import { analyzeTriageInput } from "@umbil/shared";

export {
  analyzeTriageInput,
  detectContextTags,
  detectHighRiskPhrases,
  DIGITAL_TRIAGE_TEMPLATES,
  matchTriagePresentations,
  mergeTriageScaffolds,
  STANDARD_SAFETY_CLOSER,
} from "@umbil/shared";
export type { HighRiskFlag, TriageAnalysis, TriageScaffold } from "@umbil/shared";

/** Drop questions the patient message already answers (e.g. onset already stated). */
export const isQuestionAlreadyAnswered = (question: string, input: string): boolean => {
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
};

/** Prefer red flags, then assessment; max 5; skip already-answered. */
export const selectPriorityQuestions = (
  assessmentQuestions: string[],
  redFlagQuestions: string[],
  input: string,
  maxTotal = 5
): string[] => {
  const red = redFlagQuestions.filter((q) => !isQuestionAlreadyAnswered(q, input));
  const assess = assessmentQuestions.filter((q) => !isQuestionAlreadyAnswered(q, input));

  const redTake = Math.min(red.length, Math.max(2, Math.ceil(maxTotal / 2)));
  const selected = [...red.slice(0, redTake)];
  for (const q of assess) {
    if (selected.length >= maxTotal) break;
    if (!selected.some((s) => s.toLowerCase() === q.toLowerCase())) {
      selected.push(q);
    }
  }
  for (const q of red.slice(redTake)) {
    if (selected.length >= maxTotal) break;
    if (!selected.some((s) => s.toLowerCase() === q.toLowerCase())) {
      selected.push(q);
    }
  }
  return selected.slice(0, maxTotal);
};

/** Web-only prompt block. Mobile shows the clinician summary and does not inject this. */
export const buildTriageTemplateInjection = (input: string): string => {
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
  const aboutChild =
    analysis.detectedTags.includes("Child") ||
    presentationKeys.some((key) => key.includes("CHILD"));
  const warningShape = aboutChild
    ? "If they become [short warning symptoms], or you are worried they are seriously unwell, please seek urgent medical attention or contact NHS 111/999 while awaiting our reply."
    : "If you develop [short warning symptoms], or your symptoms become significantly worse, please seek urgent medical attention or contact NHS 111/999 while awaiting our reply.";
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

WARNING SYMPTOMS for one grammatical sentence (do not paste the questions; rewrite these as symptoms):
${triggersList}
${aboutChild ? "This is about a child. In the warning sentence say \"they\", not \"you develop\"." : "This is about the person messaging. Say \"you\"."}

OUTPUT SHAPE (plain text — follow exactly, preserve blank lines, add nothing else):
Thanks for your message.

To help us assess this, could you let us know:

* [question 1]
* [question 2]
* [question 3]
* [up to 5 total]

${warningShape}

Once you reply, we can advise on next steps.

CRITICAL:
- Do NOT use headings like "About your symptoms", "Red flag symptoms", or "Safety net".
- Do NOT write the words "safety net", "safety netting", or "red flags" in the patient-facing reply.
- Do NOT add thanks, sign-offs, or any sentence that is not in the shape above.
- No empathy filler. No diagnosis. No appointment type.
Guidance refs (do not cite to patient): ${merged.guidanceRefs.join("; ") || "NHS / NICE CKS"}
!!! END TRIAGE SCAFFOLD !!!
`.trim();
};
