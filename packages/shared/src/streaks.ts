/** Learning streaks: one CPD log in a Monday–Sunday local week keeps the fire. */

export const LEARNING_MILESTONES = [10, 25, 50, 100, 200, 500, 1000] as const;

export type LearningMilestone = (typeof LEARNING_MILESTONES)[number];

/**
 * Freezes granted by each trophy.
 * One freeze covers one missed week, so the early trophies grant 1.
 * The gaps get much longer after 100 logs, so those trophies grant more.
 * Every freeze stays ready until the learner chooses to spend it.
 */
export const MILESTONE_FREEZES: Record<LearningMilestone, number> = {
  10: 1,
  25: 1,
  50: 2,
  100: 2,
  200: 3,
  500: 4,
  1000: 5,
};

export type FreezeOffer = {
  weekKey: string;
  /** This Monday–Sunday is still open. Log, or spend a freeze so the week counts. */
  reason: "open-week" | "missed-week";
};

export type LearningStreaks = {
  /** Local YYYY-MM-DD → log count. Heatmap only; streak math is weekly. */
  dates: Map<string, number>;
  /** Consecutive weeks with a learning log or a freeze the user chose to spend. */
  currentStreak: number;
  longestStreak: number;
  /** True once this Monday–Sunday week already has a log. */
  hasLoggedThisWeek: boolean;
  logsThisWeek: number;
  totalLogs: number;
  unlockedMilestones: LearningMilestone[];
  nextMilestone: LearningMilestone | null;
  /** ISO week keys that contain at least one learning log. */
  loggedWeekKeys: string[];
  /** Weeks the user chose to protect. Never filled in automatically. */
  freezeWeekKeys: string[];
  /** Total freezes granted by unlocked trophies, including ones already spent. */
  streakFreezesEarned: number;
  /** Freezes still ready to spend. There is no hold limit. */
  streakFreezesAvailable: number;
  /** The one week a ready freeze can protect, if spending it would keep a real streak. */
  freezeOffer: FreezeOffer | null;
};

