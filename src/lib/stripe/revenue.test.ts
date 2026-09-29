import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEngagementBriefingMarkdown } from "@/lib/engagement/exportReport";
import type { EngagementPayload } from "@/lib/engagement/types";
import { STRIPE_PRICES, parseCheckoutChannel } from "@/lib/stripePrices";
import {
  collectStripeRevenue,
  formatMinorUnits,
  summariseStripeRevenue,
  toBillingInvoice,
  toBillingSubscription,
  type BillingInvoice,
  type BillingItem,
  type BillingSubscription,
} from "@/lib/stripe/revenue";

const NOW = new Date("2026-09-29T12:00:00.000Z");
const DAY = 24 * 60 * 60;

const item = (priceId: string, unitAmount: number, interval: BillingItem["interval"]): BillingItem => ({
  priceId,
  unitAmount,
  currency: "gbp",
  interval,
  quantity: 1,
});

const subscription = (overrides: Partial<BillingSubscription> & Pick<BillingSubscription, "id" | "items">): BillingSubscription => ({
  status: "active",
  channel: "unknown",
  ...overrides,
});

const invoice = (overrides: Partial<BillingInvoice> & Pick<BillingInvoice, "id" | "lines">): BillingInvoice => ({
  status: "paid",
  currency: "gbp",
  amountPaid: overrides.lines?.reduce((sum, line) => sum + line.amount, 0) ?? 0,
  created: Math.floor(NOW.getTime() / 1000) - DAY,
  subscriptionId: null,
  ...overrides,
});

const payload = (): EngagementPayload =>
  ({
    generated_at: NOW.toISOString(),
    timezone: "Europe/London",
    snapshot: {
      dau: 1,
      weekday_dau: 1,
      wau: 2,
      wau_prev: 1,
      mau: 3,
      wau_mau_pct: 50,
      questions_7d: 4,
      questions_prev_7d: 2,
      questions_30d: 8,
      questions_logged_in: 8,
      week1_retention_pct: 10,
      week4_retention_pct: 20,
      week8_retention_pct: null,
      week12_retention_pct: null,
    },
    activity: {
      tools_7d: 1,
      tools_prev_7d: 1,
      tools_30d: 1,
      tool_users_7d: 1,
      cpd_7d: 1,
      cpd_prev_7d: 1,
      cpd_30d: 1,
      cpd_users_7d: 1,
      signups_7d: 1,
      signups_prev_7d: 1,
      signups_30d: 1,
      signups: 4,
      ever_asked: 3,
      pro_flagged: 1,
      stripe_active: 1,
    },
    costs: {
      tokens_7d: 1,
      tokens_30d: 1,
      estimated_usd_7d: 0.1,
      estimated_usd_30d: 0.2,
      note: "estimate",
    },
    tools: [],
    grades: [],
    wau_history: [],
    mau_history: [],
    weekly_activity: [],
    ask_modes: [],
    ask_mode_weekly: [],
    ask_modes_ready: true,
    retention_monthly: [],
    top_users: [],
    growth: {
      funnel: {
        signups: 4,
        never_asked: 1,
        ever_asked: 3,
        asked_within_1d: 2,
        asked_within_7d: 3,
        reached_5: 1,
        reached_50: 0,
        reached_100: 0,
        pro_flagged: 1,
        stripe_active: 1,
        heavy_and_pro: 0,
        heavy_and_stripe: 0,
      },
      heavy_by_grade: [],
      heavy_tools: [],
      acquisition: [],
    },
    lifetime: {
      first_question_at: null,
      questions_logged_in: 8,
      questions_anonymous: 0,
      questions_total: 8,
      users_ever_asked: 3,
      signups: 4,
      tools_total: 1,
      tool_users: 1,
      cpd_total: 1,
      cpd_users: 1,
      median_questions: 2,
      mean_questions: 2,
      asked_once: 1,
      asked_5: 1,
      asked_50: 0,
      asked_100: 0,
      top20_question_share_pct: 40,
      tokens_all: 10,
      estimated_usd_all: 0.3,
      tools: [],
      grades: [],
    },
  }) satisfies EngagementPayload;

