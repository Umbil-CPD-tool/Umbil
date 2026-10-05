import type { WorkflowToolId } from "./constants/tools";

/**
 * Suggested next actions for the chat composer.
 *
 * The draft stays on the device until the clinician sends it. Matching is local,
 * so a paste of notes can offer "Draft referral" or "Safety net" immediately.
 * Choosing one inserts a short instruction above the notes. That instruction is
 * what the ask route recognises, and it wins over whatever the notes themselves mention.
 */

export type SuggestedActionId = WorkflowToolId | "summarise_actions" | "check_evidence";

export type SuggestedActionIntent = WorkflowToolId | "standard";

export type SuggestedAction = {
  id: SuggestedActionId;
  label: string;
  /** Instruction placed on its own line above the clinician's notes. */
  prefix: string;
};

type ActionDefinition = SuggestedAction & {
  normalizedPrefix: string;
  intent: SuggestedActionIntent;
};

const normalizeDraft = (message: string): string =>
  message
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const defineAction = (
  id: SuggestedActionId,
  label: string,
  prefix: string,
  intent: SuggestedActionIntent
): ActionDefinition => ({
  id,
  label,
  prefix,
  normalizedPrefix: normalizeDraft(prefix),
  intent,
});

/** Every chat workflow tool, plus the two reading actions a clinic day needs. */
export const SUGGESTED_ACTIONS: readonly ActionDefinition[] = [
  defineAction("referral", "Draft referral", "Generate a referral letter", "referral"),
  defineAction(
    "digital_triage",
    "Reply to patient",
    "Draft a triage reply to the patient",
    "digital_triage"
  ),
  defineAction(
    "summarise_actions",
    "Summarise & actions",
    "Summarise this and list the actions required",
    "standard"
  ),
  defineAction("safety_netting", "Safety net", "Generate safety netting", "safety_netting"),
  defineAction(
    "patient_friendly",
    "Patient information",
    "Generate a patient handout",
    "patient_friendly"
  ),
  defineAction(
    "check_evidence",
    "Check evidence",
    "Check the clinical evidence for",
    "standard"
  ),
  defineAction("sbar", "SBAR handover", "Write an SBAR handover", "sbar"),
  defineAction(
    "discharge_summary",
    "Discharge letter",
    "Write a discharge summary",
    "discharge_summary"
  ),
];

const ACTION_BY_ID = new Map(SUGGESTED_ACTIONS.map((action) => [action.id, action]));

const MAX_SUGGESTIONS = 4;

/** Shown for ordinary clinical notes when nothing more specific stands out. */
const BASELINE_ORDER: SuggestedActionId[] = [
  "patient_friendly",
  "safety_netting",
  "referral",
  "check_evidence",
];

const TIE_BREAK: SuggestedActionId[] = [
  "patient_friendly",
  "safety_netting",
  "referral",
  "check_evidence",
  "digital_triage",
  "summarise_actions",
  "discharge_summary",
  "sbar",
];

