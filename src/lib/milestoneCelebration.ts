import { LEARNING_MILESTONES, type LearningMilestone } from "@umbil/shared";

const STORAGE_KEY = "umbil.celebratedMilestones";

const readStored = (): Set<number> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(
      raw
        .split(",")
        .map((part) => Number(part))
        .filter((value) => Number.isFinite(value))
    );
  } catch {
    return new Set();
  }
};

export const uncelebratedMilestones = (unlocked: LearningMilestone[]): LearningMilestone[] => {
  const seen = readStored();
  return unlocked.filter((milestone) => !seen.has(milestone));
};

export const markMilestonesCelebrated = (milestones: readonly number[]) => {
  if (typeof window === "undefined" || milestones.length === 0) return;
  const seen = readStored();
  for (const milestone of milestones) {
    if ((LEARNING_MILESTONES as readonly number[]).includes(milestone)) seen.add(milestone);
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, [...seen].join(","));
  } catch {
    // Private mode can block storage. The popup may show again next visit.
  }
};
