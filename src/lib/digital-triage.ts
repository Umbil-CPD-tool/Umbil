// src/lib/digital-triage.ts
import {
  DIGITAL_TRIAGE_TEMPLATES,
  type TriageScaffold,
} from "@/lib/digital-triage-templates";

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
  merged: {
    assessmentQuestions: string[];
    redFlagQuestions: string[];
    safetyTriggers: string[];
    guidanceRefs: string[];
  };
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

export function mergeTriageScaffolds(keys: string[]): TriageAnalysis["merged"] {
  const assessmentQuestions: string[] = [];
  const redFlagQuestions: string[] = [];
  const safetyTriggers: string[] = [];
  const guidanceRefs: string[] = [];

  const resolvedKeys = keys.length > 0 ? keys : ["GENERIC"];

  for (const key of resolvedKeys) {
    const scaffold: TriageScaffold =
      DIGITAL_TRIAGE_TEMPLATES[key] || DIGITAL_TRIAGE_TEMPLATES.GENERIC;
    assessmentQuestions.push(...scaffold.assessmentQuestions);
    redFlagQuestions.push(...scaffold.redFlagQuestions);
    safetyTriggers.push(...scaffold.safetyTriggers);
    if (scaffold.guidanceRef) guidanceRefs.push(scaffold.guidanceRef);
  }

  return {
    assessmentQuestions: dedupeStrings(assessmentQuestions),
    redFlagQuestions: dedupeStrings(redFlagQuestions),
    safetyTriggers: dedupeStrings(safetyTriggers).slice(0, 6),
    guidanceRefs: dedupeStrings(guidanceRefs),
  };
}

/** Drop questions the patient message already answers (e.g. onset already stated). */
export function isQuestionAlreadyAnswered(question: string, input: string): boolean {
  const q = question.toLowerCase();
  const lower = input.toLowerCase();

  const hasOnset =
    /\b(\d+\s*(day|days|week|weeks|hour|hours|month|months)|yesterday|today|this\s+morning|last\s+night|few\s+days|couple\s+of\s+days|since\s+\w+|for\s+a\s+few|for\s+\d+)\b/.test(
      lower
    );
  if (
    hasOnset &&
    /\b(when did|how long|how many days|started|start)\b/.test(q)
  ) {
    return true;
  }

  if (/\b(getting worse|worsening|not going away|getting better|improving)\b/.test(lower)) {
    if (/\b(getting worse|is it getting|worsening)\b/.test(q)) return true;
  }

  if (/\b(left|right|one side|forehead|temple|behind (my |the )?eyes?|all over)\b/.test(lower)) {
    if (/\bwhere (is|exactly)|location\b/.test(q)) return true;
  }

  if (/\b(migraine|similar before|had this before|usually get)\b/.test(lower)) {
    if (/\bsimilar .+ before|had .+ before\b/.test(q)) return true;
  }

  if (/\b(pregnant|pregnancy|\d+\s*weeks?\s*(pregnant|gestation))\b/.test(lower)) {
    if (/\bhow many weeks pregnant|are you pregnant\b/.test(q)) return true;
  }

  if (/\b(diabet(es|ic)|asthma|copd|on warfarin|apixaban)\b/.test(lower)) {
    if (/\bdo you have asthma|heart problems|long-term conditions|are you on blood thinners\b/.test(q)) {
      return true;
    }
  }

  return false;
}

/** Prefer red flags, then assessment; max 5; skip already-answered. */
export function selectPriorityQuestions(
  assessmentQuestions: string[],
  redFlagQuestions: string[],
  input: string,
  maxTotal = 5
): string[] {
  const red = redFlagQuestions.filter((q) => !isQuestionAlreadyAnswered(q, input));
  const assess = assessmentQuestions.filter((q) => !isQuestionAlreadyAnswered(q, input));

  // Aim for ~2–3 red flags and fill with assessment, total ≤ maxTotal
  const redTake = Math.min(red.length, Math.max(2, Math.ceil(maxTotal / 2)));
  const selected = [...red.slice(0, redTake)];
  for (const q of assess) {
    if (selected.length >= maxTotal) break;
    if (!selected.some((s) => s.toLowerCase() === q.toLowerCase())) {
      selected.push(q);
    }
  }
  // If still short, add remaining red flags
  for (const q of red.slice(redTake)) {
    if (selected.length >= maxTotal) break;
    if (!selected.some((s) => s.toLowerCase() === q.toLowerCase())) {
      selected.push(q);
    }
  }
  return selected.slice(0, maxTotal);
}

