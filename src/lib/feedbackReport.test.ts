import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { APPRAISAL_SECTION, parseAppraisalPack } from "./appraisalAi";
import {
  buildFeedbackReport,
  cycleReportFileName,
  feedbackReportToHtml,
  gmcLevelFromScore,
  gmcMappingFromBreakdown,
  stripAppraisalSection,
  type FeedbackReportInput,
} from "./feedbackReport";

const PACK = `
${APPRAISAL_SECTION.SUMMARY}
34 patient responses; overall score 4.71/5.0.

${APPRAISAL_SECTION.STRENGTHS}
- Listens carefully

${APPRAISAL_SECTION.DEVELOPMENT}
- Waiting times

${APPRAISAL_SECTION.EVIDENCE}
- Did not rush me

${APPRAISAL_SECTION.GMC}
Domain 1: Knowledge, Skills and Performance: Strong
Domain 2: Safety and Quality: Adequate
Domain 3: Communication, Partnership and Teamwork: Excellent
Domain 4: Maintaining Trust: Excellent

${APPRAISAL_SECTION.VALUED_PATIENTS}
I am pleased that patients valued listening.

${APPRAISAL_SECTION.PDP}
- Must-do: Explain delays over the next 3 months.
`.trim();

const baseInput = (overrides: Partial<FeedbackReportInput> = {}): FeedbackReportInput => ({
  docTitle: "Umbil_PSQ_Report_Test",
  title: "Spring PSQ",
  kindLabel: "Patient Satisfaction Questionnaire Report",
  dateRange: "01/01/2026 – 11/10/2026",
  responseCount: 34,
  averageScore: "4.71",
  topArea: "Maintaining Trust",
  scoreTitle: "Domain Scores",
  scoreRows: [{ name: "Domain 4: Maintaining Trust", score: "4.80" }],
  contextTitle: "Consultation Types",
  contextRows: [{ name: "Phone", value: "12" }],
  pack: parseAppraisalPack(PACK),
  breakdown: [
    { name: "Domain 1: Knowledge, Skills & Performance", score: 4.2 },
    { name: "Domain 4: Maintaining Trust", score: 4.8 },
  ],
  useScoreGmcFallback: true,
  separatePdp: false,
  reflection: "",
  commentsTitle: "Patient Comments",
  commentColumns: [
    {
      groups: [
        { title: "Done Well", tone: "good", items: ["Listened carefully"] },
        { title: "Examples Provided", tone: "good", items: ["Explained my scan"] },
      ],
    },
    {
      groups: [
        { title: "Areas for Improvement", tone: "improve", items: ["Shorter wait"] },
        { title: "Additional Comments", tone: "neutral", items: ["Thank you"] },
      ],
    },
  ],
  customTitle: "Practice-Specific Questions",
  customFeedback: [],
  ...overrides,
});

