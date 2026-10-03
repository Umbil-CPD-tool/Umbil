import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  openaiSpendFromBuckets,
  parseOpenAICostBuckets,
  parseTogetherBalanceUsd,
  parseTogetherUsageBuckets,
  spendWindows,
  togetherSpendFromPayloads,
} from "./modelSpend";

const NOW = new Date("2026-10-03T12:00:00.000Z");
const day = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

describe("OpenAI costs", () => {
  it("sums daily invoice buckets once, including the August chat switch", () => {
    const buckets = parseOpenAICostBuckets({
      data: [
        {
          start_time: day("2026-08-30T00:00:00.000Z"),
          results: [{ amount: { value: 4.0, currency: "usd" } }, { amount: { value: 0.46, currency: "usd" } }],
        },
        {
          start_time: day("2026-09-30T00:00:00.000Z"),
          results: [{ amount: { value: 0.19, currency: "usd" } }],
        },
        {
          start_time: day("2026-10-02T00:00:00.000Z"),
          results: [{ amount: { value: 0.4, currency: "usd" } }],
        },
      ],
    });

    const spend = openaiSpendFromBuckets(buckets, NOW);
    assert.equal(spend.spentSinceAug30Usd, 5.05);
    assert.equal(spend.spent7dUsd, 0.59);
    assert.equal(spend.spent30dUsd, 0.59);
    assert.equal(spend.status, "ok");
  });

  it("windows a bucket by its start time", () => {
    const windows = spendWindows(
      [
        { start: day("2026-09-01T00:00:00.000Z"), usd: 10 },
        { start: day("2026-10-01T00:00:00.000Z"), usd: 1.5 },
      ],
      NOW,
      new Date("2026-08-30T00:00:00.000Z")
    );
    assert.equal(windows.spentSinceUsd, 11.5);
    assert.equal(windows.spent7dUsd, 1.5);
    assert.equal(windows.spent30dUsd, 1.5);
  });
});

describe("Together billing", () => {
  it("reads the credit balance the billing page shows", () => {
    assert.equal(parseTogetherBalanceUsd({ balance: 139.08, currency: "USD" }), 139.08);
    assert.equal(parseTogetherBalanceUsd({ data: { credit_balance: 139.08 } }), 139.08);
  });

  it("sums usage cost rows for the last 7 and 30 days", () => {
    const spend = togetherSpendFromPayloads(
      { balance: 139.08 },
      {
        data: [
          { date: "2026-09-02", cost: 20 },
          { date: "2026-10-01", total_cost: 0.05 },
        ],
      },
      NOW
    );
    assert.equal(spend.creditsLeftUsd, 139.08);
    assert.equal(spend.spent30dUsd, 0.05);
    assert.equal(spend.spent7dUsd, 0.05);
    assert.equal(spend.status, "ok");
  });

  it("keeps the credit balance when usage has no cost field", () => {
    const buckets = parseTogetherUsageBuckets({ data: [{ date: "2026-10-01", tokens: 100 }] });
    assert.equal(buckets.length, 0);
    const spend = togetherSpendFromPayloads({ balance: 139.08 }, { data: [{ date: "2026-10-01", tokens: 100 }] }, NOW);
    assert.equal(spend.creditsLeftUsd, 139.08);
    assert.equal(spend.spent30dUsd, null);
  });
});
