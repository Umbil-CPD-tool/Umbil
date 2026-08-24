/** Clinical workflow tools — IDs must match web `TOOLS_CONFIG` / `/api/tools`. */
export const WORKFLOW_TOOLS = [
  {
    id: "referral",
    label: "Referral Writer",
    description: "Drafts a professional GP referral letter from shorthand notes.",
    placeholder:
      "e.g., 54F. 3 weeks hoarse voice. Smoker. Exam: Neck normal. Request ENT 2WW.",
  },
  {
    id: "digital_triage",
    label: "Digital Triage",
    description:
      "Drafts a calm triage reply with red-flag questions and safety-netting — screening only.",
    placeholder:
      'Paste the patient\'s AccuRx / online message, e.g. "I\'ve had a headache for a few days"',
  },
  {
    id: "safety_netting",
    label: "Safety Netting",
    description: "Generates medico-legal advice and specific red flags for the patient.",
    placeholder: "e.g., 3yo child, fever 38.5, drinking ok, no rash. Viral URTI.",
  },
  {
    id: "patient_friendly",
    label: "Patient Handout",
    description: "Generates a printable, NHS-style patient guide with actionable advice.",
    placeholder: "Try typing: 'Insomnia', 'Back Pain', 'Menopause', 'Anxiety' or paste notes...",
  },
  {
    id: "sbar",
    label: "SBAR Handover",
    description:
      "Structured situation-background-assessment-recommendation for urgent calls.",
    placeholder: "e.g., 78M, NEWS 4. BP 80/50, Sats 88%. Peri-arrest. Need Reg review.",
  },
  {
    id: "discharge_summary",
    label: "Discharge Letter",
    description:
      "Drafts a formal, PRSB-aligned discharge letter from ward notes for the GP.",
    placeholder: "Paste the admission reason, hospital course, and medication changes here...",
  },
] as const;

export type WorkflowToolId = (typeof WORKFLOW_TOOLS)[number]["id"];

export const TOOL_TAG_REGEX =
  /\[\[TOOL:(referral|safety_netting|digital_triage|discharge_summary|sbar|patient_friendly)\]\]/;
