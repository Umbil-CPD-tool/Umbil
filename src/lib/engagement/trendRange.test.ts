import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEngagementBriefingMarkdown } from "./exportReport";
import type { EngagementPayload } from "./types";
import {
  buildTrendCharts,
  DEFAULT_TREND_RANGE,
  filterMonths,
  filterWeeks,
  formatTrendMonth,
  formatTrendWeek,
  isTrendRangeId,
  openMonthKey,
  openWeekKey,
  trendRangeStart,
} from "./trendRange";

const NOW = new Date("2026-10-14T12:00:00Z");

const weeks = [
  "2025-10-06",
  "2025-10-13",
  "2026-04-06",
  "2026-04-13",
  "2026-09-07",
  "2026-09-14",
  "2026-10-05",
  "2026-10-06",
  "2026-10-12",
];

const months = ["2025-09", "2025-10", "2026-03", "2026-04", "2026-08", "2026-09", "2026-10"];

const keys = <T extends { week: string }>(rows: T[]) => rows.map((row) => row.week.slice(0, 10));

describe("trend windows", () => {
  it("opens on the past 6 months", () => {
    assert.equal(DEFAULT_TREND_RANGE, "6m");
    assert.equal(isTrendRangeId("6m"), true);
    assert.equal(isTrendRangeId("fortnight"), false);
  });

  it("uses the London calendar, including the day the clocks change", () => {
    assert.equal(openWeekKey(NOW), "2026-10-12");
    assert.equal(openMonthKey(NOW), "2026-10");
    assert.equal(openWeekKey(new Date("2026-06-14T22:30:00Z")), "2026-06-08");
    assert.equal(openWeekKey(new Date("2026-06-14T23:30:00Z")), "2026-06-15");
  });

  it("clamps month ends, including a leap day", () => {
    assert.equal(trendRangeStart("1m", new Date("2024-03-31T12:00:00Z")), "2024-02-29");
    assert.equal(trendRangeStart("1m", new Date("2026-03-31T12:00:00Z")), "2026-02-28");
    assert.equal(trendRangeStart("6m", NOW), "2026-04-14");
    assert.equal(trendRangeStart("1y", NOW), "2025-10-14");
    assert.equal(trendRangeStart("all", NOW), null);
  });

  it("keeps finished weeks that overlap the window and drops the open week", () => {
    const rows = weeks.map((week) => ({ week }));
    assert.deepEqual(keys(filterWeeks(rows, "1m", NOW)), ["2026-09-14", "2026-10-05", "2026-10-06"]);
    assert.deepEqual(keys(filterWeeks(rows, "6m", NOW)), [
      "2026-04-13",
      "2026-09-07",
      "2026-09-14",
      "2026-10-05",
      "2026-10-06",
    ]);
    assert.deepEqual(keys(filterWeeks(rows, "1y", NOW)), [
      "2025-10-13",
      "2026-04-06",
      "2026-04-13",
      "2026-09-07",
      "2026-09-14",
      "2026-10-05",
      "2026-10-06",
    ]);
    assert.deepEqual(keys(filterWeeks(rows, "all", NOW)), weeks.filter((week) => week !== "2026-10-12"));
    assert.deepEqual(keys(filterWeeks([{ week: "2026-10-12" }, { week: "nope" }], "all", NOW)), []);
  });

  it("keeps finished months that overlap the window and drops the open month", () => {
    const rows = months.map((month) => ({ month }));
    assert.deepEqual(
      filterMonths(rows, "1m", NOW).map((row) => row.month),
      ["2026-09"]
    );
    assert.deepEqual(
      filterMonths(rows, "6m", NOW).map((row) => row.month),
      ["2026-04", "2026-08", "2026-09"]
    );
    assert.deepEqual(
      filterMonths(rows, "1y", NOW).map((row) => row.month),
      ["2025-10", "2026-03", "2026-04", "2026-08", "2026-09"]
    );
    assert.deepEqual(
      filterMonths(rows, "all", NOW).map((row) => row.month),
      months.filter((month) => month !== "2026-10")
    );
  });

  it("does not reorder or drop the source rows", () => {
    const rows = [{ week: "2026-10-05" }, { week: "2026-04-13" }];
    filterWeeks(rows, "all", NOW);
    assert.deepEqual(rows, [{ week: "2026-10-05" }, { week: "2026-04-13" }]);
    assert.deepEqual(keys(filterWeeks(rows, "all", NOW)), ["2026-04-13", "2026-10-05"]);
  });
});

