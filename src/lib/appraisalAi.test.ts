import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APPRAISAL_SECTION,
  parseAppraisalPack,
  reflectionBodyFromPack,
  buildAppraisalPackPdfSections,
  hasAppraisalThemes,
  appraisalPackSystemInstructions,
} from "../../packages/shared/src/appraisalAi";

const SAMPLE_PSQ_PACK = `
${APPRAISAL_SECTION.SUMMARY}
34 patient responses; overall score 4.71/5.0. Strongest area: Maintaining Trust. Free-text highlighted listening and clear explanations. Development theme: communication around waiting times.

${APPRAISAL_SECTION.STRENGTHS}
- Listens carefully
- Explains clearly
- Respectful and professional

${APPRAISAL_SECTION.DEVELOPMENT}
- Communication around delays
- Follow-up information

${APPRAISAL_SECTION.EVIDENCE}
- Did not rush me and listened carefully
- Explained options in plain English
- Could have explained waiting times better

${APPRAISAL_SECTION.VALUED_PATIENTS}
I am pleased that patients valued my listening and clear explanations.

${APPRAISAL_SECTION.SURPRISED}
I was surprised that waiting-time communication appeared more often than expected.

${APPRAISAL_SECTION.CONTINUE}
I will continue making space for patients to ask questions.

${APPRAISAL_SECTION.IMPROVE}
I will improve how I explain delays and follow-up plans.

${APPRAISAL_SECTION.MEASURE}
I will re-check Communication domain and waiting-time comments on the next PSQ in 6–12 months.

${APPRAISAL_SECTION.PDP}
- Must-do: Pilot a written follow-up summary template over the next 3 months and review patient comments.
- Stretch: Attend a shared decision-making workshop within 6 months.
`.trim();

const SAMPLE_MSF_PACK = `
${APPRAISAL_SECTION.SUMMARY}
18 colleagues completed feedback; overall score 4.6/5.0. Key strengths: communication and teamwork. Development theme: delegation during busy clinics.

${APPRAISAL_SECTION.STRENGTHS}
- Communication
- Approachability
- Teaching and teamwork

${APPRAISAL_SECTION.DEVELOPMENT}
- Delegation during busy clinics

${APPRAISAL_SECTION.EVIDENCE}
- Always approachable with juniors
- Could delegate more in busy clinics

${APPRAISAL_SECTION.GMC}
Domain 1: Knowledge, Skills and Performance: Strong
Domain 2: Safety and Quality: Strong
Domain 3: Communication, Partnership and Teamwork: Excellent
Domain 4: Maintaining Trust: Excellent

${APPRAISAL_SECTION.VALUED_COLLEAGUES}
I am pleased that colleagues noted my accessibility and willingness to help.

${APPRAISAL_SECTION.SURPRISED}
I was surprised how often delegation was mentioned as a development theme.

${APPRAISAL_SECTION.CONTINUE}
I will continue supporting learners and remaining approachable.

${APPRAISAL_SECTION.IMPROVE}
I will work on distributing tasks more effectively during high demand.

${APPRAISAL_SECTION.MEASURE}
I will review MSF Domain 3 comments on delegation in the next cycle within 12 months.

${APPRAISAL_SECTION.PDP}
- Must-do: Improve delegation during high demand periods over the next 3 months with a simple task-share checklist.
- Stretch: Attend leadership training within 12 months.
`.trim();

describe("parseAppraisalPack", () => {
  it("parses PSQ appraisal pack sections including evidence and measure", () => {
    const pack = parseAppraisalPack(SAMPLE_PSQ_PACK);
    assert.match(pack.executiveSummary, /34 patient responses/);
    assert.equal(pack.strengths.length, 3);
    assert.equal(pack.developmentThemes.length, 2);
    assert.equal(pack.supportingEvidence.length, 3);
    assert.equal(pack.gmcMapping, null);
    assert.match(pack.valuedMost, /listening/);
    assert.match(pack.willMeasure, /PSQ/);
    assert.equal(pack.pdpSuggestions.length, 2);
    assert.equal(hasAppraisalThemes(pack), true);
  });

  it("parses MSF pack including GMC mapping", () => {
    const pack = parseAppraisalPack(SAMPLE_MSF_PACK);
    assert.match(pack.executiveSummary, /18 colleagues/);
    assert.ok(pack.gmcMapping);
    assert.equal(pack.gmcMapping?.domain1, "Strong");
    assert.equal(pack.gmcMapping?.domain3, "Excellent");
    assert.equal(pack.gmcMapping?.domain4, "Excellent");
    assert.equal(pack.pdpSuggestions.length, 2);
    assert.equal(pack.supportingEvidence.length, 2);
  });

  it("treats legacy plain paragraph as executive summary only", () => {
    const legacy = "A short appraisal paragraph without headers.";
    const pack = parseAppraisalPack(legacy);
    assert.equal(pack.executiveSummary, legacy);
    assert.equal(pack.strengths.length, 0);
    assert.equal(pack.supportingEvidence.length, 0);
    assert.equal(hasAppraisalThemes(pack), false);
  });

  it("builds reflection body including measure section", () => {
    const psq = parseAppraisalPack(SAMPLE_PSQ_PACK);
    const patientBody = reflectionBodyFromPack(psq, "patients");
    assert.match(patientBody, /WHAT PATIENTS VALUED MOST/);
    assert.match(patientBody, /WHAT I WILL MEASURE/);
    assert.match(patientBody, /PDP SUGGESTIONS/);

    const msf = parseAppraisalPack(SAMPLE_MSF_PACK);
    const colleagueBody = reflectionBodyFromPack(msf, "colleagues");
    assert.match(colleagueBody, /WHAT COLLEAGUES VALUED MOST/);
  });

  it("builds PDF HTML sections with evidence and measure", () => {
    const pack = parseAppraisalPack(SAMPLE_MSF_PACK);
    const html = buildAppraisalPackPdfSections(pack);
    assert.match(html, /Appraisal-Ready Summary/);
    assert.match(html, /Key Strengths/);
    assert.match(html, /Supporting Evidence/);
    assert.match(html, /What I will measure/);
    assert.match(html, /GMC Domain Mapping/);
    assert.match(html, /PDP Suggestions/);
  });

  it("includes honesty and PSQ language guardrails in system instructions", () => {
    const psqPrompt = appraisalPackSystemInstructions({
      audience: "patients",
      includeGmcMapping: false,
      responseCountHint: 34,
    });
    assert.match(psqPrompt, /NOT multidisciplinary team working/i);
    assert.match(psqPrompt, /Must-do/);
    assert.match(psqPrompt, /SUPPORTING EVIDENCE/);
    assert.match(psqPrompt, /WHAT I WILL MEASURE/);
    assert.match(psqPrompt, /Concise/);

    const msfPrompt = appraisalPackSystemInstructions({
      audience: "colleagues",
      includeGmcMapping: true,
      responseCountHint: 15,
    });
    assert.match(msfPrompt, /MDT, teaching, leadership/i);
    assert.match(msfPrompt, /GMC MAPPING/);
  });
});
