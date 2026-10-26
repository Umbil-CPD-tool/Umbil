import type { ModelSpendReport } from "@/lib/billing/modelSpend";
import type { ProAccessBreakdown } from "@/lib/engagement/proAccess";
import { formatMinorUnits, type StripeRevenueSummary } from "@/lib/stripe/revenue";
import { formatChange, type EngagementPayload } from "./types";
import {
  DEFAULT_TREND_RANGE,
  filterMonths,
  filterWeeks,
  trendRangeLabel,
  type TrendRangeId,
} from "./trendRange";

const n = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString("en-GB");
};

const pct = (value: number | null | undefined): string => {
  if (value == null) return "—";
  return `${value}%`;
};

const mdTable = (headers: string[], rows: Array<Array<string | number | null>>): string => {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows
    .map((row) => `| ${row.map((cell) => (cell == null ? "—" : String(cell))).join(" | ")} |`)
    .join("\n");
  return `${head}\n${sep}\n${body}`;
};

const isoDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric" });
};

const dateKey = (value: string): string => value.slice(0, 10);

const weekChange = (current: number, previous: number): string =>
  `${n(current)} (previous week ${n(previous)}, ${formatChange(current, previous)})`;

const shareOf = (value: number, total: number): string => {
  if (total <= 0) return "—";
  return pct(Math.round((value / Math.max(total, 1)) * 100));
};

const usd = (value: number | null | undefined): string => (value == null ? "—" : `$${value.toFixed(2)}`);

const proAccessSection = (access: ProAccessBreakdown | null | undefined): string => {
  if (!access) return "";
  return `
## Who has Pro

- Using Pro now: ${n(access.usingPro)}
- Paying: ${n(access.paying)}
- Free trial: ${n(access.trialing)}
- Complimentary: ${n(access.complimentary)}
  - Students: ${n(access.complimentaryBreakdown.students)} (UK university email)
  - Staff: ${n(access.complimentaryBreakdown.staff)} (admin accounts)
  - Friends and doctors: ${n(access.complimentaryBreakdown.friendsAndDoctors)} (switched on by hand)

Paying and the free month come from Stripe. Complimentary is Pro switched on without a current subscription. Students, staff, and friends and doctors add up to that complimentary total.
`;
};

const revenueSection = (revenue: StripeRevenueSummary | null | undefined): string => {
  if (!revenue) return "";
  const money = (amount: number) => formatMinorUnits(amount, revenue.currency);
  const plans = revenue.plansInUse.length ? revenue.plansInUse : revenue.byPlan.filter((row) => row.mrrPence > 0 || row.collectedAllPence > 0);
  return `
## Stripe revenue

- Monthly recurring: ${money(revenue.mrrPence)}
- Collected last 30 days: ${money(revenue.collected30dPence)}
- Collected all time: ${money(revenue.collectedAllPence)}
- Paying subscriptions: ${n(revenue.activeSubscriptions)}
- Free-month subscriptions: ${n(revenue.trialingSubscriptions)} (not included in monthly recurring)
- Past due: ${n(revenue.pastDueSubscriptions)}
- Pro: ${familyLine(revenue, "pro")}
- Team: ${familyLine(revenue, "team")}

${mdTable(
  ["Plan", "Price", "Paying", "Monthly recurring", "Collected 30 days", "Collected all time"],
  plans.map((row) => [
    row.label,
    row.detail || "—",
    n(row.active),
    money(row.mrrPence),
    money(row.collected30dPence),
    money(row.collectedAllPence),
  ])
)}
${revenue.collectedByMonth.length > 0
  ? `\n### Collected by month\n\n${mdTable(
      ["Month", "Collected"],
      revenue.collectedByMonth.map((row) => [row.label, money(row.amountPence)])
    )}\n`
  : ""}
${revenue.sourceNote ? `\n${revenue.sourceNote}\n` : ""}
${mdTable(
  ["Channel", "Paying", "Monthly recurring", "Collected 30 days", "Collected all time"],
  revenue.byChannel
    .filter((row) => row.active > 0 || row.mrrPence > 0 || row.collectedAllPence > 0)
    .map((row) => [
      row.label,
      n(row.active),
      money(row.mrrPence),
      money(row.collected30dPence),
      money(row.collectedAllPence),
    ])
)}
${revenue.note}
`;
};

const familyLine = (revenue: StripeRevenueSummary, family: "pro" | "team"): string => {
  const row = revenue.byFamily.find((item) => item.family === family);
  const money = (amount: number) => formatMinorUnits(amount, revenue.currency);
  if (!row || (row.active === 0 && row.mrrPence === 0 && row.trialing === 0)) return "none yet";
  return `${money(row.mrrPence)} a month · ${n(row.active)} paying · ${n(row.trialing)} on the free month`;
};

