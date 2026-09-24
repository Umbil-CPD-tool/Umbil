"use client";

import {
  ACQUISITION_DEVICE_KEY,
  ACQUISITION_STORAGE_KEY,
  ACQUISITION_TTL_SECONDS,
  acquisitionAuthMetadata,
  acquisitionProfileFields,
  API_PATHS,
  deserializeAcquisitionTouch,
  parseAcquisitionTouch,
  pickFirstTouch,
  serializeAcquisitionTouch,
  type AcquisitionTouch,
} from "@umbil/shared";
import { supabase } from "@/lib/supabase";

export type { AcquisitionTouch };
export { acquisitionAuthMetadata, acquisitionProfileFields };

const cookieMaxAge = ACQUISITION_TTL_SECONDS;

const readCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const key = part.slice(0, eq);
    if (key !== name) continue;
    return decodeURIComponent(part.slice(eq + 1));
  }
  return null;
};

const writeCookie = (name: string, value: string): void => {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${cookieMaxAge}; SameSite=Lax${secure}`;
};

const readLocalTouch = (): AcquisitionTouch | null => {
  if (typeof window === "undefined") return null;
  try {
    return deserializeAcquisitionTouch(window.localStorage.getItem(ACQUISITION_STORAGE_KEY));
  } catch {
    return null;
  }
};

const readCookieTouch = (): AcquisitionTouch | null =>
  deserializeAcquisitionTouch(readCookie(ACQUISITION_STORAGE_KEY));

export const readAcquisition = (): AcquisitionTouch | null =>
  pickFirstTouch(readLocalTouch(), readCookieTouch());

const writeLocalTouch = (touch: AcquisitionTouch): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACQUISITION_STORAGE_KEY, serializeAcquisitionTouch(touch));
  } catch {
    /* ignore quota / private mode */
  }
};

const persistTouchLocally = (touch: AcquisitionTouch): void => {
  writeLocalTouch(touch);
  writeCookie(ACQUISITION_STORAGE_KEY, serializeAcquisitionTouch(touch));
};

export const getOrCreateAcquisitionDeviceId = (): string | null => {
  if (typeof window === "undefined") return null;

  const fromCookie = readCookie(ACQUISITION_DEVICE_KEY);
  if (fromCookie && /^[a-zA-Z0-9_-]{8,128}$/.test(fromCookie)) {
    try {
      window.localStorage.setItem(ACQUISITION_DEVICE_KEY, fromCookie);
    } catch {
      /* ignore */
    }
    return fromCookie;
  }

  let fromLocal: string | null = null;
  try {
    fromLocal = window.localStorage.getItem(ACQUISITION_DEVICE_KEY);
  } catch {
    fromLocal = null;
  }
  if (fromLocal && /^[a-zA-Z0-9_-]{8,128}$/.test(fromLocal)) {
    writeCookie(ACQUISITION_DEVICE_KEY, fromLocal);
    return fromLocal;
  }

  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `aid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  try {
    window.localStorage.setItem(ACQUISITION_DEVICE_KEY, id);
  } catch {
    /* ignore */
  }
  writeCookie(ACQUISITION_DEVICE_KEY, id);
  return id;
};

const postAcquisitionTouch = (deviceId: string, touch: AcquisitionTouch): void => {
  if (typeof window === "undefined") return;
  try {
    void fetch(API_PATHS.acq, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": deviceId,
      },
      body: JSON.stringify({
        deviceId,
        source: touch.source,
        medium: touch.medium,
        campaign: touch.campaign,
        content: touch.content,
        clickId: touch.clickId,
        capturedAt: touch.capturedAt,
      }),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {
      /* non-blocking */
    });
  } catch {
    /* non-blocking */
  }
};

const claimAcquisitionOnServer = async (deviceId: string | null): Promise<AcquisitionTouch | null> => {
  if (typeof window === "undefined") return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  try {
    const res = await fetch(API_PATHS.acqClaim, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        ...(deviceId ? { "x-device-id": deviceId } : {}),
      },
      body: JSON.stringify(deviceId ? { deviceId } : {}),
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { touch?: AcquisitionTouch | null };
    return body.touch ?? null;
  } catch {
    return null;
  }
};

export const captureAcquisitionFromLocation = (): AcquisitionTouch | null => {
  if (typeof window === "undefined") return null;

  const deviceId = getOrCreateAcquisitionDeviceId();
  const existing = readAcquisition();
  if (existing) {
    persistTouchLocally(existing);
    // One server sync per tab for touches captured before /api/acq existed.
    try {
      if (deviceId && !sessionStorage.getItem("umbil_acq_posted")) {
        postAcquisitionTouch(deviceId, existing);
        sessionStorage.setItem("umbil_acq_posted", "1");
      }
    } catch {
      /* ignore */
    }
    return existing;
  }

  const touch = parseAcquisitionTouch(window.location.search);
  if (!touch) return null;

  persistTouchLocally(touch);
  if (deviceId) {
    postAcquisitionTouch(deviceId, touch);
    try {
      sessionStorage.setItem("umbil_acq_posted", "1");
    } catch {
      /* ignore */
    }
  }
  return touch;
};

export const persistAcquisitionToProfile = async (): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const deviceId = getOrCreateAcquisitionDeviceId();
  const localTouch = readAcquisition();
  const claimedTouch = await claimAcquisitionOnServer(deviceId);
  const touch = pickFirstTouch(localTouch, claimedTouch);
  if (!touch) return;

  persistTouchLocally(touch);

  const { data: profile, error: readError } = await supabase
    .from("profiles")
    .select("id, acquisition_source")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    console.error("Could not read acquisition fields:", readError.message);
    return;
  }

  if (profile?.acquisition_source) return;

  const fields = acquisitionProfileFields(touch);

  if (!profile) {
    const { error } = await supabase.from("profiles").upsert(
      { id: user.id, email: user.email ?? null, ...fields },
      { onConflict: "id" }
    );
    if (error) console.error("Could not save acquisition:", error.message);
    return;
  }

  const { error } = await supabase.from("profiles").update(fields).eq("id", user.id);
  if (error) console.error("Could not save acquisition:", error.message);
};
