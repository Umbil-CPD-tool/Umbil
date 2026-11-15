import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  baselineStatusCopy,
  cancelledDuringTrial,
  classifyBillingEvent,
  clinicianGradeLabel,
  monthlyRecurringPence,
  usageTierFromQuestionCount,
} from "./conversionFunnel";

describe("usage tier", () => {
  it("bands lifetime questions the same way as the engagement funnel", () => {
    assert.equal(usageTierFromQuestionCount(12, false), "guest");
    assert.equal(usageTierFromQuestionCount(0, true), "new");
    assert.equal(usageTierFromQuestionCount(4, true), "light");
    assert.equal(usageTierFromQuestionCount(5, true), "regular");
    assert.equal(usageTierFromQuestionCount(49, true), "regular");
    assert.equal(usageTierFromQuestionCount(50, true), "heavy");
    assert.equal(usageTierFromQuestionCount(99, true), "heavy");
    assert.equal(usageTierFromQuestionCount(100, true), "power");
  });
});

describe("clinician grade", () => {
  it("keeps a signed-in grade and labels blanks", () => {
    assert.equal(clinicianGradeLabel("  ST3  ", true), "ST3");
    assert.equal(clinicianGradeLabel("  ", true), "Unknown");
    assert.equal(clinicianGradeLabel("GP", false), "Guest");
  });
});

describe("monthly recurring amount", () => {
  it("turns list price into pence per month and applies a percent off", () => {
    assert.equal(monthlyRecurringPence({ unitAmount: 1500, interval: "month" }), 1500);
    assert.equal(monthlyRecurringPence({ unitAmount: 15000, interval: "year" }), 1250);
    assert.equal(
      monthlyRecurringPence({ unitAmount: 1500, interval: "month", percentOff: 20 }),
      1200
    );
    assert.equal(monthlyRecurringPence({ unitAmount: 1500, interval: null }), null);
  });
});

describe("billing events", () => {
  it("separates the free month from the first paid invoice and from cancellation", () => {
    assert.equal(
      classifyBillingEvent({ type: "checkout.session.completed", status: "trialing" }),
      "trial_started"
    );
    assert.equal(
      classifyBillingEvent({ type: "checkout.session.completed", status: "active" }),
      "subscribed"
    );
    assert.equal(
      classifyBillingEvent({ type: "checkout.session.completed", status: "incomplete" }),
      null
    );
    assert.equal(
      classifyBillingEvent({
        type: "customer.subscription.updated",
        status: "active",
        previousStatus: "trialing",
      }),
      "subscribed"
    );
    assert.equal(
      classifyBillingEvent({
        type: "customer.subscription.updated",
        status: "active",
        previousStatus: "incomplete",
      }),
      "subscribed"
    );
    assert.equal(
      classifyBillingEvent({
        type: "customer.subscription.updated",
        status: "active",
        previousStatus: "active",
      }),
      null
    );
    assert.equal(
      classifyBillingEvent({
        type: "customer.subscription.updated",
        status: "active",
        previousStatus: null,
      }),
      null
    );
    assert.equal(
      classifyBillingEvent({ type: "customer.subscription.deleted", status: "canceled" }),
      "cancelled"
    );
    assert.equal(
      classifyBillingEvent({
        type: "customer.subscription.updated",
        status: "canceled",
        previousStatus: "trialing",
      }),
      "cancelled"
    );
  });

  it("does not count a free-month cancellation as lost MRR", () => {
    assert.equal(
      cancelledDuringTrial({ previousStatus: "trialing", trialEndUnix: 200, canceledAtUnix: 150 }),
      true
    );
    assert.equal(cancelledDuringTrial({ previousStatus: "active", trialEndUnix: 200, canceledAtUnix: 250 }), false);
    assert.equal(cancelledDuringTrial({ trialEndUnix: 200, canceledAtUnix: 150 }), true);
    assert.equal(cancelledDuringTrial({ trialEndUnix: 100, canceledAtUnix: 150 }), false);
  });
});

describe("baseline window", () => {
  it("asks to leave free limits alone until the before window is long enough", () => {
    const early = baselineStatusCopy({
      daysElapsed: 2,
      trackingStartedAt: "2026-11-15T12:00:00.000Z",
      limitsChangedAt: null,
    });
    assert.match(early, /go live today/);
    assert.match(early, /after window/);

    const minimum = baselineStatusCopy({
      daysElapsed: 8,
      trackingStartedAt: "2026-11-01T12:00:00.000Z",
      limitsChangedAt: null,
    });
    assert.match(minimum, /usable before window/);

    const ready = baselineStatusCopy({
      daysElapsed: 14,
      trackingStartedAt: "2026-11-01T12:00:00.000Z",
      limitsChangedAt: null,
    });
    assert.match(ready, /full before window/);

    const after = baselineStatusCopy({
      daysElapsed: 20,
      trackingStartedAt: "2026-11-01T12:00:00.000Z",
      limitsChangedAt: "2026-11-20T12:00:00.000Z",
    });
    assert.match(after, /after window/);
    assert.match(after, /before benchmark/);
  });
});