/** Full deterministic analysis for API injection and clinician UI. */
export function analyzeTriageInput(input: string): TriageAnalysis {
  const presentationKeys = matchTriagePresentations(input);
  const isGeneric = presentationKeys.length === 1 && presentationKeys[0] === "GENERIC";
  const templateLabels = isGeneric
    ? ["Generic — review carefully"]
    : presentationKeys.map(
        (k) => DIGITAL_TRIAGE_TEMPLATES[k]?.label || k
      );
  const highRiskFlags = detectHighRiskPhrases(input);
  const detectedTags = detectContextTags(input, presentationKeys);
  const merged = mergeTriageScaffolds(presentationKeys);

  return {
    presentationKeys,
    templateLabels,
    isGeneric,
    detectedTags,
    highRiskFlags,
    merged,
  };
}

/** Build the mandatory scaffold injection block for tools/ask prompts. */
export function buildTriageTemplateInjection(input: string): string {
  const analysis = analyzeTriageInput(input);
  const { merged, templateLabels, presentationKeys, highRiskFlags } = analysis;

  const priorityQuestions = selectPriorityQuestions(
    merged.assessmentQuestions,
    merged.redFlagQuestions,
    input,
    5
  );

  const questionsBlock = priorityQuestions.map((q) => `- ${q}`).join("\n");
  const triggersList = merged.safetyTriggers.slice(0, 5).join("; ");
  const highRiskBlock =
    highRiskFlags.length > 0
      ? highRiskFlags.map((f) => `- ${f.label}`).join("\n")
      : "- None detected in the patient message";

  return `
!!! MANDATORY TRIAGE SCAFFOLD !!!
Templates loaded: ${templateLabels.join(" · ")} (${presentationKeys.join(", ")})
This is a screening reply only. Do NOT diagnose. Do NOT decide urgency or disposition.
The clinician decides next steps.

HIGH-RISK PHRASES IN INPUT (clinician awareness only):
${highRiskBlock}

STRICT LENGTH RULES:
- Maximum 5 bullet questions in total. Prefer these priority questions (already in plain English — keep them easy to understand):
${questionsBlock}
- Do NOT ask anything the patient already stated (e.g. if they said "a few days", do not ask when it started).
- Do NOT invent extra questions beyond the list above.
- Do NOT introduce clinical jargon. Everyday UK English only.
- Keep the whole reply short enough to paste into a patient message.

WARNING SYMPTOMS TO INCLUDE IN THE FINAL PARAGRAPH (pick the most relevant, weave into one sentence):
${triggersList}

OUTPUT SHAPE (plain text — follow exactly, preserve blank lines):
Thanks for your message.

To help us assess this, could you let us know:

* [question 1]
* [question 2]
* [question 3]
* [up to 5 total]

If you develop [relevant warning symptoms from the list], or your symptoms become significantly worse, please seek urgent medical attention or contact NHS 111/999 while awaiting our reply.

Once you reply, we can advise on next steps.

CRITICAL:
- Do NOT use headings like "About your symptoms", "Red flag symptoms", or "Safety net".
- Do NOT write the words "safety net", "safety netting", or "red flags" in the patient-facing reply.
- No empathy filler. No diagnosis. No appointment type.
Guidance refs (do not cite to patient): ${merged.guidanceRefs.join("; ") || "NHS / NICE CKS"}
!!! END TRIAGE SCAFFOLD !!!
`.trim();
}
