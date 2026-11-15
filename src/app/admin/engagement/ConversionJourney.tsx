"use client";

import { useState } from "react";
import { baselineStatusCopy } from "@/lib/analytics/conversionFunnel";
import type { ConversionFunnelReport, ConversionReturnWindow, ConversionSegmentRow } from "@/lib/engagement/types";
import { formatMinorUnits } from "@/lib/stripe/revenue";
import styles from "./engagement.module.css";

const fmt = (value: number): string => Number(value).toLocaleString("en-GB");

const TIER_LABELS: Record<string, string> = {
  guest: "Guest",
  new: "New (no questions yet)",
  light: "Light (1–4 questions)",
  regular: "Regular (5–49)",
  heavy: "Heavy (50–99)",
  power: "Power (100+)",
  unknown: "Unknown",
};

const SURFACE_LABELS: Record<string, string> = {
  question: "Questions",
  tool: "Tools",
  cpd: "CPD",
};

const rateCell = (window: ConversionReturnWindow, days: 7 | 14 | 30): string => {
  const matured = days === 7 ? window.matured_7d : days === 14 ? window.matured_14d : window.matured_30d;
  const returned = days === 7 ? window.returned_7d : days === 14 ? window.returned_14d : window.returned_30d;
  const pct = days === 7 ? window.return_7d_pct : days === 14 ? window.return_14d_pct : window.return_30d_pct;
  if (matured <= 0 || pct == null) return "Not enough time yet";
  return `${pct}% · ${fmt(returned)} of ${fmt(matured)}`;
};

