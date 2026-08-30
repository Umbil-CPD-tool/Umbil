import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPrescribingQuestion } from "./prescribingGuardrails";

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