describe("parseCheckoutChannel", () => {
  it("accepts website and app only", () => {
    assert.equal(parseCheckoutChannel("web"), "web");
    assert.equal(parseCheckoutChannel("app"), "app");
    assert.equal(parseCheckoutChannel("ios"), null);
    assert.equal(parseCheckoutChannel(undefined), null);
  });
});

describe("stripe revenue summary", () => {
  it("splits pro and team list price, and leaves trials out of monthly recurring", () => {
    const summary = summariseStripeRevenue({
      now: NOW,
      subscriptions: [
        subscription({
          id: "sub_pro",
          channel: "web",
          items: [item(STRIPE_PRICES.pro_monthly, 1500, "month")],
        }),
        subscription({
          id: "sub_pro_year",
          channel: "app",
          items: [item(STRIPE_PRICES.pro_annual, 12000, "year")],
        }),
        subscription({
          id: "sub_team",
          channel: "web",
          items: [{ ...item(STRIPE_PRICES.team_monthly, 4000, "month"), quantity: 2 }],
        }),
        subscription({
          id: "sub_trial",
          status: "trialing",
          channel: "app",
          items: [item(STRIPE_PRICES.pro_monthly, 1500, "month")],
        }),
        subscription({
          id: "sub_past_due",
          status: "past_due",
          channel: "app",
          items: [item(STRIPE_PRICES.team_annual, 24000, "year")],
        }),
        subscription({
          id: "sub_canceled",
          status: "canceled",
          items: [item(STRIPE_PRICES.pro_monthly, 1500, "month")],
        }),
        subscription({
          id: "sub_other",
          items: [item("price_unrelated", 9999, "month")],
        }),
      ],
      invoices: [],
    });

    assert.equal(summary.currency, "gbp");
    assert.equal(summary.mrrPence, 1500 + 1000 + 8000 + 2000);
    assert.equal(summary.activeSubscriptions, 3);
    assert.equal(summary.trialingSubscriptions, 1);
    assert.equal(summary.pastDueSubscriptions, 1);
    assert.equal(summary.byFamily.find((row) => row.family === "pro")?.mrrPence, 2500);
    assert.equal(summary.byFamily.find((row) => row.family === "team")?.mrrPence, 10000);
    assert.equal(summary.byFamily.find((row) => row.family === "pro")?.trialing, 1);
    assert.equal(summary.byPlan.find((row) => row.planType === "team_monthly")?.active, 1);
    assert.equal(summary.byChannel.find((row) => row.channel === "web")?.mrrPence, 1500 + 8000);
    assert.equal(summary.byChannel.find((row) => row.channel === "app")?.mrrPence, 1000 + 2000);
    assert.equal(summary.byChannel.find((row) => row.channel === "app")?.active, 1);
  });

  it("counts paid invoices for known plans in the last 30 days and all time", () => {
    const recent = Math.floor(NOW.getTime() / 1000) - 2 * DAY;
    const old = Math.floor(NOW.getTime() / 1000) - 40 * DAY;
    const summary = summariseStripeRevenue({
      now: NOW,
      subscriptions: [
        subscription({
          id: "sub_web",
          channel: "web",
          items: [item(STRIPE_PRICES.pro_monthly, 1500, "month")],
        }),
        subscription({
          id: "sub_app",
          channel: "app",
          items: [item(STRIPE_PRICES.team_annual, 24000, "year")],
        }),
      ],
      invoices: [
        invoice({
          id: "in_recent",
          created: recent,
          subscriptionId: "sub_web",
          lines: [{ priceId: STRIPE_PRICES.pro_monthly, amount: 1500 }],
        }),
        invoice({
          id: "in_old",
          created: old,
          subscriptionId: "sub_app",
          lines: [{ priceId: STRIPE_PRICES.team_annual, amount: 24000 }],
        }),
        invoice({
          id: "in_other",
          lines: [{ priceId: "price_unrelated", amount: 5000 }],
        }),
        invoice({
          id: "in_open",
          status: "open",
          lines: [{ priceId: STRIPE_PRICES.pro_monthly, amount: 1500 }],
        }),
      ],
    });

    assert.equal(summary.collected30dPence, 1500);
    assert.equal(summary.collectedAllPence, 1500 + 24000);
    assert.equal(summary.byPlan.find((row) => row.planType === "pro_monthly")?.collected30dPence, 1500);
    assert.equal(summary.byPlan.find((row) => row.planType === "team_annual")?.collectedAllPence, 24000);
    assert.equal(summary.byChannel.find((row) => row.channel === "web")?.collected30dPence, 1500);
    assert.equal(summary.byChannel.find((row) => row.channel === "app")?.collectedAllPence, 24000);
  });

  it("reads current and older Stripe payload shapes", () => {
    const subscriptionRow = toBillingSubscription({
      id: "sub_1",
      status: "active",
      metadata: { channel: "app", planType: "pro_monthly" },
      items: {
        data: [
          {
            quantity: 1,
            price: {
              id: STRIPE_PRICES.pro_monthly,
              unit_amount: 1500,
              currency: "gbp",
              recurring: { interval: "month" },
            },
          },
        ],
      },
    });
    assert.equal(subscriptionRow?.channel, "app");
    assert.equal(subscriptionRow?.items[0]?.priceId, STRIPE_PRICES.pro_monthly);

    const invoiceRow = toBillingInvoice({
      id: "in_1",
      status: "paid",
      currency: "gbp",
      amount_paid: 1500,
      created: 100,
      parent: { subscription_details: { subscription: "sub_1" } },
      lines: {
        data: [{ amount: 1500, pricing: { price_details: { price: STRIPE_PRICES.pro_monthly } } }],
      },
    });
    assert.equal(invoiceRow?.subscriptionId, "sub_1");
    assert.equal(invoiceRow?.lines[0]?.priceId, STRIPE_PRICES.pro_monthly);
  });

  it("pages through Stripe until the list ends", async () => {
    const calls: string[] = [];
    const summary = await collectStripeRevenue(
      {
        listSubscriptions: async (startingAfter) => {
          calls.push(`sub:${startingAfter ?? "start"}`);
          if (!startingAfter) {
            return {
              has_more: true,
              data: [
                {
                  id: "sub_page_1",
                  status: "active",
                  metadata: { channel: "web" },
                  items: {
                    data: [
                      {
                        quantity: 1,
                        price: {
                          id: STRIPE_PRICES.pro_monthly,
                          unit_amount: 1000,
                          currency: "gbp",
                          recurring: { interval: "month" },
                        },
                      },
                    ],
                  },
                },
              ],
            };
          }
          return { has_more: false, data: [] };
        },
        listInvoices: async () => ({ has_more: false, data: [] }),
      },
      NOW
    );

    assert.deepEqual(calls, ["sub:start", "sub:sub_page_1"]);
    assert.equal(summary.mrrPence, 1000);
    assert.equal(summary.truncated, false);
  });

  it("formats pence as pounds", () => {
    assert.equal(formatMinorUnits(1500, "gbp"), "£15.00");
    assert.equal(formatMinorUnits(0, "gbp"), "£0.00");
  });
});

describe("engagement briefing revenue", () => {
  it("leaves the briefing unchanged when Stripe revenue is missing", () => {
    const markdown = buildEngagementBriefingMarkdown(payload());
    assert.equal(markdown.includes("## Stripe revenue"), false);
    assert.equal(markdown.includes("Weekly active users"), true);
  });

  it("adds Pro and Team revenue when a summary is passed", () => {
    const summary = summariseStripeRevenue({
      now: NOW,
      subscriptions: [
        subscription({
          id: "sub_pro",
          channel: "web",
          items: [item(STRIPE_PRICES.pro_monthly, 1500, "month")],
        }),
      ],
      invoices: [
        invoice({
          id: "in_1",
          subscriptionId: "sub_pro",
          lines: [{ priceId: STRIPE_PRICES.pro_monthly, amount: 1500 }],
        }),
      ],
    });
    const markdown = buildEngagementBriefingMarkdown(payload(), summary);
    assert.equal(markdown.includes("## Stripe revenue"), true);
    assert.equal(markdown.includes("£15.00"), true);
    assert.equal(markdown.includes("Pro monthly"), true);
    assert.equal(markdown.includes("Website"), true);
  });
});