const QUESTION_OPENER =
  /^(?:what|whats|what's|when|whens|why|which|where|how|hows|is|are|was|were|do|does|did|should|shall|must|can|could|would|has|have|any|who)\b/i;

const SOLO_CONDITION =
  /^(?:insomnia|menopause|anxiety|depression|asthma|copd|diabetes|hypertension|migraine|headache|uti|gout|eczema|psoriasis|anaemia|anemia|hypothyroidism|hyperthyroidism|cellulitis|shingles|vertigo|dizziness|constipation|diarrhoea|diarrhea|back pain)$/i;

const CLINICAL_TERM =
  /\b(?:pain|ache|fever|cough|rash|headache|migraine|insomnia|anxiety|depression|menopause|diabetes|asthma|copd|uti|hypertension|chest|breathless|dyspnoea|dyspnea|dizziness|vertigo|nausea|vomit(?:ing)?|diarrhoea|diarrhea|constipation|bleeding|pregnan(?:t|cy)|infant|sepsis|infection|smoker|hoarse|patient|year[- ]old|\d{1,3}\s?yo\b|o\/e|impression|symptom|bloods?|result|sats?|news|ecg|cxr|mri|ultrasound|crp|ferritin|haemoptysis|hemoptysis|weight loss|back pain)\b/i;

const PATIENT_REQUEST =
  /\b(?:accurx|accu[\s-]?rx|e-?consult|econsult|patchs|online consult(?:ation)?|patient (?:message|msg|request|query)|pt (?:message|msg|says|sent))\b/i;

/** First person, and not the clinician saying "I have a 57 year old". */
const PATIENT_VOICE =
  /^(?:hi[, ]+|hello[, ]+)?i(?:'ve| have| am|'m)\b(?!\s+(?:a|an)\s+(?:\d|patient\b|pt\b))/i;

const REFERRAL_SIGNAL =
  /\b(?:2\s?ww|two[- ]week wait|urgent suspected cancer|\busc\b|please refer|needs? referring|refer(?:ral)? to)\b/i;

const HOSPITAL_LETTER =
  /\b(?:dear (?:dr|doctor|colleague)|thank you for referring|clinic letter|outpatient letter|for your (?:information|records) and action|blood results?|investigation results?|histology report)\b/i;

const DISCHARGE_SIGNAL =
  /\b(?:discharge (?:summary|letter)|d\/c summary|tt[oa]s?|to take (?:out|away)|ward notes?|this admission|going home today|home today)\b/i;

const SBAR_SIGNAL =
  /\b(?:sbar|esbar|peri-?arrest|news\s*[3-9]|bleep|escalat(?:e|ion)|needs? (?:a )?(?:reg|registrar) review)\b|\bsats?\s*(?:of\s*)?(?:[1-8]\d|9[0-2])\s*%/i;

const HANDOUT_SIGNAL =
  /\b(?:hand\s?out|leaflet|patient information|explain (?:this|it) to (?:the )?(?:patient|pt|parents))\b/i;

const SAFETY_SIGNAL = /\b(?:safety[\s-]?net(?:ting)?|red flags?|sent home|come back if)\b/i;

const EVIDENCE_SIGNAL =
  /\b(?:\d+\s?(?:mg|micrograms?|mcg|units)|bnf|nice guideline)\b/i;

const startsWithPrefix = (normalized: string, prefix: string): boolean =>
  normalized === prefix || normalized.startsWith(`${prefix} `);

const matchingAction = (text: string): ActionDefinition | null => {
  const normalized = normalizeDraft(text);
  if (!normalized) return null;
  return (
    SUGGESTED_ACTIONS.find((action) => startsWithPrefix(normalized, action.normalizedPrefix)) ??
    null
  );
};

/** Removes one or more suggested-action instructions from the top of a draft. */
export const stripSuggestedPrefix = (text: string): string => {
  let current = text;
  for (let guard = 0; guard < SUGGESTED_ACTIONS.length; guard += 1) {
    const action = matchingAction(current);
    if (!action) break;
    const stripped = current.replace(
      new RegExp(`^${escapeRegExp(action.prefix)}\\b[:\\s-]*`, "i"),
      ""
    );
    if (stripped === current) break;
    current = stripped;
  }
  return current;
};

/** The action whose instruction is already at the top of the draft, if any. */
export const activeSuggestedAction = (text: string): SuggestedActionId | null =>
  matchingAction(text)?.id ?? null;

/**
 * Tool to run, or "standard" for summarise / evidence.
 * Null when the draft does not open with a suggested-action instruction.
 */
export const suggestedActionIntent = (message: string): SuggestedActionIntent | null =>
  matchingAction(message)?.intent ?? null;

const hasClinicalDraft = (body: string): boolean => {
  const trimmed = body.trim();
  if (trimmed.length < 4) return false;
  if (trimmed.endsWith("?")) return false;
  if (QUESTION_OPENER.test(trimmed) && trimmed.length < 220 && !trimmed.includes("\n")) {
    return false;
  }
  if (SOLO_CONDITION.test(trimmed)) return true;
  if (EVIDENCE_SIGNAL.test(trimmed)) return true;
  if (PATIENT_REQUEST.test(trimmed) || PATIENT_VOICE.test(trimmed)) return true;
  if (HOSPITAL_LETTER.test(trimmed) || DISCHARGE_SIGNAL.test(trimmed) || SBAR_SIGNAL.test(trimmed)) {
    return true;
  }
  const words = trimmed.split(/\s+/).length;
  return CLINICAL_TERM.test(trimmed) && (words >= 2 || trimmed.length >= 24);
};

const scoreClinicalDraft = (body: string): Record<SuggestedActionId, number> => {
  const scores: Record<SuggestedActionId, number> = {
    patient_friendly: 2,
    safety_netting: 2,
    referral: 1,
    check_evidence: 1,
    digital_triage: 0,
    summarise_actions: 0,
    discharge_summary: 0,
    sbar: 0,
  };

  if (PATIENT_REQUEST.test(body) || PATIENT_VOICE.test(body)) scores.digital_triage += 6;
  if (REFERRAL_SIGNAL.test(body)) scores.referral += 6;
  if (HOSPITAL_LETTER.test(body)) scores.summarise_actions += 6;
  if (DISCHARGE_SIGNAL.test(body)) scores.discharge_summary += 7;
  if (SBAR_SIGNAL.test(body)) scores.sbar += 7;
  if (HANDOUT_SIGNAL.test(body)) scores.patient_friendly += 6;
  if (SAFETY_SIGNAL.test(body)) scores.safety_netting += 6;
  if (EVIDENCE_SIGNAL.test(body)) scores.check_evidence += 6;

  return scores;
};

const byRelevance =
  (scores: Record<SuggestedActionId, number>) =>
  (left: SuggestedActionId, right: SuggestedActionId): number => {
    const scoreDiff = scores[right] - scores[left];
    if (scoreDiff !== 0) return scoreDiff;
    return TIE_BREAK.indexOf(left) - TIE_BREAK.indexOf(right);
  };

/**
 * Likely next actions for what the clinician has typed or pasted.
 * At most four, with the closest workflow first. Empty for questions and non-clinical text.
 */
export const suggestClinicalActions = (text: string): SuggestedAction[] => {
  const body = stripSuggestedPrefix(text).trim();
  if (!hasClinicalDraft(body)) return [];

  const scores = scoreClinicalDraft(body);
  const ranked = (Object.keys(scores) as SuggestedActionId[]).sort(byRelevance(scores));
  const picked: SuggestedActionId[] = [];

  for (const id of ranked) {
    if (picked.length >= MAX_SUGGESTIONS) break;
    if (scores[id] >= 5) picked.push(id);
  }

  for (const id of BASELINE_ORDER) {
    if (picked.length >= MAX_SUGGESTIONS) break;
    if (!picked.includes(id)) picked.push(id);
  }

  return picked.map((id) => {
    const action = ACTION_BY_ID.get(id);
    if (!action) {
      throw new Error(`Missing suggested action: ${id}`);
    }
    return { id: action.id, label: action.label, prefix: action.prefix };
  });
};

/**
 * Puts the chosen instruction above the notes, replacing any previous one.
 * Choosing the action that is already applied removes it.
 */
export const applySuggestedAction = (text: string, id: SuggestedActionId): string => {
  const action = ACTION_BY_ID.get(id);
  if (!action) return text;

  const body = stripSuggestedPrefix(text).trim();
  if (activeSuggestedAction(text) === id) return body;
  if (!body) return action.prefix;
  return `${action.prefix}\n\n${body}`;
};
