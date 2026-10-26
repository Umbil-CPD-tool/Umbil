export type LearningGoal = {
  title: string;
  timeline?: string | null;
};

export type LearningEntry = {
  question?: string | null;
  tags?: string[] | null;
  reflection?: string | null;
};

const clip = (value: string, max: number): string => {
  const clean = value.replace(/\s+/g, " ").replace(/<[^>]+>/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
};

export const isLearningTask = (message: string): boolean =>
  /\b(cpd|pdp|reflection|learning log|capture learning|what i learned|portfolio)\b/i.test(message);

export const formatLearningContext = (goals: LearningGoal[], entries: LearningEntry[]): string => {
  const goalLines = goals
    .filter((goal) => goal.title?.trim())
    .slice(0, 5)
    .map((goal) => `- ${clip(goal.title, 140)}${goal.timeline ? ` (${clip(goal.timeline, 40)})` : ""}`);

  const entryLines = entries.slice(0, 5).flatMap((entry) => {
    const topic = clip(entry.question ?? "", 120);
    const tags = (entry.tags ?? []).filter((tag) => tag.trim()).slice(0, 4).join(", ");
    const reflection = clip(entry.reflection ?? "", 140);
    if (!topic && !reflection) return [];
    const detail = [topic || "Untitled learning", tags ? `(${tags})` : "", reflection ? `Reflection: ${reflection}` : ""]
      .filter(Boolean)
      .join(" ");
    return [`- ${detail}`];
  });

  if (goalLines.length === 0 && entryLines.length === 0) return "";

  return [
    "LEARNING CONTEXT (this clinician's own CPD and PDP, not a guideline):",
    goalLines.length ? `PDP goals:\n${goalLines.join("\n")}` : "",
    entryLines.length ? `Recent learning:\n${entryLines.join("\n")}` : "",
    "Connect new learning to these when one clearly fits. Do not invent goals, and do not change clinical facts.",
  ]
    .filter(Boolean)
    .join("\n");
};
