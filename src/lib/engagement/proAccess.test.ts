import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countProAccess } from "./proAccess";

describe("countProAccess", () => {
  it("splits paying, the free month, and Pro switched on by hand", () => {
    const breakdown = countProAccess(
      [
        { is_pro: true, subscription_status: "active" },
        { is_pro: true, subscription_status: "active" },
        { is_pro: true, subscription_status: "trialing" },
        { is_pro: true, subscription_status: null },
        { is_pro: true, subscription_status: "canceled" },
        { is_pro: false, subscription_status: "active" },
      ],
      null
    );

    assert.deepEqual(breakdown, {
      usingPro: 5,
      paying: 2,
      trialing: 1,
      complimentary: 2,
      complimentaryBreakdown: { students: 0, staff: 0, friendsAndDoctors: 2 },
    });
    assert.equal(
      breakdown.complimentaryBreakdown.students +
        breakdown.complimentaryBreakdown.staff +
        breakdown.complimentaryBreakdown.friendsAndDoctors,
      breakdown.complimentary
    );
  });

  it("uses Stripe for trials that checkout saved as active", () => {
    const breakdown = countProAccess(
      [
        { is_pro: true, subscription_status: "active" },
        { is_pro: true, subscription_status: "active" },
        { is_pro: true, subscription_status: "active" },
        { is_pro: true, subscription_status: null },
        { is_pro: true, subscription_status: null },
      ],
      { paying: 1, trialing: 2 }
    );

    assert.deepEqual(breakdown, {
      usingPro: 5,
      paying: 1,
      trialing: 2,
      complimentary: 2,
      complimentaryBreakdown: { students: 0, staff: 0, friendsAndDoctors: 2 },
    });
    assert.equal(breakdown.paying + breakdown.trialing + breakdown.complimentary, breakdown.usingPro);
  });

  it("still counts a Stripe subscriber if the Pro flag has not caught up", () => {
    const breakdown = countProAccess([{ is_pro: true, subscription_status: null }], {
      paying: 2,
      trialing: 1,
    });

    assert.equal(breakdown.usingPro, 3);
    assert.equal(breakdown.paying, 2);
    assert.equal(breakdown.trialing, 1);
    assert.equal(breakdown.complimentary, 0);
    assert.deepEqual(breakdown.complimentaryBreakdown, { students: 0, staff: 0, friendsAndDoctors: 0 });
  });

  it("splits complimentary Pro into students, staff, and friends", () => {
    const breakdown = countProAccess(
      [
        { is_pro: true, subscription_status: "active", stripe_customer_id: "cus_pay", email: "pay@nhs.net" },
        { is_pro: true, subscription_status: "active", stripe_customer_id: "cus_trial", email: "trial@nhs.net" },
        { is_pro: true, subscription_status: "active", stripe_customer_id: "cus_old", email: "  old@uni.ac.uk  " },
        { is_pro: true, subscription_status: null, email: "student@university.ac.uk" },
        { is_pro: true, subscription_status: null, email: "personal@gmail.com", academic_email: "personal@uni.ac.uk" },
        { is_pro: true, subscription_status: null, is_admin: true, email: "admin@gmail.com" },
        { is_pro: true, subscription_status: null, is_admin: true, email: "lead@uni.ac.uk" },
        { is_pro: true, subscription_status: null, email: "friend@nhs.net" },
        { is_pro: false, subscription_status: null, email: "nope@uni.ac.uk" },
      ],
      { paying: 1, trialing: 1, billedCustomerIds: ["cus_pay", "cus_trial"] }
    );

    assert.equal(breakdown.usingPro, 8);
    assert.equal(breakdown.complimentary, 6);
    assert.deepEqual(breakdown.complimentaryBreakdown, {
      students: 3,
      staff: 2,
      friendsAndDoctors: 1,
    });
    assert.equal(
      breakdown.complimentaryBreakdown.students +
        breakdown.complimentaryBreakdown.staff +
        breakdown.complimentaryBreakdown.friendsAndDoctors,
      breakdown.complimentary
    );
  });

  it("still adds up when Stripe has not named which active profile is unpaid", () => {
    const breakdown = countProAccess(
      [
        { is_pro: true, subscription_status: "active", email: "pay@nhs.net" },
        { is_pro: true, subscription_status: "active", email: "stale@gmail.com" },
        { is_pro: true, subscription_status: null, email: "student@uni.ac.uk" },
      ],
      { paying: 1, trialing: 0 }
    );

    assert.equal(breakdown.complimentary, 2);
    assert.deepEqual(breakdown.complimentaryBreakdown, { students: 1, staff: 0, friendsAndDoctors: 1 });
  });
});
