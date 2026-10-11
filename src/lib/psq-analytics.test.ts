import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateAnalytics } from "./psq-analytics";

describe("calculateAnalytics free text", () => {
  it("keeps examples and additional comments with the original questions", () => {
    const result = calculateAnalytics([
      {
        id: "survey-1",
        title: "PSQ Cycle Test",
        created_at: "2026-01-01T00:00:00.000Z",
        required_responses: 1,
        psq_responses: [
          {
            created_at: "2026-01-02T00:00:00.000Z",
            answers: {
              "1": 5,
              "2": 5,
              "3": 5,
              "4": 5,
              "5": 5,
              "6": 5,
              "7": 5,
              "8": 5,
              "9": 5,
              "10": 5,
              "11": 5,
              "12": "  Listened well  ",
              "13": "Waiting time",
              "14": "Phone",
              "15": "Explained my results",
              "16": "Thank you",
            },
          },
        ],
      },
    ]);

    assert.equal(result.textFeedback.length, 1);
    assert.equal(result.textFeedback[0].good, "Listened well");
    assert.equal(result.textFeedback[0].improve, "Waiting time");
    assert.equal(result.textFeedback[0].example, "Explained my results");
    assert.equal(result.textFeedback[0].additional, "Thank you");
    assert.equal(result.appointmentTypes[0].name, "Phone");
  });
});
