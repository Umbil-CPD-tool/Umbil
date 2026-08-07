// UK clinical triage scaffold types and shared closer copy.
// Screening questions only — never diagnose or assign urgency/disposition.

export type TriageScaffold = {
  label: string;
  category: string;
  aliases: string[];
  assessmentQuestions: string[];
  redFlagQuestions: string[];
  safetyTriggers: string[];
  guidanceRef: string;
};

/** One patient-facing paragraph — do not label as "safety netting". Triggers are woven in by the model. */
export const STANDARD_SAFETY_CLOSER =
  "If you develop [key warning symptoms], or your symptoms become significantly worse, please seek urgent medical attention or contact NHS 111/999 while awaiting our reply.";