const modelSpendSection = (spend: ModelSpendReport | null | undefined): string => {
  if (!spend) return "\nInvoice totals from Together and OpenAI were not available when this copy was made.\n";
  const gbp = spend.llm.totalGbp == null ? "—" : `£${spend.llm.totalGbp.toFixed(2)}`;
  return `
## What the models have cost

This is the real bill. The dollar figures above are only a token estimate.

- Together: ${usd(spend.llm.togetherUsd)} (last 7 days ${usd(spend.together.spent7dUsd)}, last 30 days ${usd(spend.together.spent30dUsd)})
- OpenAI: ${usd(spend.llm.openaiUsd)} (last 7 days ${usd(spend.openai.spent7dUsd)}, last 30 days ${usd(spend.openai.spent30dUsd)})
- Total: ${usd(spend.llm.totalUsd)} · ${gbp}

${spend.note}
`;
};

export const buildTrendWindow = (
  payload: EngagementPayload,
  range: TrendRangeId = DEFAULT_TREND_RANGE,
  now = new Date()
) => {
  const label = trendRangeLabel(range).toLowerCase();
  const named = label === "all time" ? "all time" : `the ${label}`;
  const weeks = filterWeeks(payload.weekly_activity, range, now);
  const wauByWeek = new Map(payload.wau_history.map((row) => [dateKey(row.week), row.wau ?? null]));
  const months = filterMonths(payload.mau_history, range, now);

  return {
    label,
    named,
    weeks: weeks.map((row) => {
      const key = dateKey(row.week);
      const modes = payload.ask_mode_weekly.find((modeWeek) => dateKey(modeWeek.week) === key);
      return {
        week: key,
        wau: n(wauByWeek.get(key)),
        questions: n(row.questions),
        clinic: n(modes?.clinic ?? 0),
        standard: n(modes?.standard ?? 0),
        deepDive: n(modes?.deepDive ?? 0),
        tools: n(row.tools ?? 0),
        learning: n(row.learning ?? 0),
      };
    }),
    months: months.map((row) => ({
      month: dateKey(row.month).slice(0, 7),
      mau: n(row.mau),
      avgWau: n(row.avg_wau),
      stickiness: pct(row.wau_mau_pct),
      questions: n(row.questions),
    })),
  };
};

