import type {
  EngagementAskModeWeekRow,
  EngagementMonthRow,
  EngagementWeekRow,
} from "./types";

export const TREND_RANGES = [
  { id: "1m", label: "Past month", months: 1 },
  { id: "6m", label: "Past 6 months", months: 6 },
  { id: "1y", label: "Past year", months: 12 },
  { id: "all", label: "All time", months: null },
] as const;

export type TrendRangeId = (typeof TREND_RANGES)[number]["id"];

/** Charts open here. Email and the downloaded briefing always use this window. */
export const DEFAULT_TREND_RANGE: TrendRangeId = "6m";

export const defaultTrendLabel = (): string =>
  TREND_RANGES.find((range) => range.id === DEFAULT_TREND_RANGE)?.label ?? "Past 6 months";

export const isTrendRangeId = (value: string): value is TrendRangeId =>
  TREND_RANGES.some((range) => range.id === value);

const londonDateKey = (now: Date): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

/** Monday of the London week, as YYYY-MM-DD. The week still in progress. */
export const openWeekKey = (now = new Date()): string => {
  const [year, month, day] = londonDateKey(now).split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay();
  const delta = weekday === 0 ? 6 : weekday - 1;
  utc.setUTCDate(utc.getUTCDate() - delta);
  return utc.toISOString().slice(0, 10);
};

/** YYYY-MM of the London month still in progress. */
export const openMonthKey = (now = new Date()): string => londonDateKey(now).slice(0, 7);

const shiftIsoDays = (isoDate: string, days: number): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
};

const subtractCalendarMonths = (isoDate: string, months: number): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  const anchor = new Date(Date.UTC(year, month - 1, 1));
  anchor.setUTCMonth(anchor.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0)).getUTCDate();
  const clamped = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), Math.min(day, lastDay)));
  return clamped.toISOString().slice(0, 10);
};

/** Inclusive calendar start of the window, or null for all time. */
export const trendRangeStart = (range: TrendRangeId, now = new Date()): string | null => {
  const months = TREND_RANGES.find((item) => item.id === range)?.months;
  if (months == null) return null;
  return subtractCalendarMonths(londonDateKey(now), months);
};

const isoDay = (value: string): string | null => {
  const key = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
};

const isoMonth = (value: string): string | null => {
  const key = value.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(key) ? key : null;
};

/**
 * A finished week is in range when it overlaps the window.
 * The Monday can fall up to 6 days before the cutoff.
 */
export const weekInTrendRange = (week: string, range: TrendRangeId, now = new Date()): boolean => {
  const key = isoDay(week);
  if (!key || key >= openWeekKey(now)) return false;
  const start = trendRangeStart(range, now);
  return start == null || key >= shiftIsoDays(start, -6);
};

export const monthInTrendRange = (month: string, range: TrendRangeId, now = new Date()): boolean => {
  const key = isoMonth(month);
  if (!key || key >= openMonthKey(now)) return false;
  const start = trendRangeStart(range, now);
  return start == null || key >= start.slice(0, 7);
};

export const filterWeeks = <T extends { week: string }>(
  rows: T[],
  range: TrendRangeId,
  now = new Date()
): T[] =>
  rows
    .filter((row) => weekInTrendRange(row.week, range, now))
    .sort((a, b) => a.week.slice(0, 10).localeCompare(b.week.slice(0, 10)));

export const filterMonths = <T extends { month: string }>(
  rows: T[],
  range: TrendRangeId,
  now = new Date()
): T[] =>
  rows
    .filter((row) => monthInTrendRange(row.month, range, now))
    .sort((a, b) => a.month.slice(0, 7).localeCompare(b.month.slice(0, 7)));

const utcParts = (value: string): { year: number; month: number; day: number } | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.slice(0, 10));
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
};

export const formatTrendWeek = (value: string, includeYear: boolean): string => {
  const parts = utcParts(value);
  if (!parts) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "2-digit" } : {}),
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
};

export const formatTrendMonth = (value: string): string => {
  const match = /^(\d{4})-(\d{2})/.exec(value.slice(0, 7));
  if (!match) return value.slice(0, 7);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "short",
    year: "2-digit",
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)));
};

export type TrendQuestionPoint = {
  week: string;
  Questions: number;
  Clinic: number;
  Standard: number;
  "Deep Dive": number;
};

export type TrendWorkPoint = {
  week: string;
  tools: number;
  learning: number;
};

export type TrendWauPoint = {
  week: string;
  wau: number;
};

export type TrendMauPoint = {
  month: string;
  mau: number;
};

export type TrendCharts = {
  questions: TrendQuestionPoint[];
  work: TrendWorkPoint[];
  wau: TrendWauPoint[];
  mau: TrendMauPoint[];
};

export const buildTrendCharts = (
  source: {
    weekly_activity: EngagementWeekRow[];
    ask_mode_weekly: EngagementAskModeWeekRow[];
    wau_history: EngagementWeekRow[];
    mau_history: EngagementMonthRow[];
  },
  range: TrendRangeId,
  now = new Date()
): TrendCharts => {
  const activity = filterWeeks(source.weekly_activity, range, now);
  const wau = filterWeeks(source.wau_history, range, now);
  const months = filterMonths(source.mau_history, range, now);
  const includeYear =
    new Set([...activity, ...wau].map((row) => row.week.slice(0, 4))).size > 1;
  const modes = new Map(source.ask_mode_weekly.map((row) => [row.week.slice(0, 10), row]));

  return {
    questions: activity.map((row) => {
      const key = row.week.slice(0, 10);
      const mode = modes.get(key);
      return {
        week: formatTrendWeek(row.week, includeYear),
        Questions: row.questions,
        Clinic: mode?.clinic ?? 0,
        Standard: mode?.standard ?? 0,
        "Deep Dive": mode?.deepDive ?? 0,
      };
    }),
    work: activity.map((row) => ({
      week: formatTrendWeek(row.week, includeYear),
      tools: row.tools ?? 0,
      learning: row.learning ?? 0,
    })),
    wau: wau.map((row) => ({
      week: formatTrendWeek(row.week, includeYear),
      wau: row.wau ?? 0,
    })),
    mau: months.map((row) => ({
      month: formatTrendMonth(row.month),
      mau: row.mau,
    })),
  };
};
