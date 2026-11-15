/** Older labels for the same tool. Translation stays separate: it is a follow-on action, not the handout itself. */
const TOOL_ALIASES: Record<string, string> = {
  "discharge condenser": "Discharge Letter",
  "discharge summary": "Discharge Letter",
  "discharge letter": "Discharge Letter",
};

export const canonicalToolName = (name: string): string => {
  const trimmed = name.trim();
  return TOOL_ALIASES[trimmed.toLowerCase()] ?? trimmed;
};

export const mergeToolRows = <T extends { tool_name: string }>(rows: readonly T[]): T[] => {
  const merged = new Map<string, T>();
  for (const row of rows) {
    const tool_name = canonicalToolName(row.tool_name);
    const existing = merged.get(tool_name);
    if (!existing) {
      merged.set(tool_name, { ...row, tool_name });
      continue;
    }
    const next = { ...existing };
    for (const key of Object.keys(row) as (keyof T)[]) {
      const value = row[key];
      const previous = existing[key];
      if (key === "tool_name") continue;
      if (typeof value === "number" && typeof previous === "number") {
        next[key] = (previous + value) as T[keyof T];
      }
    }
    merged.set(tool_name, next);
  }
  return [...merged.values()].sort((a, b) => {
    const uses = (row: T) => {
      const record = row as Record<string, unknown>;
      const count = record.uses ?? record.uses_7d ?? record.uses_30d;
      return typeof count === "number" ? count : 0;
    };
    return uses(b) - uses(a);
  });
};
