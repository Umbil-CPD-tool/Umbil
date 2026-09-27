import {
  ACQUISITION_STORAGE_KEY,
  API_PATHS,
  acquisitionAuthMetadata,
  acquisitionProfileFields,
  deserializeAcquisitionTouch,
  parseAcquisitionTouch,
  pickFirstTouch,
  serializeAcquisitionTouch,
  type AcquisitionTouch,
} from "@umbil/shared";

import { appStorage } from "./appStorage";
import { getPublicEnv } from "./env";
import { getDeviceId } from "./ids";
import { getSupabase } from "./supabase";

export type { AcquisitionTouch };
export { acquisitionAuthMetadata };

const trimSlash = (url: string) => url.replace(/\/$/, "");

export const readAcquisition = async (): Promise<AcquisitionTouch | null> => {
  const raw = await appStorage.getItem(ACQUISITION_STORAGE_KEY);
  return deserializeAcquisitionTouch(raw);
};

export const writeAcquisition = async (touch: AcquisitionTouch): Promise<void> => {
  await appStorage.setItem(ACQUISITION_STORAGE_KEY, serializeAcquisitionTouch(touch));
};

export const captureAcquisitionFromUrl = async (
  url: string | null | undefined
): Promise<AcquisitionTouch | null> => {
  if (!url?.trim()) return null;

  const existing = await readAcquisition();
  if (existing) {
    const alreadyPosted = await appStorage.getItem("umbil_acq_posted");
    if (!alreadyPosted) {
      void postAcquisitionTouch(existing).then(() =>
        appStorage.setItem("umbil_acq_posted", "1")
      );
    }
    return existing;
  }

  const touch = parseAcquisitionTouch(url);
  if (!touch) return null;

  await writeAcquisition(touch);
  void postAcquisitionTouch(touch).then(() => appStorage.setItem("umbil_acq_posted", "1"));
  return touch;
};

const postAcquisitionTouch = async (touch: AcquisitionTouch): Promise<void> => {
  try {
    const deviceId = await getDeviceId();
    const origin = trimSlash(getPublicEnv().apiUrl);
    await fetch(`${origin}${API_PATHS.acq}`, {
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
    });
  } catch {
    /* non-blocking */
  }
};

const claimAcquisitionOnServer = async (): Promise<AcquisitionTouch | null> => {
  try {
    const supabase = getSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return null;

    const deviceId = await getDeviceId();
    const origin = trimSlash(getPublicEnv().apiUrl);
    const res = await fetch(`${origin}${API_PATHS.acqClaim}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        "x-device-id": deviceId,
      },
      body: JSON.stringify({ deviceId }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { touch?: AcquisitionTouch | null };
    return body.touch ?? null;
  } catch {
    return null;
  }
};

export const persistAcquisitionToProfile = async (): Promise<void> => {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const localTouch = await readAcquisition();
  const claimedTouch = await claimAcquisitionOnServer();
  const touch = pickFirstTouch(localTouch, claimedTouch);
  if (!touch) return;

  await writeAcquisition(touch);

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
