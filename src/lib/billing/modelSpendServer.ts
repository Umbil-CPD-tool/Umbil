import {
  BILLING_HISTORY_START,
  emptyOpenAISpend,
  emptyTogetherSpend,
  modelSpendNote,
  openaiSpendFromBuckets,
  parseOpenAICostBuckets,
  togetherSpendFromUsage,
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

const loadTogether = async (now: Date): Promise<ModelSpendReport["together"]> => {
  const key = process.env.TOGETHER_API_KEY;
  if (!key) return emptyTogetherSpend("missing_key");

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
  const [openaiResult, togetherResult] = await Promise.all([
    loadOpenAI(now).catch(() => emptyOpenAISpend("error")),
    loadTogether(now).catch(() => emptyTogetherSpend("error")),
  ]);
  const report = { openai: openaiResult, together: togetherResult, note: "" };
  report.note = modelSpendNote(report);
  return report;
};
