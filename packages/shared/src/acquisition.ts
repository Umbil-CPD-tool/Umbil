/** First-touch acquisition attribution shared by web and mobile. */

export const ACQUISITION_STORAGE_KEY = "umbil_acq";
export const ACQUISITION_DEVICE_KEY = "umbil_aid";
export const ACQUISITION_TTL_DAYS = 30;
export const ACQUISITION_TTL_SECONDS = ACQUISITION_TTL_DAYS * 24 * 60 * 60;

export type AcquisitionTouch = {
  source: string;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  clickId: string | null;
  capturedAt: string;
};

export const blankToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isAcquisitionTouch = (value: unknown): value is AcquisitionTouch => {
  if (!isRecord(value)) return false;
  if (typeof value.source !== "string" || !value.source.trim()) return false;
  if (typeof value.capturedAt !== "string" || !value.capturedAt.trim()) return false;
  for (const key of ["medium", "campaign", "content", "clickId"] as const) {
    const field = value[key];
    if (field != null && typeof field !== "string") return false;
  }
  return true;
};

export const deserializeAcquisitionTouch = (raw: string | null | undefined): AcquisitionTouch | null => {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isAcquisitionTouch(parsed)) return null;
    return {
      source: parsed.source.trim(),
      medium: blankToNull(parsed.medium),
      campaign: blankToNull(parsed.campaign),
      content: blankToNull(parsed.content),
      clickId: blankToNull(parsed.clickId),
      capturedAt: parsed.capturedAt,
    };
  } catch {
    return null;
  }
};

export const serializeAcquisitionTouch = (touch: AcquisitionTouch): string =>
  JSON.stringify({
    source: touch.source,
    medium: touch.medium,
    campaign: touch.campaign,
    content: touch.content,
    clickId: touch.clickId,
    capturedAt: touch.capturedAt,
  });

/** Keep the earliest first-touch; later campaigns must not overwrite. */
export const pickFirstTouch = (
  a: AcquisitionTouch | null | undefined,
  b: AcquisitionTouch | null | undefined
): AcquisitionTouch | null => {
  if (!a) return b ?? null;
  if (!b) return a;
  return a.capturedAt <= b.capturedAt ? a : b;
};

type SearchLike = {
  get(name: string): string | null;
};

const asSearchParams = (
  input: string | URLSearchParams | SearchLike | Record<string, string | null | undefined>
): SearchLike => {
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return new URLSearchParams();
    if (trimmed.includes("://") || trimmed.startsWith("/") || trimmed.includes("?")) {
      try {
        const url = trimmed.includes("://")
          ? new URL(trimmed)
          : new URL(trimmed, "https://umbil.local");
        return url.searchParams;
      } catch {
        const q = trimmed.startsWith("?") ? trimmed.slice(1) : trimmed;
        return new URLSearchParams(q);
      }
    }
    return new URLSearchParams(trimmed);
  }
  if (typeof (input as URLSearchParams).get === "function") {
    return input as SearchLike;
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input as Record<string, string | null | undefined>)) {
    if (value != null && value !== "") params.set(key, value);
  }
  return params;
};

/**
 * Parse utm_* / paid click ids into a first-touch record.
 * Accepts a query string, URL, URLSearchParams, or plain object.
 */
export const parseAcquisitionTouch = (
  input: string | URLSearchParams | SearchLike | Record<string, string | null | undefined>,
  capturedAt: string = new Date().toISOString()
): AcquisitionTouch | null => {
  const params = asSearchParams(input);
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
  return {
    source,
    medium: blankToNull(params.get("utm_medium")) ?? (inferredPaid ? "paid" : null),
    campaign: blankToNull(params.get("utm_campaign")),
    content: blankToNull(params.get("utm_content")),
    clickId: fbclid ?? gclid ?? msclkid,
    capturedAt,
  };
};

export const acquisitionProfileFields = (touch: AcquisitionTouch) => ({
  acquisition_source: touch.source,
  acquisition_medium: touch.medium,
  acquisition_campaign: touch.campaign,
  acquisition_content: touch.content,
  acquisition_click_id: touch.clickId,
  acquisition_at: touch.capturedAt,
});

export const acquisitionAuthMetadata = (touch: AcquisitionTouch) => ({
  acquisition_source: touch.source,
  acquisition_medium: touch.medium,
  acquisition_campaign: touch.campaign,
});

const DEVICE_ID_RE = /^[a-zA-Z0-9_-]{8,128}$/;

export const isValidAcquisitionDeviceId = (value: unknown): value is string =>
  typeof value === "string" && DEVICE_ID_RE.test(value);
