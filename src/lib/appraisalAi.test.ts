import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APPRAISAL_SECTION,
  parseAppraisalPack,
  reflectionBodyFromPack,
  buildAppraisalPackPdfSections,
  hasAppraisalThemes,
} from "../../packages/shared/src/appraisalAi";

const SAMPLE_PSQ_PACK = `
${APPRAISAL_SECTION.SUMMARY}
38 patient responses were collected across face-to-face, telephone and video consultations. Overall patient satisfaction was high, with strong scores in communication, trust and professionalism. Free-text feedback highlighted listening skills and clear explanations as particular strengths. One area identified for continued development was communication around waiting times.

${APPRAISAL_SECTION.STRENGTHS}
- Listens carefully
- Explains clearly
- Respectful and professional

${APPRAISAL_SECTION.DEVELOPMENT}
- Communication around delays
- Follow-up information

${APPRAISAL_SECTION.VALUED_PATIENTS}
I am pleased that patients valued my listening and clear explanations.

${APPRAISAL_SECTION.SURPRISED}
I was surprised that waiting-time communication appeared more often than expected.

${APPRAISAL_SECTION.CONTINUE}
I will continue making space for patients to ask questions.

${APPRAISAL_SECTION.IMPROVE}
I will improve how I explain delays and follow-up plans.

${APPRAISAL_SECTION.PDP}
- Practise clearer waiting-time explanations
- Audit follow-up information leaflets
`.trim();

const SAMPLE_MSF_PACK = `
${APPRAISAL_SECTION.SUMMARY}
18 colleagues completed feedback. Key strengths identified were communication, approachability, teaching and teamwork. The most frequently mentioned development theme was delegation during busy clinics.

${APPRAISAL_SECTION.STRENGTHS}
- Communication
- Approachability
- Teaching and teamwork

${APPRAISAL_SECTION.DEVELOPMENT}
- Delegation during busy clinics

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

${APPRAISAL_SECTION.PDP}
- Improve delegation during high demand periods
- Attend leadership training
`.trim();

describe("parseAppraisalPack", () => {
  it("parses PSQ appraisal pack sections", () => {
    const pack = parseAppraisalPack(SAMPLE_PSQ_PACK);
    assert.match(pack.executiveSummary, /38 patient responses/);
    assert.equal(pack.strengths.length, 3);
    assert.equal(pack.developmentThemes.length, 2);
    assert.equal(pack.gmcMapping, null);
    assert.match(pack.valuedMost, /listening/);
    assert.match(pack.surprised, /waiting-time/);
    assert.match(pack.continueDoing, /ask questions/);
    assert.match(pack.willImprove, /delays/);
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
  });

  it("treats legacy plain paragraph as executive summary only", () => {
    const legacy = "A short appraisal paragraph without headers.";
    const pack = parseAppraisalPack(legacy);
    assert.equal(pack.executiveSummary, legacy);
    assert.equal(pack.strengths.length, 0);
    assert.equal(hasAppraisalThemes(pack), false);
  });

  it("builds reflection body for patients and colleagues", () => {
    const psq = parseAppraisalPack(SAMPLE_PSQ_PACK);
    const patientBody = reflectionBodyFromPack(psq, "patients");
    assert.match(patientBody, /WHAT PATIENTS VALUED MOST/);
    assert.match(patientBody, /PDP SUGGESTIONS/);

    const msf = parseAppraisalPack(SAMPLE_MSF_PACK);
    const colleagueBody = reflectionBodyFromPack(msf, "colleagues");
    assert.match(colleagueBody, /WHAT COLLEAGUES VALUED MOST/);
  });

  it("builds PDF HTML sections with escaped content", () => {
    const pack = parseAppraisalPack(SAMPLE_MSF_PACK);
    const html = buildAppraisalPackPdfSections(pack);
    assert.match(html, /Appraisal-Ready Summary/);
    assert.match(html, /Key Strengths/);
    assert.match(html, /Development Themes/);
    assert.match(html, /GMC Domain Mapping/);
    assert.match(html, /PDP Suggestions/);
  });
});
