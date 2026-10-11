import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  readStoredAppraisalPack,
  shouldReuseAppraisalPack,
  stampAppraisalPack,
} from "./appraisalPackCache";

describe("appraisal pack cache", () => {
  it("reuses a saved summary when the response count has not changed", () => {
    const stored = stampAppraisalPack("APPRAISAL-READY SUMMARY\nTen patients, overall 4.4/5.", 10);
    assert.equal(shouldReuseAppraisalPack(stored, 10), true);
    assert.equal(shouldReuseAppraisalPack(stored, 11), false);
    assert.equal(readStoredAppraisalPack(stored).text.startsWith("APPRAISAL-READY SUMMARY"), true);
    assert.equal(readStoredAppraisalPack(stored).text.includes("RESPONSE_COUNT"), false);
  });

  it("keeps an older summary that has no response count yet", () => {
    assert.equal(shouldReuseAppraisalPack("APPRAISAL-READY SUMMARY\nAlready written.", 10), true);
    assert.equal(shouldReuseAppraisalPack("", 10), false);
    assert.equal(shouldReuseAppraisalPack(null, 10), false);
  });
});
