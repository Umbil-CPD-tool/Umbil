export const CONVERSION_EVENT_TYPES = [
  "limit_reached",
  "pricing_viewed",
  "upgrade_clicked",
  "upgrade_dismissed",
  "checkout_started",
  "trial_started",
  "subscribed",
  "cancelled",
] as const;

export type ConversionEventType = (typeof CONVERSION_EVENT_TYPES)[number];

export const CLIENT_FUNNEL_EVENTS = [
  "pricing_viewed",
  "upgrade_clicked",
  "upgrade_dismissed",
  "limit_reached",
] as const;

export type ClientFunnelEvent = (typeof CLIENT_FUNNEL_EVENTS)[number];

export const LIMIT_SURFACES = ["question", "tool", "cpd"] as const;

export type LimitSurface = (typeof LIMIT_SURFACES)[number];

export const USAGE_TIERS = ["guest", "new", "light", "regular", "heavy", "power"] as const;

export type UsageTier = (typeof USAGE_TIERS)[number];

export type BillingInterval = "day" | "week" | "month" | "year";

export type BillingFunnelEvent = "trial_started" | "subscribed" | "cancelled";

export type BillingEventInput = {
  type: "checkout.session.completed" | "customer.subscription.updated" | "customer.subscription.deleted";
  status: string;
  previousStatus?: string | null;
};

const CLIENT_EVENT_SET = new Set<string>(CLIENT_FUNNEL_EVENTS);
const LIMIT_SURFACE_SET = new Set<string>(LIMIT_SURFACES);
const INTERVALS = new Set<string>(["day", "week", "month", "year"]);

export const isClientFunnelEvent = (value: unknown): value is ClientFunnelEvent =>
  typeof value === "string" && CLIENT_EVENT_SET.has(value);

export const isLimitSurface = (value: unknown): value is LimitSurface =>
  typeof value === "string" && LIMIT_SURFACE_SET.has(value);

/** Lifetime questions asked, matching the bands already used on the engagement funnel. */
export const usageTierFromQuestionCount = (questionCount: number, signedIn: boolean): UsageTier => {
  if (!signedIn) return "guest";
  if (questionCount <= 0) return "new";
  if (questionCount < 5) return "light";
  if (questionCount < 50) return "regular";
  if (questionCount < 100) return "heavy";
  return "power";
};

export const clinicianGradeLabel = (grade: string | null | undefined, signedIn: boolean): string => {
  if (!signedIn) return "Guest";
  const trimmed = (grade ?? "").replace(/\s+/g, " ").trim();
  if (!trimmed) return "Unknown";
  return trimmed.slice(0, 80);
};

export const clipLabel = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
};

export const parseChannel = (value: unknown): "web" | "app" | null =>
  value === "web" || value === "app" ? value : null;

/** Missing or unknown headers are the website. The app sends x-umbil-channel: app. */
export const channelFromHeader = (value: string | null | undefined): "web" | "app" =>
  parseChannel(value) ?? "web";

/**
 * Monthly recurring amount in minor units (pence). Trials should pass the list
 * price through here and store the result as future MRR, with current MRR at 0.
 */
export const monthlyRecurringPence = (input: {
  unitAmount: number | null;
  interval: string | null;
  intervalCount?: number | null;
  quantity?: number | null;
  percentOff?: number | null;
}): number | null => {
  if (input.unitAmount == null || !Number.isFinite(input.unitAmount) || input.unitAmount < 0) return null;
  if (!input.interval || !INTERVALS.has(input.interval)) return null;
  const interval = input.interval as BillingInterval;
  const count = input.intervalCount && input.intervalCount > 0 ? input.intervalCount : 1;
  const quantity = input.quantity && input.quantity > 0 ? input.quantity : 1;
  const gross = input.unitAmount * quantity;
  const perMonth =
    interval === "month"
      ? gross / count
      : interval === "year"
        ? gross / (12 * count)
        : interval === "week"
          ? (gross * 52) / (12 * count)
          : (gross * 365) / (12 * count);
  const percent = input.percentOff && input.percentOff > 0 ? Math.min(input.percentOff, 100) : 0;
  return Math.max(0, Math.round(perMonth * (1 - percent / 100)));
};

export const classifyBillingEvent = (input: BillingEventInput): BillingFunnelEvent | null => {
  if (input.type === "customer.subscription.deleted") return "cancelled";
  if (input.type === "checkout.session.completed") {
    if (input.status === "trialing") return "trial_started";
    if (input.status === "active") return "subscribed";
    return null;
  }
  const previous = input.previousStatus ?? null;
  if (!previous || previous === input.status) return null;
  if (input.status === "active" && (previous === "trialing" || previous === "incomplete")) return "subscribed";
  if (
    input.status === "canceled" ||
    input.status === "unpaid" ||
    input.status === "incomplete_expired"
  ) {
    return "cancelled";
  }
  return null;
};

export const cancelledDuringTrial = (input: {
  previousStatus?: string | null;
  trialEndUnix?: number | null;
  canceledAtUnix?: number | null;
}): boolean => {
  if (input.previousStatus === "trialing") return true;
  if (input.previousStatus === "active") return false;
  if (
    input.trialEndUnix &&
    input.canceledAtUnix &&
    Number.isFinite(input.trialEndUnix) &&
    Number.isFinite(input.canceledAtUnix)
  ) {
    return input.canceledAtUnix <= input.trialEndUnix;
  }
  return false;
};

export const baselineStatusCopy = (input: {
  daysElapsed: number;
  trackingStartedAt: string;
  limitsChangedAt: string | null;
}): string => {
  const started = new Date(input.trackingStartedAt);
  const startedLabel = Number.isNaN(started.getTime())
    ? "today"
    : started.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
  if (input.limitsChangedAt) {
    const changed = new Date(input.limitsChangedAt);
    const changedLabel = Number.isNaN(changed.getTime())
      ? "the day the limits changed"
      : changed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
    return `Free limits were marked tighter on ${changedLabel}. Anything after that is the after window. The days before it stay the before benchmark.`;
  }
  if (input.daysElapsed >= 14) {
    return `Baseline has run for ${input.daysElapsed} days, since ${startedLabel}. That is a full before window. Free limits are still unchanged.`;
  }
  if (input.daysElapsed >= 7) {
    return `Baseline has run for ${input.daysElapsed} days, since ${startedLabel}. Seven days is a usable before window. Fourteen is fuller if the new caps are not live yet.`;
  }
  return `Baseline started ${startedLabel}. The new free limits can go live today. Press “Limits are now tighter” once those caps are actually live, so everything after that sits in the after window.`;
};
