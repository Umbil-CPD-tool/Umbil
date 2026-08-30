import type { EngagementPayload } from "./types";

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

export const buildEngagementBriefingMarkdown = (payload: EngagementPayload): string => {
  const { snapshot: s, activity: a, costs: c, growth, lifetime: l } = payload;
  const f = growth.funnel;

  return `# Umbil engagement briefing

Generated: ${new Date(payload.generated_at).toLocaleString("en-GB", { timeZone: "Europe/London" })} (${payload.timezone})
Source: https://umbil.co.uk/admin/engagement

This file is meant to be pasted into ChatGPT, Claude, or similar. It is aggregated only. There are no emails, full names, or chat contents.

## How to read the numbers

- An **active user** is a logged-in person who asked at least one question. Tool use or CPD logging alone does not count as active here.
- **Pro flagged** includes complimentary / staff access. **Stripe active** is people currently paying.
- **Anonymous questions** were asked while not logged in, so they cannot be tied to a person.
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
- Estimated LLM cost (all time): $${Number(l.estimated_usd_all).toFixed(2)} (${n(Math.round(Number(l.tokens_all) / 1000))}k tokens)

## This week and this month

- Typical weekday users (last 14 days): ${n(s.weekday_dau)}
- Weekly active users: ${n(s.wau)} (previous week ${n(s.wau_prev)})
- Monthly active users: ${n(s.mau)}
- Stickiness (WAU / MAU): ${pct(s.wau_mau_pct)}
- Questions this week: ${n(s.questions_7d)} (previous week ${n(s.questions_prev_7d)})
- Questions last 30 days: ${n(s.questions_30d)}
- Tools this week: ${n(a.tools_7d)} by ${n(a.tool_users_7d)} people
- Learning this week: ${n(a.cpd_7d)} by ${n(a.cpd_users_7d)} people
- New signups this week: ${n(a.signups_7d)}
- Estimated LLM cost last 7 days: $${Number(c.estimated_usd_7d).toFixed(2)} · last 30 days: $${Number(c.estimated_usd_30d).toFixed(2)}

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
        growth.acquisition.map((row) => [row.source, n(row.signups), n(row.ever_asked), n(row.reached_5)])
      )
}

## Weekly activity (logged-in questions)

${mdTable(
  ["Week", "Questions", "Tools", "Learning"],
  payload.weekly_activity.map((row) => [
    String(row.week).slice(0, 10),
    n(row.questions),
    n(row.tools ?? 0),
    n(row.learning ?? 0),
  ])
)}

## Monthly active users

${mdTable(
  ["Month", "MAU", "Avg WAU", "WAU/MAU %", "Questions"],
  payload.mau_history.map((row) => [
    String(row.month).slice(0, 7),
    n(row.mau),
    n(row.avg_wau),
    pct(row.wau_mau_pct),
    n(row.questions),
  ])
)}

## Suggested reading for an AI

The headline is not “people do not like Umbil enough to come back”. Retention levels off rather than falling to zero, and a core group uses it heavily. The leaks are: (1) about a third of signups never ask a question, (2) usage is concentrated, (3) very few heavy users pay. Next work should be: find the right clinicians, get them to first value quickly, turn more of them into regulars, then give regulars a reason to pay for Pro.

Cost note: ${c.note}
`;
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
