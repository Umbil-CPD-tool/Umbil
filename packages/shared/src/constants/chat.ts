export const ANSWER_STYLES = [
  { id: "clinic", label: "Clinic", description: "Bullet points, rapid actions." },
  { id: "standard", label: "Standard", description: "Balanced, concise answer." },
  { id: "deepDive", label: "Deep Dive", description: "Detailed evidence review." },
] as const;

export type AnswerStyle = (typeof ANSWER_STYLES)[number]["id"];

/** Monthly free-tier caps per answer style. Pro accounts skip these via usage tracking. */
export const ASK_MODE_LIMITS: Record<AnswerStyle, number> = {
  clinic: 100,
  standard: 30,
  deepDive: 10,
};

export const ASK_MODE_FEATURE_KEYS: Record<AnswerStyle, string> = {
  clinic: "ask_clinic",
  standard: "ask_standard",
  deepDive: "ask_deepDive",
};

export const ASK_MODE_DISPLAY_NAMES: Record<AnswerStyle, string> = {
  clinic: "Clinic Mode",
  standard: "Standard Mode",
  deepDive: "Deep Dive Mode",
};

export const resolveAskAnswerStyle = (style?: string | null): AnswerStyle => {
  if (style === "clinic" || style === "deepDive") return style;
  return "standard";
};
