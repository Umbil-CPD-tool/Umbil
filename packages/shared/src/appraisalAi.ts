/**
 * Canonical appraisal-pack format for PSQ / MSF AI output.
 * Stored as plain text (no markdown) in executive_summary / ai_summary.
 */

export const APPRAISAL_SECTION = {
  SUMMARY: "APPRAISAL-READY SUMMARY",
  STRENGTHS: "TOP STRENGTHS",
  DEVELOPMENT: "DEVELOPMENT THEMES",
  EVIDENCE: "SUPPORTING EVIDENCE",
  GMC: "GMC MAPPING",
  VALUED_PATIENTS: "WHAT PATIENTS VALUED MOST",
  VALUED_COLLEAGUES: "WHAT COLLEAGUES VALUED MOST",
  SURPRISED: "WHAT SURPRISED ME",
  CONTINUE: "WHAT I WILL CONTINUE DOING",
  IMPROVE: "WHAT I WILL IMPROVE",
  MEASURE: "WHAT I WILL MEASURE",
  PDP: "PDP SUGGESTIONS",
} as const;

export type GmcMappingLevel =
  | "Excellent"
  | "Strong"
  | "Adequate"
  | "Needs attention";

export type AppraisalGmcMapping = {
  domain1: GmcMappingLevel | string;
  domain2: GmcMappingLevel | string;
  domain3: GmcMappingLevel | string;
  domain4: GmcMappingLevel | string;
};

export type AppraisalPack = {
  raw: string;
  executiveSummary: string;
  strengths: string[];
  developmentThemes: string[];
  supportingEvidence: string[];
  gmcMapping: AppraisalGmcMapping | null;
  valuedMost: string;
  surprised: string;
  continueDoing: string;
  willImprove: string;
  willMeasure: string;
  pdpSuggestions: string[];
};

const HEADER_PATTERN =
  /^(APPRAISAL-READY SUMMARY|TOP STRENGTHS|DEVELOPMENT THEMES|SUPPORTING EVIDENCE|GMC MAPPING|WHAT PATIENTS VALUED MOST|WHAT COLLEAGUES VALUED MOST|WHAT SURPRISED ME|WHAT I WILL CONTINUE DOING|WHAT I WILL IMPROVE|WHAT I WILL MEASURE|PDP SUGGESTIONS)\s*$/i;

const emptyPack = (raw = ""): AppraisalPack => ({
  raw,
  executiveSummary: "",
  strengths: [],
  developmentThemes: [],
  supportingEvidence: [],
  gmcMapping: null,
  valuedMost: "",
  surprised: "",
  continueDoing: "",
  willImprove: "",
  willMeasure: "",
  pdpSuggestions: [],
});

const normalizeHeader = (line: string): string =>
  line.replace(/^\*+|\*+$/g, "").replace(/^#+\s*/, "").trim().toUpperCase();

const bulletize = (body: string): string[] =>
  body
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s*/, "").replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean);

const parseGmcMapping = (body: string): AppraisalGmcMapping | null => {
  const levels: Partial<AppraisalGmcMapping> = {};
  for (const line of body.split(/\n+/)) {
    const cleaned = line.replace(/^[-•*]\s*/, "").trim();
    if (!cleaned) continue;
    // Prefer level after the final colon so
    // "Domain 1: Knowledge, Skills and Performance: Strong" parses as Strong.
    const match = cleaned.match(
      /Domain\s*([1-4]).*:\s*(Excellent|Strong|Adequate|Needs attention)\s*$/i
    );
    if (!match) continue;
    const key = `domain${match[1]}` as keyof AppraisalGmcMapping;
    levels[key] = match[2].trim();
  }
  if (!levels.domain1 && !levels.domain2 && !levels.domain3 && !levels.domain4) {
    return null;
  }
  return {
    domain1: levels.domain1 || "—",
    domain2: levels.domain2 || "—",
    domain3: levels.domain3 || "—",
    domain4: levels.domain4 || "—",
  };
};

