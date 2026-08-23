export const ANSWER_STYLES = [
  { id: "clinic", label: "Clinic" },
  { id: "standard", label: "Standard" },
  { id: "deepDive", label: "Deep Dive" },
] as const;

export type AnswerStyle = (typeof ANSWER_STYLES)[number]["id"];