const SegmentTable = ({ rows }: { rows: ConversionSegmentRow[] }) => (
  <div className={styles.tableWrap}>
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Group</th>
          <th>Hit a limit</th>
          <th>Saw pricing</th>
          <th>Clicked upgrade</th>
          <th>Opened checkout</th>
          <th>Free month</th>
          <th>Started paying</th>
          <th>Cancelled</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.segment}>
            <td>{TIER_LABELS[row.segment] ?? row.segment}</td>
            <td>{fmt(row.limit_reached)}</td>
            <td>{fmt(row.pricing_viewed)}</td>
            <td>{fmt(row.upgrade_clicked)}</td>
            <td>{fmt(row.checkout_started)}</td>
            <td>{fmt(row.trial_started)}</td>
            <td>{fmt(row.subscribed)}</td>
            <td>{fmt(row.cancelled)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ConversionJourney = ({
  report,
  onChange,
}: {
  report: ConversionFunnelReport | null;
  onChange: (report: ConversionFunnelReport) => void;
}) => {
  const [marking, setMarking] = useState(false);
  const [markNote, setMarkNote] = useState<string | null>(null);

  if (!report) {
    return (
      <p className={styles.note}>
        Upgrade tracking is not available on this database yet. The rest of this page is unchanged.
      </p>
    );
  }

  const events = report.events;
  const money = (pence: number) => formatMinorUnits(pence, "gbp");
  const copy = baselineStatusCopy({
    daysElapsed: report.days_elapsed,
    trackingStartedAt: report.tracking_started_at,
    limitsChangedAt: report.limits_changed_at,
  });
  const grades = report.by_grade.filter((row) =>
    row.limit_reached + row.pricing_viewed + row.upgrade_clicked + row.checkout_started + row.trial_started + row.subscribed + row.cancelled > 0
  );

  const markChanged = async () => {
    const confirmed = window.confirm(
      "Mark today as the day free limits were tightened? This only starts the after window. It does not change any limits."
    );
    if (!confirmed) return;
    setMarking(true);
    setMarkNote(null);
    try {
      const res = await fetch("/api/admin/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_limits_changed" }),
      });
      const json = (await res.json()) as { error?: string; conversion?: ConversionFunnelReport | null };
      if (!res.ok || !json.conversion) throw new Error(json.error || "Could not mark the change");
      onChange(json.conversion);
      setMarkNote("After window started. New events from now on are compared with the before benchmark.");
    } catch (error) {
      setMarkNote(error instanceof Error ? error.message : "Could not mark the change");
    } finally {
      setMarking(false);
    }
  };

  return (
    <>
      <p className={`${styles.note} ${styles.noteTop}`}>{copy}</p>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Hit a limit</p>
          <p className={styles.statValue}>{fmt(events.limit_reached)}</p>
          <p className={styles.statHint}>{fmt(report.users.limit_reached)} people</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Saw pricing</p>
          <p className={styles.statValue}>{fmt(events.pricing_viewed)}</p>
          <p className={styles.statHint}>{fmt(report.users.pricing_viewed)} people</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Clicked upgrade</p>
          <p className={styles.statValue}>{fmt(events.upgrade_clicked)}</p>
          <p className={styles.statHint}>{fmt(events.upgrade_dismissed)} closed the prompt</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Opened checkout</p>
          <p className={styles.statValue}>{fmt(events.checkout_started)}</p>
          <p className={styles.statHint}>{fmt(report.users.checkout_started)} people</p>
        </div>
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Started a trial</p>
          <p className={styles.statValue}>{fmt(events.trial_started)}</p>
          <p className={styles.statHint}>
            {fmt(report.mrr.trial_open_count)} still open · {money(report.mrr.trial_open_pence)} if they pay
          </p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Started paying</p>
          <p className={styles.statValue}>{fmt(events.subscribed)}</p>
          <p className={styles.statHint}>{money(report.mrr.subscribed_pence)} a month added</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Cancelled</p>
          <p className={styles.statValue}>{fmt(events.cancelled)}</p>
          <p className={styles.statHint}>{money(report.mrr.cancelled_pence)} a month lost</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Limit, then paid</p>
          <p className={styles.statValue}>{fmt(report.limit_then_paid)}</p>
          <p className={styles.statHint}>People who hit a limit and later started paying</p>
        </div>
      </div>

      <h3 className={styles.panelTitle}>Where the limit was</h3>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Limit</th>
              <th>Times hit</th>
              <th>People</th>
            </tr>
          </thead>
          <tbody>
            {report.surfaces.map((row) => (
              <tr key={row.surface}>
                <td>{SURFACE_LABELS[row.surface] ?? row.surface}</td>
                <td>{fmt(row.events)}</td>
                <td>{fmt(row.users)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {report.limit_features.length > 0 ? (
        <p className={styles.note}>
          {report.limit_features
            .map((row) => `${row.feature}: ${fmt(row.events)}`)
            .join(" · ")}
        </p>
      ) : null}

      <h3 className={styles.panelTitle}>By clinician grade</h3>
      {grades.length === 0 ? (
        <p className={styles.note}>No upgrade steps yet. This fills in as people use the free product.</p>
      ) : (
        <SegmentTable rows={grades} />
      )}

      <h3 className={styles.panelTitle}>By usage</h3>
      <p className={`${styles.note} ${styles.noteTop}`}>
        Usage is how many questions they had asked before this step. New is none, light is under 5, regular is 5–49, heavy is 50–99, power is 100 or more.
      </p>
      <SegmentTable rows={report.by_tier} />

      <h3 className={styles.panelTitle}>Came back after asking</h3>
      <p className={`${styles.note} ${styles.noteTop}`}>
        Of people who asked a question in that window, the share who asked again on a later day within 7, 14, or 30 days. A second question in the same sitting does not count. A rate appears only once that many days have passed. The first row is a finished month from before this tracker. The before and after rows are the limit experiment and fill in as those days pass.
      </p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Window</th>
              <th>People</th>
              <th>Back in 7 days</th>
              <th>Back in 14 days</th>
              <th>Back in 30 days</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Completed month before tracking</td>
              <td>{fmt(report.return_rates.prior_30d.users)}</td>
              <td>{rateCell(report.return_rates.prior_30d, 7)}</td>
              <td>{rateCell(report.return_rates.prior_30d, 14)}</td>
              <td>{rateCell(report.return_rates.prior_30d, 30)}</td>
            </tr>
            <tr>
              <td>Before the limit change</td>
              <td>{fmt(report.return_rates.before.users)}</td>
              <td>{rateCell(report.return_rates.before, 7)}</td>
              <td>{rateCell(report.return_rates.before, 14)}</td>
              <td>{rateCell(report.return_rates.before, 30)}</td>
            </tr>
            <tr>
              <td>After the limit change</td>
              {report.return_rates.after ? (
                <>
                  <td>{fmt(report.return_rates.after.users)}</td>
                  <td>{rateCell(report.return_rates.after, 7)}</td>
                  <td>{rateCell(report.return_rates.after, 14)}</td>
                  <td>{rateCell(report.return_rates.after, 30)}</td>
                </>
              ) : (
                <td colSpan={4}>Waiting. Free limits have not been tightened.</td>
              )}
            </tr>
          </tbody>
        </table>
      </div>

      {report.limits_changed_at ? null : (
        <div className={styles.note}>
          <button className="btn" type="button" onClick={() => void markChanged()} disabled={marking}>
            {marking ? "Saving…" : "Limits are now tighter"}
          </button>
        </div>
      )}
      {markNote ? <p className={styles.note}>{markNote}</p> : null}
    </>
  );
};

export default ConversionJourney;