/** Parse a stored appraisal pack into structured fields for UI / PDF. */
export const parseAppraisalPack = (text: string | null | undefined): AppraisalPack => {
  const raw = String(text ?? "").trim();
  if (!raw) return emptyPack();

  const sections: Record<string, string> = {};
  let current: string | null = null;
  const buffer: string[] = [];
  const preamble: string[] = [];

  const flush = () => {
    if (!current) return;
    sections[current] = buffer.join("\n").trim();
    buffer.length = 0;
  };

  for (const line of raw.split(/\r?\n/)) {
    const header = normalizeHeader(line);
    if (HEADER_PATTERN.test(header)) {
      flush();
      current = header;
      continue;
    }
    if (current) buffer.push(line);
    else preamble.push(line);
  }
  flush();

  // Legacy: plain paragraph with no headers → treat as executive summary only
  if (Object.keys(sections).length === 0) {
    return { ...emptyPack(raw), executiveSummary: raw };
  }

  const valued =
    sections[APPRAISAL_SECTION.VALUED_PATIENTS] ||
    sections[APPRAISAL_SECTION.VALUED_COLLEAGUES] ||
    "";

  return {
    raw,
    executiveSummary:
      sections[APPRAISAL_SECTION.SUMMARY] || preamble.join("\n").trim() || "",
    strengths: bulletize(sections[APPRAISAL_SECTION.STRENGTHS] || ""),
    developmentThemes: bulletize(sections[APPRAISAL_SECTION.DEVELOPMENT] || ""),
    supportingEvidence: bulletize(sections[APPRAISAL_SECTION.EVIDENCE] || ""),
    gmcMapping: parseGmcMapping(sections[APPRAISAL_SECTION.GMC] || ""),
    valuedMost: valued,
    surprised: sections[APPRAISAL_SECTION.SURPRISED] || "",
    continueDoing: sections[APPRAISAL_SECTION.CONTINUE] || "",
    willImprove: sections[APPRAISAL_SECTION.IMPROVE] || "",
    willMeasure: sections[APPRAISAL_SECTION.MEASURE] || "",
    pdpSuggestions: bulletize(sections[APPRAISAL_SECTION.PDP] || ""),
  };
};

/** First-person reflection body (excluding summary / themes / GMC) for editing or CPD. */
export const reflectionBodyFromPack = (pack: AppraisalPack, audience: "patients" | "colleagues"): string => {
  const valuedHeader =
    audience === "patients"
      ? APPRAISAL_SECTION.VALUED_PATIENTS
      : APPRAISAL_SECTION.VALUED_COLLEAGUES;
  const parts: string[] = [];
  if (pack.valuedMost) parts.push(`${valuedHeader}\n${pack.valuedMost}`);
  if (pack.surprised) parts.push(`${APPRAISAL_SECTION.SURPRISED}\n${pack.surprised}`);
  if (pack.continueDoing) parts.push(`${APPRAISAL_SECTION.CONTINUE}\n${pack.continueDoing}`);
  if (pack.willImprove) parts.push(`${APPRAISAL_SECTION.IMPROVE}\n${pack.willImprove}`);
  if (pack.willMeasure) parts.push(`${APPRAISAL_SECTION.MEASURE}\n${pack.willMeasure}`);
  if (pack.pdpSuggestions.length) {
    parts.push(
      `${APPRAISAL_SECTION.PDP}\n${pack.pdpSuggestions.map((s) => `- ${s}`).join("\n")}`
    );
  }
  return parts.join("\n\n").trim() || pack.raw;
};

