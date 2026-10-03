import {
  BILLING_HISTORY_START,
  TOGETHER_CREDIT_TOPUP_USD,
  emptyOpenAISpend,
  emptyTogetherSpend,
  llmCostFromParts,
  modelSpendNote,
  openaiSpendFromBuckets,
  parseOpenAICostBuckets,
  parseTogetherBalanceUsd,
  togetherSpendFromUsage,
  togetherSpentFromCredit,
  type ModelSpendReport,
  type ProviderBillingStatus,
} from "@/lib/billing/modelSpend";

const statusFromResponse = (status: number): ProviderBillingStatus => {
  if (status === 401 || status === 403) return "forbidden";
  return "error";
};

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const loadOpenAI = async (now: Date): Promise<ModelSpendReport["openai"]> => {
  const key = process.env.OPENAI_ADMIN_KEY;
  if (!key) return emptyOpenAISpend("missing_key");

  const start = Math.floor(new Date(BILLING_HISTORY_START).getTime() / 1000);
  const buckets = [];
  let page: string | null = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const url = new URL("https://api.openai.com/v1/organization/costs");
    url.searchParams.set("start_time", String(start));
    url.searchParams.set("bucket_width", "1d");
    url.searchParams.set("limit", "180");
    if (page) url.searchParams.set("page", page);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return emptyOpenAISpend(statusFromResponse(response.status));
    const payload = await readJson(response);
    buckets.push(...parseOpenAICostBuckets(payload));
    const root = payload !== null && typeof payload === "object" ? (payload as { next_page?: unknown; has_more?: unknown }) : null;
    page = typeof root?.next_page === "string" && root.next_page ? root.next_page : null;
    if (!page || root?.has_more === false) break;
  }
  return openaiSpendFromBuckets(buckets, now);
};

const DAY_MS = 24 * 60 * 60 * 1000;

const togetherTopUpUsd = (): number => {
  const raw = process.env.TOGETHER_CREDIT_TOPUP_USD;
  const parsed = raw == null ? Number.NaN : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : TOGETHER_CREDIT_TOPUP_USD;
};

const loadTogetherBalance = async (key: string): Promise<number | null> => {
  const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };
  for (const url of ["https://api.together.xyz/v1/billing/balance", "https://api.together.ai/v1/billing/balance"]) {
    const response = await fetch(url, { headers, cache: "no-store" });
    if (!response.ok) continue;
    const balance = parseTogetherBalanceUsd(await readJson(response));
    if (balance != null) return balance;
  }
  return null;
};

const loadGbpPerUsd = async (): Promise<number | null> => {
  const response = await fetch("https://api.frankfurter.app/latest?from=USD&to=GBP", { cache: "no-store" });
  if (!response.ok) return null;
  const payload = await readJson(response);
  const rates = payload !== null && typeof payload === "object" ? (payload as { rates?: { GBP?: unknown } }).rates : null;
  const rate = typeof rates?.GBP === "number" ? rates.GBP : null;
  return rate != null && rate > 0 ? rate : null;
};

const loadTogether = async (now: Date): Promise<ModelSpendReport["together"]> => {
  const key = process.env.TOGETHER_API_KEY;
  if (!key) return emptyTogetherSpend("missing_key");

  const creditsLeft = await loadTogetherBalance(key);
  if (creditsLeft != null) {
    return {
      status: "ok",
      spent7dUsd: null,
      spent30dUsd: null,
      spentAllUsd: togetherSpentFromCredit(togetherTopUpUsd(), creditsLeft),
    };
  }

  const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };
  const payloads: unknown[] = [];
  let cursor = new Date(BILLING_HISTORY_START).getTime();
  const endMs = now.getTime();
  while (cursor < endMs) {
    const chunkEnd = Math.min(endMs, cursor + 180 * DAY_MS);
    const startDate = new Date(cursor).toISOString().slice(0, 10);
    const endDate = new Date(chunkEnd).toISOString().slice(0, 10);
    const response = await fetch(
      `https://api.together.xyz/v1/billing/usage?start_date=${startDate}&end_date=${endDate}`,
      { headers, cache: "no-store" }
    );
    if (!response.ok) {
      if (payloads.length === 0) return emptyTogetherSpend(statusFromResponse(response.status));
      break;
    }
    payloads.push(await readJson(response));
    const next = chunkEnd + DAY_MS;
    if (next <= cursor) break;
    cursor = next;
  }
  return togetherSpendFromUsage(payloads, now);
};

export const loadModelSpend = async (now = new Date()): Promise<ModelSpendReport> => {
  const [openaiResult, togetherResult, gbpPerUsd] = await Promise.all([
    loadOpenAI(now).catch(() => emptyOpenAISpend("error")),
    loadTogether(now).catch(() => emptyTogetherSpend("error")),
    loadGbpPerUsd().catch(() => null),
  ]);
  const report = {
    openai: openaiResult,
    together: togetherResult,
    llm: llmCostFromParts(togetherResult.spentAllUsd, openaiResult.spentAllUsd, gbpPerUsd),
    note: "",
  };
  report.note = modelSpendNote(report);
  return report;
};
