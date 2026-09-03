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

export const CANONICAL_SITE_ORIGIN = "https://umbil.co.uk";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Turn an env value into an http(s) origin Stripe will accept as return_url.
 * Common Vercel mistakes (missing protocol, quotes, trailing space) otherwise
 * become `url_invalid` and the billing portal never opens.
 */
export const toAbsoluteHttpOrigin = (value: string | undefined | null): string | null => {
  if (!value) return null;

  let raw = value.trim().replace(/^['"]+|['"]+$/g, "");
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname) return null;
    return url.origin;
  } catch {
    return null;
  }
};

/** Canonical site origin for Stripe return URLs. Never trust the request Origin header. */
export const getAppBaseUrl = (): string => {
  const fromEnv = toAbsoluteHttpOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  const fromVercel = toAbsoluteHttpOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  const isDev = process.env.NODE_ENV === "development";

  const candidate = fromEnv || fromVercel;
  if (candidate) {
    try {
      const host = new URL(candidate).hostname;
      if (!isDev && LOCAL_HOSTS.has(host)) return CANONICAL_SITE_ORIGIN;
    } catch {
      return CANONICAL_SITE_ORIGIN;
    }
    if (!isDev && candidate.startsWith("http://")) {
      return `https://${candidate.slice("http://".length)}`;
    }
    return candidate;
  }

  if (isDev) return "http://localhost:3000";
  return CANONICAL_SITE_ORIGIN;
};
