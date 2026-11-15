import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalToolName, mergeToolRows } from "./toolNames";

describe("engagement tool names", () => {
  it("treats the old discharge condenser as the discharge letter", () => {
    assert.equal(canonicalToolName("Discharge Condenser"), "Discharge Letter");
    assert.equal(canonicalToolName("Discharge Letter"), "Discharge Letter");
  });

  it("keeps the patient handout and the translator apart", () => {
    assert.equal(canonicalToolName("Patient Handout"), "Patient Handout");
    assert.equal(canonicalToolName("Patient Translator"), "Patient Translator");
  });

  it("adds uses and people when two labels are the same tool", () => {
    const rows = mergeToolRows([
      { tool_name: "Discharge Letter", uses: 22, users: 7 },
      { tool_name: "Discharge Condenser", uses: 8, users: 4 },
      { tool_name: "Patient Handout", uses: 182, users: 44 },
    ]);
    assert.deepEqual(rows[0], { tool_name: "Patient Handout", uses: 182, users: 44 });
    assert.deepEqual(rows[1], { tool_name: "Discharge Letter", uses: 30, users: 11 });
  });
});
