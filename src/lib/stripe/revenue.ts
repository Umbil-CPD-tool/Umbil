import {
  PLAN_LABELS,
  STRIPE_PLAN_TYPES,
  STRIPE_PRICES,
  parseCheckoutChannel,
  planFamily,
  type CheckoutChannel,
  type StripePlanType,
} from "@/lib/stripePrices";

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;
const MAX_PAGES = 20;

const PLAN_BY_PRICE = new Map<string, StripePlanType>(
  STRIPE_PLAN_TYPES.map((planType) => [STRIPE_PRICES[planType], planType])
);

export type BillingInterval = "day" | "week" | "month" | "year";

export type PlanFamily = "pro" | "team" | "other";

export type BillingItem = {
  priceId: string;
  unitAmount: number | null;
  currency: string;
  interval: BillingInterval | null;
  intervalCount?: number;
  quantity: number;
  label?: string;
  family?: PlanFamily;
};

export type BillingSubscription = {
  id: string;
  status: string;
  channel: CheckoutChannel | "unknown";
  percentOff?: number;
  items: BillingItem[];
};

export type BillingInvoiceLine = {
  priceId: string | null;
  amount: number;
};

export type BillingInvoice = {
  id: string;
  status: string;
  currency: string;
  amountPaid: number;
  created: number;
  subscriptionId: string | null;
  lines: BillingInvoiceLine[];
};

export type PriceCatalogEntry = {
  id: string;
  unitAmount: number | null;
  currency: string;
  interval: BillingInterval | null;
  intervalCount?: number;
  productName?: string | null;
  nickname?: string | null;
};

export type PlanRevenueRow = {
  planType: string;
  label: string;
  detail: string;
  earlier: boolean;
  family: PlanFamily;
  active: number;
  trialing: number;
  pastDue: number;
  mrrPence: number;
  collected30dPence: number;
  collectedAllPence: number;
};

export type CollectedMonth = {
  month: string;
  label: string;
  amountPence: number;
};

export type FamilyRevenueRow = {
  family: PlanFamily;
  label: string;
  active: number;
  trialing: number;
  pastDue: number;
  mrrPence: number;
  collected30dPence: number;
  collectedAllPence: number;
};

export type ChannelRevenueRow = {
  channel: CheckoutChannel | "unknown";
  label: string;
  active: number;
  mrrPence: number;
  collected30dPence: number;
  collectedAllPence: number;
};

export type StripeRevenueSummary = {
  currency: string;
  generatedAt: string;
  mrrPence: number;
  collected30dPence: number;
  collectedAllPence: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  pastDueSubscriptions: number;
  byPlan: PlanRevenueRow[];
  plansInUse: PlanRevenueRow[];
  byFamily: FamilyRevenueRow[];
  byChannel: ChannelRevenueRow[];
  collectedByMonth: CollectedMonth[];
  sourceNote: string | null;
  truncated: boolean;
  note: string;
};

type Page<T> = { data: T[]; has_more: boolean };