export type StreakCelebration = {
  show: boolean;
  streakCount: number;
  milestone: LearningMilestone | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEEK_KEY = /^(\d{4})-W(\d{2})$/;

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

/** Monday of an ISO week key, or null when the key is not a real week. */
export const mondayFromWeekKey = (weekKey: string): Date | null => {
  const match = WEEK_KEY.exec(weekKey);
  if (!match) return null;
  const isoYear = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;
  const week1Monday = mondayOfLocal(new Date(isoYear, 0, 4));
  const monday = addDays(week1Monday, (week - 1) * 7);
  if (toWeekKey(monday) !== weekKey) return null;
  return monday;
};

export const formatWeekOf = (weekKey: string): string => {
  const monday = mondayFromWeekKey(weekKey);
  if (!monday) return "That week";
  return monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export const weekLabel = (count: number): string => (count === 1 ? "week" : "weeks");

export const formatWeekStreak = (count: number): string => `${count} ${weekLabel(count)}`;

const parseTimestamp = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const isMilestone = (value: number): value is LearningMilestone =>
  (LEARNING_MILESTONES as readonly number[]).includes(value);

export const freezesFromMilestones = (milestones: readonly LearningMilestone[]): number =>
  milestones.reduce((sum, milestone) => sum + MILESTONE_FREEZES[milestone], 0);

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

const runLength = (
  start: Date,
  counts: (weekKey: string) => boolean
): number => {
  let length = 0;
  let cursor = start;
  for (let i = 0; i < 520; i++) {
    if (!counts(toWeekKey(cursor))) break;
    length += 1;
    cursor = addDays(cursor, -7);
  }
  return length;
};

/**
 * Weekly streak from CPD timestamps.
 * `appliedFreezeWeekKeys` are weeks the user chose to protect. Empty weeks are never frozen on their own.
 */
export const computeLearningStreaks = (
  timestamps: Array<string | null | undefined>,
  now: Date = new Date(),
  appliedFreezeWeekKeys: readonly string[] = []
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

  const currentMonday = mondayOfLocal(now);
  const currentWeekKey = toWeekKey(now);
  const hasLoggedThisWeek = weekMondays.has(currentWeekKey);
  let logsThisWeek = 0;
  if (hasLoggedThisWeek) {
    for (const raw of timestamps) {
      const date = parseTimestamp(raw);
      if (date && toWeekKey(date) === currentWeekKey) logsThisWeek += 1;
    }
  }

  const unlockedMilestones = LEARNING_MILESTONES.filter((milestone) => totalLogs >= milestone);
  const nextMilestone = LEARNING_MILESTONES.find((milestone) => totalLogs < milestone) ?? null;
  const streakFreezesEarned = freezesFromMilestones(unlockedMilestones);

  const freezeWeekKeys: string[] = [];
  for (const key of appliedFreezeWeekKeys) {
    if (freezeWeekKeys.length >= streakFreezesEarned) break;
    if (freezeWeekKeys.includes(key)) continue;
    if (weekMondays.has(key)) continue;
    const monday = mondayFromWeekKey(key);
    if (!monday || monday.getTime() > currentMonday.getTime()) continue;
    freezeWeekKeys.push(key);
  }

  const frozen = new Set(freezeWeekKeys);
  const weekCounts = (key: string, extra?: string) =>
    weekMondays.has(key) || frozen.has(key) || key === extra;

  const openCounts = hasLoggedThisWeek || frozen.has(currentWeekKey);
  const front = openCounts ? currentMonday : addDays(currentMonday, -7);
  const currentStreak = runLength(front, (key) => weekCounts(key));

  const countingMondays = [...weekMondays.values()];
  for (const key of freezeWeekKeys) {
    const monday = mondayFromWeekKey(key);
    if (monday) countingMondays.push(monday);
  }
  countingMondays.sort((a, b) => a.getTime() - b.getTime());
  let longestFromHistory = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const monday of countingMondays) {
    if (previous && toLocalDateKey(addDays(previous, 7)) === toLocalDateKey(monday)) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longestFromHistory) longestFromHistory = run;
    previous = monday;
  }

  const spent = freezeWeekKeys.length;
  const streakFreezesAvailable = Math.max(0, streakFreezesEarned - spent);

  let freezeOffer: FreezeOffer | null = null;
  if (streakFreezesAvailable > 0) {
    if (!hasLoggedThisWeek && !frozen.has(currentWeekKey) && currentStreak > 0) {
      freezeOffer = { weekKey: currentWeekKey, reason: "open-week" };
    } else {
      const candidateMonday = addDays(front, -7 * currentStreak);
      if (candidateMonday.getTime() <= currentMonday.getTime()) {
        const candidateKey = toWeekKey(candidateMonday);
        let empties = 0;
        let cursor = candidateMonday;
        let reachesLoggedWeek = false;
        for (let step = 0; step < streakFreezesAvailable; step++) {
          const key = toWeekKey(cursor);
          if (weekMondays.has(key) || frozen.has(key)) {
            reachesLoggedWeek = true;
            break;
          }
          empties += 1;
          cursor = addDays(cursor, -7);
          const behind = toWeekKey(cursor);
          if (weekMondays.has(behind) || frozen.has(behind)) {
            reachesLoggedWeek = true;
            break;
          }
        }
        if (reachesLoggedWeek && empties > 0 && empties <= streakFreezesAvailable) {
          freezeOffer = { weekKey: candidateKey, reason: "missed-week" };
        }
      }
    }
  }

  return {
    dates,
    currentStreak,
    longestStreak: Math.max(longestFromHistory, currentStreak),
    hasLoggedThisWeek,
    logsThisWeek,
    totalLogs,
    unlockedMilestones,
    nextMilestone,
    loggedWeekKeys: [...weekMondays.keys()],
    freezeWeekKeys,
    streakFreezesEarned,
    streakFreezesAvailable,
    freezeOffer,
  };
};

export const parseTrophyParam = (value: string | null | undefined): LearningMilestone | null => {
  if (!value) return null;
  const n = Number(value);
  return isMilestone(n) ? n : null;
};