describe("trend charts", () => {
  const source = {
    weekly_activity: [
      { week: "2025-10-06", questions: 11, tools: 1, learning: 2 },
      { week: "2026-10-06", questions: 22, tools: 3, learning: 4 },
      { week: "2026-10-12", questions: 99, tools: 9, learning: 9 },
      { week: "2026-08-03", questions: 33, tools: 5, learning: 6 },
    ],
    ask_mode_weekly: [
      { week: "2025-10-06", clinic: 2, standard: 3, deepDive: 4 },
      { week: "2026-10-06", clinic: 9, standard: 8, deepDive: 7 },
    ],
    wau_history: [
      { week: "2025-10-06", wau: 4, questions: 11 },
      { week: "2026-08-03", wau: 15, questions: 33 },
      { week: "2026-10-12", wau: 1, questions: 99 },
    ],
    mau_history: [
      { month: "2025-11-01", mau: 40, avg_wau: 4, wau_mau_pct: 10, questions: 1 },
      { month: "2026-08-01", mau: 80, avg_wau: 8, wau_mau_pct: 10, questions: 2 },
      { month: "2026-10-01", mau: 120, avg_wau: 12, wau_mau_pct: 10, questions: 3 },
    ],
  };

  it("moves every chart together and keeps answer styles on the right week", () => {
    const recent = buildTrendCharts(source, "6m", NOW);
    assert.deepEqual(
      recent.questions.map((row) => row.Questions),
      [33, 22]
    );
    assert.deepEqual(
      recent.work.map((row) => [row.tools, row.learning]),
      [
        [5, 6],
        [3, 4],
      ]
    );
    assert.deepEqual(
      recent.wau.map((row) => row.wau),
      [15]
    );
    assert.deepEqual(
      recent.mau.map((row) => row.mau),
      [80]
    );
    assert.deepEqual(recent.questions.map((row) => row.Clinic), [0, 9]);
    assert.equal(recent.questions[1]?.Standard, 8);
    assert.equal(recent.questions[1]?.["Deep Dive"], 7);

    const everything = buildTrendCharts(source, "all", NOW);
    assert.deepEqual(
      everything.questions.map((row) => [row.week, row.Clinic, row.Questions]),
      [
        ["6 Oct 25", 2, 11],
        ["3 Aug 26", 0, 33],
        ["6 Oct 26", 9, 22],
      ]
    );
    assert.equal(new Set(everything.questions.map((row) => row.week)).size, everything.questions.length);
    assert.deepEqual(
      everything.mau.map((row) => row.mau),
      [40, 80]
    );
  });

  it("formats week and month labels from the date itself", () => {
    assert.equal(formatTrendWeek("2026-10-05", false), "5 Oct");
    assert.match(formatTrendWeek("2026-09-07", false), /^7 Sept?$/);
    assert.match(formatTrendMonth("2026-09-01"), /^Sept? 26$/);
  });
});

const briefingPayload = (): EngagementPayload => ({
  generated_at: NOW.toISOString(),
  timezone: "Europe/London",
  snapshot: {
    dau: 1,
    weekday_dau: 1,
    wau: 2,
    wau_prev: 1,
    mau: 3,
    wau_mau_pct: 50,
    questions_7d: 4,
    questions_prev_7d: 2,
    questions_30d: 8,
    questions_logged_in: 8,
    week1_retention_pct: 10,
    week4_retention_pct: 20,
    week8_retention_pct: null,
    week12_retention_pct: null,
  },
  activity: {
    tools_7d: 1,
    tools_prev_7d: 1,
    tools_30d: 1,
    tool_users_7d: 1,
    cpd_7d: 1,
    cpd_prev_7d: 1,
    cpd_30d: 1,
    cpd_users_7d: 1,
    signups_7d: 1,
    signups_prev_7d: 1,
    signups_30d: 1,
    signups: 4,
    ever_asked: 3,
    pro_flagged: 1,
    stripe_active: 1,
  },
  costs: {
    tokens_7d: 1,
    tokens_30d: 1,
    estimated_usd_7d: 0.1,
    estimated_usd_30d: 0.2,
    note: "estimate",
  },
  tools: [],
  grades: [],
  wau_history: [],
  mau_history: [
    { month: "2025-11-01", mau: 44444, avg_wau: 1, wau_mau_pct: 10, questions: 1 },
    { month: "2026-08-01", mau: 55555, avg_wau: 2, wau_mau_pct: 20, questions: 2 },
    { month: "2026-10-01", mau: 66666, avg_wau: 3, wau_mau_pct: 30, questions: 3 },
  ],
  weekly_activity: [
    { week: "2025-11-03", questions: 11111, tools: 1, learning: 1 },
    { week: "2026-08-03", questions: 22222, tools: 2, learning: 2 },
    { week: "2026-10-12", questions: 33333, tools: 3, learning: 3 },
  ],
  ask_modes: [],
  ask_mode_weekly: [],
  ask_modes_ready: true,
  retention_monthly: [],
  top_users: [],
  growth: {
    funnel: {
      signups: 4,
      never_asked: 1,
      ever_asked: 3,
      asked_within_1d: 2,
      asked_within_7d: 3,
      reached_5: 1,
      reached_50: 0,
      reached_100: 0,
      pro_flagged: 1,
      stripe_active: 1,
      heavy_and_pro: 0,
      heavy_and_stripe: 0,
    },
    heavy_by_grade: [],
    heavy_tools: [],
    acquisition: [],
  },
  lifetime: {
    first_question_at: null,
    questions_logged_in: 8,
    questions_anonymous: 0,
    questions_total: 8,
    users_ever_asked: 3,
    signups: 4,
    tools_total: 1,
    tool_users: 1,
    cpd_total: 1,
    cpd_users: 1,
    median_questions: 2,
    mean_questions: 2,
    asked_once: 1,
    asked_5: 1,
    asked_50: 0,
    asked_100: 0,
    top20_question_share_pct: 40,
    tokens_all: 10,
    estimated_usd_all: 0.3,
    tools: [],
    grades: [],
  },
});

describe("briefing trend window", () => {
  it("keeps the downloaded briefing on the past 6 months", () => {
    const markdown = buildEngagementBriefingMarkdown(briefingPayload(), null, null, null, NOW);
    assert.match(markdown, /this briefing stays on the past 6 months/);
    assert.match(markdown, /## Weekly activity \(past 6 months\)/);
    assert.match(markdown, /## Monthly active users \(past 6 months\)/);
    assert.match(markdown, /22,222/);
    assert.match(markdown, /55,555/);
    assert.equal(markdown.includes("11,111"), false);
    assert.equal(markdown.includes("33,333"), false);
    assert.equal(markdown.includes("44,444"), false);
    assert.equal(markdown.includes("66,666"), false);
    assert.equal(markdown.includes("2026-10-12"), false);
    assert.equal(markdown.includes("2025-11"), false);
  });
});
