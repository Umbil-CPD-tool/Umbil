import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { FeedbackReportPdf } from "../components/feedback/FeedbackReportPdf";
import { buildFeedbackReport, feedbackReportToHtml, type FeedbackReportInput } from "./feedbackReport";
import { parseAppraisalPack } from "./appraisalAi";

const input = (reflection: string): FeedbackReportInput => ({
  docTitle: "Umbil_PSQ_Report_Render",
  title: "Spring PSQ",
  kindLabel: "Patient Satisfaction Questionnaire Report",
  dateRange: "01/01/2026 – 11/10/2026",
  responseCount: 12,
  averageScore: "4.50",
  topArea: "Maintaining Trust",
  scoreTitle: "Domain Scores",
  scoreRows: [{ name: "Domain 4: Maintaining Trust", score: "4.80" }],
  contextTitle: "Consultation Types",
  contextRows: [{ name: "Phone", value: "12" }],
  pack: parseAppraisalPack("APPRAISAL-READY SUMMARY\nTwelve patients, overall 4.50/5.0.\n\nTOP STRENGTHS\n- Listening"),
  breakdown: [{ name: "Domain 4: Maintaining Trust", score: 4.8 }],
  useScoreGmcFallback: true,
  separatePdp: true,
  reflection,
  commentsTitle: "Patient Comments",
  commentColumns: [
    {
      groups: [
        { title: "Examples Provided", tone: "good", items: ["Explained my results"] },
        { title: "Additional Comments", tone: "neutral", items: ["Thank you"] },
      ],
    },
  ],
  customTitle: "Practice-Specific Questions",
  customFeedback: [],
});

describe("feedback report PDF file", () => {
  it("creates a PDF that follows the same section rules as print", async () => {
    const filled = buildFeedbackReport(input("I will explain waiting times."));
    const empty = buildFeedbackReport(input("   "));
    const filledHtml = feedbackReportToHtml(filled);
    const emptyHtml = feedbackReportToHtml(empty);

    assert.match(filledHtml, />Reflection</);
    assert.match(filledHtml, /Examples Provided/);
    assert.match(filledHtml, /Additional Comments/);
    assert.equal(emptyHtml.includes(">Reflection<"), false);

    const filledPdf = await renderToBuffer(<FeedbackReportPdf report={filled} />);
    const emptyPdf = await renderToBuffer(<FeedbackReportPdf report={empty} />);
    assert.equal(filledPdf.subarray(0, 4).toString(), "%PDF");
    assert.equal(emptyPdf.subarray(0, 4).toString(), "%PDF");
    assert.ok(filledPdf.length > 1000);
    assert.ok(emptyPdf.length > 1000);
  });
});
