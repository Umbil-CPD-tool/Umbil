import { Resend } from "resend";
import { formatChange, type EngagementPayload } from "@/lib/engagement/types";

const FROM = "Umbil <hello@notifications.umbil.co.uk>";
const REPLY_TO = "umbil.support@gmail.com";
const BRAND = "#1fb8cd";
const SITE = "https://umbil.co.uk";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const statCell = (label: string, value: string, hint?: string) => `
  <td style="width: 25%; padding: 12px 10px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; vertical-align: top;">
    <p style="margin: 0 0 4px; font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; color: #6b7280;">${escapeHtml(label)}</p>
    <p style="margin: 0; font-size: 22px; font-weight: 700; color: #111827;">${escapeHtml(value)}</p>
    ${hint ? `<p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">${escapeHtml(hint)}</p>` : ""}
  </td>
`;

const sectionTitle = (text: string) =>
  `<h2 style="margin: 28px 0 12px; font-size: 16px; color: #111827;">${escapeHtml(text)}</h2>`;

const tableHead = (cols: string[]) =>
  `<tr>${cols.map((c) => `<th style="text-align: left; padding: 8px 10px; font-size: 12px; color: #6b7280; border-bottom: 1px solid #e5e7eb;">${escapeHtml(c)}</th>`).join("")}</tr>`;

const tableRow = (cols: string[]) =>
  `<tr>${cols.map((c) => `<td style="padding: 8px 10px; font-size: 13px; color: #1f2937; border-bottom: 1px solid #f3f4f6;">${escapeHtml(c)}</td>`).join("")}</tr>`;

const barRow = (label: string, value: number, max: number) => {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return `
    <tr>
      <td style="padding: 6px 10px 6px 0; font-size: 13px; color: #374151; white-space: nowrap;">${escapeHtml(label)}</td>
      <td style="padding: 6px 0; width: 100%;">
        <div style="height: 10px; background: #e5e7eb; border-radius: 999px; overflow: hidden;">
          <div style="height: 10px; width: ${width}%; background: ${BRAND};"></div>
        </div>
      </td>
      <td style="padding: 6px 0 6px 10px; font-size: 13px; font-weight: 600; color: #111827;">${value}</td>
    </tr>
  `;
};

export const buildEngagementReportHtml = (payload: EngagementPayload): string => {
  const { snapshot: s, activity: a, costs: c, growth } = payload;
  const g = growth.funnel;
  const toolMax = Math.max(1, ...payload.tools.map((t) => t.uses_7d));
  const gradeMax = Math.max(1, ...payload.grades.map((g) => g.active_30d));

  const toolRows = payload.tools
    .filter((t) => t.uses_7d > 0 || t.uses_30d > 0)
    .map((t) => barRow(`${t.tool_name} (${t.users_7d} users)`, t.uses_7d, toolMax))
    .join("");

  const gradeRows = payload.grades
    .map((g) => barRow(`${g.grade} · ${g.questions_30d} q`, g.active_30d, gradeMax))
    .join("");

  const topRows = payload.top_users
    .map((u) => tableRow([u.first_name, u.grade, String(u.questions), String(u.tools), String(u.learning)]))
    .join("");

  const heavyGradeRows = growth.heavy_by_grade
    .map((row) =>
      tableRow([
        row.grade,
        String(row.users),
        String(row.avg_questions),
        String(row.pro_flagged),
        String(row.stripe_active),
      ])
    )
    .join("");

  const retentionRows = payload.retention_monthly
    .slice(-8)
    .map((r) =>
      tableRow([
        String(r.cohort_month).slice(0, 7),
        String(r.cohort_size),
        r.month_1_pct == null ? "—" : `${r.month_1_pct}%`,
        r.month_2_pct == null ? "—" : `${r.month_2_pct}%`,
        r.month_3_pct == null ? "—" : `${r.month_3_pct}%`,
      ])
    )
    .join("");

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 720px; margin: 0 auto; color: #111827;">
      <p style="margin: 0 0 4px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: ${BRAND};">Umbil weekly</p>
      <h1 style="margin: 0 0 8px; font-size: 26px;">Engagement report</h1>
      <p style="margin: 0 0 20px; font-size: 14px; color: #6b7280;">
        Last 7 days · generated ${escapeHtml(new Date(payload.generated_at).toLocaleString("en-GB", { timeZone: "Europe/London" }))} ${escapeHtml(payload.timezone)}
      </p>

      <table width="100%" cellspacing="8" cellpadding="0" style="border-collapse: separate;">
        <tr>
          ${statCell("Weekday DAU", String(s.weekday_dau), "Mon–Fri average, 14 days")}
          ${statCell("WAU", String(s.wau), formatChange(s.wau, s.wau_prev) + " vs last week")}
          ${statCell("MAU", String(s.mau), `${s.wau_mau_pct}% WAU/MAU`)}
          ${statCell("Questions", String(s.questions_7d), formatChange(s.questions_7d, s.questions_prev_7d) + " vs last week")}
        </tr>
      </table>
      <table width="100%" cellspacing="8" cellpadding="0" style="border-collapse: separate; margin-top: 4px;">
        <tr>
          ${statCell("Tools", String(a.tools_7d), `${a.tool_users_7d} users · ${formatChange(a.tools_7d, a.tools_prev_7d)}`)}
          ${statCell("Learning logged", String(a.cpd_7d), `${a.cpd_users_7d} users · ${formatChange(a.cpd_7d, a.cpd_prev_7d)}`)}
          ${statCell("New signups", String(a.signups_7d), formatChange(a.signups_7d, a.signups_prev_7d) + " vs last week")}
          ${statCell("Est. LLM cost", `$${Number(c.estimated_usd_7d).toFixed(2)}`, `${Math.round(Number(c.tokens_7d) / 1000)}k tokens`)}
        </tr>
      </table>

      ${sectionTitle("Retention")}
      <p style="margin: 0 0 8px; font-size: 14px; color: #4b5563;">
        Week 1 ${s.week1_retention_pct ?? "—"}% · Week 4 ${s.week4_retention_pct ?? "—"}% · Week 8 ${s.week8_retention_pct ?? "—"}% · Week 12 ${s.week12_retention_pct ?? "—"}%
      </p>
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
        ${tableHead(["First-use month", "New users", "M1", "M2", "M3"])}
        ${retentionRows}
      </table>

      ${sectionTitle("Tools this week")}
      <table width="100%" cellspacing="0" cellpadding="0">${toolRows}</table>

      ${sectionTitle("Who is using Umbil (30 days)")}
      <table width="100%" cellspacing="0" cellpadding="0">${gradeRows}</table>

      ${sectionTitle("Most active this week")}
      <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280;">First name and grade only — no emails.</p>
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
        ${tableHead(["Name", "Grade", "Questions", "Tools", "Learning"])}
        ${topRows}
      </table>

      ${sectionTitle("Growth funnel")}
      <p style="margin: 0 0 8px; font-size: 14px; color: #374151;">
        ${g.signups} signed up · ${g.never_asked} never asked · ${g.ever_asked} asked · ${g.reached_5} reached 5 questions · ${g.reached_100} asked 100+ · ${g.stripe_active} paying
      </p>
      <p style="margin: 0 0 12px; font-size: 13px; color: #6b7280;">
        ${g.asked_within_1d} of ${g.ever_asked} first questions happened within 24 hours. ${g.heavy_and_pro} heavy users have a Pro flag; ${g.heavy_and_stripe} are Stripe-active.
      </p>
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
        ${tableHead(["Grade (100+ questions)", "People", "Avg questions", "Pro", "Stripe"])}
        ${heavyGradeRows}
      </table>

      <p style="margin: 28px 0 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
        ${escapeHtml(c.note)} Charts live at <a href="${SITE}/admin/engagement" style="color: ${BRAND};">${SITE}/admin/engagement</a>
      </p>
    </div>
  `;
};

export const sendEngagementReportEmail = async (payload: EngagementPayload, to: string[]) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }
  if (to.length === 0) {
    throw new Error("No engagement report recipients");
  }

  const weekLabel = new Date(payload.generated_at).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to,
    subject: `Umbil weekly · WAU ${payload.snapshot.wau} · ${weekLabel}`,
    html: buildEngagementReportHtml(payload),
  });

  if (error) {
    throw new Error(error.message);
  }
};
