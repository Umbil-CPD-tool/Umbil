import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CORRECTION_PROMOTION_COUNT,
  correctionToCount,
  detectEditSignal,
  detectStyleCorrection,
} from "@umbil/shared";

const longLetter = (extra = "") =>
  `${Array.from({ length: 12 }, (_, index) => `Sentence ${index} about the referral and the history.`).join(" ")} ${extra}`;

describe("detectStyleCorrection", () => {
  it("hears a request to cut the writing down", () => {
    const signal = detectStyleCorrection("Too much unnecessary detail.");
    assert.equal(signal?.key, "shorter");
  });

  it("hears prose, absolute risk, and a vague style complaint", () => {
    assert.equal(detectStyleCorrection("Write it in continuous prose.")?.key, "prose");
    assert.equal(detectStyleCorrection("Please use absolute risk figures.")?.key, "absolute_risk");
    assert.equal(detectStyleCorrection("Stop writing like that.")?.key, "tone");
  });

  it("does not learn from a request to drop safety-netting", () => {
    assert.equal(detectStyleCorrection("Too long, and skip safety netting."), null);
    assert.equal(detectStyleCorrection("Never show red flags."), null);
  });

  it("ignores shorter when it is buried in a long clinical paste", () => {
    const pasted = `${"Patient history ".repeat(40)} too long course of antibiotics was discussed.`;
    assert.equal(detectStyleCorrection(pasted), null);
  });

  it("leaves standing preferences to the explicit memory path", () => {
    assert.equal(correctionToCount("Remember that I prefer absolute risk figures."), null);
    assert.equal(correctionToCount("Too long.")?.key, "shorter");
    assert.equal(CORRECTION_PROMOTION_COUNT, 3);
  });
});

describe("detectEditSignal", () => {
  it("treats a much shorter referral as a referral habit", () => {
    const original = longLetter();
    const edited = "Please see this patient with chest pain. Needs cardiology review.";
    const signal = detectEditSignal(original, edited, "referral");
    assert.equal(signal?.key, "referral:shorter");
    assert.match(signal?.body ?? "", /shorter referral/);
  });

  it("treats bullets rewritten as prose as a prose habit", () => {
    const original = ["- Chest pain for two weeks, worse on exertion, with breathlessness.", "- Smoker.", "- ECG normal.", "- Please see."].join("\n");
    const edited = "This patient has had exertional chest pain for two weeks, with breathlessness. He smokes. The ECG was normal. I would be grateful if you could see him.";
    assert.equal(detectEditSignal(original, edited, "referral")?.key, "referral:prose");
  });

  it("ignores a tiny tidy and an edit that drops the safety net", () => {
    const original = longLetter();
    assert.equal(detectEditSignal(original, `${original} Thanks.`, "referral"), null);
    const withNet = `${longLetter()} Safety-net: return if worse, and these are the red flags to watch for overnight.`;
    const stripped = longLetter();
    assert.equal(detectEditSignal(withNet, stripped, "safety_netting"), null);
  });
});
