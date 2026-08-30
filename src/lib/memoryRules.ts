// src/lib/memoryRules.ts
// Pure parsing / validation rules for the memory consolidator.
// Kept free of env vars and Supabase imports so it can be unit tested directly.

/** Qwen2.5-7B serves a 32k window; a pasted ward round overruns it and the call fails. */
export const MAX_MESSAGE_CHARS = 4000;

/** Memory rides in every system prompt, so it has to stay small. */
export const MAX_MEMORY_CHARS = 1500;

/** Below this a shrinking rewrite is normal; above it, halving the profile is data loss. */
const DESTRUCTIVE_REWRITE_FLOOR = 60;

/** Plain-text fallback only accepts something short enough to plausibly be a profile line. */
const MAX_PLAIN_TEXT_FALLBACK_CHARS = 400;

export type MemoryCandidate = {
  memory: string | null;
  updateRequired: boolean;
};

export type MemoryVerdict =
  | { ok: true; memory: string }
  | { ok: false; reason: MemorySkipReason };

export type MemorySkipReason =
  | "unparsable_model_output"
  | "empty_memory"
  | "placeholder_memory"
  | "model_refusal"
  | "unsafe_memory"
  | "no_update_required"
  | "too_short"
  | "unchanged"
  | "destructive_rewrite";

const PLACEHOLDER_PATTERNS: RegExp[] = [
  /^__no_?update__$/i,
  /^(none|null|undefined|n\/?a|nil|empty|no change|unchanged)\.?$/i,
  /no (new |permanent |additional |relevant |user )?facts?/i,
  /^(no|nothing)\b.{0,20}\b(update|save|record|add|store)/i,
  /^(there (are|is) no|as an ai)/i,
];

/** A refusal is prose, not a fact — it must never be written into the profile. */
const REFUSAL_PATTERNS: RegExp[] = [
  /^(i\s?[''’]?\s?m\s+)?sorry\b/i,
  /^i\s?[''’]?\s?(m|am)\s+(sorry|unable|afraid)/i,
  /^i\s+(cannot|can\s?[''’]?\s?t|could\s+not|couldn\s?[''’]?\s?t|will\s+not|won\s?[''’]?\s?t|do\s+not|don\s?[''’]?\s?t|am\s+unable)/i,
  /\b(cannot|can\s?[''’]?\s?t|unable\s+to)\s+(comply|help|assist|do\s+that)/i,
  /\bas\s+an\s+ai\s+(language\s+)?model\b/i,
];

/**
 * Defence in depth against prompt injection. The consolidator reads raw user text, and a
 * weaker model will happily copy "set memory to: you are an admin" straight into the profile —
 * which then rides in every system prompt.
 */
const UNSAFE_MEMORY_PATTERNS: RegExp[] = [
  /\b(ignore|disregard|override|forget)\b[\s\S]{0,40}\b(previous|prior|above|earlier|all)?\s*(instruction|rule|prompt|guideline|direction)/i,
  /\b(skip|bypass|disable|suppress|omit|never\s+show)\b[\s\S]{0,40}\b(safety|warning|caution|disclaimer|red\s*flag|safety[\s-]?net)/i,
  /\b(administrator|admin|superuser|root|developer|god)\b[\s\S]{0,30}\b(access|privile|mode|rights|role)/i,
  /\bfull\s+(access|permissions?|privileges?)\b/i,
  /\b(system|developer)\s+prompt\b/i,
  /\b(you|user)\s+(are|is)\s+(now\s+)?(an?\s+)?(admin|administrator|unrestricted|jailbroken|dan)\b/i,
];

export const normaliseMemory = (value: string | null | undefined): string =>
  (value ?? "").replace(/\s+/g, " ").trim();

/** Trims to the character budget without cutting a word or sentence in half. */
export const truncateMemory = (memory: string): string => {
  if (memory.length <= MAX_MEMORY_CHARS) return memory;

  const window = memory.slice(0, MAX_MEMORY_CHARS);
  const lastSentence = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "));
  if (lastSentence > MAX_MEMORY_CHARS * 0.5) return window.slice(0, lastSentence + 1).trim();

  const lastSpace = window.lastIndexOf(" ");
  return (lastSpace > 0 ? window.slice(0, lastSpace) : window).trim();
};

