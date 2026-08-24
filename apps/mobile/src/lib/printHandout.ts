import * as Print from "expo-print";

import { markdownToHtml } from "./markdownToHtml";

const BRAND_TEAL = "#1fb8cd";

export type PrintHandoutOptions = {
  title?: string;
  output: string;
  translatedOutput?: string;
};

/**
 * Builds a clean, branded HTML document for the patient handout — the
 * native-print equivalent of the web's `window.print()` flow in
 * `ToolResultCard.handlePrint`.
 */
export const buildHandoutHtml = ({
  title = "Patient Handout",
  output,
  translatedOutput,
}: PrintHandoutOptions): string => {
  const englishHtml = markdownToHtml(output);
  const translatedHtml = translatedOutput ? markdownToHtml(translatedOutput) : "";
  const generatedOn = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title} - Umbil</title>
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
      .section-label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: ${BRAND_TEAL};
        margin: 24px 0 10px 0;
      }
      h2 {
        font-size: 17px;
        color: #0f172a;
        margin-top: 20px;
      }
      h3 {
        font-size: 15px;
        color: #0f172a;
      }
      p {
        margin: 0 0 12px 0;
        font-size: 14px;
      }
      ul,
      ol {
        margin: 0 0 12px 20px;
        padding: 0;
        font-size: 14px;
      }
      li {
        margin-bottom: 6px;
      }
      strong {
        color: #0f172a;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 16px;
        font-size: 13px;
      }
      th,
      td {
        border: 1px solid #cbd5e1;
        padding: 6px 10px;
        text-align: left;
      }
      th {
        background: #f0fdfa;
      }
      .divider {
        border: 0;
        border-top: 1px solid #e2e8f0;
        margin: 24px 0;
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

    <h1>Information for you</h1>
    <div class="meta">Prepared for you on ${generatedOn}</div>

    ${translatedHtml ? '<div class="section-label">English</div>' : ""}
    ${englishHtml}

    ${
      translatedHtml
        ? `<hr class="divider" /><div class="section-label">Translated</div>${translatedHtml}`
        : ""
    }

    <div class="footer">
      This handout is for general guidance only and does not replace professional medical advice.<br />
      If your symptoms worsen or you are concerned, please contact your GP or NHS 111.
    </div>
  </body>
</html>`;
};

/** Opens the native print dialog with a formatted patient handout. */
export const printHandout = async (options: PrintHandoutOptions): Promise<void> => {
  const html = buildHandoutHtml(options);
  await Print.printAsync({ html });
};
