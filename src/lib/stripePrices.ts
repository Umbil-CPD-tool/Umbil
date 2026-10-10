export const STRIPE_PLAN_TYPES = [
  "pro_monthly",
  "pro_annual",
  "team_monthly",
  "team_annual",
] as const;

export type StripePlanType = (typeof STRIPE_PLAN_TYPES)[number];

/** Server-side price map. Checkout must look up IDs here, never trust the client. */
export const STRIPE_PRICES: Record<StripePlanType, string> = {
  pro_monthly: "price_1UP7szEwbwdYfgj46mgfeHnJ",
  pro_annual: "price_1UP7mqEwbwdYfgj4FHtulfjJ",
  team_monthly: "price_1UP8n7EwbwdYfgj47PuFQIV6",
  team_annual: "price_1UP8n8EwbwdYfgj44FelGhyT",
};

export const isStripePlanType = (value: unknown): value is StripePlanType =>
  typeof value === "string" && (STRIPE_PLAN_TYPES as readonly string[]).includes(value);

export const isProPlanType = (planType: StripePlanType): boolean =>
  planType.startsWith("pro_");

/** Where checkout was started. Stored on the Stripe customer subscription. */
export const CHECKOUT_CHANNELS = ["web", "app"] as const;

export type CheckoutChannel = (typeof CHECKOUT_CHANNELS)[number];

export const parseCheckoutChannel = (value: unknown): CheckoutChannel | null =>
  value === "web" || value === "app" ? value : null;

export const planFamily = (planType: StripePlanType): "pro" | "team" =>
  isProPlanType(planType) ? "pro" : "team";

export const PLAN_LABELS: Record<StripePlanType, string> = {
  pro_monthly: "Pro monthly",
  pro_annual: "Pro annual",
  team_monthly: "Team monthly",
  team_annual: "Team annual",
};
