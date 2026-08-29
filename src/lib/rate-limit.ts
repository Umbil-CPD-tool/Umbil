type Bucket = { count: number; resetTime: number };

const buckets = new Map<string, Bucket>();

const DEFAULT_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_MAX = 10;

/**
 * In-memory rate limit (resets per serverless instance).
 * Use for abuse protection, not as the only billing control.
 */
export function checkRateLimit(
  key: string,
  max: number = DEFAULT_MAX,
  windowMs: number = DEFAULT_WINDOW_MS
): boolean {
  const now = Date.now();
  const record = buckets.get(key);

  if (!record || record.resetTime < now) {
    buckets.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (record.count >= max) {
    return false;
  }
  record.count++;
  return true;
}

/** Client IP for guest limits. Uses the first X-Forwarded-For hop. */
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") || "unknown-ip";
}
