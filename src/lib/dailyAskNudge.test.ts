import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DAILY_NUDGE_EVERY,
  calendarDateKey,
  clearDailyNudges,
  dashboardReturnPath,
  emptyDailyNudge,
  parseDailyNudgeState,
  recordDailyQuestion,
  showsDailyNudge,
  undoDailyQuestion,
  type DailyNudgeState,
} from "@umbil/shared";

const TODAY = "2026-10-25";

const ask = (state: DailyNudgeState, questionIndex: number, conversationId = "chat-a") =>
  recordDailyQuestion(state, { today: TODAY, conversationId, questionIndex });

describe("daily capture-learning nudge", () => {
  it("uses every 10 questions", () => {
    assert.equal(DAILY_NUDGE_EVERY, 10);
  });

  it("starts again on the London day, including the midnight after the clocks change", () => {
    assert.equal(calendarDateKey(new Date("2026-10-25T23:30:00Z")), "2026-10-25");
    assert.equal(calendarDateKey(new Date("2026-06-14T22:30:00Z")), "2026-06-14");
    assert.equal(calendarDateKey(new Date("2026-06-14T23:30:00Z")), "2026-06-15");
  });

  it("shows the suggestion on the 10th question of the day, across chats", () => {
    let state = emptyDailyNudge(TODAY);
    for (let index = 1; index <= 6; index += 1) state = ask(state, index, "morning");
    for (let index = 1; index <= 3; index += 1) state = ask(state, index, "afternoon");
    assert.equal(showsDailyNudge(state, TODAY, "afternoon", 3), false);

    state = ask(state, 4, "afternoon");
    assert.equal(state.count, 10);
    assert.equal(showsDailyNudge(state, TODAY, "afternoon", 4), true);
    assert.equal(showsDailyNudge(state, TODAY, "morning", 6), false);

    state = ask(state, 5, "afternoon");
    assert.equal(showsDailyNudge(state, TODAY, "afternoon", 4), true);
    assert.equal(showsDailyNudge(state, TODAY, "afternoon", 5), false);
  });

  it("drops yesterday's count and hides the suggestion until the next 10", () => {
    const yesterday = recordDailyQuestion(emptyDailyNudge("2026-10-24"), {
      today: "2026-10-24",
      conversationId: "chat-a",
      questionIndex: 1,
    });
    const stored = JSON.stringify({ ...yesterday, count: 9, anchors: [] });
    const today = parseDailyNudgeState(stored, TODAY);
    assert.deepEqual(today, emptyDailyNudge(TODAY));

    let state = emptyDailyNudge(TODAY);
    for (let index = 1; index <= 10; index += 1) state = ask(state, index);
    state = clearDailyNudges(state, TODAY);
    assert.equal(state.count, 10);
    assert.equal(showsDailyNudge(state, TODAY, "chat-a", 10), false);

    for (let index = 11; index <= 19; index += 1) state = ask(state, index);
    assert.equal(showsDailyNudge(state, TODAY, "chat-a", 10), false);
    state = ask(state, 20);
    assert.equal(showsDailyNudge(state, TODAY, "chat-a", 20), true);
  });

  it("does not count a question the server refused", () => {
    let state = emptyDailyNudge(TODAY);
    for (let index = 1; index <= 10; index += 1) state = ask(state, index);
    state = undoDailyQuestion(state, TODAY);
    assert.equal(state.count, 9);
    assert.equal(showsDailyNudge(state, TODAY, "chat-a", 10), false);
  });

  it("ignores a stored count from another day or a broken payload", () => {
    assert.equal(parseDailyNudgeState("not-json", TODAY).count, 0);
    assert.equal(parseDailyNudgeState(null, TODAY).count, 0);
  });
});

describe("return to the same place in chat", () => {
  it("keeps the conversation and the scroll offset on the way back", () => {
    assert.equal(dashboardReturnPath("chat-a", 842.4), "/dashboard?c=chat-a&scroll=842");
    assert.equal(dashboardReturnPath(null, 0), "/dashboard?scroll=0");
    assert.equal(dashboardReturnPath("chat-a", null), "/dashboard?c=chat-a");
    assert.equal(dashboardReturnPath(null, Number.NaN), "/dashboard");
  });
});
