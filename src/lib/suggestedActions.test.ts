import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SUGGESTED_ACTIONS,
  WORKFLOW_TOOLS,
  activeSuggestedAction,
  applySuggestedAction,
  suggestClinicalActions,
  type SuggestedActionId,
} from "@umbil/shared";
import { resolveAskIntent, shouldAskModelForIntent } from "./askIntent";

const ids = (text: string): SuggestedActionId[] =>
  suggestClinicalActions(text).map((action) => action.id);

describe("suggested clinical actions", () => {
  it("covers every workflow tool", () => {
    for (const tool of WORKFLOW_TOOLS) {
      assert.ok(
        SUGGESTED_ACTIONS.some((action) => action.id === tool.id),
        `missing suggestion for ${tool.id}`
      );
    }
  });

  it("stays quiet for empty text, greetings, and clinical questions", () => {
    assert.deepEqual(ids(""), []);
    assert.deepEqual(ids("   "), []);
    assert.deepEqual(ids("hello"), []);
    assert.deepEqual(ids("thanks"), []);
    assert.deepEqual(ids("what is the dose of amoxicillin?"), []);
    assert.deepEqual(ids("how do I explain sepsis to a patient"), []);
    assert.deepEqual(ids("what are the red flags for a headache?"), []);
    assert.deepEqual(ids("what goes in an SBAR?"), []);
  });

  it("offers a handout and safety netting for a short presenting complaint", () => {
    assert.deepEqual(ids("back pain"), [
      "patient_friendly",
      "safety_netting",
      "referral",
      "check_evidence",
    ]);
    assert.deepEqual(ids("57 year old patient with back pain"), [
      "patient_friendly",
      "safety_netting",
      "referral",
      "check_evidence",
    ]);
    assert.deepEqual(ids("Insomnia"), [
      "patient_friendly",
      "safety_netting",
      "referral",
      "check_evidence",
    ]);
  });

  it("puts the matching workflow first for each kind of clinical paste", () => {
    assert.equal(
      ids("Accurx: burning when I pass urine for 2 days, no fever")[0],
      "digital_triage"
    );
    assert.equal(
      ids("I've had a headache for a few days and it's not going away")[0],
      "digital_triage"
    );
    assert.equal(
      ids("54F. 3 weeks hoarse voice. Smoker. Please refer to ENT, 2ww.")[0],
      "referral"
    );
    assert.equal(
      ids("3yo fever 38.5, drinking ok, no rash, sent home")[0],
      "safety_netting"
    );
    assert.equal(
      ids("Please explain this to the patient. New diagnosis of type 2 diabetes, started metformin.")[0],
      "patient_friendly"
    );
    assert.equal(
      ids("78M NEWS 6. BP 80/50, Sats 88%. Peri-arrest. Need reg review.")[0],
      "sbar"
    );
    assert.equal(
      ids("78M NSTEMI, PCI to LAD. TTO: aspirin, ticagrelor. Going home today.")[0],
      "discharge_summary"
    );
    assert.equal(
      ids(
        "Dear Dr, thank you for referring this 67 year old. Blood results show Hb 102. For your information and action."
      )[0],
      "summarise_actions"
    );
    assert.equal(ids("amoxicillin 500mg tds for a uti")[0], "check_evidence");
  });

  it("does not treat a clinician's note as a patient message", () => {
    assert.notEqual(ids("I have a 57 year old patient with back pain")[0], "digital_triage");
  });

  it("still suggests actions for a pasted note that starts with What", () => {
    const suggested = ids(
      "What the patient told me:\n57 year old with back pain for 6 weeks, worse at night."
    );
    assert.ok(suggested.includes("patient_friendly"));
    assert.ok(suggested.includes("safety_netting"));
  });

  it("puts the chosen instruction above the notes and can replace or remove it", () => {
    const notes = "57 year old patient with back pain";
    const referral = applySuggestedAction(notes, "referral");
    assert.equal(referral, `Generate a referral letter\n\n${notes}`);
    assert.equal(activeSuggestedAction(referral), "referral");

    const handout = applySuggestedAction(referral, "patient_friendly");
    assert.equal(handout, `Generate a patient handout\n\n${notes}`);
    assert.equal(activeSuggestedAction(handout), "patient_friendly");
    assert.deepEqual(ids(handout), ids(notes));

    assert.equal(applySuggestedAction(handout, "patient_friendly"), notes);
  });

  it("makes the clicked action win even when the notes name a different document", () => {
    const notes = "Please write a discharge summary. TTO aspirin. Going home today.";
    assert.equal(resolveAskIntent(notes), "discharge_summary");

    for (const action of SUGGESTED_ACTIONS) {
      const drafted = applySuggestedAction(notes, action.id);
      assert.equal(drafted.startsWith(`${action.prefix}\n\n`), true);
      assert.equal(resolveAskIntent(drafted), action.intent);
      assert.equal(shouldAskModelForIntent(drafted), false);
    }
  });
});