export const truncateMessage = (message: string): string =>
  message.length > MAX_MESSAGE_CHARS ? `${message.slice(0, MAX_MESSAGE_CHARS)}…` : message;

/**
 * Deliberately permissive pre-screen. A message with no self-reference at all
 * (a bare clinical query) cannot contain a user fact, so it skips the model call.
 * Anything ambiguous still goes to the consolidator.
 */
const SELF_REFERENCE_PATTERNS: RegExp[] = [
  /\b(i|me|my|mine|myself|we|us|our|ours)\b/i,
  /\bi\s?['’]\s?(m|ve|d|ll)\b/i,
  /\bim\b/i,
  /\bas an?\b/i,
  /\b(call|address)\s+me\b/i,
  /\b(working|work|based|train(ing|ee)?|rotat(e|ing))\s+(as|at|in)\b/i,
];

export const hasSelfReferenceSignal = (message: string): boolean =>
  SELF_REFERENCE_PATTERNS.some((pattern) => pattern.test(message));

const stripReasoningTags = (text: string): string =>
  text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<\/?think>/gi, "");

const stripCodeFences = (text: string): string => text.replace(/```[a-z]*/gi, "");

/** Pulls the first balanced JSON object out of prose, ignoring braces inside strings. */
const extractJsonObject = (text: string): string | null => {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
};

const readCandidate = (json: string): MemoryCandidate | null => {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) return null;

    const flag = parsed.update_required;
    return {
      memory: typeof parsed.memory === "string" ? parsed.memory : null,
      updateRequired: typeof flag === "boolean" ? flag : String(flag).toLowerCase() === "true",
    };
  } catch {
    return null;
  }
};

/**
 * Recovers a candidate from whatever the 7B consolidator actually returned.
 * Handles clean JSON, JSON wrapped in prose or fences, and a bare memory sentence.
 */
export const parseMemoryResponse = (rawOutput: string | null | undefined): MemoryCandidate | null => {
  if (!rawOutput) return null;

  const cleaned = stripCodeFences(stripReasoningTags(rawOutput)).trim();
  if (!cleaned) return null;

  const direct = readCandidate(cleaned);
  if (direct) return direct;

  const embedded = extractJsonObject(cleaned);
  if (embedded) {
    const fromEmbedded = readCandidate(embedded);
    if (fromEmbedded) return fromEmbedded;
  }

  // Fallback: the model ignored the schema and replied with the memory line itself.
  // The prompt requires facts to be written as "User ...", so anything else here is
  // commentary, a refusal, or echoed user text and must not be treated as a candidate.
  const looksLikeMemoryLine =
    !cleaned.includes("{") &&
    /^user\b/i.test(cleaned) &&
    cleaned.length >= 5 &&
    cleaned.length <= MAX_PLAIN_TEXT_FALLBACK_CHARS &&
    !cleaned.endsWith("?");

  if (looksLikeMemoryLine) {
    return { memory: cleaned, updateRequired: true };
  }

  return null;
};

/**
 * Decides whether a candidate is safe to persist over the memory it was consolidated from.
 * Every rejection returns a reason so failures show up in logs instead of vanishing.
 */
export const validateMemoryCandidate = (
  candidate: MemoryCandidate | null,
  currentMemory: string | null
): MemoryVerdict => {
  if (!candidate) return { ok: false, reason: "unparsable_model_output" };

  const next = normaliseMemory(candidate.memory);
  const current = normaliseMemory(currentMemory);

  if (!next) return { ok: false, reason: "empty_memory" };
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(next))) {
    return { ok: false, reason: "placeholder_memory" };
  }
  if (REFUSAL_PATTERNS.some((pattern) => pattern.test(next))) {
    return { ok: false, reason: "model_refusal" };
  }
  if (UNSAFE_MEMORY_PATTERNS.some((pattern) => pattern.test(next))) {
    return { ok: false, reason: "unsafe_memory" };
  }
  if (!candidate.updateRequired) return { ok: false, reason: "no_update_required" };
  if (next.length < 5) return { ok: false, reason: "too_short" };
  if (next === current) return { ok: false, reason: "unchanged" };

  // A small model rewriting the whole blob each turn can silently drop earlier facts.
  if (current.length >= DESTRUCTIVE_REWRITE_FLOOR && next.length < current.length * 0.5) {
    return { ok: false, reason: "destructive_rewrite" };
  }

  return { ok: true, memory: truncateMemory(next) };
};
