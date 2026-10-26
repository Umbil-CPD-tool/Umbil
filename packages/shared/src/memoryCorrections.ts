import { containsUnsafeMemory, type MemoryCategory } from "./memoryItems";

export const CORRECTION_PROMOTION_COUNT = 3;

export type StyleSignal = {
  key: string;
  body: string;
  category: MemoryCategory;
};

const catalogue = (
  key: string,
  body: string,
  category: MemoryCategory
): StyleSignal => ({ key, body, category });

export const STYLE_SIGNALS: Record<string, StyleSignal> = {
  shorter: catalogue("shorter", "Prefers shorter writing, without unnecessary detail.", "communication"),
  longer: catalogue("longer", "Prefers more complete writing when detail matters.", "communication"),
  prose: catalogue("prose", "Prefers continuous prose rather than bullet points.", "communication"),
  bullets: catalogue("bullets", "Prefers bullet points.", "communication"),
  absolute_risk: catalogue(
    "absolute_risk",
    "Prefers evidence summaries with absolute risk figures rather than relative risks only.",
    "communication"
  ),
  tables: catalogue("tables", "Prefers answers in table format.", "communication"),
  plain: catalogue("plain", "Prefers plain, direct language.", "communication"),
  tone: catalogue("tone", "Prefers a plainer, more direct writing style.", "communication"),
  "referral:shorter": catalogue("referral:shorter", "Prefers shorter referral letters.", "workflow"),
  "referral:prose": catalogue(
    "referral:prose",
    "Prefers referral letters in continuous prose rather than bullet points.",
    "workflow"
  ),
};

const SIGNAL_PRIORITY = [
  "absolute_risk",
  "referral:prose",
  "prose",
  "bullets",
  "tables",
  "plain",
  "referral:shorter",
  "shorter",
  "longer",
  "tone",
];

const RULES: Array<{ key: string; pattern: RegExp }> = [
  { key: "absolute_risk", pattern: /\babsolute risk\b/i },
  { key: "prose", pattern: /\b(prose|no bullets|not bullets|without bullets|continuous prose|paragraphs?,?\s+not bullets)\b/i },
  { key: "bullets", pattern: /\b(use bullets|bullet points|as bullets)\b/i },
  { key: "tables", pattern: /\b(in a table|as a table|use tables)\b/i },
  { key: "plain", pattern: /\b(plain language|simpler language|less jargon|more direct)\b/i },
  {
    key: "shorter",
    pattern: /\b(too long|too much detail|too detailed|unnecessary detail|make it shorter|more concise|be brief|cut it down|less detail|keep it short)\b/i,
  },
  { key: "longer", pattern: /\b(too short|more detail|expand this|write more)\b/i },
  { key: "tone", pattern: /\bstop writing like that\b/i },
];

export const styleSignalByKey = (key: string): StyleSignal | null => STYLE_SIGNALS[key] ?? null;

/** A standing instruction is saved immediately by the memory consolidator, not counted as a habit. */
export const isExplicitPreference = (message: string): boolean =>
  /\b(remember that|from now on|don['’]t forget|i prefer)\b/i.test(message);

const haystackFor = (message: string): string => {
  const text = message.replace(/\s+/g, " ").trim();
  return text.length > 500 ? text.slice(0, 160) : text;
};

export const detectStyleCorrection = (message: string): StyleSignal | null => {
  const text = message.replace(/\s+/g, " ").trim();
  if (!text || containsUnsafeMemory(text)) return null;

  const haystack = haystackFor(text);
  const matched = RULES.filter((rule) => rule.pattern.test(haystack)).map((rule) => rule.key);
  if (/\bshorter\b/i.test(haystack) && text.length < 180) matched.push("shorter");
  if (matched.length === 0) return null;

  const key = SIGNAL_PRIORITY.find((candidate) => matched.includes(candidate));
  return key ? styleSignalByKey(key) : null;
};

export const correctionToCount = (message: string): StyleSignal | null => {
  if (isExplicitPreference(message)) return null;
  return detectStyleCorrection(message);
};

const bulletCount = (text: string): number => (text.match(/^\s*(?:[-*•]|\d+\.)\s+/gm) ?? []).length;

const removedSafetyNet = (original: string, edited: string): boolean =>
  /safety[\s-]?net|red flag/i.test(original) && !/safety[\s-]?net|red flag/i.test(edited);

export const detectEditSignal = (
  original: string,
  edited: string,
  toolId?: string | null
): StyleSignal | null => {
  const before = original.replace(/\s+/g, " ").trim();
  const after = edited.replace(/\s+/g, " ").trim();
  if (before.length < 80 || after.length < 40 || before === after) return null;
  if (removedSafetyNet(original, edited) || containsUnsafeMemory(after)) return null;

  const referral = toolId === "referral";
  const bulletsBefore = bulletCount(original);
  const bulletsAfter = bulletCount(edited);
  const ratio = after.length / before.length;

  if (bulletsBefore >= 3 && bulletsAfter <= 1) {
    return styleSignalByKey(referral ? "referral:prose" : "prose");
  }
  if (ratio <= 0.75 && before.length - after.length >= 80) {
    return styleSignalByKey(referral ? "referral:shorter" : "shorter");
  }
  if (ratio >= 1.4 && after.length - before.length >= 80) {
    return styleSignalByKey("longer");
  }
  return null;
};