/** System-prompt block describing the required pack structure. */
export const appraisalPackSystemInstructions = (opts: {
  audience: "patients" | "colleagues";
  includeGmcMapping: boolean;
  responseCountHint: number | string;
}): string => {
  const isPatients = opts.audience === "patients";
  const valuedHeader = isPatients
    ? APPRAISAL_SECTION.VALUED_PATIENTS
    : APPRAISAL_SECTION.VALUED_COLLEAGUES;
  const who = isPatients ? "patients" : "colleagues";
  const audienceLabel = isPatients ? "patient (PSQ)" : "colleague (MSF)";
  const gmcBlock = opts.includeGmcMapping
    ? `
${APPRAISAL_SECTION.GMC}
Domain 1: Knowledge, Skills and Performance: [Excellent|Strong|Adequate|Needs attention]
Domain 2: Safety and Quality: [Excellent|Strong|Adequate|Needs attention]
Domain 3: Communication, Partnership and Teamwork: [Excellent|Strong|Adequate|Needs attention]
Domain 4: Maintaining Trust: [Excellent|Strong|Adequate|Needs attention]
`
    : "";

  const audienceGuard = isPatients
    ? `PSQ LANGUAGE RULES:
- Write from a patient-feedback perspective only.
- "Communication, Partnership & Teamwork" for patients usually means listening, explanations, involvement in decisions, waiting-time communication, and follow-up information — NOT multidisciplinary team working unless free-text explicitly says so.
- Do NOT invent MDT, nursing, pharmacy, ward, or colleague-teamwork narratives from domain labels alone.`
    : `MSF LANGUAGE RULES:
- Write from a colleague-feedback perspective.
- MDT, teaching, leadership, and teamwork language is appropriate when scores or free-text support it.
- Do not invent patient-care anecdotes that colleagues did not describe.`;

  return `
You are an expert UK medical appraiser helping a doctor turn ${audienceLabel} feedback into concise appraisal evidence.

DEFAULT TONE: Concise. Prefer short, paste-ready paragraphs over long essays. Aim for appraisal documentation a busy doctor can use immediately.

REQUIRED STRUCTURE — use exactly these headers, STRICTLY PLAIN TEXT (no markdown, no bold, no #):

${APPRAISAL_SECTION.SUMMARY}
(ONE short paragraph. MUST open with hard numbers when available: response count, overall score out of 5, then strongest / lowest domain signals, then free-text themes. Example shape: "${opts.responseCountHint} ${who} responses; overall score X.X/5.0. Strongest area: [domain]. Free-text highlighted [themes]. Development theme: [theme grounded in comments].")

${APPRAISAL_SECTION.STRENGTHS}
- (3-5 short theme bullets distilled from scores AND free text — not verbatim quotes)
- ...

${APPRAISAL_SECTION.DEVELOPMENT}
- (2-3 short development theme bullets grounded in free text and/or clearly lower scores)
- ...

${APPRAISAL_SECTION.EVIDENCE}
- (2-3 short anonymised supporting phrases paraphrased from free text; no names/identifiers; keep under ~15 words each)
- ...
${gmcBlock}
${valuedHeader}
(First-person, 2-4 sentences max: "I am pleased that my ${who} noted...")

${APPRAISAL_SECTION.SURPRISED}
(First-person, 1-3 sentences. Separate domain labels from comment themes — do not invent stories from a domain name alone.)

${APPRAISAL_SECTION.CONTINUE}
(First-person, 2-3 concrete behaviours to maintain)

${APPRAISAL_SECTION.IMPROVE}
(First-person, 2-3 actionable improvements grounded in the feedback)

${APPRAISAL_SECTION.MEASURE}
(One sentence: how success will be checked, e.g. re-check the relevant domain/theme on the next ${isPatients ? "PSQ" : "MSF"} cycle in 6–12 months.)

${APPRAISAL_SECTION.PDP}
- Must-do: (one practical goal with timeframe and how they will know it worked)
- Stretch: (one optional stretch goal with timeframe)
(Exactly 2 bullets preferred. Do not list three equal-weight goals.)

${audienceGuard}

RULES:
1. Professional, reflective, UK clinical appraisal tone — Concise, not essay-length.
2. STRICTLY PLAIN TEXT. No markdown, asterisks, or hash headers.
3. Do not invent patient/colleague names or identifiable details.
4. Distil themes under TOP STRENGTHS / DEVELOPMENT THEMES. Put short anonymised phrases only under SUPPORTING EVIDENCE.
5. Base claims on the provided quantitative scores and free-text feedback. If free-text is thin, say so gently and lean on scores without fabricating comment themes.
6. Honesty: never claim teamwork/MDT/leadership/shared decision-making unless free-text or clear score patterns support it.
7. Keep reflection sections shorter than a typical portfolio essay — appraisers prefer clarity over length.
`.trim();
};

