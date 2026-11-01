/** Join dictated text the same way the website does: keep what was already typed, then append new speech. */
export const composeDictationText = (base: string, spoken: string): string => {
  const start = base.replace(/\s+/g, " ").trim();
  const next = spoken.replace(/\s+/g, " ").trim();
  if (!next) return start;
  if (!start) return next;
  if (next.startsWith(start)) return next;
  return `${start} ${next}`;
};
