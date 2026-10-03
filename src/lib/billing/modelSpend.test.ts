import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  openaiSpendFromBuckets,
  parseOpenAICostBuckets,
  parseTogetherUsageBuckets,
  spendWindows,
  togetherSpendFromUsage,
} from "./modelSpend";

const NOW = new Date("2026-10-03T12:00:00.000Z");
const day = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

describe("OpenAI costs", () => {
  it("sums daily invoice buckets once, including the August chat switch", () => {
    const buckets = parseOpenAICostBuckets({
      data: [
        {
          start_time: day("2026-01-15T00:00:00.000Z"),
          results: [{ amount: { value: 1.25, currency: "usd" } }],
        },
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
    assert.equal(spend.spentAllUsd, 6.3);
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
  it("sums all usage rows, and still splits the recent days", () => {
    const spend = togetherSpendFromUsage(
      [
        {
          data: [
            { date: "2025-06-01", cost: 40 },
            { date: "2026-09-02", cost: 20 },
            { date: "2026-10-01", total_cost: 0.05 },
          ],
        },
      ],
      NOW
    );
    assert.equal(spend.spentAllUsd, 60.05);
    assert.equal(spend.spent30dUsd, 0.05);
    assert.equal(spend.spent7dUsd, 0.05);
    assert.equal(spend.status, "ok");
  });

  it("uses a single total when the usage response has no daily costs", () => {
    const buckets = parseTogetherUsageBuckets({ data: [{ date: "2026-10-01", tokens: 100 }] });
    assert.equal(buckets.length, 0);
    const spend = togetherSpendFromUsage([{ total_cost: 45.92 }], NOW);
    assert.equal(spend.spentAllUsd, 45.92);
    assert.equal(spend.spent30dUsd, null);
  });
});