describe("feedback report export", () => {
  it("names the file from the cycle title", () => {
    assert.equal(cycleReportFileName("PSQ", "PSQ Cycle 2026"), "PSQ Cycle 2026");
    assert.equal(cycleReportFileName("MSF", "June MSF"), "MSF June MSF");
    assert.equal(cycleReportFileName("MSF", "A/B: test"), "MSF AB test");
  });

  it("maps domain scores onto GMC signals", () => {
    assert.equal(gmcLevelFromScore(4.6), "Excellent");
    assert.equal(gmcLevelFromScore(4), "Strong");
    assert.equal(gmcLevelFromScore(3.5), "Adequate");
    assert.equal(gmcLevelFromScore(3.4), "Needs attention");
    assert.equal(gmcLevelFromScore("Insufficient Data"), "—");

    const mapping = gmcMappingFromBreakdown([
      { name: "Domain 1: Knowledge, Skills & Performance", score: 4.2 },
      { name: "Domain 3: Communication, Partnership & Teamwork", score: "Insufficient Data" },
    ]);
    assert.equal(mapping?.domain1, "Strong");
    assert.equal(mapping?.domain2, "—");
    assert.equal(mapping?.domain3, "—");
  });

  it("prefers the appraisal-pack GMC mapping over score fallback", () => {
    const report = buildFeedbackReport(baseInput());
    assert.equal(report.gmcRows.find((row) => row.domain.startsWith("Domain 3"))?.level, "Excellent");
    assert.equal(report.gmcRows.length, 4);
  });

  it("hides domains that have no score when the pack has no GMC mapping", () => {
    const report = buildFeedbackReport(
      baseInput({
        pack: parseAppraisalPack("A short summary with no headers."),
        useScoreGmcFallback: true,
      })
    );
    assert.deepEqual(
      report.gmcRows.map((row) => row.domain.slice(0, 8)),
      ["Domain 1", "Domain 4"]
    );
  });

  it("leaves every reflection heading out when the clinician box is empty", () => {
    const report = buildFeedbackReport(baseInput({ reflection: "   \n  " }));
    const html = feedbackReportToHtml(report);
    assert.equal(report.reflection, "");
    assert.equal(html.includes(">Reflection<"), false);
    assert.equal(html.includes("What was valued most"), false);
    assert.equal(html.includes("What surprised me"), false);
    assert.equal(html.includes("Reflection & Action Plan"), false);
    assert.match(html, /Top Strengths Identified/);
    assert.match(html, /Areas for Improvement/);
    assert.match(html, /Supporting Evidence/);
    assert.match(html, /GMC Domain Mapping/);
    assert.equal(html.includes("Suggested PDP"), false);
    assert.match(html, /Examples Provided/);
    assert.match(html, /Additional Comments/);
    assert.match(html, /class="comments-flow"/);
    assert.equal(html.includes("page-break-before: always"), false);
    assert.match(html, /keep-together/);
    assert.equal(html.includes("window.print"), false);
  });

  it("prints formatted reflection html and drops scripts", () => {
    const report = buildFeedbackReport(
      baseInput({
        reflection: `<p>I will <strong>explain</strong> delays.</p><script>alert(1)</script>`,
      })
    );
    const html = feedbackReportToHtml(report);
    assert.match(html, /<strong>explain<\/strong>/);
    assert.match(html, />Reflection</);
    assert.equal(html.includes("<script"), false);
    assert.equal(html.includes("alert(1)"), false);
  });

  it("omits the reflection heading when the editor is empty", () => {
    const report = buildFeedbackReport(baseInput({ reflection: "<p><br/></p>" }));
    const html = feedbackReportToHtml(report);
    assert.equal(report.reflection, "");
    assert.equal(html.includes(">Reflection<"), false);
  });

  it("includes the clinician reflection when they have written one", () => {
    const report = buildFeedbackReport(
      baseInput({ reflection: "I will explain delays at the start of the consultation." })
    );
    const html = feedbackReportToHtml(report, { autoPrint: true });
    assert.match(html, />Reflection</);
    assert.match(html, /explain delays at the start/);
    assert.match(html, /window\.print/);
  });

  it("keeps Suggested PDP off the MSF export, including text inside the reflection", () => {
    const report = buildFeedbackReport(
      baseInput({
        separatePdp: false,
        kindLabel: "Multi-Source Feedback Report",
        reflection: `WHAT COLLEAGUES VALUED MOST\nColleagues valued my teaching.\n\n${APPRAISAL_SECTION.PDP}\n- Must-do: Delegate more.`,
      })
    );
    const html = feedbackReportToHtml(report);
    assert.equal(report.pdpSuggestions.length, 0);
    assert.equal(html.includes("Suggested PDP"), false);
    assert.equal(html.includes("PDP SUGGESTIONS"), false);
    assert.equal(html.includes("Clinician Action Plan"), false);
    assert.match(html, /Colleagues valued my teaching/);
    assert.match(html, />Reflection</);
  });

  it("moves PSQ PDP out of the reflection block so it is not printed twice", () => {
    const report = buildFeedbackReport(
      baseInput({
        separatePdp: true,
        reflection: `WHAT PATIENTS VALUED MOST\nPatients valued listening.\n\n${APPRAISAL_SECTION.PDP}\n- Must-do: Explain delays.`,
      })
    );
    assert.match(report.reflection, /Patients valued listening/);
    assert.equal(report.reflection.includes("PDP SUGGESTIONS"), false);
    assert.equal(report.pdpSuggestions.length, 1);
    assert.match(report.pdpSuggestions[0], /Explain delays/);
  });

  it("drops an empty comment group instead of printing its heading", () => {
    const report = buildFeedbackReport(
      baseInput({
        commentColumns: [
          {
            groups: [
              { title: "Done Well", tone: "good", items: ["Kind"] },
              { title: "Examples Provided", tone: "good", items: ["  "] },
            ],
          },
        ],
      })
    );
    const html = feedbackReportToHtml(report);
    assert.match(html, /Done Well/);
    assert.equal(html.includes("Examples Provided"), false);
  });

  it("escapes comment text", () => {
    const report = buildFeedbackReport(
      baseInput({
        commentColumns: [
          { groups: [{ title: "Done Well", tone: "good", items: [`<script>alert("x")</script>`] }] },
        ],
      })
    );
    const html = feedbackReportToHtml(report);
    assert.equal(html.includes("<script>alert"), false);
    assert.match(html, /&lt;script&gt;/);
  });

  it("strips only the requested appraisal section", () => {
    const stripped = stripAppraisalSection(
      `WHAT PATIENTS VALUED MOST\nListening.\n\nPDP SUGGESTIONS\n- Must-do: One goal.`,
      APPRAISAL_SECTION.PDP
    );
    assert.match(stripped, /Listening/);
    assert.equal(stripped.includes("PDP SUGGESTIONS"), false);
    assert.equal(stripped.includes("Must-do"), false);
  });
});
