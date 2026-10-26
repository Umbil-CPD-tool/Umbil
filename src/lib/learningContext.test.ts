import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatLearningContext, isLearningTask } from "@umbil/shared";

describe("learning context", () => {
  it("recognises a CPD question and ignores an ordinary clinical one", () => {
    assert.equal(isLearningTask("Help me write a reflection for my CPD"), true);
    assert.equal(isLearningTask("What is the dose of amoxicillin?"), false);
  });

  it("joins PDP goals and recent reflections without inventing any", () => {
    const block = formatLearningContext(
      [{ title: "Improve safety-netting in asthma reviews", timeline: "This year" }],
      [{ question: "Asthma action plans", tags: ["Asthma", "SIGN"], reflection: "I will use absolute risk when I explain preventer treatment." }]
    );
    assert.match(block, /Improve safety-netting/);
    assert.match(block, /Asthma action plans/);
    assert.match(block, /Do not invent goals/);
    assert.equal(formatLearningContext([], []), "");
  });
});