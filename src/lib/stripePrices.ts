export const STRIPE_PLAN_TYPES = [
  "pro_monthly",
  "pro_annual",
  "team_monthly",
  "team_annual",
] as const;

export type StripePlanType = (typeof STRIPE_PLAN_TYPES)[number];

/** Server-side price map. Checkout must look up IDs here, never trust the client. */
export const STRIPE_PRICES: Record<StripePlanType, string> = {
  pro_monthly: "price_1TgCHkEwbwdYfgj4xSqguUmo",
  pro_annual: "price_1TgCHkEwbwdYfgj4x4ytPO05",
  team_monthly: "price_1TgCIBEwbwdYfgj4ie6nH1m2",
  team_annual: "price_1TgCJBEwbwdYfgj4MWPA4Sk0",
};

export const isStripePlanType = (value: unknown): value is StripePlanType =>
  typeof value === "string" && (STRIPE_PLAN_TYPES as readonly string[]).includes(value);

export const isProPlanType = (planType: StripePlanType): boolean =>
  planType.startsWith("pro_");
