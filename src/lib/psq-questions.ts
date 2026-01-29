export type PSQQuestion = {
  id: string;
  text: string;
  domain: string; // GMC Domain mapping
  type: 'likert' | 'text' | 'option';
  options?: string[]; // For context questions like appointment type
  isOptional?: boolean; // For clinician-added questions
};

export const PSQ_INTRO = {
  title: "Help us improve your care.",
  body: "Your feedback is anonymous and takes around 2 minutes. It will be used to improve our service and support professional revalidation. Please do not include names or personal details."
};

// GMC Standard Scale (Fixed)
export const PSQ_SCALE = [
  { value: 5, label: "Strongly agree" },
  { value: 4, label: "Agree" },
  { value: 3, label: "Neither agree nor disagree" },
  { value: 2, label: "Disagree" },
  { value: 1, label: "Strongly disagree" },
  { value: 0, label: "Not applicable" },
];

export const PSQ_FOOTER_TEXT = "This anonymised patient feedback was collected using a structured questionnaire aligned with GMC revalidation requirements and supports reflection across GMC domains 1–4.";

export const PSQ_QUESTIONS: PSQQuestion[] = [
  // --- LIKERT QUESTIONS (Scored) ---
  {
    id: "1",
    text: "The clinician listened carefully to me",
    domain: "Domain 3: Communication, Partnership & Teamwork",
    type: "likert",
  },
  {
    id: "2",
    text: "The clinician gave me enough time",
    domain: "Domain 3: Communication, Partnership & Teamwork",
    type: "likert",
  },
  {
    id: "3",
    text: "The clinician explained things clearly",
    domain: "Domain 3: Communication, Partnership & Teamwork",
    type: "likert",
  },
  {
    id: "4",
    text: "I was treated with respect and dignity",
    domain: "Domain 4: Maintaining Trust",
    type: "likert",
  },
  {
    id: "5",
    text: "I felt comfortable talking openly",
    domain: "Domain 3: Communication, Partnership & Teamwork",
    type: "likert",
  },
  {
    id: "6",
    text: "I was involved in decisions as much as I wanted",
    domain: "Domain 3: Communication, Partnership & Teamwork",
    type: "likert",
  },
  {
    id: "7",
    text: "I understood what the plan was after the consultation",
    domain: "Domain 1: Knowledge, Skills & Performance",
    type: "likert",
  },
  {
    id: "8",
    text: "I had confidence in the clinician’s knowledge and skills",
    domain: "Domain 1: Knowledge, Skills & Performance",
    type: "likert",
  },
  {
    id: "9",
    text: "I trusted the clinician’s judgement",
    domain: "Domain 4: Maintaining Trust",
    type: "likert",
  },
  {
    id: "10",
    text: "Overall, I was satisfied with the care I received",
    domain: "Domain 4: Maintaining Trust",
    type: "likert",
  },

  // --- FREE TEXT (Domain 2 / Quality) ---
  {
    id: "11",
    text: "What was good about your care today?",
    domain: "Domain 2: Safety & Quality",
    type: "text",
  },
  {
    id: "12",
    text: "What could we improve?",
    domain: "Domain 2: Safety & Quality",
    type: "text",
  },

  // --- CONTEXT (Non-Scored) ---
  {
    id: "13",
    text: "Appointment type",
    domain: "Context",
    type: "option",
    options: ["Face-to-face", "Phone", "Video", "Other"]
  },
];