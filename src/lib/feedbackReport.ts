import { APPRAISAL_SECTION, type AppraisalGmcMapping, type AppraisalPack } from "./appraisalAi";
import { reflectionHasContent, sanitizeReflectionHtml } from "./reflectionHtml";
import { escapeHtml } from "./security";

export type ReportTone = "good" | "improve" | "neutral";

export type ReportCommentGroup = {
  title: string;
  tone: ReportTone;
  items: string[];
};

export type FeedbackReport = {
  docTitle: string;
  title: string;
  kindLabel: string;
  dateRange: string;
  responseCount: number;
  stats: { value: string; label: string }[];
  scoreTitle: string;
  scoreRows: { name: string; score: string }[];
  contextTitle: string;
  contextRows: { name: string; value: string }[];
  summary: string;
  strengths: string[];
  developmentThemes: string[];
  supportingEvidence: string[];
  gmcRows: { domain: string; level: string }[];
  pdpSuggestions: string[];
  reflection: string;
  commentsTitle: string;
  commentColumns: { groups: ReportCommentGroup[] }[];
  customTitle: string;
  customFeedback: { question: string; answers: string[] }[];
};

export type FeedbackReportInput = {
  docTitle: string;
  title: string;
  kindLabel: string;
  dateRange: string;
  responseCount: number;
  averageScore: string;
  topArea: string;
  scoreTitle: string;
  scoreRows: { name: string; score: string }[];
  contextTitle: string;
  contextRows: { name: string; value: string }[];
  pack: AppraisalPack;
  breakdown?: { name: string; score: number | string }[];
  /** PSQ can show a score-based GMC signal when the appraisal pack has no mapping yet. */
  useScoreGmcFallback: boolean;
  /** PSQ keeps a separate Suggested PDP section. MSF does not. */
  separatePdp: boolean;
  reflection: string;
  commentsTitle: string;
  commentColumns: { groups: ReportCommentGroup[] }[];
  customTitle: string;
  customFeedback: { question: string; answers: string[] }[];
};

export const GMC_DOMAIN_DISPLAY: {
  key: keyof AppraisalGmcMapping;
  full: string;
  short: string;
}[] = [
  {
    key: "domain1",
    full: "Domain 1: Knowledge, Skills and Performance",
    short: "Domain 1: Knowledge, Skills & Performance",
  },
  {
    key: "domain2",
    full: "Domain 2: Safety and Quality",
    short: "Domain 2: Safety & Quality",
  },
  {
    key: "domain3",
    full: "Domain 3: Communication, Partnership and Teamwork",
    short: "Domain 3: Communication & Teamwork",
  },
  {
    key: "domain4",
    full: "Domain 4: Maintaining Trust",
    short: "Domain 4: Maintaining Trust",
  },
];

const SECTION_HEADERS = new Set(Object.values(APPRAISAL_SECTION).map((value) => value.toUpperCase()));

const cleanList = (items: string[] | undefined): string[] =>
  (items ?? []).map((item) => item.trim()).filter(Boolean);

/** Download name uses the cycle title, for example "PSQ Cycle 2026". */
export const cycleReportFileName = (kind: "PSQ" | "MSF", title: string): string => {
  const clean = String(title || "Report")
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  if (!clean) return `${kind} Report`;
  if (clean.toLowerCase().startsWith(kind.toLowerCase())) return clean;
  return `${kind} ${clean}`;
};

