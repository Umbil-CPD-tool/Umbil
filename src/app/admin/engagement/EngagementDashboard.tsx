"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  briefingFilename,
  buildEngagementBriefingMarkdown,
  downloadTextFile,
} from "@/lib/engagement/exportReport";
import { changePct, formatChange, type EngagementPayload, type GrowthFunnelCounts } from "@/lib/engagement/types";
import styles from "./engagement.module.css";

const fmt = (value: number): string => Number(value).toLocaleString("en-GB");

const teal = "var(--umbil-brand-teal)";

const SECTIONS = [
  { id: "this-week", label: "1. This week" },
  { id: "since-launch", label: "2. Since launch" },
  { id: "funnel", label: "3. Funnel" },
  { id: "regulars", label: "4. Regulars" },
  { id: "trends", label: "5. Trends" },
  { id: "this-week-detail", label: "6. This week in detail" },
  { id: "retention", label: "7. Retention" },
  { id: "ads", label: "8. Ads" },
] as const;

const shortWeek = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(5, 10);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

const shortMonth = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 7);
  return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
};

const Delta = ({ current, previous }: { current: number; previous: number }) => {
  const pct = changePct(current, previous);
  const cls = pct == null || pct === 0 ? styles.flat : pct > 0 ? styles.up : styles.down;
  return <span className={cls}>{formatChange(current, previous)} vs last week</span>;
};

const heatStyle = (pct: number | null) => {
  if (pct == null) {
    return { background: "var(--umbil-bg-subtle, #f8fafc)", color: "var(--umbil-muted)" };
  }
  if (pct >= 35) return { background: "color-mix(in srgb, var(--umbil-brand-teal) 28%, white)", color: "#115e59" };
  if (pct >= 25) return { background: "color-mix(in srgb, var(--umbil-brand-teal) 16%, white)", color: "#134e4a" };
  return { background: "#fff7ed", color: "#9a3412" };
};

const pctOf = (value: number, total: number): string => {
  if (total <= 0) return "—";
  return `${Math.round((value / total) * 100)}%`;
};

const Block = ({
  id,
  step,
  title,
  summary,
  children,
}: {
  id: string;
  step: string;
  title: string;
  summary: ReactNode;
  children: ReactNode;
}) => (
  <section id={id} className={styles.block}>
    <header className={styles.blockHead}>
      <p className={styles.kicker}>{step}</p>
      <h2 className={styles.blockTitle}>{title}</h2>
      <p className={styles.blockSummary}>{summary}</p>
    </header>
    <div className={styles.blockBody}>{children}</div>
  </section>
);

const FunnelSteps = ({ funnel }: { funnel: GrowthFunnelCounts }) => {
  const steps = [
    { label: "Signed up", value: funnel.signups, hint: "Registered accounts" },
    { label: "Asked a question", value: funnel.ever_asked, hint: `${funnel.never_asked} never started` },
    { label: "Asked 5+", value: funnel.reached_5, hint: "Past first-use curiosity" },
    { label: "Asked 50+", value: funnel.reached_50, hint: "Regular users" },
    { label: "Asked 100+", value: funnel.reached_100, hint: "Heavy users" },
    { label: "Pro flagged", value: funnel.pro_flagged, hint: "Includes comps" },
    { label: "Paying on Stripe", value: funnel.stripe_active, hint: "Currently billed" },
  ];
  const max = Math.max(1, funnel.signups);

  return (
    <div className={styles.funnel}>
      {steps.map((step) => (
        <div key={step.label} className={styles.funnelRow}>
          <div>
            <p className={styles.funnelLabel}>{step.label}</p>
            <p className={styles.funnelHint}>{step.hint}</p>
          </div>
          <div className={styles.funnelTrack}>
            <div className={styles.funnelBar} style={{ width: `${Math.max(3, Math.round((step.value / max) * 100))}%` }} />
          </div>
          <p className={styles.funnelValue}>{fmt(step.value)}</p>
          <p className={styles.funnelPct}>{pctOf(step.value, funnel.signups)}</p>
        </div>
      ))}
    </div>
  );
};

const Stat = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
}) => (
  <div className={styles.stat}>
    <p className={styles.statLabel}>{label}</p>
    <p className={styles.statValue}>{value}</p>
    {hint ? <p className={styles.statHint}>{hint}</p> : null}
  </div>
);

