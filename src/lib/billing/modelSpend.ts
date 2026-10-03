/** Earliest day we ask OpenAI for invoices. Umbil's account starts after this. */
export const BILLING_HISTORY_START = "2025-09-01T00:00:00.000Z";

/** Credits bought on Together. Spend is this minus the balance still on the account. */
export const TOGETHER_CREDIT_TOPUP_USD = 185;

/** Used only when Together will not return the live balance. From the billing page. */
export const TOGETHER_CREDITS_LEFT_USD = 139.08;

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
  spentAllUsd: number | null;
};

export type TogetherSpend = {
  status: ProviderBillingStatus;
  spent7dUsd: number | null;
  spent30dUsd: number | null;
  spentAllUsd: number | null;
};

export type LlmCost = {
  togetherUsd: number | null;
  openaiUsd: number | null;
  totalUsd: number | null;
  totalGbp: number | null;
};

export type ModelSpendReport = {
  openai: OpenAISpend;
  together: TogetherSpend;
  llm: LlmCost;
  note: string;
};

export type CostBucket = {
  start: number;
  usd: number;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
};

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
  spentAllUsd: null,
});

export const emptyTogetherSpend = (status: ProviderBillingStatus): TogetherSpend => ({
  status,
  spent7dUsd: null,
  spent30dUsd: null,
  spentAllUsd: null,
});

export const openaiSpendFromBuckets = (buckets: CostBucket[], now = new Date()): OpenAISpend => {
  const windows = spendWindows(buckets, now, new Date(0));
  return {
    status: "ok",
    spent7dUsd: windows.spent7dUsd,
    spent30dUsd: windows.spent30dUsd,
    spentAllUsd: windows.spentSinceUsd,
  };
};

const togetherTotalUsd = (payload: unknown): number | null => {
  const root = asRecord(payload);
  if (!root) return null;
  return firstNumber(root, ["total_cost", "total_spend", "spend", "cost"]);
};

export const togetherSpendFromUsage = (payloads: unknown[], now = new Date()): TogetherSpend => {
  const buckets = payloads.flatMap((payload) => parseTogetherUsageBuckets(payload));
  if (buckets.length > 0) {
    const windows = spendWindows(buckets, now, new Date(0));
    return {
      status: "ok",
      spent7dUsd: windows.spent7dUsd,
      spent30dUsd: windows.spent30dUsd,
      spentAllUsd: windows.spentSinceUsd,
    };
  }
  const totals = payloads.map(togetherTotalUsd).filter((value): value is number => value != null);
  if (totals.length === 0) return emptyTogetherSpend("error");
  return {
    status: "ok",
    spent7dUsd: null,
    spent30dUsd: null,
    spentAllUsd: roundUsd(totals.reduce((sum, value) => sum + value, 0)),
  };
};

export const parseTogetherBalanceUsd = (payload: unknown): number | null => {
  const root = asRecord(payload);
  if (!root) return null;
  const direct = firstNumber(root, ["balance", "total_balance", "credit_balance", "remaining_balance", "credits"]);
  if (direct != null) return roundUsd(direct);
  for (const key of ["balance", "credit_balance", "credits"]) {
    const nested = asRecord(root[key]);
    if (!nested) continue;
    const amount = firstNumber(nested, ["value", "amount", "usd", "total", "balance"]);
    if (amount != null) return roundUsd(amount);
  }
  const nested = asRecord(root.data) ?? asRecord(root.result);
  return nested ? parseTogetherBalanceUsd(nested) : null;
};

/** Together does not return lifetime spend. It is the credit bought minus the credit left. */
export const togetherSpentFromCredit = (topUpUsd: number, creditsLeftUsd: number): number =>
  roundUsd(topUpUsd - creditsLeftUsd);

export const llmCostFromParts = (
  togetherUsd: number | null,
  openaiUsd: number | null,
  gbpPerUsd: number | null
): LlmCost => {
  if (togetherUsd == null || openaiUsd == null) {
    return { togetherUsd, openaiUsd, totalUsd: null, totalGbp: null };
  }
  const totalUsd = roundUsd(togetherUsd + openaiUsd);
  return {
    togetherUsd,
    openaiUsd,
    totalUsd,
    totalGbp: gbpPerUsd == null ? null : roundUsd(totalUsd * gbpPerUsd),
  };
};

export const modelSpendNote = (report: Pick<ModelSpendReport, "openai" | "together">): string => {
  const parts = [
    "Together spend is the $185 credit minus what is still on the account. OpenAI is the invoice. The total is converted to pounds at the latest dollar rate.",
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
