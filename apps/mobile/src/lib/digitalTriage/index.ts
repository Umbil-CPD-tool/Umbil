// UK clinical triage scaffolds (NICE CKS / NICE guidance / NHS.uk themes).
// Mirrors web `src/lib/digital-triage.ts` + `digital-triage-templates.ts` — used to show a
// clinician-facing "what Umbil detected" summary alongside the Digital Triage tool output.
// Screening questions only — never diagnose or assign urgency/disposition.
export type { TriageScaffold } from "./types";
export { STANDARD_SAFETY_CLOSER } from "./types";

import type { TriageScaffold } from "./types";
import { TEMPLATES as acute } from "./acute";
import { TEMPLATES as giMsk } from "./gi-msk";
import { TEMPLATES as infectionPaedsEnt } from "./infection-paeds-ent";
import { TEMPLATES as specialistGeneral } from "./specialist-general";

export const DIGITAL_TRIAGE_TEMPLATES: Record<string, TriageScaffold> = {
  ...acute,
  ...giMsk,
  ...infectionPaedsEnt,
  ...specialistGeneral,
};

export type HighRiskFlag = {
  id: string;
  label: string;
};

export type TriageAnalysis = {
  presentationKeys: string[];
  templateLabels: string[];
  isGeneric: boolean;
  detectedTags: string[];
  highRiskFlags: HighRiskFlag[];
};

const MAX_PRESENTATIONS = 3;

