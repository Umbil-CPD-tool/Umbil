/**
 * Escape text before interpolating it into HTML (print windows, emails, etc.).
 * Accepts unknown so a null title from an older row cannot break a report export.
 */
export const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Only allow same-origin relative paths for post-login redirects.
 * Rejects protocol-relative URLs, backslashes, and absolute URLs.
 */
export const safeInternalPath = (value: string | null | undefined, fallback = "/"): string => {
  if (!value || typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\") || trimmed.includes("://")) return fallback;

  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded.startsWith("//") || decoded.includes("://")) return fallback;
  } catch {
    return fallback;
  }

  return trimmed;
};

/**
 * Exactly one deliverable address. Transactional email providers accept arrays of
 * recipients, so anything looser turns a per-user invite endpoint into a bulk
 * sender running on our own domain reputation.
 */
export const isSingleEmailAddress = (value: unknown): value is string => {
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 254) return false;

  return /^[^\s@,;:<>"()[\]\\]+@[^\s@,;:<>"()[\]\\]+\.[^\s@,;:<>"()[\]\\]{2,}$/.test(trimmed);
};

/** Canonical site origin for Stripe return URLs. Never trust the request Origin header. */
export const getAppBaseUrl = (): string => {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  return "https://umbil.co.uk";
};