export type StripeRevenueSource = {
  listSubscriptions: (startingAfter?: string) => Promise<Page<unknown>>;
  listInvoices: (startingAfter?: string) => Promise<Page<unknown>>;
  listPrices?: (startingAfter?: string) => Promise<Page<unknown>>;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const intervalOf = (value: unknown): BillingInterval | null =>
  value === "day" || value === "week" || value === "month" || value === "year" ? value : null;

const priceIdFromUnknown = (value: unknown): string | null => {
  const direct = asString(value);
  if (direct) return direct;
  return asString(asRecord(value)?.id);
};

const inferFamily = (label: string): PlanFamily => {
  if (/team/i.test(label)) return "team";
  if (/\bpro\b/i.test(label) || /\bumbil\b/i.test(label)) return "pro";
  return "other";
};

const cadenceWord = (interval: BillingInterval | null): string => {
  if (interval === "year") return "annual";
  if (interval === "month") return "monthly";
  if (interval === "week") return "weekly";
  return "plan";
};

/** Human name for a Stripe price, including the earlier £15 Pro price. */
export const describeStripePrice = (facts: {
  priceId: string;
  unitAmount: number | null;
  currency: string;
  interval: BillingInterval | null;
  productName?: string | null;
  nickname?: string | null;
}): { label: string; detail: string; family: PlanFamily; earlier: boolean } => {
  const known = PLAN_BY_PRICE.get(facts.priceId);
  const text = `${facts.productName ?? ""} ${facts.nickname ?? ""}`;
  let family: PlanFamily = known ? planFamily(known) : inferFamily(text);
  const monthlyLegacy = !known && facts.interval === "month" && facts.unitAmount === 1500;
  const annualLegacy = !known && facts.interval === "year" && facts.unitAmount === 15000;
  if (family === "other" && (monthlyLegacy || annualLegacy)) family = "pro";

  const title = family === "team" ? "Team" : family === "pro" ? "Pro" : "Other";
  const label = family === "other" ? "Other plan" : `${title} ${cadenceWord(facts.interval)}`;
  const amount = facts.unitAmount;
  const priceText = amount == null ? "" : formatMinorUnits(amount, facts.currency || "gbp");
  let detail = "";
  if (facts.interval === "month" && priceText) detail = `${priceText} a month`;
  if (facts.interval === "year" && priceText && amount != null) {
    detail = `${priceText} a year · ${formatMinorUnits(Math.round(amount / 12), facts.currency || "gbp")} a month`;
  }
  if (!detail && priceText) detail = priceText;
  const earlier = !known;
  if (detail && earlier) detail = `${detail} · earlier price`;
  if (detail && known) detail = `${detail} · current price`;
  if (!detail && known) detail = "Current price";
  return { label, detail, family, earlier };
};

const productLabel = (price: Record<string, unknown> | null): string | undefined => {
  if (!price) return undefined;
  const nickname = asString(price.nickname);
  const product = asRecord(price.product);
  const productName = product ? asString(product.name) : null;
  const interval = intervalOf(asRecord(price.recurring)?.interval ?? price.interval);
  const intervalLabel = interval === "year" ? "annual" : interval === "month" ? "monthly" : interval;
  const name = [productName, nickname].filter(Boolean).join(" · ");
  if (name && intervalLabel) return `${name} (${intervalLabel})`;
  return name || undefined;
};

const toBillingItem = (raw: unknown): BillingItem | null => {
  const row = asRecord(raw);
  if (!row) return null;
  const price = asRecord(row.price) ?? asRecord(row.plan);
  const priceId = priceIdFromUnknown(row.price) ?? priceIdFromUnknown(row.plan);
  if (!priceId) return null;
  const recurring = price ? asRecord(price.recurring) : null;
  const quantity = asNumber(row.quantity) ?? 1;
  const label = productLabel(price);
  const intervalCount = asNumber(recurring?.interval_count) ?? (price ? asNumber(price.interval_count) : null);
  return {
    priceId,
    unitAmount: price ? asNumber(price.unit_amount) ?? asNumber(price.amount) : null,
    currency: (price ? asString(price.currency) : null) ?? "gbp",
    interval: intervalOf(recurring?.interval ?? price?.interval),
    intervalCount: intervalCount && intervalCount > 0 ? intervalCount : 1,
    quantity: quantity > 0 ? quantity : 1,
    label,
    family: label ? inferFamily(label) : "other",
  };
};

const percentOffFromSubscription = (row: Record<string, unknown>): number => {
  const discounts: Record<string, unknown>[] = [];
  const single = asRecord(row.discount);
  if (single) discounts.push(single);
  if (Array.isArray(row.discounts)) {
    for (const entry of row.discounts) {
      const record = asRecord(entry);
      if (record) discounts.push(record);
    }
  }
  for (const discount of discounts) {
    const coupon = asRecord(discount.coupon) ?? asRecord(asRecord(discount.source)?.coupon);
    const percent = coupon ? asNumber(coupon.percent_off) : null;
    if (percent != null && percent > 0 && percent <= 100) return percent;
  }
  return 0;
};

export const toBillingSubscription = (raw: unknown): BillingSubscription | null => {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asString(row.id);
  const status = asString(row.status);
  if (!id || !status) return null;
  const metadata = asRecord(row.metadata);
  const itemsRecord = asRecord(row.items);
  const data = Array.isArray(itemsRecord?.data) ? itemsRecord.data : [];
  return {
    id,
    status,
    channel: parseCheckoutChannel(metadata?.channel) ?? "unknown",
    percentOff: percentOffFromSubscription(row),
    items: data.map(toBillingItem).filter((item): item is BillingItem => item != null),
  };
};

const subscriptionIdFromInvoice = (row: Record<string, unknown>): string | null => {
  const direct = priceIdFromUnknown(row.subscription);
  if (direct) return direct;
  const parent = asRecord(row.parent);
  const details = parent ? asRecord(parent.subscription_details) : null;
  return details ? priceIdFromUnknown(details.subscription) : null;
};

const priceIdFromLine = (line: Record<string, unknown>): string | null => {
  const legacy = priceIdFromUnknown(line.price);
  if (legacy) return legacy;
  const pricing = asRecord(line.pricing);
  const details = pricing ? asRecord(pricing.price_details) : null;
  return details ? priceIdFromUnknown(details.price) : null;
};

export const toBillingInvoice = (raw: unknown): BillingInvoice | null => {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asString(row.id);
  const status = asString(row.status);
  if (!id || !status) return null;
  const paidField = asNumber(row.amount_paid);
  const totalField = asNumber(row.total);
  const amountPaid = paidField != null && paidField > 0 ? paidField : totalField != null && totalField > 0 ? totalField : paidField ?? 0;
  const linesRecord = asRecord(row.lines);
  const data = Array.isArray(linesRecord?.data) ? linesRecord.data : [];
  const lines = data
    .map((line) => {
      const record = asRecord(line);
      if (!record) return null;
      return {
        priceId: priceIdFromLine(record),
        amount: asNumber(record.amount) ?? 0,
      };
    })
    .filter((line): line is BillingInvoiceLine => line != null);

  return {
    id,
    status,
    currency: asString(row.currency) ?? "gbp",
    amountPaid,
    created: asNumber(row.created) ?? 0,
    subscriptionId: subscriptionIdFromInvoice(row),
    lines,
  };
};

const monthlyPence = (item: BillingItem, percentOff = 0): number | null => {
  if (item.unitAmount == null || item.interval == null) return null;
  const count = item.intervalCount && item.intervalCount > 0 ? item.intervalCount : 1;
  const total = item.unitAmount * item.quantity;
  let monthly: number | null = null;
  if (item.interval === "month") monthly = Math.round(total / count);
  if (item.interval === "year") monthly = Math.round(total / (12 * count));
  if (item.interval === "week") monthly = Math.round((total * 52) / (12 * count));
  if (item.interval === "day") monthly = Math.round((total * 365) / (12 * count));
  if (monthly == null) return null;
  if (percentOff > 0) return Math.round((monthly * (100 - percentOff)) / 100);
  return monthly;
};

const emptyPlan = (planType: string, label: string, family: PlanFamily, detail = "", earlier = false): PlanRevenueRow => ({
  planType,
  label,
  detail,
  earlier,
  family,
  active: 0,
  trialing: 0,
  pastDue: 0,
  mrrPence: 0,
  collected30dPence: 0,
  collectedAllPence: 0,
});

const emptyChannel = (channel: ChannelRevenueRow["channel"], label: string): ChannelRevenueRow => ({
  channel,
  label,
  active: 0,
  mrrPence: 0,
  collected30dPence: 0,
  collectedAllPence: 0,
});

const primaryCurrency = (subscriptions: BillingSubscription[], invoices: BillingInvoice[]): string => {
  const counts = new Map<string, number>();
  const add = (currency: string | null | undefined) => {
    if (!currency) return;
    const key = currency.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  for (const subscription of subscriptions) {
    for (const item of subscription.items) add(item.currency);
  }
  for (const invoice of invoices) {
    if (invoice.status === "paid") add(invoice.currency);
  }
  let best = "gbp";
  let bestCount = 0;
  for (const [currency, count] of counts) {
    if (count > bestCount) {
      best = currency;
      bestCount = count;
    }
  }
  return best;
};

type PriceMeta = { key: string; label: string; detail: string; family: PlanFamily; earlier: boolean };

const metaForPrice = (
  priceId: string,
  hint: { unitAmount?: number | null; currency?: string; interval?: BillingInterval | null; label?: string; family?: PlanFamily } | undefined,
  catalog: Map<string, PriceCatalogEntry>,
  cache: Map<string, PriceMeta>
): PriceMeta => {
  const cached = cache.get(priceId);
  if (cached) return cached;
  const fromCatalog = catalog.get(priceId);
  const described = describeStripePrice({
    priceId,
    unitAmount: hint?.unitAmount ?? fromCatalog?.unitAmount ?? null,
    currency: hint?.currency || fromCatalog?.currency || "gbp",
    interval: hint?.interval ?? fromCatalog?.interval ?? null,
    productName: fromCatalog?.productName,
    nickname: fromCatalog?.nickname ?? hint?.label,
  });
  const known = PLAN_BY_PRICE.get(priceId);
  const meta: PriceMeta = {
    key: known ?? `price:${priceId}`,
    label: described.label,
    detail: described.detail,
    family: described.family,
    earlier: described.earlier,
  };
  cache.set(priceId, meta);
  return meta;
};

const monthBucket = (unixSeconds: number): { month: string; label: string } => {
  const date = new Date(unixSeconds * 1000);
  const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  const label = date.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });
  return { month, label };
};

