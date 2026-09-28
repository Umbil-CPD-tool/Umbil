/** Learning streaks: one CPD log in a Monday–Sunday local week keeps the fire. */

export const LEARNING_MILESTONES = [5, 10, 25, 50, 100] as const;

export type LearningMilestone = (typeof LEARNING_MILESTONES)[number];

export type LearningStreaks = {
  /** Local YYYY-MM-DD → log count. Heatmap only; streak math is weekly. */
  dates: Map<string, number>;
  /** Consecutive weeks with at least one learning log. */
  currentStreak: number;
  longestStreak: number;
  /** True once this Monday–Sunday week already has a log. */
  hasLoggedThisWeek: boolean;
  logsThisWeek: number;
  totalLogs: number;
  unlockedMilestones: LearningMilestone[];
  nextMilestone: LearningMilestone | null;
};

export type StreakCelebration = {
  show: boolean;
  streakCount: number;
  milestone: LearningMilestone | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const toLocalDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/** Monday 00:00 local for the week that contains `date`. */
export const mondayOfLocal = (date: Date): Date => {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = local.getDay();
  const delta = day === 0 ? 6 : day - 1;
  local.setDate(local.getDate() - delta);
  return local;
};

/**
 * ISO-8601 week key in the local timezone, Monday start. Example: "2026-W40".
 * The year is the ISO week-year (the year of that week's Thursday).
 */
export const toWeekKey = (date: Date): string => {
  const monday = mondayOfLocal(date);
  const thursday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3);
  const isoYear = thursday.getFullYear();
  const week1Monday = mondayOfLocal(new Date(isoYear, 0, 4));
  const diffDays = Math.round((monday.getTime() - week1Monday.getTime()) / MS_PER_DAY);
  const week = Math.floor(diffDays / 7) + 1;
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
};

export const weekLabel = (count: number): string => (count === 1 ? "week" : "weeks");

export const formatWeekStreak = (count: number): string => `${count} ${weekLabel(count)}`;

const parseTimestamp = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  return next;
};

const isMilestone = (value: number): value is LearningMilestone =>
  (LEARNING_MILESTONES as readonly number[]).includes(value);

export const getNewlyUnlockedMilestone = (
  prevTotal: number,
  nextTotal: number
): LearningMilestone | null => {
  let unlocked: LearningMilestone | null = null;
  for (const milestone of LEARNING_MILESTONES) {
    if (prevTotal < milestone && nextTotal >= milestone) unlocked = milestone;
  }
  return unlocked;
};

/**
 * What to show after one successful learning-log save.
 * Pass streak state from *before* the save.
 */
export const getStreakCelebration = (input: {
  hasLoggedThisWeek: boolean;
  currentStreak: number;
  totalLogs: number;
}): StreakCelebration => {
  const milestone = getNewlyUnlockedMilestone(input.totalLogs, input.totalLogs + 1);
  const firstLogThisWeek = !input.hasLoggedThisWeek;
  return {
    show: firstLogThisWeek || milestone !== null,
    streakCount: firstLogThisWeek ? input.currentStreak + 1 : input.currentStreak,
    milestone,
  };
};

/** Mon–Sun flags for the local week containing `now`. */
export const activeDaysThisWeek = (
  loggedDateKeys: Iterable<string>,
  now: Date = new Date(),
  alsoInclude?: Date
): boolean[] => {
  const logged = new Set(loggedDateKeys);
  if (alsoInclude) logged.add(toLocalDateKey(alsoInclude));
  const monday = mondayOfLocal(now);
  return Array.from({ length: 7 }, (_, index) =>
    logged.has(toLocalDateKey(addDays(monday, index)))
  );
};

export const computeLearningStreaks = (
  timestamps: Array<string | null | undefined>,
  now: Date = new Date()
): LearningStreaks => {
  const dates = new Map<string, number>();
  const weekMondays = new Map<string, Date>();
  let totalLogs = 0;

  for (const raw of timestamps) {
    const date = parseTimestamp(raw);
    if (!date) continue;
    totalLogs += 1;
    const dateKey = toLocalDateKey(date);
    dates.set(dateKey, (dates.get(dateKey) ?? 0) + 1);
    const weekKey = toWeekKey(date);
    if (!weekMondays.has(weekKey)) weekMondays.set(weekKey, mondayOfLocal(date));
  }

  const currentWeekKey = toWeekKey(now);
  const hasLoggedThisWeek = weekMondays.has(currentWeekKey);
  let logsThisWeek = 0;
  if (hasLoggedThisWeek) {
    for (const raw of timestamps) {
      const date = parseTimestamp(raw);
      if (date && toWeekKey(date) === currentWeekKey) logsThisWeek += 1;
    }
  }

  const sortedMondays = [...weekMondays.values()].sort((a, b) => a.getTime() - b.getTime());
  let longestStreak = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const monday of sortedMondays) {
    if (previous && toLocalDateKey(addDays(previous, 7)) === toLocalDateKey(monday)) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    previous = monday;
  }

  let cursor = mondayOfLocal(now);
  if (!hasLoggedThisWeek) cursor = addDays(cursor, -7);
  let currentStreak = 0;
  for (let i = 0; i < 520; i++) {
    if (!weekMondays.has(toWeekKey(cursor))) break;
    currentStreak += 1;
    cursor = addDays(cursor, -7);
  }

  const unlockedMilestones = LEARNING_MILESTONES.filter((milestone) => totalLogs >= milestone);
  const nextMilestone = LEARNING_MILESTONES.find((milestone) => totalLogs < milestone) ?? null;

  return {
    dates,
    currentStreak,
    longestStreak,
    hasLoggedThisWeek,
    logsThisWeek,
    totalLogs,
    unlockedMilestones,
    nextMilestone,
  };
};

export const parseTrophyParam = (value: string | null | undefined): LearningMilestone | null => {
  if (!value) return null;
  const n = Number(value);
  return isMilestone(n) ? n : null;
};
