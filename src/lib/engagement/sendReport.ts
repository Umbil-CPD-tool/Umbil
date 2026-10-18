import { loadModelSpend } from "@/lib/billing/modelSpendServer";
import { sendEngagementReportEmail, type EngagementReportExtras } from "@/lib/email/engagementReport";
import { formatMinorUnits } from "@/lib/stripe/revenue";
import { loadStripeRevenue } from "@/lib/stripe/revenueServer";
import { fetchEngagementPayload } from "./fetchReport";
import { countProAccess } from "./proAccess";
import { fetchProProfiles } from "./proAccessServer";
import { formatChange, type EngagementPayload } from "./types";

const parseList = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const DEFAULT_RECIPIENTS = ["masteringmedicineltd@gmail.com"];

export const resolveReportRecipients = async (): Promise<string[]> => {
  const fromEnv = parseList(process.env.ENGAGEMENT_REPORT_TO);
  if (fromEnv.length > 0) return fromEnv;
  return DEFAULT_RECIPIENTS;
};

const redact = (error: unknown): string =>
  (error instanceof Error ? error.message : String(error)).replace(/sk_(live|test)_\S+/gi, "sk_redacted");

const loadReportExtras = async (): Promise<EngagementReportExtras> => {
  const [revenue, modelSpend, profiles] = await Promise.all([
    loadStripeRevenue().catch((error: unknown) => {
      console.error("Engagement revenue failed:", redact(error));
      return null;
    }),
    loadModelSpend().catch((error: unknown) => {
      console.error("Engagement model spend failed:", redact(error));
      return null;
    }),
    fetchProProfiles().catch((error: unknown) => {
      console.error("Engagement Pro profiles failed:", redact(error));
      return null;
    }),
  ]);

  const stripeAccess = revenue
    ? {
        paying: revenue.activeSubscriptions,
        trialing: revenue.trialingSubscriptions,
        billedCustomerIds: revenue.billedCustomerIds,
      }
    : null;
  const proAccess = profiles
    ? countProAccess(profiles, stripeAccess)
    : stripeAccess
      ? countProAccess([], stripeAccess)
      : null;

  return { revenue, modelSpend, proAccess };
};

const slackText = (payload: EngagementPayload, extras?: EngagementReportExtras): string => {
  const { snapshot: s, activity: a, costs: c } = payload;
  const tools = payload.tools
    .filter((t) => t.uses_7d > 0)
    .map((t) => `• ${t.tool_name}: ${t.uses_7d}`)
    .join("\n");

  return [
    `*Umbil weekly*`,
    `WAU ${s.wau} (${formatChange(s.wau, s.wau_prev)}) · MAU ${s.mau} · stickiness ${s.wau_mau_pct}%`,
    `Questions ${s.questions_7d} (${formatChange(s.questions_7d, s.questions_prev_7d)}) · Clinic ${payload.ask_modes.find((m) => m.style === "clinic")?.questions_7d ?? 0} · Standard ${payload.ask_modes.find((m) => m.style === "standard")?.questions_7d ?? 0} · Deep Dive ${payload.ask_modes.find((m) => m.style === "deepDive")?.questions_7d ?? 0}`,
    `Tools ${a.tools_7d} · Learning ${a.cpd_7d} · Signups ${a.signups_7d}`,
    `Retention W1 ${s.week1_retention_pct ?? "—"}% · W4 ${s.week4_retention_pct ?? "—"}% · W12 ${s.week12_retention_pct ?? "—"}%`,
    `Funnel ${payload.growth.funnel.signups} signed up → ${payload.growth.funnel.ever_asked} asked → ${payload.growth.funnel.reached_100} heavy → ${payload.growth.funnel.stripe_active} paying`,
    `Since launch ${payload.lifetime.questions_total.toLocaleString("en-GB")} questions · ${payload.lifetime.users_ever_asked.toLocaleString("en-GB")} have asked · ${payload.lifetime.tools_total.toLocaleString("en-GB")} tools`,
    `Est. LLM cost $${Number(c.estimated_usd_7d).toFixed(2)} (${Math.round(Number(c.tokens_7d) / 1000)}k tokens)`,
    extras?.proAccess
      ? `Pro ${extras.proAccess.usingPro} using · ${extras.proAccess.paying} paying · ${extras.proAccess.trialing} free month · ${extras.proAccess.complimentary} complimentary (${extras.proAccess.complimentaryBreakdown.students} students, ${extras.proAccess.complimentaryBreakdown.staff} staff, ${extras.proAccess.complimentaryBreakdown.friendsAndDoctors} friends and doctors)`
      : "",
    extras?.revenue
      ? `Revenue ${formatMinorUnits(extras.revenue.mrrPence, extras.revenue.currency)} a month · ${formatMinorUnits(extras.revenue.collected30dPence, extras.revenue.currency)} last 30 days`
      : "",
    extras?.modelSpend?.llm.totalGbp != null
      ? `Model bill £${extras.modelSpend.llm.totalGbp.toFixed(2)}`
      : "",
    tools ? `Tools\n${tools}` : "",
    `Charts: https://umbil.co.uk/admin/engagement`,
  ]
    .filter(Boolean)
    .join("\n");
};

export const postEngagementSlack = async (
  payload: EngagementPayload,
  extras?: EngagementReportExtras
): Promise<boolean> => {
  const webhook = process.env.ENGAGEMENT_REPORT_SLACK_WEBHOOK;
  if (!webhook) return false;

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: slackText(payload, extras) }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Slack webhook failed: ${res.status} ${body}`);
  }
  return true;
};

export const sendWeeklyEngagementReport = async (options?: { email?: boolean; slack?: boolean }) => {
  const sendEmail = options?.email !== false;
  const sendSlack = options?.slack !== false;
  const [payload, extras, recipients] = await Promise.all([
    fetchEngagementPayload(),
    loadReportExtras(),
    sendEmail ? resolveReportRecipients() : Promise.resolve([] as string[]),
  ]);

  if (sendEmail) {
    await sendEngagementReportEmail(payload, recipients, extras);
  }

  let slackSent = false;
  if (sendSlack) {
    slackSent = await postEngagementSlack(payload, extras);
  }

  return {
    payload,
    emailed: sendEmail ? recipients.length : 0,
    slack: slackSent,
  };
};
