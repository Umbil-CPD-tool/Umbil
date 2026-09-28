import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LEARNING_MILESTONES,
  activeDaysThisWeek,
  computeLearningStreaks,
  getNewlyUnlockedMilestone,
  getStreakCelebration,
  toLocalDateKey,
  toWeekKey,
} from "@umbil/shared";

const at = (year: number, monthIndex: number, day: number, hour = 12, minute = 0) =>
  new Date(year, monthIndex, day, hour, minute);

const iso = (date: Date) => date.toISOString();

const NOW = at(2026, 8, 28, 12);

describe("weekly learning streaks", () => {
  it("returns zeros for an empty history", () => {
    const streaks = computeLearningStreaks([], NOW);
    assert.equal(streaks.currentStreak, 0);
    assert.equal(streaks.longestStreak, 0);
    assert.equal(streaks.hasLoggedThisWeek, false);
    assert.equal(streaks.logsThisWeek, 0);
    assert.equal(streaks.totalLogs, 0);
    assert.deepEqual(streaks.unlockedMilestones, []);
    assert.equal(streaks.nextMilestone, 5);
    assert.equal(streaks.dates.size, 0);
  });

  it("counts one log this week as a 1-week streak", () => {
    const streaks = computeLearningStreaks([iso(at(2026, 8, 28, 9))], NOW);
    assert.equal(streaks.currentStreak, 1);
    assert.equal(streaks.longestStreak, 1);
    assert.equal(streaks.hasLoggedThisWeek, true);
    assert.equal(streaks.logsThisWeek, 1);
    assert.equal(streaks.totalLogs, 1);
  });

  it("keeps last week's streak while this week is still empty", () => {
    const streaks = computeLearningStreaks([iso(at(2026, 8, 22, 9))], NOW);
    assert.equal(streaks.currentStreak, 1);
    assert.equal(streaks.hasLoggedThisWeek, false);
    assert.equal(streaks.logsThisWeek, 0);
  });

  it("drops the streak when last week was also empty", () => {
    const streaks = computeLearningStreaks([iso(at(2026, 8, 14, 9))], NOW);
    assert.equal(streaks.currentStreak, 0);
    assert.equal(streaks.longestStreak, 1);
    assert.equal(streaks.hasLoggedThisWeek, false);
  });

  it("records three consecutive weeks as the longest run, then a gap", () => {
    const streaks = computeLearningStreaks(
      [iso(at(2026, 7, 31, 9)), iso(at(2026, 8, 14, 9)), iso(at(2026, 8, 21, 9)), iso(at(2026, 8, 28, 9))],
      NOW
    );
    assert.equal(streaks.currentStreak, 3);
    assert.equal(streaks.longestStreak, 3);
  });

  it("does not increment the week when two logs fall in the same week", () => {
    const streaks = computeLearningStreaks(
      [iso(at(2026, 8, 28, 9)), iso(at(2026, 8, 30, 18))],
      at(2026, 8, 30, 19)
    );
    assert.equal(streaks.currentStreak, 1);
    assert.equal(streaks.longestStreak, 1);
    assert.equal(streaks.logsThisWeek, 2);
    assert.equal(streaks.totalLogs, 2);
  });

  it("splits Sunday night and Monday morning into different local weeks", () => {
    const sunday = at(2026, 8, 27, 23, 30);
    const monday = at(2026, 8, 28, 0, 30);
    assert.equal(toLocalDateKey(sunday), "2026-09-27");
    assert.equal(toLocalDateKey(monday), "2026-09-28");
    assert.notEqual(toWeekKey(sunday), toWeekKey(monday));

    const before = computeLearningStreaks([iso(sunday)], monday);
    assert.equal(before.hasLoggedThisWeek, false);
    assert.equal(before.currentStreak, 1);

    const after = computeLearningStreaks([iso(monday)], monday);
    assert.equal(after.hasLoggedThisWeek, true);
    assert.equal(after.currentStreak, 1);
    assert.equal(after.dates.get("2026-09-28"), 1);
  });

  it("treats the year boundary as consecutive Monday weeks", () => {
    const now = at(2026, 0, 5, 12);
    const streaks = computeLearningStreaks([iso(at(2025, 11, 29, 10)), iso(at(2026, 0, 5, 10))], now);
    assert.equal(streaks.currentStreak, 2);
    assert.equal(streaks.longestStreak, 2);
  });

  it("ignores invalid timestamps", () => {
    const streaks = computeLearningStreaks([null, "", "not-a-date"], NOW);
    assert.equal(streaks.totalLogs, 0);
  });
});

describe("learning milestones", () => {
  it("unlocks exactly at 5, 10, 25, 50, and 100", () => {
    for (const milestone of LEARNING_MILESTONES) {
      const stamps = Array.from({ length: milestone }, () => iso(at(2026, 8, 28, 9)));
      const streaks = computeLearningStreaks(stamps, NOW);
      assert.equal(streaks.totalLogs, milestone);
      assert.equal(streaks.unlockedMilestones.at(-1), milestone);
      assert.equal(streaks.currentStreak, 1);
      const nextIndex = LEARNING_MILESTONES.indexOf(milestone) + 1;
      assert.equal(streaks.nextMilestone, LEARNING_MILESTONES[nextIndex] ?? null);
    }
  });

  it("returns the highest milestone crossed", () => {
    assert.equal(getNewlyUnlockedMilestone(9, 10), 10);
    assert.equal(getNewlyUnlockedMilestone(4, 11), 10);
    assert.equal(getNewlyUnlockedMilestone(9, 9), null);
    assert.equal(getNewlyUnlockedMilestone(10, 11), null);
    assert.equal(getNewlyUnlockedMilestone(99, 100), 100);
  });
});

describe("streak celebration", () => {
  it("stays quiet on a second log in the same week when no trophy unlocks", () => {
    const celebration = getStreakCelebration({
      hasLoggedThisWeek: true,
      currentStreak: 2,
      totalLogs: 3,
    });
    assert.equal(celebration.show, false);
    assert.equal(celebration.streakCount, 2);
    assert.equal(celebration.milestone, null);
  });

  it("celebrates the first log of the week", () => {
    const celebration = getStreakCelebration({
      hasLoggedThisWeek: false,
      currentStreak: 2,
      totalLogs: 3,
    });
    assert.equal(celebration.show, true);
    assert.equal(celebration.streakCount, 3);
    assert.equal(celebration.milestone, null);
  });

  it("celebrates a trophy without extending the week", () => {
    const celebration = getStreakCelebration({
      hasLoggedThisWeek: true,
      currentStreak: 2,
      totalLogs: 9,
    });
    assert.equal(celebration.show, true);
    assert.equal(celebration.streakCount, 2);
    assert.equal(celebration.milestone, 10);
  });
});

describe("activeDaysThisWeek", () => {
  it("marks only logged weekdays, Monday first", () => {
    const flags = activeDaysThisWeek(["2026-09-28", "2026-09-30"], NOW);
    assert.deepEqual(flags, [true, false, true, false, false, false, false]);
  });
});
