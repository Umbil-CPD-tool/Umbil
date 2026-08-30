"use client";

import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "umbil_acq";

export type AcquisitionTouch = {
  source: string;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  clickId: string | null;
  capturedAt: string;
};

const blankToNull = (value: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const readAcquisition = (): AcquisitionTouch | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AcquisitionTouch;
    if (!parsed?.source) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const captureAcquisitionFromLocation = (): AcquisitionTouch | null => {
  if (typeof window === "undefined") return null;

  const existing = readAcquisition();
  if (existing) return existing;

  const params = new URLSearchParams(window.location.search);
  const utmSource = blankToNull(params.get("utm_source"));
  const fbclid = blankToNull(params.get("fbclid"));
  const gclid = blankToNull(params.get("gclid"));
  const msclkid = blankToNull(params.get("msclkid"));

  const source =
    utmSource ??
    (fbclid ? "facebook" : null) ??
    (gclid ? "google" : null) ??
    (msclkid ? "microsoft" : null);

  if (!source) return null;

  const inferredPaid = Boolean(fbclid || gclid || msclkid);
  const touch: AcquisitionTouch = {
    source,
    medium: blankToNull(params.get("utm_medium")) ?? (inferredPaid ? "paid" : null),
    campaign: blankToNull(params.get("utm_campaign")),
    content: blankToNull(params.get("utm_content")),
    clickId: fbclid ?? gclid ?? msclkid,
    capturedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(touch));
  return touch;
};

export const persistAcquisitionToProfile = async (): Promise<void> => {
  const touch = readAcquisition();
  if (!touch) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

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

  const fields = {
    acquisition_source: touch.source,
    acquisition_medium: touch.medium,
    acquisition_campaign: touch.campaign,
    acquisition_content: touch.content,
    acquisition_click_id: touch.clickId,
    acquisition_at: touch.capturedAt,
  };

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
