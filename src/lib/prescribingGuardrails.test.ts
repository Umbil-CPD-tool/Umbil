import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isHardClinicalQuestion, isPrescribingQuestion, isSimpleClinicalLookup } from "./prescribingGuardrails";
import { resolveAskReasoningEffort } from "./askLlm";

describe("isPrescribingQuestion", () => {
  it("catches formulation, licence and brand-in-indication questions", () => {
    assert.equal(isPrescribingQuestion("Slynd in HRT"), true);
    assert.equal(isPrescribingQuestion("can I use Slynd as the progestogen in HRT"), true);
    assert.equal(isPrescribingQuestion("amoxicillin dose for a 3 year old with otitis media"), true);
    assert.equal(isPrescribingQuestion("is semaglutide licensed for obesity"), true);
    assert.equal(isPrescribingQuestion("off label melatonin in children"), true);
    assert.equal(isPrescribingQuestion("ibuprofen interaction with ramipril"), true);
    assert.equal(isPrescribingQuestion("utrogestan vs slynd for endometrial protection"), true);
    assert.equal(isPrescribingQuestion("progestogen in HRT"), true);
  });

  it("leaves ordinary non-prescribing questions alone", () => {
    assert.equal(isPrescribingQuestion("red flags of back pain"), false);
    assert.equal(isPrescribingQuestion("what is sepsis"), false);
    assert.equal(isPrescribingQuestion("NICE criteria for referring to memory clinic"), false);
    assert.equal(isPrescribingQuestion("what is HRT"), false);
    assert.equal(isPrescribingQuestion("hello"), false);
  });
});

describe("isSimpleClinicalLookup", () => {
  it("flags short licensed-fact lookups", () => {
    assert.equal(isSimpleClinicalLookup("amoxicillin dose for a 3 year old with otitis media"), true);
    assert.equal(isSimpleClinicalLookup("how many days of nitrofurantoin for cystitis"), true);
  });

  it("keeps off-label and product-swap questions on the slower path", () => {
    assert.equal(isSimpleClinicalLookup("Slynd in HRT"), false);
    assert.equal(isSimpleClinicalLookup("can I use Slynd as the progestogen in HRT"), false);
    assert.equal(isSimpleClinicalLookup("off label melatonin in children"), false);
  });
});

describe("isHardClinicalQuestion", () => {
  it("flags licence and comparison questions", () => {
    assert.equal(isHardClinicalQuestion("Slynd in HRT"), true);
    assert.equal(isHardClinicalQuestion("can I use Slynd as the progestogen in HRT"), true);
    assert.equal(isHardClinicalQuestion("off label melatonin in children"), true);
  });

  it("leaves simple lookups and ordinary questions on the fast path", () => {
    assert.equal(isHardClinicalQuestion("amoxicillin dose for a 3 year old with otitis media"), false);
    assert.equal(isHardClinicalQuestion("red flags of back pain"), false);
    assert.equal(isHardClinicalQuestion("what is sepsis"), false);
  });
});

describe("resolveAskReasoningEffort", () => {
  it("keeps clinic mode on low even when the question is hard", () => {
    assert.equal(resolveAskReasoningEffort({ simpleLookup: false, clinicMode: true, hard: true }), "low");
  });

  it("keeps simple lookups on low unless they are also hard or deep dive", () => {
    assert.equal(resolveAskReasoningEffort({ simpleLookup: true, clinicMode: false, hard: false }), "low");
    assert.equal(resolveAskReasoningEffort({ simpleLookup: true, clinicMode: false, hard: true }), "medium");
  });

  it("uses medium for hard questions outside clinic", () => {
    assert.equal(resolveAskReasoningEffort({ simpleLookup: false, clinicMode: false, hard: true }), "medium");
    assert.equal(resolveAskReasoningEffort({ simpleLookup: false, clinicMode: false, hard: false }), "low");
  });
});