export const buildEngagementBriefingMarkdown = (
  payload: EngagementPayload,
  revenue?: StripeRevenueSummary | null,
  proAccess?: ProAccessBreakdown | null,
  modelSpend?: ModelSpendReport | null,
  now = new Date(),
  range: TrendRangeId = DEFAULT_TREND_RANGE
): string => {
  const { snapshot: s, activity: a, costs: c, growth, lifetime: l } = payload;
  const f = growth.funnel;
  const trends = buildTrendWindow(payload, range, now);

  return `# Umbil engagement briefing

Generated: ${new Date(payload.generated_at).toLocaleString("en-GB", { timeZone: "Europe/London" })} (${payload.timezone})
Source: https://umbil.co.uk/admin/engagement

This file is meant to be pasted into ChatGPT, Claude, or similar. It is aggregated only. There are no emails, full names, or chat contents.

## How to read the numbers

- An **active user** is a logged-in person who asked at least one question. Tool use or CPD logging alone does not count as active here.
- **Pro flagged** includes complimentary access. **Paying** and the **free month** come from Stripe. Complimentary is Pro with no current subscription, split into students (UK university email), staff (admin accounts), and friends and doctors.
- **Anonymous questions** were asked while not logged in, so they cannot be tied to a person.
- The **token estimate** is a rough cost from logged tokens. **What the models have cost** is the Together credit used plus the OpenAI invoice, in pounds.
- Trend tables use ${trends.named} and leave off the week and the month still in progress, so an early Monday does not look like a collapse. This week's numbers are in the section above those tables.
- Acquisition source is blank until ads use UTM links (utm_source, utm_medium, utm_campaign).

## Since launch

- First recorded question: ${isoDate(l.first_question_at)}
- Signups: ${n(l.signups)}
- People who have ever asked a question: ${n(l.users_ever_asked)} (${n(l.signups - l.users_ever_asked)} never started)
- Questions (logged in): ${n(l.questions_logged_in)}
- Questions (anonymous): ${n(l.questions_anonymous)}
- Questions (all): ${n(l.questions_total)}
- Tool runs: ${n(l.tools_total)} by ${n(l.tool_users)} people
- Learning items logged: ${n(l.cpd_total)} by ${n(l.cpd_users)} people
- Median questions per person who asked: ${n(l.median_questions)}
- Mean questions per person who asked: ${n(l.mean_questions)}
- Asked only once: ${n(l.asked_once)}
- Asked 5+: ${n(l.asked_5)} · 50+: ${n(l.asked_50)} · 100+: ${n(l.asked_100)}
- Top 20% of users account for ${pct(l.top20_question_share_pct)} of logged-in questions
- Token estimate (all time): $${Number(l.estimated_usd_all).toFixed(2)} (${n(Math.round(Number(l.tokens_all) / 1000))}k tokens)
${modelSpendSection(modelSpend)}
## This week and this month

- Typical weekday users (last 14 days): ${n(s.weekday_dau)}
- Weekly active users: ${weekChange(s.wau, s.wau_prev)}
- Monthly active users: ${n(s.mau)}
- Stickiness (WAU / MAU): ${pct(s.wau_mau_pct)}
- Questions this week: ${weekChange(s.questions_7d, s.questions_prev_7d)}
- Questions last 30 days: ${n(s.questions_30d)}
- Answer styles this week: ${
    payload.ask_modes.length
      ? payload.ask_modes
          .map(
            (row) =>
              `${row.label} ${weekChange(row.questions_7d, row.questions_prev_7d)}, ${n(row.users_7d)} people, ${n(row.questions_30d)} in 30 days`
          )
          .join(" · ")
      : "—"
  }
${payload.ask_modes_ready ? "" : "- Answer styles are incomplete until supabase/ask_mode_analytics.sql has been run.\n"}- Tools this week: ${weekChange(a.tools_7d, a.tools_prev_7d)} by ${n(a.tool_users_7d)} people (${n(a.tools_30d)} in 30 days)
- Learning this week: ${weekChange(a.cpd_7d, a.cpd_prev_7d)} by ${n(a.cpd_users_7d)} people (${n(a.cpd_30d)} in 30 days)
- New signups this week: ${weekChange(a.signups_7d, a.signups_prev_7d)} (${n(a.signups_30d)} in 30 days)
- Token estimate last 7 days: $${Number(c.estimated_usd_7d).toFixed(2)} · last 30 days: $${Number(c.estimated_usd_30d).toFixed(2)}

## This week in detail

${mdTable(
  ["Tool", "Uses this week", "People", "Uses in 30 days"],
  payload.tools
    .filter((row) => row.uses_7d > 0 || row.uses_30d > 0)
    .map((row) => [row.tool_name, n(row.uses_7d), n(row.users_7d), n(row.uses_30d)])
)}

${(() => {
  const gradeTotal = payload.grades.reduce((sum, row) => sum + row.active_30d, 0);
  return mdTable(
    ["Grade this month", "People", "Questions", "Share"],
    payload.grades.map((row) => [row.grade, n(row.active_30d), n(row.questions_30d), shareOf(row.active_30d, gradeTotal)])
  );
})()}

Unknown grade usually means the person never filled in a role.

${mdTable(
  ["#", "Grade", "Questions", "Tools", "Learning"],
  payload.top_users.map((row, index) => [String(index + 1), row.grade, n(row.questions), n(row.tools), n(row.learning)])
)}

Busiest people are ranked by questions. Names are left out. Tools and learning can be zero.

## Retention

Of people whose first question was long enough ago:

- Come back the following week: ${pct(s.week1_retention_pct)}
- Still returning at 4 weeks: ${pct(s.week4_retention_pct)}
- At 8 weeks: ${pct(s.week8_retention_pct)}
- At 12 weeks: ${pct(s.week12_retention_pct)}

${mdTable(
  ["First used", "New users", "Month 1 %", "Month 2 %", "Month 3 %"],
  payload.retention_monthly.map((row) => [
    String(row.cohort_month).slice(0, 7),
    n(row.cohort_size),
    row.month_1_pct == null ? "—" : pct(row.month_1_pct),
    row.month_2_pct == null ? "—" : pct(row.month_2_pct),
    row.month_3_pct == null ? "—" : pct(row.month_3_pct),
  ])
)}

## Growth funnel

${mdTable(
  ["Stage", "People", "% of signups"],
  [
    ["Signed up", n(f.signups), "100%"],
    ["Never asked", n(f.never_asked), `${Math.round((f.never_asked / Math.max(f.signups, 1)) * 100)}%`],
    ["Asked a question", n(f.ever_asked), `${Math.round((f.ever_asked / Math.max(f.signups, 1)) * 100)}%`],
    ["Asked within 24 hours", n(f.asked_within_1d), `${Math.round((f.asked_within_1d / Math.max(f.signups, 1)) * 100)}%`],
    ["Asked within 7 days", n(f.asked_within_7d), `${Math.round((f.asked_within_7d / Math.max(f.signups, 1)) * 100)}%`],
    ["Asked 5+", n(f.reached_5), `${Math.round((f.reached_5 / Math.max(f.signups, 1)) * 100)}%`],
    ["Asked 50+", n(f.reached_50), `${Math.round((f.reached_50 / Math.max(f.signups, 1)) * 100)}%`],
    ["Asked 100+", n(f.reached_100), `${Math.round((f.reached_100 / Math.max(f.signups, 1)) * 100)}%`],
    ["Pro flagged (includes comps)", n(f.pro_flagged), `${Math.round((f.pro_flagged / Math.max(f.signups, 1)) * 100)}%`],
    ["Paying on Stripe", n(f.stripe_active), `${Math.round((f.stripe_active / Math.max(f.signups, 1)) * 100)}%`],
  ]
)}

Heavy users with a Pro flag: ${n(f.heavy_and_pro)}. Heavy users currently paying: ${n(f.heavy_and_stripe)}.

## Who the 100+ question users are

${mdTable(
  ["Grade", "People", "Avg questions", "Weeks active", "Pro flagged", "Stripe active"],
  growth.heavy_by_grade.map((row) => [
    row.grade,
    n(row.users),
    n(row.avg_questions),
    n(row.avg_weeks_active),
    n(row.pro_flagged),
    n(row.stripe_active),
  ])
)}

## Tools used by those heavy users

${mdTable(
  ["Tool", "Uses", "Heavy users"],
  growth.heavy_tools.map((row) => [row.tool_name, n(row.uses), n(row.heavy_users)])
)}

## Answer styles since launch

${mdTable(
  ["Mode", "Questions", "People", "Share of signed-in questions", "This week", "Previous week", "Last 30 days"],
  payload.ask_modes.map((row) => [
    row.label,
    n(row.questions_all),
    n(row.users_all),
    shareOf(row.questions_all, l.questions_logged_in),
    n(row.questions_7d),
    n(row.questions_prev_7d),
    n(row.questions_30d),
  ])
)}

## Tools since launch

${mdTable(
  ["Tool", "Uses", "People"],
  l.tools.map((row) => [row.tool_name, n(row.uses), n(row.users)])
)}

## Who has ever asked a question, by grade

${mdTable(
  ["Grade", "People", "Questions"],
  l.grades.map((row) => [row.grade, n(row.users), n(row.questions)])
)}

## Where people came from

${
  growth.acquisition.every((row) => row.source === "(none)")
    ? "No ad source yet. Ads need UTM links such as https://umbil.co.uk/?utm_source=facebook&utm_medium=paid&utm_campaign=gps_sept26"
    : mdTable(
        ["Source", "Signups", "Asked a question", "Asked 5+"],
        growth.acquisition.map((row) => [
          row.source,
          n(row.signups),
          `${n(row.ever_asked)} (${shareOf(row.ever_asked, row.signups)})`,
          `${n(row.reached_5)} (${shareOf(row.reached_5, row.signups)})`,
        ])
      )
}

## Weekly activity (${trends.label})

Finished weeks only. The week still in progress is left off.

${
  trends.weeks.length === 0
    ? `No finished week in ${trends.named}.`
    : mdTable(
        ["Week", "WAU", "Questions", "Clinic", "Standard", "Deep Dive", "Tools", "Learning logged"],
        trends.weeks.map((row) => [
          row.week,
          row.wau,
          row.questions,
          row.clinic,
          row.standard,
          row.deepDive,
          row.tools,
          row.learning,
        ])
      )
}

## Monthly active users (${trends.label})

Finished months only. The month still in progress is left off.

${
  trends.months.length === 0
    ? `No finished month in ${trends.named}.`
    : mdTable(
        ["Month", "MAU", "Avg WAU", "WAU/MAU %", "Questions"],
        trends.months.map((row) => [row.month, row.mau, row.avgWau, row.stickiness, row.questions])
      )
}

## Suggested reading for an AI

The headline is not “people do not like Umbil enough to come back”. Retention levels off rather than falling to zero, and a core group uses it heavily. The leaks are: (1) about a third of signups never ask a question, (2) usage is concentrated, (3) very few heavy users pay. Next work should be: find the right clinicians, get them to first value quickly, turn more of them into regulars, then give regulars a reason to pay for Pro.

Cost note: ${c.note}
${proAccess ? "" : "\nWho has Pro was not available when this copy was made.\n"}
${proAccessSection(proAccess)}
${revenue ? "" : "\nStripe revenue was not available when this copy was made.\n"}
${revenueSection(revenue)}`;
};

export const downloadTextFile = (filename: string, contents: string, mime = "text/plain"): void => {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const briefingFilename = (generatedAt: string, ext: "md" | "json"): string => {
  const day = new Date(generatedAt).toISOString().slice(0, 10);
  return `umbil-engagement-${day}.${ext}`;
};
