import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  questionIncrementRoom,
  summedMonthlyUsage,
  transitionOfferFor,
  trialPeriodDays,
} from "@umbil/shared";

describe("free question pool", () => {
  const now = new Date("2026-11-15T12:00:00Z");

  it("counts only the shared question counter, not older per-style rows", () => {
    const used = summedMonthlyUsage(
      [
        { feature: "ask_standard", usage_count: 30, last_reset_date: "2026-11-02T00:00:00Z" },
        { feature: "ask_clinic", usage_count: 100, last_reset_date: "2026-11-04T00:00:00Z" },
        { feature: "ask_questions", usage_count: 2, last_reset_date: "2026-11-10T00:00:00Z" },
        { feature: "ask_questions", usage_count: 9, last_reset_date: "2026-10-01T00:00:00Z" },
      ],
      ["ask_questions"],
      now
    );
    assert.equal(used, 2);
  });

  it("gives a fresh 10 even when older styles were already used this month", () => {
    assert.equal(
      questionIncrementRoom(
        [{ feature: "ask_standard", usage_count: 30, last_reset_date: "2026-11-01T00:00:00Z" }],
        now
      ),
      10
    );
  });
});

describe("checkout trial", () => {
  it("uses a 7-day trial for Pro and no trial for student or team", () => {
    assert.equal(trialPeriodDays("pro_monthly"), 7);
    assert.equal(trialPeriodDays("pro_annual"), 7);
    assert.equal(trialPeriodDays("student_monthly"), null);
    assert.equal(trialPeriodDays("team_monthly"), null);
  });
});

describe("complimentary transition offer", () => {
  it("keeps qualified clinicians on the clinician offer even with a university email", () => {
    assert.equal(transitionOfferFor({ email: "gp@qub.ac.uk", grade: "GP" }), "clinician");
    assert.equal(
      transitionOfferFor({ email: "anp@nhs.scot", academic_email: "anp@uni.ac.uk", grade: "ANP" }),
      "clinician"
    );
    assert.equal(
      transitionOfferFor({
        email: "teacher@bham.ac.uk",
        grade: "Medical educator and palliative care doctor",
      }),
      "clinician"
    );
    assert.equal(transitionOfferFor({ email: "fy@yahoo.co.uk", grade: "Fy1" }), "clinician");
  });

  it("marks students by grade or a student mailbox", () => {
    assert.equal(
      transitionOfferFor({ email: "a@student.gla.ac.uk", grade: null }),
      "student"
    );
    assert.equal(transitionOfferFor({ email: "person@gmail.com", grade: "Medical student" }), "student");
    assert.equal(transitionOfferFor({ email: "nurse@yahoo.com", grade: "Student Nurse" }), "student");
    assert.equal(transitionOfferFor({ email: "pre@student.gla.ac.uk", grade: "pre med " }), "student");
  });

  it("treats an unclassified university address as a student and everyone else as a clinician", () => {
    assert.equal(transitionOfferFor({ email: "person@ucl.ac.uk", grade: null }), "student");
    assert.equal(transitionOfferFor({ email: "tester@gmail.com", grade: "Tester" }), "clinician");
  });
});