export const escapeHtmlPlain = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** HTML fragments for PDF export (caller supplies surrounding document chrome). */
export const buildAppraisalPackPdfSections = (
  pack: AppraisalPack,
  opts?: { escapeHtml?: (s: string) => string }
): string => {
  const esc = opts?.escapeHtml ?? escapeHtmlPlain;
  const parts: string[] = [];

  if (pack.executiveSummary) {
    parts.push(
      `<div class="summary-box"><strong>Appraisal-Ready Summary:</strong> ${esc(pack.executiveSummary)}</div>`
    );
  }

  if (pack.strengths.length || pack.developmentThemes.length) {
    parts.push(`<div class="feedback-container">`);
    if (pack.strengths.length) {
      parts.push(
        `<div class="feedback-column"><div class="feedback-header good">Key Strengths</div>${pack.strengths
          .map((s) => `<div class="feedback-card good">${esc(s)}</div>`)
          .join("")}</div>`
      );
    }
    if (pack.developmentThemes.length) {
      parts.push(
        `<div class="feedback-column"><div class="feedback-header improve">Development Themes</div>${pack.developmentThemes
          .map((s) => `<div class="feedback-card improve">${esc(s)}</div>`)
          .join("")}</div>`
      );
    }
    parts.push(`</div>`);
  }

  if (pack.supportingEvidence.length) {
    parts.push(
      `<div class="section-title">Supporting Evidence</div><ul>${pack.supportingEvidence
        .map((s) => `<li>${esc(s)}</li>`)
        .join("")}</ul>`
    );
  }

  if (pack.gmcMapping) {
    const rows = [
      ["Domain 1: Knowledge, Skills and Performance", pack.gmcMapping.domain1],
      ["Domain 2: Safety and Quality", pack.gmcMapping.domain2],
      ["Domain 3: Communication, Partnership and Teamwork", pack.gmcMapping.domain3],
      ["Domain 4: Maintaining Trust", pack.gmcMapping.domain4],
    ]
      .map(
        ([name, level]) =>
          `<tr><td style="font-weight:500;">${esc(name)}</td><td style="text-align:right;font-weight:700;color:#1fb8cd;">${esc(
            String(level)
          )}</td></tr>`
      )
      .join("");
    parts.push(
      `<div class="section-title">GMC Domain Mapping</div><table><thead><tr><th>Domain</th><th style="text-align:right;">Appraisal Signal</th></tr></thead><tbody>${rows}</tbody></table>`
    );
  }

  const reflectionBits: string[] = [];
  if (pack.valuedMost) reflectionBits.push(`<p><strong>What was valued most</strong><br/>${esc(pack.valuedMost)}</p>`);
  if (pack.surprised) reflectionBits.push(`<p><strong>What surprised me</strong><br/>${esc(pack.surprised)}</p>`);
  if (pack.continueDoing) reflectionBits.push(`<p><strong>What I will continue doing</strong><br/>${esc(pack.continueDoing)}</p>`);
  if (pack.willImprove) reflectionBits.push(`<p><strong>What I will improve</strong><br/>${esc(pack.willImprove)}</p>`);
  if (pack.willMeasure) reflectionBits.push(`<p><strong>What I will measure</strong><br/>${esc(pack.willMeasure)}</p>`);
  if (reflectionBits.length) {
    parts.push(
      `<div class="reflection-box"><h3>Reflection</h3><div class="markdown-body">${reflectionBits.join("")}</div></div>`
    );
  }

  if (pack.pdpSuggestions.length) {
    parts.push(
      `<div class="section-title">Clinician Action Plan / PDP Suggestions</div><ul>${pack.pdpSuggestions
        .map((s) => `<li>${esc(s)}</li>`)
        .join("")}</ul>`
    );
  }

  return parts.join("\n");
};

export const hasAppraisalThemes = (pack: AppraisalPack): boolean =>
  pack.strengths.length > 0 || pack.developmentThemes.length > 0;