export const summariseStripeRevenue = ({
  subscriptions,
  invoices,
  prices = [],
  now = new Date(),
  truncated = false,
}: {
  subscriptions: BillingSubscription[];
  invoices: BillingInvoice[];
  prices?: PriceCatalogEntry[];
  now?: Date;
  truncated?: boolean;
}): StripeRevenueSummary => {
  const currency = primaryCurrency(subscriptions, invoices);
  const cutoff = Math.floor(now.getTime() / 1000) - THIRTY_DAYS_SECONDS;
  const plans = new Map<string, PlanRevenueRow>(
    STRIPE_PLAN_TYPES.map((planType) => [planType, emptyPlan(planType, PLAN_LABELS[planType], planFamily(planType))])
  );
  const catalog = new Map(prices.map((price) => [price.id, price]));
  const priceMeta = new Map<string, PriceMeta>();
  const months = new Map<string, CollectedMonth>();
  const ensurePlan = (meta: PriceMeta): PlanRevenueRow => {
    const existing = plans.get(meta.key);
    if (existing) {
      if (!existing.detail && meta.detail) existing.detail = meta.detail;
      if (meta.earlier) existing.earlier = true;
      return existing;
    }
    const row = emptyPlan(meta.key, meta.label, meta.family, meta.detail, meta.earlier);
    plans.set(meta.key, row);
    return row;
  };
  const priceMetaFor = (priceId: string, hint?: BillingItem) => metaForPrice(priceId, hint, catalog, priceMeta);
  const channels = new Map<ChannelRevenueRow["channel"], ChannelRevenueRow>([
    ["web", emptyChannel("web", "Website")],
    ["app", emptyChannel("app", "App")],
    ["unknown", emptyChannel("unknown", "Not tagged")],
  ]);

  const channelBySubscription = new Map<string, ChannelRevenueRow["channel"]>();
  let activeSubscriptions = 0;
  let trialingSubscriptions = 0;
  let pastDueSubscriptions = 0;
  let skippedOtherCurrency = false;

  for (const subscription of subscriptions) {
    channelBySubscription.set(subscription.id, subscription.channel);
    const recurringItems = subscription.items.filter((item) => item.interval != null);
    if (recurringItems.length === 0) continue;

    const countsAsActive = subscription.status === "active";
    const countsAsTrial = subscription.status === "trialing";
    const countsAsPastDue = subscription.status === "past_due";
    if (!countsAsActive && !countsAsTrial && !countsAsPastDue) continue;

    if (countsAsActive) activeSubscriptions += 1;
    if (countsAsTrial) trialingSubscriptions += 1;
    if (countsAsPastDue) pastDueSubscriptions += 1;

    const seen = new Set<string>();
    for (const item of recurringItems) {
      const meta = priceMetaFor(item.priceId, item);
      if (seen.has(meta.key)) continue;
      seen.add(meta.key);
      const row = ensurePlan(meta);
      if (countsAsActive) row.active += 1;
      if (countsAsTrial) row.trialing += 1;
      if (countsAsPastDue) row.pastDue += 1;
    }

    if (!countsAsActive && !countsAsPastDue) continue;

    let subscriptionMrr = 0;
    for (const item of recurringItems) {
      if (item.currency.toLowerCase() !== currency) {
        skippedOtherCurrency = true;
        continue;
      }
      const monthly = monthlyPence(item, subscription.percentOff ?? 0);
      if (monthly == null) continue;
      const row = ensurePlan(priceMetaFor(item.priceId, item));
      row.mrrPence += monthly;
      subscriptionMrr += monthly;
    }

    const channel = channels.get(subscription.channel);
    if (channel && (countsAsActive || countsAsPastDue)) {
      if (countsAsActive) channel.active += 1;
      channel.mrrPence += subscriptionMrr;
    }
  }

  for (const invoice of invoices) {
    if (invoice.status !== "paid") continue;
    if (invoice.currency.toLowerCase() !== currency) {
      skippedOtherCurrency = true;
      continue;
    }

    const paid = invoice.amountPaid;
    if (paid <= 0) continue;
    const recent = invoice.created >= cutoff;
    const channelKey = invoice.subscriptionId
      ? channelBySubscription.get(invoice.subscriptionId) ?? "unknown"
      : "unknown";
    const channel = channels.get(channelKey);
    const pricedLines = invoice.lines.filter((line) => line.priceId && line.amount > 0);
    const lineTotal = pricedLines.reduce((sum, line) => sum + line.amount, 0);

    const addCollected = (meta: PriceMeta, amount: number) => {
      if (amount <= 0) return;
      const row = ensurePlan(meta);
      row.collectedAllPence += amount;
      if (recent) row.collected30dPence += amount;
    };

    if (lineTotal > 0) {
      let allocated = 0;
      pricedLines.forEach((line, index) => {
        const amount = index === pricedLines.length - 1 ? paid - allocated : Math.round((paid * line.amount) / lineTotal);
        allocated += amount;
        addCollected(priceMetaFor(line.priceId as string), amount);
      });
    } else {
      const onlyPrice = invoice.lines.find((line) => line.priceId)?.priceId;
      addCollected(
        onlyPrice
          ? priceMetaFor(onlyPrice)
          : { key: "other_payments", label: "Other payments", detail: "", family: "other" as const, earlier: false },
        paid
      );
    }

    if (channel) {
      channel.collectedAllPence += paid;
      if (recent) channel.collected30dPence += paid;
    }
    const bucket = monthBucket(invoice.created);
    const existingMonth = months.get(bucket.month);
    if (existingMonth) existingMonth.amountPence += paid;
    else months.set(bucket.month, { month: bucket.month, label: bucket.label, amountPence: paid });
  }

  const knownRows = STRIPE_PLAN_TYPES.map(
    (planType) => plans.get(planType) ?? emptyPlan(planType, PLAN_LABELS[planType], planFamily(planType))
  );
  const extraRows = [...plans.values()].filter(
    (row) =>
      !STRIPE_PLAN_TYPES.includes(row.planType as StripePlanType) &&
      (row.active > 0 || row.trialing > 0 || row.pastDue > 0 || row.mrrPence > 0 || row.collectedAllPence > 0)
  );
  const byPlan = [...knownRows, ...extraRows];
  const plansInUse = byPlan
    .filter((row) => row.active > 0 || row.trialing > 0 || row.pastDue > 0 || row.mrrPence > 0 || row.collectedAllPence > 0)
    .sort((a, b) => Number(a.earlier) - Number(b.earlier) || b.mrrPence - a.mrrPence);
  const collectedByMonth = [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
  const byFamily: FamilyRevenueRow[] = (["pro", "team", "other"] as const).map((family) => {
    const rows = byPlan.filter((row) => row.family === family);
    return {
      family,
      label: family === "pro" ? "Pro" : family === "team" ? "Team" : "Other",
      active: rows.reduce((sum, row) => sum + row.active, 0),
      trialing: rows.reduce((sum, row) => sum + row.trialing, 0),
      pastDue: rows.reduce((sum, row) => sum + row.pastDue, 0),
      mrrPence: rows.reduce((sum, row) => sum + row.mrrPence, 0),
      collected30dPence: rows.reduce((sum, row) => sum + row.collected30dPence, 0),
      collectedAllPence: rows.reduce((sum, row) => sum + row.collectedAllPence, 0),
    };
  });
  const byChannel = (["web", "app", "unknown"] as const).map(
    (channel) => channels.get(channel) ?? emptyChannel(channel, channel)
  );

  const tagged = byChannel.some((row) => row.channel !== "unknown" && (row.active > 0 || row.collectedAllPence > 0));
  const sourceNote =
    !tagged && (activeSubscriptions > 0 || byPlan.some((row) => row.collectedAllPence > 0))
      ? "These subscriptions started before checkout was tagged as website or app."
      : null;
  const notes = [
    "Monthly recurring is what active subscriptions add up to each month. Annual prices are divided by 12. The £15 Pro price is the earlier monthly price, before it became £24.",
  ];
  if (skippedOtherCurrency) {
    notes.push(`Totals are in ${currency.toUpperCase()}. Charges in other currencies were left out.`);
  }
  if (truncated) {
    notes.push("Stripe returned more records than this report loaded, so the totals may be short.");
  }

  return {
    currency,
    generatedAt: now.toISOString(),
    mrrPence: byPlan.reduce((sum, row) => sum + row.mrrPence, 0),
    collected30dPence: byPlan.reduce((sum, row) => sum + row.collected30dPence, 0),
    collectedAllPence: byPlan.reduce((sum, row) => sum + row.collectedAllPence, 0),
    activeSubscriptions,
    trialingSubscriptions,
    pastDueSubscriptions,
    byPlan,
    plansInUse,
    byFamily,
    byChannel,
    collectedByMonth,
    sourceNote,
    truncated,
    note: notes.join(" "),
  };
};

const listAll = async (fetchPage: (startingAfter?: string) => Promise<Page<unknown>>): Promise<{ rows: unknown[]; truncated: boolean }> => {
  const rows: unknown[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await fetchPage(startingAfter);
    rows.push(...result.data);
    if (!result.has_more || result.data.length === 0) {
      return { rows, truncated: false };
    }
    const last = asRecord(result.data[result.data.length - 1]);
    const next = last ? asString(last.id) : null;
    if (!next) return { rows, truncated: true };
    startingAfter = next;
  }
  return { rows, truncated: true };
};

export const toPriceCatalogEntry = (raw: unknown): PriceCatalogEntry | null => {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asString(row.id);
  if (!id) return null;
  const recurring = asRecord(row.recurring);
  const product = asRecord(row.product);
  return {
    id,
    unitAmount: asNumber(row.unit_amount),
    currency: asString(row.currency) ?? "gbp",
    interval: intervalOf(recurring?.interval),
    intervalCount: asNumber(recurring?.interval_count) ?? 1,
    productName: product ? asString(product.name) : null,
    nickname: asString(row.nickname),
  };
};

export const collectStripeRevenue = async (
  source: StripeRevenueSource,
  now = new Date()
): Promise<StripeRevenueSummary> => {
  const [subscriptionsPage, invoicesPage, pricesPage] = await Promise.all([
    listAll(source.listSubscriptions),
    listAll(source.listInvoices),
    source.listPrices ? listAll(source.listPrices) : Promise.resolve({ rows: [] as unknown[], truncated: false }),
  ]);
  return summariseStripeRevenue({
    subscriptions: subscriptionsPage.rows
      .map(toBillingSubscription)
      .filter((row): row is BillingSubscription => row != null),
    invoices: invoicesPage.rows.map(toBillingInvoice).filter((row): row is BillingInvoice => row != null),
    prices: pricesPage.rows.map(toPriceCatalogEntry).filter((row): row is PriceCatalogEntry => row != null),
    now,
    truncated: subscriptionsPage.truncated || invoicesPage.truncated || pricesPage.truncated,
  });
};

export const formatMinorUnits = (amount: number, currency: string): string => {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
};
