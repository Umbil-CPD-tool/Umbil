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
  it("uses every 5 questions", () => {
    assert.equal(DAILY_NUDGE_EVERY, 5);
  });

  it("keeps the London calendar key, including the midnight after the clocks change", () => {
    assert.equal(calendarDateKey(new Date("2026-10-25T23:30:00Z")), "2026-10-25");
    assert.equal(calendarDateKey(new Date("2026-06-14T22:30:00Z")), "2026-06-14");
    assert.equal(calendarDateKey(new Date("2026-06-14T23:30:00Z")), "2026-06-15");
  });

  it("shows the suggestion on every 5th question, across chats", () => {
    let state = emptyDailyNudge(TODAY);
    for (let index = 1; index <= 3; index += 1) state = ask(state, index, "morning");
    state = ask(state, 1, "afternoon");
    assert.equal(showsDailyNudge(state, TODAY, "afternoon", 1), false);

    state = ask(state, 2, "afternoon");
    assert.equal(state.count, 5);
    assert.equal(showsDailyNudge(state, TODAY, "afternoon", 2), true);
    assert.equal(showsDailyNudge(state, TODAY, "morning", 3), false);

    state = ask(state, 3, "afternoon");
    assert.equal(showsDailyNudge(state, TODAY, "afternoon", 2), true);
    assert.equal(showsDailyNudge(state, TODAY, "afternoon", 3), false);
  });

  it("keeps yesterday's count and shows the suggestion on the next multiple of 5", () => {
    let yesterday = emptyDailyNudge("2026-10-24");
    for (let index = 1; index <= 4; index += 1) {
      yesterday = recordDailyQuestion(yesterday, {
        today: "2026-10-24",
        conversationId: "chat-a",
        questionIndex: index,
      });
    }
    const today = parseDailyNudgeState(JSON.stringify(yesterday), TODAY);
    assert.equal(today.count, 4);
    assert.equal(today.date, TODAY);

    let state = recordDailyQuestion(today, { today: TODAY, conversationId: "chat-a", questionIndex: 5 });
    assert.equal(state.count, 5);
    assert.equal(showsDailyNudge(state, TODAY, "chat-a", 5), true);

    state = clearDailyNudges(state, TODAY);
    assert.equal(state.count, 5);
    assert.equal(showsDailyNudge(state, TODAY, "chat-a", 5), false);

    for (let index = 6; index <= 9; index += 1) state = ask(state, index);
    assert.equal(showsDailyNudge(state, TODAY, "chat-a", 5), false);
    state = ask(state, 10);
    assert.equal(showsDailyNudge(state, TODAY, "chat-a", 10), true);
  });

  it("does not count a question the server refused", () => {
    let state = emptyDailyNudge(TODAY);
    for (let index = 1; index <= 5; index += 1) state = ask(state, index);
    state = undoDailyQuestion(state, TODAY);
    assert.equal(state.count, 4);
    assert.equal(showsDailyNudge(state, TODAY, "chat-a", 5), false);
  });

  it("starts from zero when the stored payload is missing or broken", () => {
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
