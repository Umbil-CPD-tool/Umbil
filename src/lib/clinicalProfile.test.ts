import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildClinicianContext,
  buildClinicianPromptBlock,
  formatClinicianSignOff,
  getMissingProfileFields,
  inferAudienceBand,
  isProfileIncomplete,
  profileCompletionTitle,
  resolveSpecialty,
  signupMetadataFromClinicalProfile,
  validateSignupClinicalProfile,
} from "./clinicalProfile";
import { SYSTEM_PROMPTS } from "./prompts";

describe("validateSignupClinicalProfile", () => {
  it("requires only the freestyle role / grade line", () => {
    assert.equal(validateSignupClinicalProfile({ grade: "" }), "Please enter your role or grade.");
    assert.equal(validateSignupClinicalProfile({ grade: "   " }), "Please enter your role or grade.");
    assert.equal(validateSignupClinicalProfile({ grade: "ST4 Cardiology" }), null);
    assert.equal(validateSignupClinicalProfile({ grade: "GP" }), null);
  });
});

describe("isProfileIncomplete", () => {
  it("is complete when name and role/grade are present", () => {
    assert.equal(isProfileIncomplete(null), false);
    assert.equal(isProfileIncomplete({ full_name: "Ada", grade: "GP" }), false);
    assert.equal(isProfileIncomplete({ full_name: "Ada", grade: "ST4 Cardiology" }), false);
    assert.equal(isProfileIncomplete({ full_name: "Ada", grade: "" }), true);
    assert.equal(isProfileIncomplete({ full_name: "", grade: "FY1" }), true);
  });

  it("reports each missing field", () => {
    assert.deepEqual(
      getMissingProfileFields({ full_name: "Ada", grade: null }),
      { missingName: false, missingGrade: true }
    );
  });

  it("titles the reminder from the missing fields", () => {
    assert.equal(
      profileCompletionTitle({ missingName: true, missingGrade: true }),
      "Add your name and role"
    );
    assert.equal(
      profileCompletionTitle({ missingName: false, missingGrade: true }),
      "Add your role / grade"
    );
    assert.equal(
      profileCompletionTitle({ missingName: true, missingGrade: false }),
      "Add your name"
    );
  });
});

describe("inferAudienceBand", () => {
  it("classifies common UK grades", () => {
    assert.equal(inferAudienceBand("5th Year Medical Student"), "student");
    assert.equal(inferAudienceBand("FY1"), "foundation");
    assert.equal(inferAudienceBand("FY2 Doctor"), "foundation");
    assert.equal(inferAudienceBand("GP"), "gp");
    assert.equal(inferAudienceBand("gp"), "gp");
    assert.equal(inferAudienceBand("GP Trainee"), "gp");
    assert.equal(inferAudienceBand("GPST2"), "gp");
    assert.equal(inferAudienceBand("ST4 Cardiology"), "specialty_trainee");
    assert.equal(inferAudienceBand("Consultant Cardiologist"), "consultant");
    assert.equal(inferAudienceBand("ANP"), "ahp");
    assert.equal(inferAudienceBand("Physician Associate"), "ahp");
    assert.equal(inferAudienceBand(""), "unknown");
  });
});

describe("resolveSpecialty", () => {
  it("prefers the explicit specialty field", () => {
    assert.equal(resolveSpecialty("ST4 Cardiology", "Emergency Medicine"), "Emergency Medicine");
  });

  it("recovers a specialty written only in the grade", () => {
    assert.equal(resolveSpecialty("ST4 Cardiology", null), "Cardiology");
    assert.equal(resolveSpecialty("GP", ""), null);
  });
});

describe("formatClinicianSignOff", () => {
  it("joins name, grade, and specialty without duplicating a specialty already in the grade", () => {
    assert.equal(formatClinicianSignOff("Dr Ada Lovelace", "ST4 Cardiology", "Cardiology"), "Dr Ada Lovelace, ST4 Cardiology");
    assert.equal(formatClinicianSignOff("Dr Ada Lovelace", "ST4", "Cardiology"), "Dr Ada Lovelace, ST4, Cardiology");
    assert.equal(formatClinicianSignOff("Dr Ada Lovelace", null, null), "Dr Ada Lovelace");
    assert.equal(formatClinicianSignOff("", "GP", "General Practice"), "");
  });
});

describe("buildClinicianContext", () => {
  it("returns empty when nothing is known", () => {
    assert.equal(buildClinicianContext({}), "");
    assert.equal(buildClinicianPromptBlock({}), "");
  });

  it("pitches a medical student without assuming prescribing rights", () => {
    const text = buildClinicianContext({
      grade: "5th Year Medical Student",
    });
    assert.match(text, /CLINICIAN CONTEXT/);
    assert.match(text, /medical student/i);
    assert.match(text, /Do not assume they can prescribe/);
    assert.match(text, /Do not announce that you are personalising/);
  });

  it("keeps GP answers in primary care", () => {
    const text = buildClinicianContext({
      grade: "GP",
      nation: "England",
      workplace_setting: "GP / Primary care",
    });
    assert.match(text, /Role: GP/);
    assert.match(text, /Setting: GP \/ Primary care/);
    assert.match(text, /England/);
    assert.match(text, /community/);
    assert.match(text, /Do not announce that you are personalising/);
  });

  it("reads specialty from a combined freestyle role line", () => {
    const text = buildClinicianContext({
      grade: "ST4 Cardiology",
      nation: "Scotland",
      workplace_setting: "Hospital",
    });
    assert.match(text, /specialty trainee/);
    assert.match(text, /Cardiology/);
    assert.match(text, /SIGN/);
    assert.match(text, /Do not lecture on basics/);
    assert.match(text, /Do not invent privileges/);
  });

  it("does not invent a band when only a setting is known", () => {
    const text = buildClinicianContext({ workplace_setting: "Hospital" });
    assert.match(text, /Audience: unknown/);
    assert.match(text, /Do not invent a grade/);
  });
});

describe("ASK_BASE clinician contract", () => {
  it("tells the model how to use a CLINICIAN CONTEXT block", () => {
    assert.match(SYSTEM_PROMPTS.ASK_BASE, /CLINICIAN CONTEXT/);
    assert.match(SYSTEM_PROMPTS.ASK_BASE, /Do not invent privileges/);
    assert.match(SYSTEM_PROMPTS.ASK_BASE, /Do not announce that you are personalising/);
    assert.match(buildClinicianPromptBlock({ grade: "GP" }), /CLINICIAN CONTEXT/);
  });
});

describe("signupMetadataFromClinicalProfile", () => {
  it("stores the freestyle role and derives specialty when embedded", () => {
    assert.deepEqual(
      signupMetadataFromClinicalProfile({
        grade: " ST4 Cardiology ",
        nation: "England",
        workplace_setting: "Hospital",
      }),
      {
        grade: "ST4 Cardiology",
        specialty: "Cardiology",
        nation: "England",
        workplace_setting: "Hospital",
      }
    );
    assert.deepEqual(
      signupMetadataFromClinicalProfile({
        grade: "GP",
        nation: "France",
        workplace_setting: "Ward 7",
      }),
      {
        grade: "GP",
        specialty: null,
        nation: null,
        workplace_setting: null,
      }
    );
  });
});
