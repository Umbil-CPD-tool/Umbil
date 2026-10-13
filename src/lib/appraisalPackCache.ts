const RESPONSE_STAMP = /^RESPONSE_COUNT:\s*(\d+)\s*(?:\r?\n)?/;

export type StoredAppraisalPack = {
  responseCount: number | null;
  text: string;
};

/** Split a saved appraisal pack from the response count it was written for. */
export const readStoredAppraisalPack = (stored: string | null | undefined): StoredAppraisalPack => {
  const raw = String(stored ?? "").trim();
  if (!raw) return { responseCount: null, text: "" };
  const match = raw.match(RESPONSE_STAMP);
  if (!match) return { responseCount: null, text: raw };
  return {
    responseCount: Number(match[1]),
    text: raw.slice(match[0].length).trim(),
  };
};

export const stampAppraisalPack = (text: string, responseCount: number): string => {
  const body = readStoredAppraisalPack(text).text.trim();
  return `RESPONSE_COUNT: ${responseCount}\n${body}`;
};

/**
 * Reuse a saved pack when it exists and was built from the same number of responses.
 * Older saves have no count yet, so they are kept until new responses arrive.
 */
export const shouldReuseAppraisalPack = (
  stored: string | null | undefined,
  responseCount: number
): boolean => {
  const parsed = readStoredAppraisalPack(stored);
  if (!parsed.text) return false;
  if (parsed.responseCount === null) return true;
  return parsed.responseCount === responseCount;
};
