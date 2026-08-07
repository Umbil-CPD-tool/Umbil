import type { ChatToolId } from "./types";

export type ToolConfig = {
  id: ChatToolId;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  desc: string;
};

const Icons = {
  Referral: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  Shield: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Triage: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 10h.01" />
      <path d="M12 10h.01" />
      <path d="M16 10h.01" />
    </svg>
  ),
  Sbar: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  ),
  Discharge: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M10 13h4" />
      <path d="M12 11v4" />
    </svg>
  ),
  Patient: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
};

export const TOOLS_CONFIG: ToolConfig[] = [
  {
    id: "referral",
    label: "Referral Writer",
    icon: Icons.Referral,
    placeholder: "e.g., 54F. 3 weeks hoarse voice. Smoker. Exam: Neck normal. Request ENT 2WW.",
    desc: "Drafts a professional GP referral letter from shorthand notes.",
  },
  {
    id: "digital_triage",
    label: "Digital Triage",
    icon: Icons.Triage,
    placeholder:
      'Paste the patient\'s AccuRx / online message, e.g. "I\'ve had a headache for a few days and it\'s not going away"',
    desc: "Drafts a calm triage reply with red-flag questions and safety-netting — screening only.",
  },
  {
    id: "safety_netting",
    label: "Safety Netting",
    icon: Icons.Shield,
    placeholder: "e.g., 3yo child, fever 38.5, drinking ok, no rash. Viral URTI.",
    desc: "Generates medico-legal advice and specific red flags for the patient.",
  },
  {
    id: "patient_friendly",
    label: "Patient Handout",
    icon: Icons.Patient,
    placeholder: "Try typing: 'Insomnia', 'Back Pain', 'Menopause', 'Anxiety' or paste notes...",
    desc: "Generates a printable, NHS-style patient guide with actionable advice.",
  },
  {
    id: "sbar",
    label: "SBAR Handover",
    icon: Icons.Sbar,
    placeholder: "e.g., 78M, Bay 4. BP 80/50, Sats 88%. Peri-arrest. Need Reg review.",
    desc: "Structured situation-background-assessment-recommendation for urgent calls.",
  },
  {
    id: "discharge_summary",
    label: "Discharge Letter",
    icon: Icons.Discharge,
    placeholder: "Paste the admission reason, hospital course, and medication changes here...",
    desc: "Drafts a formal, PRSB-aligned discharge letter from ward notes for the GP.",
  },
];
