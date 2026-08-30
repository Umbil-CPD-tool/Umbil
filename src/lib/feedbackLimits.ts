/**
 * Limits for anonymous PSQ/MSF submissions.
 *
 * These links are public, long-lived and often printed on a QR code or left open
 * on a clinic kiosk, which makes them the most exposed write path in the app. The
 * responses become the evidence behind a GMC appraisal, so the point of these
 * checks is to stop whoever holds a link from fabricating that evidence.
 *
 * Kept free of imports so the validators can be unit tested without a database
 * client.
 */

export const MAX_SUBMISSION_BYTES = 20_000;
export const MAX_TEXT_ANSWER_CHARS = 5_000;
export const MAX_ANSWER_FIELDS = 60;
export const MAX_ANSWER_KEY_CHARS = 64;
export const MAX_ROLE_CHARS = 80;
export const SUBMISSIONS_PER_IP_PER_HOUR = 30;

/** Cheap pre-parse guard so an oversized body is refused before it is read into memory. */
export const exceedsDeclaredSize = (req: {
  headers: { get(name: string): string | null };
}): boolean => {
  const declared = Number(req.headers.get("content-length") ?? 0);
  return Number.isFinite(declared) && declared > MAX_SUBMISSION_BYTES;
};

export const jsonByteLength = (value: unknown): number =>
  new TextEncoder().encode(JSON.stringify(value ?? null)).length;

/**
 * Answers are stored in a single JSON column, so their shape has to be checked
 * here rather than by the database. Both surveys mix Likert numbers with free
 * text from optional custom questions, so a value may be either.
 */
export const isValidAnswerMap = (value: unknown): boolean => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0 || entries.length > MAX_ANSWER_FIELDS) return false;

  return entries.every(([key, answer]) => {
    if (key.length > MAX_ANSWER_KEY_CHARS) return false;
    if (typeof answer === "number") return Number.isFinite(answer);
    if (typeof answer === "boolean") return true;
    return typeof answer === "string" && answer.length <= MAX_TEXT_ANSWER_CHARS;
  });
};

/** Optional free-text fields on an MSF response. */
export const isValidFreeText = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  (typeof value === "string" && value.length <= MAX_TEXT_ANSWER_CHARS);
