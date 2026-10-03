import {
  OPENAI_CHAT_STARTED_AT,
  emptyOpenAISpend,
  emptyTogetherSpend,
  modelSpendNote,
  openaiSpendFromBuckets,
  parseOpenAICostBuckets,
  togetherSpendFromPayloads,
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

  const start = Math.floor(new Date(OPENAI_CHAT_STARTED_AT).getTime() / 1000);
  const buckets = [];
  let page: string | null = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
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

const loadTogether = async (now: Date): Promise<ModelSpendReport["together"]> => {
  const key = process.env.TOGETHER_API_KEY;
  if (!key) return emptyTogetherSpend("missing_key");

  const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };
  const balanceResponse = await fetch("https://api.together.xyz/v1/billing/balance", { headers, cache: "no-store" });
  if (!balanceResponse.ok) return emptyTogetherSpend(statusFromResponse(balanceResponse.status));
  const balance = await readJson(balanceResponse);

  const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const end = now.toISOString().slice(0, 10);
  const usageUrl = `https://api.together.xyz/v1/billing/usage?start_date=${start}&end_date=${end}`;
  const usageResponse = await fetch(usageUrl, { headers, cache: "no-store" });
  const usage = usageResponse.ok ? await readJson(usageResponse) : null;
  return togetherSpendFromPayloads(balance, usage, now);
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
