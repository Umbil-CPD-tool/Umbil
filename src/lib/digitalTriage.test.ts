import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeTriageInput, detectHighRiskPhrases, matchTriagePresentations } from "@umbil/shared";

describe("shared digital triage", () => {
  it("matches a presentation and keeps the red-flag phrase id", () => {
    const keys = matchTriagePresentations("worst headache of my life, sudden severe headache");
    assert.ok(keys.includes("HEADACHE"));
    const flags = detectHighRiskPhrases("thunderclap headache");
    assert.deepEqual(
      flags.map((flag) => flag.id),
      ["thunderclap"]
    );
  });

  it("uses the child fever scaffold when the note is about a child", () => {
    const analysis = analyzeTriageInput("3 year old with a fever and poor feeding");
    assert.ok(analysis.presentationKeys.includes("FEVER_CHILD"));
    assert.ok(analysis.merged.redFlagQuestions.length > 0);
  });
});
