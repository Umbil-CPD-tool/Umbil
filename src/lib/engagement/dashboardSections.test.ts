import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ENGAGEMENT_SECTIONS } from "./dashboardSections";

describe("engagement section order", () => {
  it("keeps ids unique and tells the stickiness story before the money", () => {
    const ids = ENGAGEMENT_SECTIONS.map((section) => section.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(ids, [
      "this-week",
      "this-week-detail",
      "trends",
      "retention",
      "since-launch",
      "funnel",
      "regulars",
      "revenue",
      "upgrade",
      "ads",
    ]);
  });
});