/** Drop one appraisal header and its body. Neighbouring sections stay. */
export const stripAppraisalSection = (text: string, header: string): string => {
  const target = header.trim().toUpperCase();
  const kept: string[] = [];
  let skipping = false;

  for (const line of String(text ?? "").split(/\r?\n/)) {
    const normalized = line.replace(/^\*+|\*+$/g, "").replace(/^#+\s*/, "").trim().toUpperCase();
    if (SECTION_HEADERS.has(normalized)) {
      skipping = normalized === target;
      if (skipping) continue;
    }
    if (!skipping) kept.push(line);
  }

  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
};

export const gmcLevelFromScore = (score: number | string): string => {
  if (typeof score !== "number" || Number.isNaN(score)) return "—";
  if (score >= 4.6) return "Excellent";
  if (score >= 4.0) return "Strong";
  if (score >= 3.5) return "Adequate";
  return "Needs attention";
};

export const gmcMappingFromBreakdown = (
  breakdown: { name: string; score: number | string }[] | undefined
): AppraisalGmcMapping | null => {
  const found: Partial<AppraisalGmcMapping> = {};
  let sawNumeric = false;

  for (const row of breakdown ?? []) {
    const match = row.name.match(/domain\s*([1-4])/i);
    if (!match || typeof row.score !== "number" || Number.isNaN(row.score)) continue;
    const key = `domain${match[1]}` as keyof AppraisalGmcMapping;
    found[key] = gmcLevelFromScore(row.score);
    sawNumeric = true;
  }

  if (!sawNumeric) return null;

  return {
    domain1: found.domain1 || "—",
    domain2: found.domain2 || "—",
    domain3: found.domain3 || "—",
    domain4: found.domain4 || "—",
  };
};

export const resolveGmcRows = (
  pack: AppraisalPack,
  breakdown: { name: string; score: number | string }[] | undefined,
  useScoreGmcFallback: boolean
): { domain: string; short: string; level: string }[] => {
  const fromPack = Boolean(pack.gmcMapping);
  const mapping = pack.gmcMapping ?? (useScoreGmcFallback ? gmcMappingFromBreakdown(breakdown) : null);
  if (!mapping) return [];
  const rows = GMC_DOMAIN_DISPLAY.map((domain) => ({
    domain: domain.full,
    short: domain.short,
    level: String(mapping[domain.key] || "—"),
  }));
  return fromPack ? rows : rows.filter((row) => row.level !== "—");
};

const compactColumns = (
  columns: { groups: ReportCommentGroup[] }[]
): { groups: ReportCommentGroup[] }[] =>
  columns
    .map((column) => ({
      groups: column.groups
        .map((group) => ({ ...group, items: cleanList(group.items) }))
        .filter((group) => group.items.length > 0),
    }))
    .filter((column) => column.groups.length > 0);

export const buildFeedbackReport = (input: FeedbackReportInput): FeedbackReport => {
  const reflectionSource = sanitizeReflectionHtml(
    stripAppraisalSection(input.reflection, APPRAISAL_SECTION.PDP)
  );
  const gmcRows = resolveGmcRows(input.pack, input.breakdown, input.useScoreGmcFallback);

  return {
    docTitle: input.docTitle.replace(/[^a-zA-Z0-9_-]/g, "_") || "Umbil_Report",
    title: input.title.trim() || "Feedback report",
    kindLabel: input.kindLabel,
    dateRange: input.dateRange,
    responseCount: input.responseCount,
    stats: [
      { value: String(input.responseCount), label: "Total Responses" },
      { value: input.averageScore, label: "Average Score (Max 5)" },
      { value: input.topArea, label: "Highest Rated Area" },
    ],
    scoreTitle: input.scoreTitle,
    scoreRows: input.scoreRows,
    contextTitle: input.contextTitle,
    contextRows: input.contextRows,
    summary: input.pack.executiveSummary.trim(),
    strengths: cleanList(input.pack.strengths),
    developmentThemes: cleanList(input.pack.developmentThemes),
    supportingEvidence: cleanList(input.pack.supportingEvidence),
    gmcRows: gmcRows.map(({ domain, level }) => ({ domain, level })),
    pdpSuggestions: input.separatePdp ? cleanList(input.pack.pdpSuggestions) : [],
    reflection: reflectionHasContent(reflectionSource) ? reflectionSource : "",
    commentsTitle: input.commentsTitle,
    commentColumns: compactColumns(input.commentColumns),
    customTitle: input.customTitle,
    customFeedback: (input.customFeedback ?? [])
      .map((entry) => ({
        question: entry.question.trim(),
        answers: cleanList(entry.answers),
      }))
      .filter((entry) => entry.question && entry.answers.length > 0),
  };
};

const toneClass = (tone: ReportTone): string => (tone === "neutral" ? "" : ` ${tone}`);

const commentCards = (group: ReportCommentGroup): string =>
  group.items
    .map(
      (item) =>
        `<div class="feedback-card${toneClass(group.tone)}">"${escapeHtml(item)}"</div>`
    )
    .join("");

const renderCommentColumns = (report: FeedbackReport): string => {
  if (report.commentColumns.length === 0) {
    return '<p style="color: #64748b; font-style: italic;">No written comments available.</p>';
  }

  const columns = report.commentColumns
    .map((column) => {
      const groups = column.groups
        .map(
          (group, index) =>
            `<div class="feedback-header${toneClass(group.tone)}"${index > 0 ? ' style="margin-top:20px;"' : ""}>${escapeHtml(group.title)}</div>${commentCards(group)}`
        )
        .join("");
      return `<div class="feedback-column">${groups}</div>`;
    })
    .join("");

  return `<div class="feedback-container">${columns}</div>`;
};

export const feedbackReportToHtml = (
  report: FeedbackReport,
  opts?: { autoPrint?: boolean }
): string => {
  const scoreRows = report.scoreRows
    .map(
      (row) =>
        `<tr><td style="font-weight: 500;">${escapeHtml(row.name)}</td><td style="text-align: right; font-weight: 700; color: #1fb8cd;">${escapeHtml(row.score)}</td></tr>`
    )
    .join("");

  const contextRows = report.contextRows.length
    ? report.contextRows
        .map(
          (row) =>
            `<tr><td style="font-weight: 500;">${escapeHtml(row.name)}</td><td style="text-align: right; font-weight: 700; color: #64748b;">${escapeHtml(row.value)}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="2" style="color: #94a3b8; font-style: italic; text-align: center;">No data recorded</td></tr>`;

  const summary = report.summary
    ? `<div class="print-section keep-together summary-box"><strong>Appraisal-Ready Summary:</strong> ${escapeHtml(report.summary)}</div>`
    : "";

  const themeColumns: string[] = [];
  if (report.strengths.length) {
    themeColumns.push(
      `<div class="feedback-column"><div class="feedback-header good">Top Strengths Identified</div>${report.strengths
        .map((item) => `<div class="feedback-card good">${escapeHtml(item)}</div>`)
        .join("")}</div>`
    );
  }
  if (report.developmentThemes.length) {
    themeColumns.push(
      `<div class="feedback-column"><div class="feedback-header improve">Areas for Improvement</div>${report.developmentThemes
        .map((item) => `<div class="feedback-card improve">${escapeHtml(item)}</div>`)
        .join("")}</div>`
    );
  }
  const themes = themeColumns.length
    ? `<div class="feedback-container print-section keep-together">${themeColumns.join("")}</div>`
    : "";

  const evidence = report.supportingEvidence.length
    ? `<div class="print-section keep-together"><div class="section-title">Supporting Evidence</div><ul>${report.supportingEvidence
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("")}</ul></div>`
    : "";

  const gmc = report.gmcRows.length
    ? `<div class="print-section keep-together"><div class="section-title">GMC Domain Mapping</div><table><thead><tr><th>Domain</th><th style="text-align:right;">Appraisal Signal</th></tr></thead><tbody>${report.gmcRows
        .map(
          (row) =>
            `<tr><td style="font-weight:500;">${escapeHtml(row.domain)}</td><td style="text-align:right;font-weight:700;color:#1fb8cd;">${escapeHtml(row.level)}</td></tr>`
        )
        .join("")}</tbody></table></div>`
    : "";

  const safeReflection = reflectionHasContent(report.reflection)
    ? sanitizeReflectionHtml(report.reflection)
    : "";
  const reflection = safeReflection
    ? `<div class="reflection-box print-section keep-together"><h3>Appraisal-Ready Reflection</h3><div class="reflection-html">${safeReflection}</div></div>`
    : "";

  const pdp = report.pdpSuggestions.length
    ? `<div class="print-section keep-together"><div class="section-title">Suggested PDP</div><ul>${report.pdpSuggestions
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("")}</ul></div>`
    : "";

  const custom = report.customFeedback.length
    ? `<div class="print-section" style="margin-top: 30px;"><div class="section-title">${escapeHtml(report.customTitle)}</div>${report.customFeedback
        .map(
          (entry) =>
            `<div class="comment-section"><h4 style="color: #475569; margin-bottom: 5px;">Q: ${escapeHtml(entry.question)}</h4><ul style="margin-top: 0; padding-left: 20px; color: #334155;">${entry.answers
              .map((answer) => `<li>"${escapeHtml(answer)}"</li>`)
              .join("")}</ul></div>`
        )
        .join("")}</div>`
    : "";

  const printScript = opts?.autoPrint
    ? `<script>
        document.title = "${report.docTitle}";
        try { history.replaceState(null, "", "${report.docTitle}"); } catch (e) {}
        window.onload = function () { setTimeout(function () { window.print(); }, 500); };
      </script>`
    : "";

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(report.docTitle)}</title>
    <style>
      @media print {
        @page { margin: 1.5cm; size: auto; }
        body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .dashboard, .data-tables, .keep-together, .comment-section, .feedback-card { break-inside: avoid; page-break-inside: avoid; }
        .section-title, .feedback-header, .reflection-box h3 { break-after: avoid; page-break-after: avoid; }
        .comments-flow, .comments-flow .feedback-container, .comments-flow .feedback-column { break-inside: auto; page-break-inside: auto; }
        .no-print { display: none !important; }
      }
      tr:nth-child(even) { background-color: #f8fafc; }
      body { font-family: Inter, Segoe UI, sans-serif; padding: 40px; color: #1e293b; max-width: 900px; margin: 0 auto; line-height: 1.5; }
      .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px; }
      h1 { color: #0f172a; margin: 0 0 16px; font-size: 24px; line-height: 1.3; }
      .subtitle { color: #64748b; font-size: 14px; margin-top: 0; line-height: 1.6; }
      .summary-box { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 30px; font-size: 14px; color: #1e3a8a; border-radius: 0 8px 8px 0; }
      .dashboard { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; background: #f0fdfa; padding: 20px; border-radius: 12px; border: 1px solid #ccfbf1; }
      .stat-box { text-align: center; }
      .stat-val { display: block; font-size: 24px; font-weight: 800; color: #1fb8cd; }
      .stat-label { font-size: 11px; color: #115e59; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; margin-top: 4px; }
      .data-tables { display: flex; gap: 30px; margin-bottom: 30px; align-items: flex-start; }
      .data-table-wrapper { flex: 1; }
      .data-table-wrapper.large { flex: 2; }
      table { width: 100%; border-collapse: collapse; font-size: 14px; }
      th { text-align: left; border-bottom: 2px solid #cbd5e1; padding: 10px; color: #64748b; text-transform: uppercase; font-size: 12px; }
      td { border-bottom: 1px solid #e2e8f0; padding: 12px 10px; color: #334155; }
      tr:last-child td { border-bottom: none; }
      .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 15px; border-left: 4px solid #1fb8cd; padding-left: 10px; }
      .print-section { margin-bottom: 24px; }
      .keep-together { break-inside: avoid; page-break-inside: avoid; }
      .feedback-container { display: flex; gap: 30px; margin-bottom: 20px; align-items: flex-start; }
      .feedback-column { flex: 1; }
      .feedback-header { font-size: 13px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em; color: #475569; }
      .feedback-header.good { color: #059669; }
      .feedback-header.improve { color: #d97706; }
      .feedback-card { padding: 12px 16px; margin-bottom: 12px; border-radius: 6px; font-size: 13px; font-style: italic; color: #334155; line-height: 1.5; background-color: #f1f5f9; border-left: 3px solid #cbd5e1; }
      .feedback-card.good { background-color: #ecfdf5; border-left-color: #10b981; }
      .feedback-card.improve { background-color: #fffbeb; border-left-color: #f59e0b; }
      .comment-section { margin-bottom: 20px; }
      .reflection-box { background: #fff7ed; border: 1px solid #fed7aa; padding: 25px; border-radius: 8px; margin-bottom: 30px; }
      .reflection-box h3 { margin-top: 0; }
      .reflection-html { font-size: 14px; color: #431407; }
      .reflection-html p, .reflection-html div { margin: 0 0 0.6em; }
      .reflection-html ul, .reflection-html ol { margin: 0.4em 0 0.8em 1.2em; }
      ul { margin-top: 0; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>${escapeHtml(report.title)}</h1>
      <div class="subtitle">${escapeHtml(report.kindLabel)} • Generated by Umbil<br/>Date range: ${escapeHtml(report.dateRange)} • ${report.responseCount} responses</div>
    </div>
    <div class="dashboard">
      ${report.stats
        .map(
          (stat) =>
            `<div class="stat-box"><span class="stat-val">${escapeHtml(stat.value)}</span><span class="stat-label">${escapeHtml(stat.label)}</span></div>`
        )
        .join("")}
    </div>
    <div class="data-tables">
      <div class="data-table-wrapper large">
        <div class="section-title">${escapeHtml(report.scoreTitle)}</div>
        <table><thead><tr><th>Question Area</th><th style="text-align: right;">Average Score</th></tr></thead><tbody>${scoreRows}</tbody></table>
      </div>
      <div class="data-table-wrapper">
        <div class="section-title">${escapeHtml(report.contextTitle)}</div>
        <table><thead><tr><th>Type</th><th style="text-align: right;">Count</th></tr></thead><tbody>${contextRows}</tbody></table>
      </div>
    </div>
    ${summary}
    ${themes}
    ${evidence}
    ${gmc}
    ${reflection}
    ${pdp}
    <div class="comments-flow">
      <div class="section-title">${escapeHtml(report.commentsTitle)}</div>
      ${renderCommentColumns(report)}
    </div>
    ${custom}
    ${printScript}
  </body>
</html>`;
};
