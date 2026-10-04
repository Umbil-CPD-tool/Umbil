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
    });
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
  });
});
