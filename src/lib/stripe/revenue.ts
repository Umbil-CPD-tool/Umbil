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

export type BillingItem = {
  priceId: string;
  unitAmount: number | null;
  currency: string;
  interval: BillingInterval | null;
  quantity: number;
};

export type BillingSubscription = {
  id: string;
  status: string;
  channel: CheckoutChannel | "unknown";
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

export type PlanRevenueRow = {
  planType: StripePlanType;
  label: string;
  family: "pro" | "team";
  active: number;
  trialing: number;
  pastDue: number;
  mrrPence: number;
  collected30dPence: number;
  collectedAllPence: number;
};

export type FamilyRevenueRow = {
  family: "pro" | "team";
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
  byFamily: FamilyRevenueRow[];
  byChannel: ChannelRevenueRow[];
  truncated: boolean;
  note: string;
};

type Page<T> = { data: T[]; has_more: boolean };

export type StripeRevenueSource = {
  listSubscriptions: (startingAfter?: string) => Promise<Page<unknown>>;
  listInvoices: (startingAfter?: string) => Promise<Page<unknown>>;
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

const toBillingItem = (raw: unknown): BillingItem | null => {
  const row = asRecord(raw);
  if (!row) return null;
  const price = asRecord(row.price);
  const priceId = priceIdFromUnknown(row.price);
  if (!priceId) return null;
  const recurring = price ? asRecord(price.recurring) : null;
  const quantity = asNumber(row.quantity) ?? 1;
  return {
    priceId,
    unitAmount: price ? asNumber(price.unit_amount) : null,
    currency: (price ? asString(price.currency) : null) ?? "gbp",
    interval: intervalOf(recurring?.interval),
    quantity: quantity > 0 ? quantity : 1,
  };
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
    amountPaid: asNumber(row.amount_paid) ?? 0,
    created: asNumber(row.created) ?? 0,
    subscriptionId: subscriptionIdFromInvoice(row),
    lines,
  };
};

const monthlyPence = (item: BillingItem): number | null => {
  if (item.unitAmount == null) return null;
  const total = item.unitAmount * item.quantity;
  if (item.interval === "month") return total;
  if (item.interval === "year") return Math.round(total / 12);
  if (item.interval === "week") return Math.round((total * 52) / 12);
  if (item.interval === "day") return Math.round((total * 365) / 12);
  return null;
};

const emptyPlan = (planType: StripePlanType): PlanRevenueRow => ({
  planType,
  label: PLAN_LABELS[planType],
  family: planFamily(planType),
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
    for (const item of subscription.items) {
      if (PLAN_BY_PRICE.has(item.priceId)) add(item.currency);
    }
  }
  for (const invoice of invoices) {
    if (invoice.lines.some((line) => line.priceId && PLAN_BY_PRICE.has(line.priceId))) {
      add(invoice.currency);
    }
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

const knownPlans = (items: BillingItem[]): StripePlanType[] => {
  const plans: StripePlanType[] = [];
  for (const item of items) {
    const plan = PLAN_BY_PRICE.get(item.priceId);
    if (plan && !plans.includes(plan)) plans.push(plan);
  }
  return plans;
};

export const summariseStripeRevenue = ({
  subscriptions,
  invoices,
  now = new Date(),
  truncated = false,
}: {
  subscriptions: BillingSubscription[];
  invoices: BillingInvoice[];
  now?: Date;
  truncated?: boolean;
}): StripeRevenueSummary => {
  const currency = primaryCurrency(subscriptions, invoices);
  const cutoff = Math.floor(now.getTime() / 1000) - THIRTY_DAYS_SECONDS;
  const plans = new Map<StripePlanType, PlanRevenueRow>(
    STRIPE_PLAN_TYPES.map((planType) => [planType, emptyPlan(planType)])
  );
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
    const plansOnSub = knownPlans(subscription.items);
    if (plansOnSub.length === 0) continue;

    const countsAsActive = subscription.status === "active";
    const countsAsTrial = subscription.status === "trialing";
    const countsAsPastDue = subscription.status === "past_due";
    if (!countsAsActive && !countsAsTrial && !countsAsPastDue) continue;

    if (countsAsActive) activeSubscriptions += 1;
    if (countsAsTrial) trialingSubscriptions += 1;
    if (countsAsPastDue) pastDueSubscriptions += 1;

    for (const planType of plansOnSub) {
      const row = plans.get(planType);
      if (!row) continue;
      if (countsAsActive) row.active += 1;
      if (countsAsTrial) row.trialing += 1;
      if (countsAsPastDue) row.pastDue += 1;
    }

    if (!countsAsActive && !countsAsPastDue) continue;

    let subscriptionMrr = 0;
    for (const item of subscription.items) {
      const planType = PLAN_BY_PRICE.get(item.priceId);
      if (!planType) continue;
      if (item.currency.toLowerCase() !== currency) {
        skippedOtherCurrency = true;
        continue;
      }
      const monthly = monthlyPence(item);
      if (monthly == null) continue;
      const row = plans.get(planType);
      if (!row) continue;
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
      if (invoice.lines.some((line) => line.priceId && PLAN_BY_PRICE.has(line.priceId))) {
        skippedOtherCurrency = true;
      }
      continue;
    }

    const matched = invoice.lines.filter((line) => line.priceId && PLAN_BY_PRICE.has(line.priceId));
    if (matched.length === 0) continue;

    const lineTotal = matched.reduce((sum, line) => sum + Math.max(0, line.amount), 0);
    const paid = lineTotal > 0 ? lineTotal : invoice.amountPaid;
    if (paid <= 0) continue;
    const recent = invoice.created >= cutoff;
    const channelKey = invoice.subscriptionId
      ? channelBySubscription.get(invoice.subscriptionId) ?? "unknown"
      : "unknown";
    const channel = channels.get(channelKey);

    if (lineTotal > 0) {
      for (const line of matched) {
        const planType = line.priceId ? PLAN_BY_PRICE.get(line.priceId) : undefined;
        if (!planType || line.amount <= 0) continue;
        const row = plans.get(planType);
        if (!row) continue;
        row.collectedAllPence += line.amount;
        if (recent) row.collected30dPence += line.amount;
      }
    } else if (matched.length === 1 && matched[0]?.priceId) {
      const planType = PLAN_BY_PRICE.get(matched[0].priceId);
      const row = planType ? plans.get(planType) : undefined;
      if (row) {
        row.collectedAllPence += paid;
        if (recent) row.collected30dPence += paid;
      }
    }

    if (channel) {
      channel.collectedAllPence += paid;
      if (recent) channel.collected30dPence += paid;
    }
  }

  const byPlan = STRIPE_PLAN_TYPES.map((planType) => plans.get(planType) ?? emptyPlan(planType));
  const byFamily: FamilyRevenueRow[] = (["pro", "team"] as const).map((family) => {
    const rows = byPlan.filter((row) => row.family === family);
    return {
      family,
      label: family === "pro" ? "Pro" : "Team",
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

  const notes = [
    "Monthly recurring is the list price of active and past-due Pro and Team subscriptions, with annual plans divided by 12. Trials are counted separately and are not included until Stripe marks a payment as paid.",
    "Collected amounts are paid Stripe invoices for these plans, including checkouts started on the website and in the app.",
    "Subscriptions started before channel tagging show as not tagged.",
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
    byFamily,
    byChannel,
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

export const collectStripeRevenue = async (
  source: StripeRevenueSource,
  now = new Date()
): Promise<StripeRevenueSummary> => {
  const [subscriptionsPage, invoicesPage] = await Promise.all([
    listAll(source.listSubscriptions),
    listAll(source.listInvoices),
  ]);
  return summariseStripeRevenue({
    subscriptions: subscriptionsPage.rows
      .map(toBillingSubscription)
      .filter((row): row is BillingSubscription => row != null),
    invoices: invoicesPage.rows.map(toBillingInvoice).filter((row): row is BillingInvoice => row != null),
    now,
    truncated: subscriptionsPage.truncated || invoicesPage.truncated,
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