const EngagementDashboard = ({ payload }: { payload: EngagementPayload }) => {
  const [sending, setSending] = useState(false);
  const [sendNote, setSendNote] = useState<string | null>(null);
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const { snapshot: s, activity: a, costs: c, growth, lifetime: l } = payload;
  const f = growth.funnel;
  const attributed = growth.acquisition.filter((row) => row.source !== "(none)");
  const askedSameDay = f.ever_asked > 0 ? Math.round((f.asked_within_1d / f.ever_asked) * 100) : 0;

  const weeklyQuestions = useMemo(
    () => payload.weekly_activity.map((row) => ({ week: shortWeek(row.week), questions: row.questions })),
    [payload.weekly_activity]
  );
  const weeklyWork = useMemo(
    () =>
      payload.weekly_activity.map((row) => ({
        week: shortWeek(row.week),
        tools: row.tools ?? 0,
        learning: row.learning ?? 0,
      })),
    [payload.weekly_activity]
  );
  const wauHistory = useMemo(
    () => payload.wau_history.map((row) => ({ week: shortWeek(row.week), wau: row.wau })),
    [payload.wau_history]
  );
  const mauHistory = useMemo(
    () => payload.mau_history.map((row) => ({ month: shortMonth(row.month), mau: row.mau })),
    [payload.mau_history]
  );
  const toolsThisWeek = useMemo(
    () =>
      payload.tools
        .filter((t) => t.uses_7d > 0)
        .map((t) => ({ ...t, label: `${t.tool_name} · ${t.users_7d} users` })),
    [payload.tools]
  );
  const grades = useMemo(() => {
    const total = payload.grades.reduce((sum, row) => sum + row.active_30d, 0) || 1;
    const known = payload.grades.filter((row) => row.grade !== "Unknown");
    const unknown = payload.grades.filter((row) => row.grade === "Unknown");
    return [...known, ...unknown].map((row) => ({
      ...row,
      share: Math.round((row.active_30d / total) * 100),
    }));
  }, [payload.grades]);
  const unknownShare = grades.find((row) => row.grade === "Unknown")?.share ?? 0;

  const sendNow = async () => {
    setSending(true);
    setSendNote(null);
    try {
      const res = await fetch("/api/admin/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slack: true }),
      });
      const json = (await res.json()) as { error?: string; emailed?: number; slack?: boolean };
      if (!res.ok) throw new Error(json.error || "Send failed");
      setSendNote(`Sent to ${json.emailed ?? 0} inbox${json.emailed === 1 ? "" : "es"}${json.slack ? " and Slack" : ""}.`);
    } catch (error) {
      setSendNote(error instanceof Error ? error.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const downloadBriefing = () => {
    downloadTextFile(
      briefingFilename(payload.generated_at, "md"),
      buildEngagementBriefingMarkdown(payload),
      "text/markdown"
    );
  };

  const downloadJson = () => {
    downloadTextFile(
      briefingFilename(payload.generated_at, "json"),
      JSON.stringify(payload, null, 2),
      "application/json"
    );
  };

  const copyBriefing = async () => {
    try {
      await navigator.clipboard.writeText(buildEngagementBriefingMarkdown(payload));
      setCopyNote("Copied — paste it into ChatGPT or Claude.");
    } catch {
      setCopyNote("Could not copy. Use Download briefing instead.");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Internal</p>
          <h1 style={{ margin: "4px 0 6px" }}>How sticky is Umbil?</h1>
          <p style={{ margin: 0, color: "var(--umbil-muted)" }}>
            {new Date(payload.generated_at).toLocaleString("en-GB", { timeZone: "Europe/London" })}
          </p>
        </div>
        <div className={styles.actions}>
          <button className="btn btn--primary" type="button" onClick={sendNow} disabled={sending}>
            {sending ? "Sending…" : "Email this week"}
          </button>
          <button className="btn" type="button" onClick={downloadBriefing}>
            Download briefing
          </button>
          <button className={styles.textBtn} type="button" onClick={() => void copyBriefing()}>
            Copy for AI
          </button>
          <button className={styles.textBtn} type="button" onClick={downloadJson}>
            JSON
          </button>
        </div>
      </div>
      {sendNote ? <p className={styles.note}>{sendNote}</p> : null}
      {copyNote ? <p className={styles.note}>{copyNote}</p> : null}

      <nav className={styles.toc} aria-label="Jump to section">
        {SECTIONS.map((section) => (
          <a key={section.id} href={`#${section.id}`}>
            {section.label}
          </a>
        ))}
      </nav>

      <Block
        id="this-week"
        step="1 · This week"
        title="People who get going do come back"
        summary={
          <>
            <strong>{fmt(s.wau)}</strong> people used Umbil this week (<Delta current={s.wau} previous={s.wau_prev} />
            ). About <strong>{s.wau_mau_pct}%</strong> of this month’s users returned in the last 7 days.
          </>
        }
      >
        <div className={styles.stats}>
          <Stat label="Typical weekday" value={String(s.weekday_dau)} hint="Average Mon–Fri users, last 14 days" />
          <Stat label="This week" value={fmt(s.wau)} hint={<Delta current={s.wau} previous={s.wau_prev} />} />
          <Stat label="This month" value={fmt(s.mau)} hint={`${s.wau_mau_pct}% come back most weeks`} />
          <Stat
            label="Still using after 4 weeks"
            value={s.week4_retention_pct == null ? "—" : `${s.week4_retention_pct}%`}
            hint={`Week 1 ${s.week1_retention_pct ?? "—"}% · week 12 ${s.week12_retention_pct ?? "—"}%`}
          />
        </div>
        <div className={styles.stats}>
          <Stat
            label="Questions"
            value={fmt(s.questions_7d)}
            hint={<Delta current={s.questions_7d} previous={s.questions_prev_7d} />}
          />
          <Stat label="Tools" value={fmt(a.tools_7d)} hint={`${a.tool_users_7d} people · mostly referrals`} />
          <Stat label="Learning logged" value={fmt(a.cpd_7d)} hint={`${a.cpd_users_7d} people saved CPD`} />
          <Stat
            label="New signups"
            value={fmt(a.signups_7d)}
            hint={<Delta current={a.signups_7d} previous={a.signups_prev_7d} />}
          />
        </div>
      </Block>

      <Block
        id="since-launch"
        step="2 · Since launch"
        title="A real core group, not just registrations"
        summary={
          <>
            {fmt(l.questions_total)} questions from {fmt(l.users_ever_asked)} people who actually asked. The typical
            user asked {fmt(l.median_questions)}; a smaller group uses Umbil a lot.
          </>
        }
      >
        <div className={styles.stats}>
          <Stat
            label="Questions"
            value={fmt(l.questions_total)}
            hint={`${fmt(l.questions_logged_in)} signed-in · ${fmt(l.questions_anonymous)} anonymous`}
          />
          <Stat
            label="People who have asked"
            value={fmt(l.users_ever_asked)}
            hint={`${fmt(l.signups)} signups · ${fmt(l.signups - l.users_ever_asked)} never started`}
          />
          <Stat label="Tools run" value={fmt(l.tools_total)} hint={`${fmt(l.tool_users)} people used a tool`} />
          <Stat label="Learning logged" value={fmt(l.cpd_total)} hint={`${fmt(l.cpd_users)} people saved CPD`} />
        </div>
        <div className={styles.stats}>
          <Stat
            label="Typical user"
            value={`${fmt(l.median_questions)} questions`}
            hint={`Median. Mean is ${fmt(l.mean_questions)} because a few people ask a lot`}
          />
          <Stat
            label="Top 20% of users"
            value={`${l.top20_question_share_pct}%`}
            hint="Share of all signed-in questions"
          />
          <Stat
            label="Asked 100+"
            value={fmt(l.asked_100)}
            hint={`${fmt(l.asked_50)} asked 50+ · ${fmt(l.asked_once)} asked only once`}
          />
          <Stat
            label="Est. LLM cost"
            value={`$${Number(l.estimated_usd_all).toFixed(2)}`}
            hint={`This week $${Number(c.estimated_usd_7d).toFixed(2)} · 30 days $${Number(c.estimated_usd_30d).toFixed(2)}`}
          />
        </div>
        <div className={styles.grid2} style={{ marginTop: 16 }}>
          <div>
            <h3 className={styles.panelTitle}>Tools since launch</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tool</th>
                    <th>Uses</th>
                    <th>People</th>
                  </tr>
                </thead>
                <tbody>
                  {l.tools.map((row) => (
                    <tr key={row.tool_name}>
                      <td>{row.tool_name}</td>
                      <td>{fmt(row.uses)}</td>
                      <td>{fmt(row.users)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className={styles.panelTitle}>Who has ever asked</h3>
            <p className={`${styles.note} ${styles.noteTop}`}>Unknown usually means they never filled in their grade.</p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Grade</th>
                    <th>People</th>
                    <th>Questions</th>
                  </tr>
                </thead>
                <tbody>
                  {l.grades.map((row) => (
                    <tr key={row.grade}>
                      <td>{row.grade}</td>
                      <td>{fmt(row.users)}</td>
                      <td>{fmt(row.questions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Block>

      <Block
        id="funnel"
        step="3 · The leak"
        title="The drop is signup to first question, then Pro"
        summary={
          <>
            Of people who ask at least once, <strong>{askedSameDay}%</strong> do it within 24 hours. Stickiness is not
            the main problem. Getting people started — and then giving regulars a reason to pay — is.
          </>
        }
      >
        <FunnelSteps funnel={f} />
      </Block>

      <Block
        id="regulars"
        step="4 · Who it works for"
        title="The 85 people who asked 100+ questions"
        summary={
          <>
            GPs are the group that converts: {growth.heavy_by_grade.find((row) => row.grade === "GP")?.pro_flagged ?? 0}{" "}
            of them have a Pro flag, and {f.heavy_and_stripe} heavy users are paying. Referral Writer is the tool that
            has clicked.
          </>
        }
      >
        <div className={styles.grid2}>
          <div>
            <h3 className={styles.panelTitle}>By grade</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Grade</th>
                    <th>People</th>
                    <th>Avg questions</th>
                    <th>Weeks</th>
                    <th>Pro</th>
                    <th>Stripe</th>
                  </tr>
                </thead>
                <tbody>
                  {growth.heavy_by_grade.map((row) => (
                    <tr key={row.grade}>
                      <td>{row.grade}</td>
                      <td>{row.users}</td>
                      <td>{row.avg_questions}</td>
                      <td>{row.avg_weeks_active}</td>
                      <td>{row.pro_flagged}</td>
                      <td>{row.stripe_active}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className={styles.panelTitle}>Tools they run</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tool</th>
                    <th>Uses</th>
                    <th>People</th>
                  </tr>
                </thead>
                <tbody>
                  {growth.heavy_tools.map((row) => (
                    <tr key={row.tool_name}>
                      <td>{row.tool_name}</td>
                      <td>{fmt(row.uses)}</td>
                      <td>{fmt(row.heavy_users)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Block>

      <Block
        id="trends"
        step="5 · Trends"
        title="Questions and users over time"
        summary="Questions on their own scale. Tools and learning are much smaller, so they sit on a separate chart."
      >
        <h3 className={styles.panelTitle}>Questions each week</h3>
        <div className={styles.chartTall}>
          <ResponsiveContainer>
            <LineChart data={weeklyQuestions}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="questions" name="Questions" stroke={teal} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.grid2} style={{ marginTop: 16 }}>
          <div>
            <h3 className={styles.panelTitle}>Tools and learning</h3>
            <div className={styles.chart}>
              <ResponsiveContainer>
                <LineChart data={weeklyWork}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="tools" name="Tools" stroke={teal} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="learning" name="Learning" stroke="#334155" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h3 className={styles.panelTitle}>Weekly active users</h3>
            <p className={`${styles.note} ${styles.noteTop}`}>Logged-in people who asked at least one question.</p>
            <div className={styles.chart}>
              <ResponsiveContainer>
                <LineChart data={wauHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="wau" name="WAU" stroke={teal} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <h3 className={styles.panelTitle}>Monthly active users</h3>
          <div className={styles.chart}>
            <ResponsiveContainer>
              <LineChart data={mauHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, "auto"]} />
                <Tooltip />
                <Line type="monotone" dataKey="mau" name="MAU" stroke={teal} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Block>

      <Block
        id="this-week-detail"
        step="6 · This week in detail"
        title="What they used, and who was busiest"
        summary={`${unknownShare}% of this month’s users have no usable grade, so they show as Unknown. First names are omitted when they are only a title.`}
      >
        <div className={styles.grid2}>
          <div>
            <h3 className={styles.panelTitle}>Tools this week</h3>
            <div className={styles.chart}>
              <ResponsiveContainer>
                <BarChart data={toolsThisWeek} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="tool_name" width={120} />
                  <Tooltip
                    formatter={(value, _name, item) => {
                      const row = item?.payload as { users_7d?: number } | undefined;
                      return [`${value} uses · ${row?.users_7d ?? 0} people`, "This week"];
                    }}
                  />
                  <Bar dataKey="uses_7d" name="Uses" fill={teal} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h3 className={styles.panelTitle}>Who used it this month</h3>
            <div className={styles.chart}>
              <ResponsiveContainer>
                <BarChart data={grades} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="grade" width={130} />
                  <Tooltip
                    formatter={(value, _name, item) => {
                      const row = item?.payload as { questions_30d?: number; share?: number } | undefined;
                      return [`${value} people · ${row?.questions_30d ?? 0} questions · ${row?.share ?? 0}%`, "30 days"];
                    }}
                  />
                  <Bar dataKey="active_30d" name="People" fill={teal} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <h3 className={styles.panelTitle} style={{ marginTop: 16 }}>
          Busiest this week
        </h3>
        <p className={`${styles.note} ${styles.noteTop}`}>
          Ranked by questions. Tools and learning can be zero — heavy askers are often not the same people who draft
          referrals.
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Grade</th>
                <th>Questions</th>
                <th>Tools</th>
                <th>Learning</th>
              </tr>
            </thead>
            <tbody>
              {payload.top_users.map((user, index) => (
                <tr key={`${user.grade}-${user.questions}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{user.grade}</td>
                  <td>{user.questions}</td>
                  <td>{user.tools}</td>
                  <td>{user.learning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Block>

      <Block
        id="retention"
        step="7 · Retention"
        title="It levels off rather than falling to zero"
        summary="Of people whose first question was in that month, how many asked again 1, 2 and 3 months later. A dash means that month has not finished yet. Stronger green is better."
      >
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>First used</th>
                <th>New users</th>
                <th>Month 1</th>
                <th>Month 2</th>
                <th>Month 3</th>
              </tr>
            </thead>
            <tbody>
              {payload.retention_monthly.map((row) => (
                <tr key={row.cohort_month}>
                  <td>{shortMonth(row.cohort_month)}</td>
                  <td>{row.cohort_size}</td>
                  <td>
                    <span className={styles.heat} style={heatStyle(row.month_1_pct)}>
                      {row.month_1_pct == null ? "—" : `${row.month_1_pct}%`}
                    </span>
                  </td>
                  <td>
                    <span className={styles.heat} style={heatStyle(row.month_2_pct)}>
                      {row.month_2_pct == null ? "—" : `${row.month_2_pct}%`}
                    </span>
                  </td>
                  <td>
                    <span className={styles.heat} style={heatStyle(row.month_3_pct)}>
                      {row.month_3_pct == null ? "—" : `${row.month_3_pct}%`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Block>

      <Block
        id="ads"
        step="8 · Ads"
        title="Judge campaigns on use, not clicks"
        summary="Once ads use tagged links, this table will show signup → first question → 5 questions by source."
      >
        {attributed.length === 0 ? (
          <>
            <p className={`${styles.note} ${styles.noteTop}`}>
              Nothing here yet. Marketing should point every Meta or Google ad at a tagged homepage link:
            </p>
            <code className={styles.code}>
              https://umbil.co.uk/?utm_source=facebook&utm_medium=paid&utm_campaign=gps_sept26
            </code>
          </>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Signups</th>
                  <th>Asked a question</th>
                  <th>Asked 5+</th>
                </tr>
              </thead>
              <tbody>
                {growth.acquisition.map((row) => (
                  <tr key={row.source}>
                    <td>{row.source}</td>
                    <td>{row.signups}</td>
                    <td>
                      {row.ever_asked} ({pctOf(row.ever_asked, row.signups)})
                    </td>
                    <td>
                      {row.reached_5} ({pctOf(row.reached_5, row.signups)})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Block>
    </div>
  );
};

export default EngagementDashboard;