const HIGH_RISK_PHRASES: { id: string; label: string; pattern: RegExp }[] = [
  { id: "thunderclap", label: "Worst / sudden severe headache", pattern: /\b(worst\s+headache|thunderclap|sudden\s+severe\s+headache|worst\s+ever\s+headache)\b/i },
  { id: "crushing_chest", label: "Crushing / severe chest pain", pattern: /\b(crushing\s+chest|severe\s+chest\s+pain|central\s+crushing)\b/i },
  { id: "black_stools", label: "Black stools / melaena", pattern: /\b(black\s+stools?|melaena|melena|tarry\s+stools?)\b/i },
  { id: "onesided_weakness", label: "One-sided weakness", pattern: /\b(one[\s-]?sided\s+weakness|weak(ness)?\s+(on\s+)?(my\s+)?(left|right)\s+(arm|leg|side)|facial\s+droop)\b/i },
  { id: "cant_breathe", label: "Can't breathe / severe breathlessness", pattern: /\b(can'?t\s+breathe|cannot\s+breathe|struggling\s+to\s+breathe|severe\s+breathlessness|gasping)\b/i },
  { id: "suicidal", label: "Suicidal thoughts / self-harm", pattern: /\b(suicid(al|e)|kill\s+myself|end\s+my\s+life|self[\s-]?harm|want\s+to\s+die)\b/i },
  { id: "haemoptysis", label: "Coughing blood", pattern: /\b(cough(ing)?\s+(up\s+)?blood|haemoptysis|hemoptysis)\b/i },
  { id: "seizure", label: "Seizure / fit", pattern: /\b(seizure|fitting|had\s+a\s+fit|tonic[\s-]?clonic)\b/i },
  { id: "vision_loss", label: "Sudden vision loss", pattern: /\b(sudden\s+(loss\s+of\s+)?vision|can'?t\s+see|blind(ness)?\s+in\s+(one|my)\s+eye)\b/i },
  { id: "collapse", label: "Collapse / unresponsive", pattern: /\b(collapsed|unresponsive|passed\s+out|loss\s+of\s+consciousness)\b/i },
  { id: "reduced_fm", label: "Reduced fetal movements", pattern: /\b(reduced\s+(fetal\s+)?movements?|baby\s+not\s+moving|no\s+fetal\s+movements?)\b/i },
  { id: "anaphylaxis", label: "Possible severe allergy", pattern: /\b(throat\s+swelling|tongue\s+swelling|lips?\s+swelling|anaphylaxis|can'?t\s+swallow)\b/i },
];

const CONTEXT_TAG_RULES: { label: string; pattern: RegExp }[] = [
  { label: "Diabetic", pattern: /\b(diabet(es|ic)|t1dm|t2dm|type\s*[12]\s*diabet)\b/i },
  { label: "Pregnant", pattern: /\b(pregnant|pregnancy|\d+\s*weeks?\s*(pregnant|gestation)|antenatal)\b/i },
  { label: "Head injury", pattern: /\b(head\s+injury|hit\s+(my\s+)?head|bumped\s+(my\s+)?head|concussion)\b/i },
  { label: "Child", pattern: /\b(child|children|baby|infant|toddler|neonate|paediatric|pediatric|\d{1,2}\s*(yo|yr|yrs|year(?:s)?\s*old))\b/i },
  { label: "Immunosuppressed", pattern: /\b(immunosuppress|chemo(therapy)?|on\s+steroids|transplant)\b/i },
  { label: "Blood thinners", pattern: /\b(warfarin|apixaban|rivaroxaban|edoxaban|dabigatran|blood\s+thinners?|anticoagulan)\b/i },
];

function hasChildCue(lower: string): boolean {
  if (/\b(child|children|paediatric|pediatric|baby|infant|toddler|neonate)\b/.test(lower)) {
    return true;
  }
  const ageMatch = lower.match(/\b(\d{1,2})\s*(?:yo|yr|yrs|year(?:s)?\s*old)/);
  return ageMatch ? parseInt(ageMatch[1], 10) < 16 : false;
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}

/** Match up to 3 presentation keys by alias length priority. */
export function matchTriagePresentations(input: string): string[] {
  const lower = input.toLowerCase();

  type Candidate = { key: string; alias: string };
  const candidates: Candidate[] = [];

  for (const [key, scaffold] of Object.entries(DIGITAL_TRIAGE_TEMPLATES)) {
    if (key === "GENERIC") continue;
    for (const alias of scaffold.aliases) {
      candidates.push({ key, alias: alias.toLowerCase() });
    }
  }

  candidates.sort((a, b) => b.alias.length - a.alias.length);

  const matched: string[] = [];
  for (const { key, alias } of candidates) {
    if (!lower.includes(alias)) continue;
    if (matched.includes(key)) continue;
    matched.push(key);
    if (matched.length >= MAX_PRESENTATIONS) break;
  }

  // Fever adult vs child disambiguation
  const feverIdx = matched.findIndex((k) => k === "FEVER_ADULT" || k === "FEVER_CHILD");
  const feverInText = /\b(fever|high temperature|pyrexia|feverish)\b/.test(lower);

  if (feverIdx >= 0 || (matched.length === 0 && feverInText)) {
    const feverKey = hasChildCue(lower) ? "FEVER_CHILD" : "FEVER_ADULT";
    if (feverIdx >= 0) {
      matched[feverIdx] = feverKey;
    } else {
      matched.push(feverKey);
    }
  }

  // Prefer CHILD_ILLNESS alongside paediatric fever when child cues + unwell wording
  if (
    hasChildCue(lower) &&
    /\b(unwell|poor\s+feeding|not\s+feeding|irritable|grumpy)\b/.test(lower) &&
    !matched.includes("CHILD_ILLNESS") &&
    matched.length < MAX_PRESENTATIONS
  ) {
    matched.push("CHILD_ILLNESS");
  }

  // Dedupe after fever rewrite
  const unique = [...new Set(matched)].slice(0, MAX_PRESENTATIONS);
  return unique.length > 0 ? unique : ["GENERIC"];
}

export function detectHighRiskPhrases(input: string): HighRiskFlag[] {
  const flags: HighRiskFlag[] = [];
  for (const rule of HIGH_RISK_PHRASES) {
    if (rule.pattern.test(input)) {
      flags.push({ id: rule.id, label: rule.label });
    }
  }
  return flags;
}

export function detectContextTags(input: string, presentationKeys: string[]): string[] {
  const tags: string[] = [];

  for (const key of presentationKeys) {
    if (key === "GENERIC") continue;
    const scaffold = DIGITAL_TRIAGE_TEMPLATES[key];
    if (scaffold?.label) tags.push(scaffold.label);
  }

  for (const rule of CONTEXT_TAG_RULES) {
    if (rule.pattern.test(input)) tags.push(rule.label);
  }

  return dedupeStrings(tags);
}

/** Deterministic analysis for the clinician-facing "Umbil detected" summary. */
export function analyzeTriageInput(input: string): TriageAnalysis {
  const presentationKeys = matchTriagePresentations(input);
  const isGeneric = presentationKeys.length === 1 && presentationKeys[0] === "GENERIC";
  const templateLabels = isGeneric
    ? ["Generic — review carefully"]
    : presentationKeys.map((k) => DIGITAL_TRIAGE_TEMPLATES[k]?.label || k);
  const highRiskFlags = detectHighRiskPhrases(input);
  const detectedTags = detectContextTags(input, presentationKeys);

  return {
    presentationKeys,
    templateLabels,
    isGeneric,
    detectedTags,
    highRiskFlags,
  };
}
