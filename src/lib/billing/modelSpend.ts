/** Chat moved to OpenAI on this day. Earlier ask traffic was Together. */
export const OPENAI_CHAT_STARTED_AT = "2026-08-30T00:00:00.000Z";

const DAY_SECONDS = 24 * 60 * 60;

export type SpendWindows = {
  spent7dUsd: number;
  spent30dUsd: number;
  spentSinceUsd: number;
};

export type ProviderBillingStatus = "ok" | "missing_key" | "forbidden" | "error";

export type OpenAISpend = {
  status: ProviderBillingStatus;
  spent7dUsd: number | null;
  spent30dUsd: number | null;
  spentSinceAug30Usd: number | null;
};

export type TogetherSpend = {
  status: ProviderBillingStatus;
  creditsLeftUsd: number | null;
  spent7dUsd: number | null;
  spent30dUsd: number | null;
};

export type ModelSpendReport = {
  openai: OpenAISpend;
  together: TogetherSpend;
  note: string;
};

export type CostBucket = {
  start: number;
  usd: number;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const roundUsd = (value: number): number => Math.round(value * 100) / 100;

const firstNumber = (row: Record<string, unknown>, keys: string[]): number | null => {
  for (const key of keys) {
    const direct = asNumber(row[key]);
    if (direct != null) return direct;
    const nested = asRecord(row[key]);
    const nestedValue = nested ? asNumber(nested.value) : null;
    if (nestedValue != null) return nestedValue;
  }
  return null;
};

const timeOf = (row: Record<string, unknown>): number | null => {
  const unix = asNumber(row.start_time) ?? asNumber(row.timestamp) ?? asNumber(row.created);
  if (unix != null) return unix > 10_000_000_000 ? Math.floor(unix / 1000) : unix;
  const text = row.date ?? row.day ?? row.start_date;
  if (typeof text !== "string") return null;
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? null : Math.floor(parsed / 1000);
};

export const parseOpenAICostBuckets = (payload: unknown): CostBucket[] => {
  const root = asRecord(payload);
  const data = Array.isArray(root?.data) ? root.data : [];
  const buckets: CostBucket[] = [];
  for (const item of data) {
    const row = asRecord(item);
    if (!row) continue;
    const start = timeOf(row) ?? 0;
    const results = Array.isArray(row.results) ? row.results : [row];
    let usd = 0;
    let found = false;
    for (const result of results) {
      const record = asRecord(result);
      if (!record) continue;
      const value = firstNumber(record, ["amount", "cost"]);
      if (value == null) continue;
      usd += value;
      found = true;
    }
    if (found) buckets.push({ start, usd });
  }
  return buckets;
};

export const spendWindows = (buckets: CostBucket[], now: Date, since: Date): SpendWindows => {
  const nowSec = Math.floor(now.getTime() / 1000);
  const sinceSec = Math.floor(since.getTime() / 1000);
  const sum = (from: number) => roundUsd(buckets.filter((bucket) => bucket.start >= from).reduce((total, bucket) => total + bucket.usd, 0));
  return {
    spent7dUsd: sum(nowSec - 7 * DAY_SECONDS),
    spent30dUsd: sum(nowSec - 30 * DAY_SECONDS),
    spentSinceUsd: sum(sinceSec),
  };
};

export const parseTogetherBalanceUsd = (payload: unknown): number | null => {
  const root = asRecord(payload);
  if (!root) return null;
  const direct = firstNumber(root, ["balance", "total_balance", "credit_balance", "remaining_balance", "credits"]);
  if (direct != null) return roundUsd(direct);
  const nested = asRecord(root.data) ?? asRecord(root.result);
  return nested ? parseTogetherBalanceUsd(nested) : null;
};

export const parseTogetherUsageBuckets = (payload: unknown): CostBucket[] => {
  const arrays: unknown[][] = [];
  const visit = (value: unknown, depth: number) => {
    if (depth > 4 || value == null) return;
    if (Array.isArray(value)) {
      arrays.push(value);
      for (const item of value) visit(item, depth + 1);
      return;
    }
    const row = asRecord(value);
    if (!row) return;
    for (const child of Object.values(row)) visit(child, depth + 1);
  };
  visit(payload, 0);

  const buckets: CostBucket[] = [];
  for (const list of arrays) {
    for (const item of list) {
      const row = asRecord(item);
      if (!row) continue;
      const usd = firstNumber(row, ["cost", "total_cost", "cost_usd", "amount", "spend", "usd"]);
      const start = timeOf(row);
      if (usd == null || start == null) continue;
      buckets.push({ start, usd });
    }
  }
  return buckets;
};

export const emptyOpenAISpend = (status: ProviderBillingStatus): OpenAISpend => ({
  status,
  spent7dUsd: null,
  spent30dUsd: null,
  spentSinceAug30Usd: null,
});

export const emptyTogetherSpend = (status: ProviderBillingStatus): TogetherSpend => ({
  status,
  creditsLeftUsd: null,
  spent7dUsd: null,
  spent30dUsd: null,
});

export const openaiSpendFromBuckets = (buckets: CostBucket[], now = new Date()): OpenAISpend => {
  const windows = spendWindows(buckets, now, new Date(OPENAI_CHAT_STARTED_AT));
  return {
    status: "ok",
    spent7dUsd: windows.spent7dUsd,
    spent30dUsd: windows.spent30dUsd,
    spentSinceAug30Usd: windows.spentSinceUsd,
  };
};

export const togetherSpendFromPayloads = (
  balancePayload: unknown,
  usagePayload: unknown | null,
  now = new Date()
): TogetherSpend => {
  const creditsLeftUsd = parseTogetherBalanceUsd(balancePayload);
  const buckets = usagePayload == null ? [] : parseTogetherUsageBuckets(usagePayload);
  const windows = buckets.length ? spendWindows(buckets, now, new Date(0)) : null;
  return {
    status: creditsLeftUsd == null && !windows ? "error" : "ok",
    creditsLeftUsd,
    spent7dUsd: windows?.spent7dUsd ?? null,
    spent30dUsd: windows?.spent30dUsd ?? null,
  };
};

export const modelSpendNote = (report: Pick<ModelSpendReport, "openai" | "together">): string => {
  const parts = [
    "OpenAI is the main Ask chat from 30 August. Together still runs tools, reflection, and the other models.",
  ];
  if (report.openai.status === "missing_key") {
    parts.push("OpenAI spend needs an admin key named OPENAI_ADMIN_KEY with Costs read. The chat key cannot see invoices.");
  } else if (report.openai.status === "forbidden") {
    parts.push("OpenAI rejected the admin key. It needs Costs read access.");
  }
  if (report.together.status === "forbidden") {
    parts.push("Together rejected the billing read. The API key needs billing access.");
  } else if (report.together.status === "missing_key") {
    parts.push("Together billing needs TOGETHER_API_KEY.");
  }
  return parts.join(" ");
};
