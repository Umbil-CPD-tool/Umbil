import { sendEngagementReportEmail } from "@/lib/email/engagementReport";
import { fetchEngagementPayload } from "./fetchReport";
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

const slackText = (payload: EngagementPayload): string => {
  const { snapshot: s, activity: a, costs: c } = payload;
  const tools = payload.tools
    .filter((t) => t.uses_7d > 0)
    .map((t) => `• ${t.tool_name}: ${t.uses_7d}`)
    .join("\n");

  return [
    `*Umbil weekly*`,
    `WAU ${s.wau} (${formatChange(s.wau, s.wau_prev)}) · MAU ${s.mau} · stickiness ${s.wau_mau_pct}%`,
    `Questions ${s.questions_7d} (${formatChange(s.questions_7d, s.questions_prev_7d)}) · Tools ${a.tools_7d} · Learning ${a.cpd_7d} · Signups ${a.signups_7d}`,
    `Retention W1 ${s.week1_retention_pct ?? "—"}% · W4 ${s.week4_retention_pct ?? "—"}% · W12 ${s.week12_retention_pct ?? "—"}%`,
    `Funnel ${payload.growth.funnel.signups} signed up → ${payload.growth.funnel.ever_asked} asked → ${payload.growth.funnel.reached_100} heavy → ${payload.growth.funnel.stripe_active} paying`,
    `Est. LLM cost $${Number(c.estimated_usd_7d).toFixed(2)} (${Math.round(Number(c.tokens_7d) / 1000)}k tokens)`,
    tools ? `Tools\n${tools}` : "",
    `Charts: https://umbil.co.uk/admin/engagement`,
  ]
    .filter(Boolean)
    .join("\n");
};

export const postEngagementSlack = async (payload: EngagementPayload): Promise<boolean> => {
  const webhook = process.env.ENGAGEMENT_REPORT_SLACK_WEBHOOK;
  if (!webhook) return false;

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: slackText(payload) }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Slack webhook failed: ${res.status} ${body}`);
  }
  return true;
};

export const sendWeeklyEngagementReport = async (options?: { email?: boolean; slack?: boolean }) => {
  const payload = await fetchEngagementPayload();
  const sendEmail = options?.email !== false;
  const sendSlack = options?.slack !== false;

  const recipients = sendEmail ? await resolveReportRecipients() : [];
  if (sendEmail) {
    await sendEngagementReportEmail(payload, recipients);
  }

  let slackSent = false;
  if (sendSlack) {
    slackSent = await postEngagementSlack(payload);
  }

  return {
    payload,
    emailed: sendEmail ? recipients.length : 0,
    slack: slackSent,
  };
};
