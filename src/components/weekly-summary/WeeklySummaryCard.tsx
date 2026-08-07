"use client";

import Link from "next/link";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  formatWeekLabel,
  hasWeeklyActivity,
  WEEKLY_TOPIC_COLORS,
  type WeeklySummaryData,
} from "@/lib/weekly-summary";

type WeeklySummaryCardProps = {
  summary: WeeklySummaryData | null;
  loading?: boolean;
  compact?: boolean;
  showActions?: boolean;
};

const Stat = ({
  label,
  value,
  compact,
}: {
  label: string;
  value: string | number;
  compact?: boolean;
}) => (
  <div
    className="text-center"
    style={{
      flex: 1,
      minWidth: compact ? 72 : 88,
      padding: compact ? "8px 4px" : "12px 8px",
    }}
  >
    <div
      style={{
        fontSize: compact ? "1.35rem" : "1.6rem",
        fontWeight: 700,
        color: "var(--umbil-brand-teal)",
        lineHeight: 1.1,
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontSize: "0.75rem",
        color: "var(--umbil-muted)",
        marginTop: 4,
        lineHeight: 1.3,
      }}
    >
      {label}
    </div>
  </div>
);

const TopicTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
}) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div
      style={{
        background: "var(--umbil-surface)",
        border: "1px solid var(--umbil-border)",
        borderRadius: 8,
        padding: "8px 10px",
        fontSize: "0.8rem",
        color: "var(--umbil-text)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      <strong>{item.name}</strong>: {item.value}{" "}
      {item.value === 1 ? "question" : "questions"}
    </div>
  );
};

export default function WeeklySummaryCard({
  summary,
  loading = false,
  compact = false,
  showActions = true,
}: WeeklySummaryCardProps) {
  if (loading) {
    return (
      <p style={{ color: "var(--umbil-muted)", margin: 0 }}>
        Loading this week&apos;s activity…
      </p>
    );
  }

  if (!summary) {
    return (
      <p style={{ color: "var(--umbil-muted)", margin: 0 }}>
        Couldn&apos;t load your weekly summary. Please try again.
      </p>
    );
  }

  const active = hasWeeklyActivity(summary);
  const rangeLabel = formatWeekLabel(summary.weekStart, summary.weekEnd);
  const pieData = summary.questionTopics.filter((t) => t.count > 0);
  const chartHeight = compact ? 160 : 200;

  return (
    <div>
      <p
        style={{
          fontSize: "0.85rem",
          color: "var(--umbil-muted)",
          marginBottom: compact ? 12 : 16,
        }}
      >
        This week · {rangeLabel}
      </p>

      {!active ? (
        <p style={{ margin: "0 0 12px", color: "var(--umbil-text)", lineHeight: 1.5 }}>
          No activity yet this week — ask a question or log a reflection to get started.
        </p>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              marginBottom: 16,
              background: "var(--umbil-hover-bg)",
              borderRadius: 12,
              border: "1px solid var(--umbil-border)",
            }}
          >
            <Stat label="Questions" value={summary.questionsAsked} compact={compact} />
            <Stat label="Learning logs" value={summary.learningLogged} compact={compact} />
            <Stat label="Tools used" value={summary.toolsUsed} compact={compact} />
            <Stat
              label="Active days"
              value={`${summary.activeDays}/7`}
              compact={compact}
            />
          </div>

          {summary.topQuestionTopic && summary.questionsAsked > 0 && (
            <p
              style={{
                margin: "0 0 14px",
                fontSize: "0.9rem",
                lineHeight: 1.45,
                color: "var(--umbil-text)",
              }}
            >
              Most asked topic:{" "}
              <strong style={{ color: "var(--umbil-brand-teal)" }}>
                {summary.topQuestionTopic}
              </strong>
            </p>
          )}

          {pieData.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  marginBottom: 8,
                  color: "var(--umbil-text)",
                }}
              >
                Questions by specialty
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ width: compact ? 140 : 170, height: chartHeight, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={compact ? 32 : 42}
                        outerRadius={compact ? 58 : 70}
                        paddingAngle={2}
                        stroke="var(--umbil-surface)"
                        strokeWidth={2}
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={WEEKLY_TOPIC_COLORS[index % WEEKLY_TOPIC_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<TopicTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    flex: 1,
                    minWidth: 120,
                    fontSize: "0.8rem",
                    lineHeight: 1.55,
                    color: "var(--umbil-text)",
                  }}
                >
                  {pieData.slice(0, 6).map((topic, index) => {
                    const pct = Math.round(
                      (topic.count / summary.questionsAsked) * 100
                    );
                    return (
                      <li
                        key={topic.name}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            flexShrink: 0,
                            background:
                              WEEKLY_TOPIC_COLORS[index % WEEKLY_TOPIC_COLORS.length],
                          }}
                        />
                        <span style={{ flex: 1 }}>{topic.name}</span>
                        <span style={{ color: "var(--umbil-muted)", whiteSpace: "nowrap" }}>
                          {topic.count} · {pct}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

          {summary.loggedTopics.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  marginBottom: 8,
                  color: "var(--umbil-text)",
                }}
              >
                Topics you logged
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {summary.loggedTopics.map((topic) => (
                  <span
                    key={topic.name}
                    style={{
                      fontSize: "0.8rem",
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "rgba(51, 225, 255, 0.12)",
                      color: "var(--umbil-text)",
                      border: "1px solid rgba(51, 225, 255, 0.25)",
                    }}
                  >
                    {topic.name}
                    {topic.count > 1 ? ` · ${topic.count}` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {summary.toolsByType.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  marginBottom: 6,
                  color: "var(--umbil-text)",
                }}
              >
                Tools
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: "0.85rem",
                  color: "var(--umbil-muted)",
                  lineHeight: 1.6,
                }}
              >
                {summary.toolsByType.slice(0, 4).map((tool) => (
                  <li key={tool.name}>
                    {tool.name}
                    {tool.count > 1 ? ` × ${tool.count}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <p
        style={{
          margin: "0 0 4px",
          fontSize: "0.9rem",
          lineHeight: 1.5,
          color: "var(--umbil-text)",
        }}
      >
        {summary.encouragement}
      </p>

      {showActions && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 16,
          }}
        >
          <Link href="/capture-learning" className="btn btn--primary" style={{ fontSize: "0.9rem" }}>
            Log learning
          </Link>
          <Link href="/cpd/analytics" className="btn btn--outline" style={{ fontSize: "0.9rem" }}>
            View analytics
          </Link>
        </div>
      )}
    </div>
  );
}
