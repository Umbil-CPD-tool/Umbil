import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CANONICAL_SITE_ORIGIN,
  escapeHtml,
  getAppBaseUrl,
  isSingleEmailAddress,
  safeInternalPath,
  toAbsoluteHttpOrigin,
} from "./security";
import { checkRateLimit } from "./rate-limit";
import { isProPlanType, isStripePlanType, STRIPE_PRICES } from "./stripePrices";
import {
  MAX_ANSWER_FIELDS,
  MAX_TEXT_ANSWER_CHARS,
  isValidAnswerMap,
  isValidFreeText,
} from "./feedbackLimits";

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

describe("toAbsoluteHttpOrigin", () => {
  it("accepts a normal https origin", () => {
    assert.equal(toAbsoluteHttpOrigin("https://umbil.co.uk"), "https://umbil.co.uk");
    assert.equal(toAbsoluteHttpOrigin("https://umbil.co.uk/"), "https://umbil.co.uk");
  });

  it("repairs values Stripe would reject as return_url", () => {
    assert.equal(toAbsoluteHttpOrigin("umbil.co.uk"), "https://umbil.co.uk");
    assert.equal(toAbsoluteHttpOrigin("  https://umbil.co.uk  "), "https://umbil.co.uk");
    assert.equal(toAbsoluteHttpOrigin('"https://umbil.co.uk"'), "https://umbil.co.uk");
    assert.equal(toAbsoluteHttpOrigin("www.umbil.co.uk"), "https://www.umbil.co.uk");
  });

  it("rejects empty or non-http values", () => {
    assert.equal(toAbsoluteHttpOrigin(""), null);
    assert.equal(toAbsoluteHttpOrigin("   "), null);
    assert.equal(toAbsoluteHttpOrigin("javascript:alert(1)"), null);
    assert.equal(toAbsoluteHttpOrigin(null), null);
  });
});

describe("getAppBaseUrl", () => {
  const keys = ["NEXT_PUBLIC_SITE_URL", "VERCEL_PROJECT_PRODUCTION_URL", "NODE_ENV"] as const;

  const withEnv = (overrides: Partial<Record<(typeof keys)[number], string | undefined>>, fn: () => void) => {
    const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    try {
      for (const key of keys) {
        const next = overrides[key];
        if (next === undefined) delete process.env[key];
        else process.env[key] = next;
      }
      fn();
    } finally {
      for (const key of keys) {
        const next = previous[key];
        if (next === undefined) delete process.env[key];
        else process.env[key] = next;
      }
    }
  };

  it("falls back to the live site when env is missing in production", () => {
    withEnv({ NEXT_PUBLIC_SITE_URL: undefined, VERCEL_PROJECT_PRODUCTION_URL: undefined, NODE_ENV: "production" }, () => {
      assert.equal(getAppBaseUrl(), CANONICAL_SITE_ORIGIN);
    });
  });

  it("does not send localhost to Stripe in production", () => {
    withEnv(
      { NEXT_PUBLIC_SITE_URL: "http://localhost:3000", VERCEL_PROJECT_PRODUCTION_URL: undefined, NODE_ENV: "production" },
      () => {
        assert.equal(getAppBaseUrl(), CANONICAL_SITE_ORIGIN);
      }
    );
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

describe("isSingleEmailAddress", () => {
  it("accepts one ordinary colleague address", () => {
    assert.equal(isSingleEmailAddress("colleague@nhs.net"), true);
    assert.equal(isSingleEmailAddress(" colleague@nhs.net "), true);
    assert.equal(isSingleEmailAddress("first.last+msf@example.co.uk"), true);
  });

  it("rejects anything that could fan out to many recipients", () => {
    assert.equal(isSingleEmailAddress(["a@x.com", "b@x.com"]), false);
    assert.equal(isSingleEmailAddress("a@x.com, b@x.com"), false);
    assert.equal(isSingleEmailAddress("a@x.com; b@x.com"), false);
    assert.equal(isSingleEmailAddress("Someone <a@x.com>"), false);
    assert.equal(isSingleEmailAddress("not-an-email"), false);
    assert.equal(isSingleEmailAddress(""), false);
    assert.equal(isSingleEmailAddress(null), false);
  });
});

describe("feedback submission validation", () => {
  it("accepts a normal mixed survey submission", () => {
    assert.equal(
      isValidAnswerMap({ q1: 5, q2: 0, custom_0: "Very kind and thorough", consent: true }),
      true
    );
  });

  it("rejects shapes that are not an answer map", () => {
    assert.equal(isValidAnswerMap([1, 2, 3]), false);
    assert.equal(isValidAnswerMap(null), false);
    assert.equal(isValidAnswerMap("q1=5"), false);
    assert.equal(isValidAnswerMap({}), false);
  });

  it("rejects padded submissions that would bloat the database", () => {
    const tooManyFields = Object.fromEntries(
      Array.from({ length: MAX_ANSWER_FIELDS + 1 }, (_, i) => [`q${i}`, 3])
    );
    assert.equal(isValidAnswerMap(tooManyFields), false);
    assert.equal(isValidAnswerMap({ q1: "x".repeat(MAX_TEXT_ANSWER_CHARS + 1) }), false);
    assert.equal(isValidAnswerMap({ q1: { nested: "object" } }), false);
  });

  it("treats missing optional comments as valid", () => {
    assert.equal(isValidFreeText(undefined), true);
    assert.equal(isValidFreeText(null), true);
    assert.equal(isValidFreeText("Great communicator"), true);
    assert.equal(isValidFreeText("x".repeat(MAX_TEXT_ANSWER_CHARS + 1)), false);
  });
});
