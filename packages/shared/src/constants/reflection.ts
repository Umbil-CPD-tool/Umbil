export type GuidedReflectionField = "learned" | "differently" | "learningNeeds";

export type GuidedReflectionAnswers = Record<GuidedReflectionField, string>;

export type GuidedReflectionPrompt = {
  id: GuidedReflectionField;
  title: string;
  hint: string;
};

/** Rolfe What / So What / Now What — the structure appraisers already recognise. */
export const GUIDED_REFLECTION_PROMPTS: readonly GuidedReflectionPrompt[] = [
  {
    id: "learned",
    title: "What did you learn?",
    hint: "The key fact, guideline, distinction, or decision you want to remember.",
  },
  {
    id: "differently",
    title: "What might you do differently next time?",
    hint: "How this could change your assessment, treatment, safety-netting, or what you say to the patient or team.",
  },
  {
    id: "learningNeeds",
    title: "What do you still need to learn more about?",
    hint: "A gap, uncertainty, or PDP item this has flagged — even a single topic is enough.",
  },
];

export const emptyGuidedReflectionAnswers = (): GuidedReflectionAnswers => ({
  learned: "",
  differently: "",
  learningNeeds: "",
});

export const hasGuidedReflectionAnswer = (answers: GuidedReflectionAnswers): boolean =>
  GUIDED_REFLECTION_PROMPTS.some((prompt) => answers[prompt.id].trim().length > 0);

export const isStructuredReflection = (text: string): boolean => {
  const upper = text.toUpperCase();
  return (
    /\bLEARNING\b/.test(upper) &&
    (/\bAPPLICATION\b/.test(upper) || /\bNEXT STEPS\b/.test(upper))
  );
};

/** Prefill only short free notes — never a finished LEARNING / APPLICATION block. */
export const seedLearnedFromNotes = (notes: string): string => {
  const trimmed = notes.trim();
  if (!trimmed || isStructuredReflection(trimmed) || trimmed.length > 400) return "";
  return trimmed;
};
