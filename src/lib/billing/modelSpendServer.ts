import {
  BILLING_HISTORY_START,
  TOGETHER_CREDITS_LEFT_USD,
  TOGETHER_CREDIT_TOPUP_USD,
  emptyOpenAISpend,
  emptyTogetherSpend,
  llmCostFromParts,
  modelSpendNote,
  openaiSpendFromBuckets,
  parseOpenAICostBuckets,
  parseTogetherBalanceUsd,
  togetherSpentFromCredit,
  type ModelSpendReport,
} from "@/lib/billing/modelSpend";

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const OPENAI_SLICE_SECONDS = 31 * 24 * 60 * 60;

const loadOpenAISlice = async (key: string, start: number, end: number) => {
  const url = new URL("https://api.openai.com/v1/organization/costs");
  url.searchParams.set("start_time", String(start));
  url.searchParams.set("end_time", String(end));
  url.searchParams.set("bucket_width", "1d");
  url.searchParams.set("limit", "31");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    console.error("OpenAI costs slice failed:", response.status);
    return null;
  }
  return parseOpenAICostBuckets(await readJson(response));
};

const loadOpenAI = async (now: Date): Promise<ModelSpendReport["openai"]> => {
  const key = process.env.OPENAI_ADMIN_KEY;
  if (!key) return emptyOpenAISpend("missing_key");

  const historyStart = Math.floor(new Date(BILLING_HISTORY_START).getTime() / 1000);
  const nowSec = Math.floor(now.getTime() / 1000);
  const slices: Array<Promise<ReturnType<typeof parseOpenAICostBuckets> | null>> = [];
  for (let start = historyStart; start < nowSec; start += OPENAI_SLICE_SECONDS) {
    const end = Math.min(nowSec, start + OPENAI_SLICE_SECONDS);
    if (end - start < 24 * 60 * 60) continue;
    slices.push(loadOpenAISlice(key, start, end));
  }
  const results = await Promise.all(slices);
  const buckets = results.flatMap((slice) => slice ?? []);
  if (results.every((slice) => slice == null)) return emptyOpenAISpend("error");
  return openaiSpendFromBuckets(buckets, now);
};

const togetherTopUpUsd = (): number => {
  const raw = process.env.TOGETHER_CREDIT_TOPUP_USD;
  const parsed = raw == null ? Number.NaN : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : TOGETHER_CREDIT_TOPUP_USD;
};

const loadTogetherBalance = async (key: string): Promise<number | null> => {
  const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };
  for (const url of ["https://api.together.xyz/v1/billing/balance", "https://api.together.ai/v1/billing/balance"]) {
    const response = await fetch(url, { headers, cache: "no-store" });
    if (!response.ok) {
      console.error("Together balance failed:", response.status);
      continue;
    }
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

const loadTogether = async (): Promise<ModelSpendReport["together"]> => {
  const key = process.env.TOGETHER_API_KEY;
  const creditsLeft = key ? await loadTogetherBalance(key) : null;
  const balance = creditsLeft ?? TOGETHER_CREDITS_LEFT_USD;
  return {
    status: "ok",
    spent7dUsd: null,
    spent30dUsd: null,
    spentAllUsd: togetherSpentFromCredit(togetherTopUpUsd(), balance),
  };
};

export const loadModelSpend = async (now = new Date()): Promise<ModelSpendReport> => {
  const [openaiResult, togetherResult, gbpPerUsd] = await Promise.all([
    loadOpenAI(now).catch(() => emptyOpenAISpend("error")),
    loadTogether().catch(() => emptyTogetherSpend("error")),
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
