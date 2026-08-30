"use client";

import { useState } from "react";
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
import { formatChange, type EngagementPayload } from "@/lib/engagement/types";

const teal = "var(--umbil-brand-teal)";
const ink = "var(--umbil-text, #111827)";

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

const Stat = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="card">
    <div className="card__body">
      <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--umbil-muted)" }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: "1.6rem", fontWeight: 700, color: ink }}>{value}</p>
      {hint ? (
        <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--umbil-muted)" }}>{hint}</p>
      ) : null}
    </div>
  </div>
);

const EngagementDashboard = ({ payload }: { payload: EngagementPayload }) => {
  const [sending, setSending] = useState(false);
  const [sendNote, setSendNote] = useState<string | null>(null);
  const { snapshot: s, activity: a, costs: c } = payload;

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

  return (
    <div className="page-wrap" style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px 64px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <p style={{ margin: 0, fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase", color: teal }}>
            Internal
          </p>
          <h1 style={{ margin: "4px 0" }}>Engagement</h1>
          <p style={{ margin: 0, color: "var(--umbil-muted)" }}>
            Last 7 days · {new Date(payload.generated_at).toLocaleString("en-GB", { timeZone: "Europe/London" })}
          </p>
        </div>
        <button className="btn btn--primary" type="button" onClick={sendNow} disabled={sending}>
          {sending ? "Sending…" : "Email this week now"}
        </button>
      </div>
      {sendNote ? <p style={{ marginTop: 0, color: "var(--umbil-muted)" }}>{sendNote}</p> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <Stat label="Weekday DAU" value={String(s.weekday_dau)} hint="Mon–Fri, last 14 days" />
        <Stat label="WAU" value={String(s.wau)} hint={`${formatChange(s.wau, s.wau_prev)} vs last week`} />
        <Stat label="MAU" value={String(s.mau)} hint={`${s.wau_mau_pct}% come back weekly`} />
        <Stat label="Questions" value={String(s.questions_7d)} hint={formatChange(s.questions_7d, s.questions_prev_7d)} />
        <Stat label="Tools" value={String(a.tools_7d)} hint={`${a.tool_users_7d} users`} />
        <Stat label="Learning logged" value={String(a.cpd_7d)} hint={`${a.cpd_users_7d} users`} />
        <Stat label="Signups" value={String(a.signups_7d)} hint={formatChange(a.signups_7d, a.signups_prev_7d)} />
        <Stat label="Est. LLM cost" value={`$${Number(c.estimated_usd_7d).toFixed(2)}`} hint={`${Math.round(Number(c.tokens_7d) / 1000)}k tokens`} />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card__body">
          <h2 style={{ marginTop: 0 }}>Questions, tools and learning by week</h2>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={payload.weekly_activity.map((row) => ({ ...row, week: shortWeek(row.week) }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="questions" name="Questions" stroke={teal} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="tools" name="Tools" stroke="#0f766e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="learning" name="Learning" stroke="#334155" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card__body">
            <h2 style={{ marginTop: 0 }}>Weekly active users</h2>
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={payload.wau_history.map((row) => ({ ...row, week: shortWeek(row.week) }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="wau" name="WAU" stroke={teal} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card__body">
            <h2 style={{ marginTop: 0 }}>Monthly active users</h2>
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={payload.mau_history.map((row) => ({ ...row, month: shortMonth(row.month) }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="mau" name="MAU" stroke={teal} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card__body">
            <h2 style={{ marginTop: 0 }}>Tools this week</h2>
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={payload.tools.filter((t) => t.uses_7d > 0)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="tool_name" width={120} />
                  <Tooltip />
                  <Bar dataKey="uses_7d" name="Uses" fill={teal} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card__body">
            <h2 style={{ marginTop: 0 }}>Active users by grade (30 days)</h2>
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={payload.grades} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="grade" width={130} />
                  <Tooltip />
                  <Bar dataKey="active_30d" name="Users" fill={teal} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card__body">
          <h2 style={{ marginTop: 0 }}>Most active this week</h2>
          <p style={{ color: "var(--umbil-muted)", marginTop: 0 }}>First name and grade only.</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Name", "Grade", "Questions", "Tools", "Learning"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid var(--umbil-border)", fontSize: "0.8rem" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payload.top_users.map((user) => (
                  <tr key={`${user.first_name}-${user.grade}-${user.questions}`}>
                    <td style={{ padding: "8px 6px" }}>{user.first_name}</td>
                    <td style={{ padding: "8px 6px" }}>{user.grade}</td>
                    <td style={{ padding: "8px 6px" }}>{user.questions}</td>
                    <td style={{ padding: "8px 6px" }}>{user.tools}</td>
                    <td style={{ padding: "8px 6px" }}>{user.learning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__body">
          <h2 style={{ marginTop: 0 }}>Monthly retention</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Cohort", "New users", "Month 1", "Month 2", "Month 3"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid var(--umbil-border)", fontSize: "0.8rem" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payload.retention_monthly.map((row) => (
                  <tr key={row.cohort_month}>
                    <td style={{ padding: "8px 6px" }}>{shortMonth(row.cohort_month)}</td>
                    <td style={{ padding: "8px 6px" }}>{row.cohort_size}</td>
                    <td style={{ padding: "8px 6px" }}>{row.month_1_pct == null ? "—" : `${row.month_1_pct}%`}</td>
                    <td style={{ padding: "8px 6px" }}>{row.month_2_pct == null ? "—" : `${row.month_2_pct}%`}</td>
                    <td style={{ padding: "8px 6px" }}>{row.month_3_pct == null ? "—" : `${row.month_3_pct}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ color: "var(--umbil-muted)", fontSize: "0.8rem", marginBottom: 0 }}>{c.note}</p>
        </div>
      </div>
    </div>
  );
};

export default EngagementDashboard;
