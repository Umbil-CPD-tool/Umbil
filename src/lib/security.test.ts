import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeHtml, safeInternalPath } from "./security";
import { checkRateLimit } from "./rate-limit";
import { isProPlanType, isStripePlanType, STRIPE_PRICES } from "./stripePrices";

describe("safeInternalPath", () => {
  it("allows relative app paths used after login", () => {
    assert.equal(safeInternalPath("/settings"), "/settings");
    assert.equal(safeInternalPath("/blog/admin"), "/blog/admin");
    assert.equal(safeInternalPath("/pro"), "/pro");
    assert.equal(safeInternalPath("/profile"), "/profile");
  });

  it("rejects open redirects", () => {
    assert.equal(safeInternalPath("https://evil.com"), "/");
    assert.equal(safeInternalPath("//evil.com"), "/");
    assert.equal(safeInternalPath("/\\evil.com"), "/");
    assert.equal(safeInternalPath("https://evil.com"), "/");
    assert.equal(safeInternalPath("/auth?next=https://evil.com"), "/");
  });

  it("falls back when missing", () => {
    assert.equal(safeInternalPath(null, "/dashboard"), "/dashboard");
    assert.equal(safeInternalPath("", "/dashboard"), "/dashboard");
  });
});

describe("escapeHtml", () => {
  it("neutralizes script tags in print HTML", () => {
    const out = escapeHtml('<img src=x onerror="alert(1)">');
    assert.equal(out.includes("<img"), false);
    assert.equal(out.includes("&lt;img"), true);
  });

  it("does not throw on a missing report title", () => {
    assert.equal(escapeHtml(null), "");
    assert.equal(escapeHtml(undefined), "");
    assert.equal(escapeHtml(4.25), "4.25");
  });
});

describe("stripePrices", () => {
  it("accepts only known plan types", () => {
    assert.equal(isStripePlanType("pro_monthly"), true);
    assert.equal(isStripePlanType("price_1TgCHkEwbwdYfgj4xSqguUmo"), false);
    assert.equal(isProPlanType("pro_annual"), true);
    assert.equal(isProPlanType("team_monthly"), false);
    assert.ok(STRIPE_PRICES.pro_monthly.startsWith("price_"));
  });
});

describe("checkRateLimit", () => {
  it("allows up to max then blocks", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    assert.equal(checkRateLimit(key, 2, 60_000), true);
    assert.equal(checkRateLimit(key, 2, 60_000), true);
    assert.equal(checkRateLimit(key, 2, 60_000), false);
  });
});
