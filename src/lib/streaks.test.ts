import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LEARNING_MILESTONES,
  MILESTONE_FREEZES,
  activeDaysThisWeek,
  computeLearningStreaks,
  freezesFromMilestones,
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
    assert.equal(streaks.nextMilestone, 10);
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
  it("unlocks exactly at 10, 25, 50, 100, 200, 500, and 1000", () => {
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
    assert.equal(getNewlyUnlockedMilestone(199, 200), 200);
    assert.equal(getNewlyUnlockedMilestone(999, 1000), 1000);
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

describe("streak freezes", () => {
  const tenLogs = (day: Date) => Array.from({ length: 10 }, () => iso(day));
  const missedWeek = toWeekKey(at(2026, 8, 21, 9));

  it("offers a freeze for the open week and does not spend it", () => {
    const streaks = computeLearningStreaks(tenLogs(at(2026, 8, 22, 9)), NOW);
    assert.equal(streaks.streakFreezesEarned, 1);
    assert.equal(streaks.currentStreak, 1);
    assert.equal(streaks.hasLoggedThisWeek, false);
    assert.deepEqual(streaks.freezeWeekKeys, []);
    assert.equal(streaks.streakFreezesAvailable, 1);
    assert.equal(streaks.freezeOffer?.reason, "open-week");
    assert.equal(streaks.freezeOffer?.weekKey, toWeekKey(NOW));
  });

  it("leaves a missed week broken until that week is chosen", () => {
    const streaks = computeLearningStreaks(tenLogs(at(2026, 8, 14, 9)), NOW);
    assert.equal(streaks.currentStreak, 0);
    assert.deepEqual(streaks.freezeWeekKeys, []);
    assert.equal(streaks.streakFreezesAvailable, 1);
    assert.equal(streaks.freezeOffer?.reason, "missed-week");
    assert.equal(streaks.freezeOffer?.weekKey, missedWeek);
  });

  it("counts a missed week only after the user spends a freeze on it", () => {
    const streaks = computeLearningStreaks(tenLogs(at(2026, 8, 14, 9)), NOW, [missedWeek]);
    assert.equal(streaks.currentStreak, 2);
    assert.deepEqual(streaks.freezeWeekKeys, [missedWeek]);
    assert.equal(streaks.streakFreezesAvailable, 0);
    assert.equal(streaks.freezeOffer, null);
  });

  it("offers the nearest missed week when the freezes on hand can reach a logged week", () => {
    const stamps = Array.from({ length: 25 }, () => iso(at(2026, 8, 7, 9)));
    const streaks = computeLearningStreaks(stamps, NOW);
    assert.equal(streaks.streakFreezesAvailable, 2);
    assert.equal(streaks.currentStreak, 0);
    assert.equal(streaks.freezeOffer?.reason, "missed-week");
    assert.equal(streaks.freezeOffer?.weekKey, missedWeek);
  });

  it("does not offer a freeze when one week cannot reconnect the streak", () => {
    const streaks = computeLearningStreaks(tenLogs(at(2026, 7, 10, 9)), NOW);
    assert.equal(streaks.streakFreezesEarned, 1);
    assert.equal(streaks.currentStreak, 0);
    assert.deepEqual(streaks.freezeWeekKeys, []);
    assert.equal(streaks.freezeOffer, null);
  });

  it("returns a freeze that was saved on a week which later got a log", () => {
    const thisWeek = toWeekKey(NOW);
    const streaks = computeLearningStreaks(tenLogs(NOW), NOW, [thisWeek]);
    assert.deepEqual(streaks.freezeWeekKeys, []);
    assert.equal(streaks.streakFreezesAvailable, 1);
    assert.equal(streaks.currentStreak, 1);
  });

  it("keeps every earned freeze ready, with no hold limit", () => {
    const stamps = Array.from({ length: 100 }, () => iso(NOW));
    const streaks = computeLearningStreaks(stamps, NOW);
    const earned = freezesFromMilestones(streaks.unlockedMilestones);
    assert.equal(earned, MILESTONE_FREEZES[10] + MILESTONE_FREEZES[25] + MILESTONE_FREEZES[50] + MILESTONE_FREEZES[100]);
    assert.equal(streaks.streakFreezesEarned, earned);
    assert.equal(streaks.streakFreezesAvailable, earned);
  });
});
