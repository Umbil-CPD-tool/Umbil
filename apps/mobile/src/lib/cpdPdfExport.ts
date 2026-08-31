import type { CPDEntry } from "@umbil/shared";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { GMC_DOMAINS, mapToGmcDomain } from "./cpdAnalytics";
import { markdownToHtml } from "./markdownToHtml";

const DEFAULT_MINUTES = 10;
const BRAND_TEAL = "#1fb8cd";

const domainForEntry = (entry: CPDEntry): string => {
  for (const tag of entry.tags || []) {
    const domain = mapToGmcDomain(tag);
    if (domain) return domain;
  }
  return GMC_DOMAINS[0];
};

const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Builds a single, multi-page PDF-ready HTML document covering every CPD
 * entry, grouped by GMC domain — the native-print equivalent of the web's
 * `printCPD` (which opens a `window.print()` view) and `downloadSelectedZip`
 * (a bundle of per-entry PDFs). One well-formatted PDF is a better fit for
 * mobile than a zip archive.
 */
const buildCpdLogHtml = (entries: CPDEntry[]): string => {
  const grouped: Record<string, CPDEntry[]> = {};
  GMC_DOMAINS.forEach((domain) => {
    grouped[domain] = [];
  });
  entries.forEach((entry) => {
    grouped[domainForEntry(entry)].push(entry);
  });

  let totalCredits = 0;
  let sectionsHtml = "";

  GMC_DOMAINS.forEach((domain) => {
    const domainEntries = grouped[domain];
    if (domainEntries.length === 0) return;

    let sectionCredits = 0;
    domainEntries.forEach((entry) => {
      sectionCredits += (entry.duration || DEFAULT_MINUTES) / 60;
    });
    totalCredits += sectionCredits;

    const entriesHtml = domainEntries
      .map((entry) => {
        const minutes = entry.duration || DEFAULT_MINUTES;
        const credits = minutes / 60;
        const answerHtml = markdownToHtml(entry.answer || "");
        const reflectionHtml = entry.reflection ? markdownToHtml(entry.reflection) : "";
        const tagsHtml = (entry.tags || [])
          .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
          .join("");

        return `
          <div class="entry">
            <div class="entry-meta">
              <span class="date">${new Date(entry.timestamp).toLocaleDateString("en-GB")}</span>
              <span class="credit-tag">${credits.toFixed(2)} credits (${minutes}m)</span>
            </div>
            <div class="question">${escapeHtml(entry.question || "Learning entry")}</div>
            <div class="answer">${answerHtml}</div>
            ${
              reflectionHtml
                ? `<div class="reflection"><div class="reflection-label">Reflection</div>${reflectionHtml}</div>`
                : ""
            }
            ${tagsHtml ? `<div class="tags">${tagsHtml}</div>` : ""}
          </div>
        `;
      })
      .join("");

    sectionsHtml += `
      <div class="domain-header">
        <h2>${domain}</h2>
        <span class="domain-meta">${domainEntries.length} activities &bull; ${sectionCredits.toFixed(2)} credits</span>
      </div>
      ${entriesHtml}
    `;
  });

  const generatedOn = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${
      entries.length === 1
        ? escapeHtml(entries[0].question || "Learning entry")
        : "Umbil Learning Log"
    }</title>
    <style>
      body {
        font-family: -apple-system, Helvetica, Arial, sans-serif;
        margin: 0;
        padding: 32px 40px;
        color: #1e293b;
        line-height: 1.6;
      }
      .brand-header {
        display: flex;
        align-items: baseline;
        gap: 10px;
        border-bottom: 3px solid ${BRAND_TEAL};
        padding-bottom: 16px;
        margin-bottom: 24px;
      }
      .brand-mark {
        font-size: 20px;
        font-weight: 700;
        color: ${BRAND_TEAL};
        letter-spacing: 0.3px;
      }
      .brand-sub {
        font-size: 12px;
        color: #64748b;
      }
      h1 {
        font-size: 22px;
        margin: 0 0 4px 0;
        color: #0f172a;
      }
      .meta {
        color: #64748b;
        font-size: 13px;
        margin-bottom: 24px;
      }
      .dashboard {
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 18px;
      }
      .stat {
        flex: 1;
        text-align: center;
      }
      .stat-val {
        display: block;
        font-size: 26px;
        font-weight: 700;
        color: ${BRAND_TEAL};
      }
      .stat-label {
        font-size: 11px;
        color: #64748b;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.05em;
      }
      .tip {
        background: #fff7ed;
        border: 1px solid #ffedd5;
        color: #c2410c;
        border-radius: 8px;
        padding: 10px 14px;
        font-size: 13px;
        margin-bottom: 24px;
      }
      .domain-header {
        margin-top: 32px;
        margin-bottom: 16px;
        border-bottom: 2px solid ${BRAND_TEAL};
        padding-bottom: 6px;
        display: flex;
        justify-content: space-between;
        align-items: baseline;
      }
      .domain-header h2 {
        font-size: 17px;
        color: ${BRAND_TEAL};
        margin: 0;
      }
      .domain-meta {
        font-size: 11px;
        color: #64748b;
        font-weight: 600;
      }
      .entry {
        margin-bottom: 18px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 16px;
        page-break-inside: avoid;
      }
      .entry-meta {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 8px;
      }
      .date {
        font-weight: 600;
        font-size: 12px;
        color: #64748b;
      }
      .credit-tag {
        background: #e0f2fe;
        color: #0369a1;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 700;
        border: 1px solid #bae6fd;
      }
      .question {
        font-weight: 700;
        font-size: 15px;
        margin-bottom: 8px;
        color: #0f172a;
      }
      .answer {
        font-size: 13px;
        color: #334155;
      }
      .answer p,
      .answer ul,
      .answer ol {
        font-size: 13px;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 8px 0;
        font-size: 12px;
      }
      th,
      td {
        border: 1px solid #cbd5e1;
        padding: 6px 8px;
        text-align: left;
      }
      th {
        background-color: #f1f5f9;
      }
      .reflection {
        background: #f0fdf4;
        border-left: 3px solid #16a34a;
        padding: 10px 14px;
        border-radius: 0 4px 4px 0;
        margin-top: 12px;
      }
      .reflection-label {
        font-weight: 700;
        color: #166534;
        font-size: 10px;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .reflection p {
        margin: 0;
        font-style: italic;
        color: #14532d;
        font-size: 13px;
      }
      .tags {
        margin-top: 10px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .tag {
        background: #f1f5f9;
        border-radius: 12px;
        padding: 2px 10px;
        font-size: 11px;
        color: #475569;
      }
      .footer {
        margin-top: 40px;
        padding-top: 16px;
        border-top: 1px solid #e2e8f0;
        font-size: 11px;
        color: #94a3b8;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="brand-header">
      <span class="brand-mark">Umbil</span>
      <span class="brand-sub">Clinical Support Platform</span>
    </div>

    <h1>${
      entries.length === 1
        ? escapeHtml(entries[0].question || "Learning entry")
        : "Annual Appraisal Portfolio"
    }</h1>
    <div class="meta">Learning Log &bull; Generated ${generatedOn}</div>

    <div class="dashboard">
      <div class="stat">
        <span class="stat-val">${entries.length}</span>
        <span class="stat-label">Total Activities</span>
      </div>
      <div class="stat">
        <span class="stat-val">${totalCredits.toFixed(2)}</span>
        <span class="stat-label">Total Credit Hours</span>
      </div>
    </div>

    <div class="tip">
      This PDF is grouped by GMC Domain for easy upload to Turas, SOAR, FourteenFish, or Clarity.
    </div>

    ${sectionsHtml}

    <div class="footer">Generated by Umbil &mdash; Clinical Support Platform</div>
  </body>
</html>`;
};

/**
 * Generates a multi-page PDF of the given CPD entries and opens the native
 * share sheet so the user can save/AirDrop/email it — the mobile equivalent
 * of the web's CSV/PDF "download" buttons.
 */
export const exportCpdLogPdf = async (entries: CPDEntry[]): Promise<void> => {
  if (entries.length === 0) return;

  const html = buildCpdLogHtml(entries);
  const { uri } = await Print.printToFileAsync({ html });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle:
      entries.length === 1 ? "Export CPD entry" : "Export Learning Log",
    UTI: "com.adobe.pdf",
  });
};

export const exportCpdEntryPdf = async (entry: CPDEntry): Promise<void> => {
  await exportCpdLogPdf([entry]);
};
