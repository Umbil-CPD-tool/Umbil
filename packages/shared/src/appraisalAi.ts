/**
 * Canonical appraisal-pack format for PSQ / MSF AI output.
 * Stored as plain text (no markdown) in executive_summary / ai_summary.
 */

export const APPRAISAL_SECTION = {
  SUMMARY: "APPRAISAL-READY SUMMARY",
  STRENGTHS: "TOP STRENGTHS",
  DEVELOPMENT: "DEVELOPMENT THEMES",
  GMC: "GMC MAPPING",
  VALUED_PATIENTS: "WHAT PATIENTS VALUED MOST",
  VALUED_COLLEAGUES: "WHAT COLLEAGUES VALUED MOST",
  SURPRISED: "WHAT SURPRISED ME",
  CONTINUE: "WHAT I WILL CONTINUE DOING",
  IMPROVE: "WHAT I WILL IMPROVE",
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
  gmcMapping: AppraisalGmcMapping | null;
  valuedMost: string;
  surprised: string;
  continueDoing: string;
  willImprove: string;
  pdpSuggestions: string[];
};

const HEADER_PATTERN =
  /^(APPRAISAL-READY SUMMARY|TOP STRENGTHS|DEVELOPMENT THEMES|GMC MAPPING|WHAT PATIENTS VALUED MOST|WHAT COLLEAGUES VALUED MOST|WHAT SURPRISED ME|WHAT I WILL CONTINUE DOING|WHAT I WILL IMPROVE|PDP SUGGESTIONS)\s*$/i;

const emptyPack = (raw = ""): AppraisalPack => ({
  raw,
  executiveSummary: "",
  strengths: [],
  developmentThemes: [],
  gmcMapping: null,
  valuedMost: "",
  surprised: "",
  continueDoing: "",
  willImprove: "",
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
    gmcMapping: parseGmcMapping(sections[APPRAISAL_SECTION.GMC] || ""),
    valuedMost: valued,
    surprised: sections[APPRAISAL_SECTION.SURPRISED] || "",
    continueDoing: sections[APPRAISAL_SECTION.CONTINUE] || "",
    willImprove: sections[APPRAISAL_SECTION.IMPROVE] || "",
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
  const valuedHeader =
    opts.audience === "patients"
      ? APPRAISAL_SECTION.VALUED_PATIENTS
      : APPRAISAL_SECTION.VALUED_COLLEAGUES;
  const who = opts.audience === "patients" ? "patients" : "colleagues";
  const gmcBlock = opts.includeGmcMapping
    ? `
${APPRAISAL_SECTION.GMC}
Domain 1: Knowledge, Skills and Performance: [Excellent|Strong|Adequate|Needs attention]
Domain 2: Safety and Quality: [Excellent|Strong|Adequate|Needs attention]
Domain 3: Communication, Partnership and Teamwork: [Excellent|Strong|Adequate|Needs attention]
Domain 4: Maintaining Trust: [Excellent|Strong|Adequate|Needs attention]
`
    : "";

  return `
You are an expert UK medical appraiser helping a doctor turn feedback into appraisal evidence.

REQUIRED STRUCTURE — use exactly these headers, STRICTLY PLAIN TEXT (no markdown, no bold, no #):

${APPRAISAL_SECTION.SUMMARY}
(Write one data-driven paragraph suitable to paste into appraisal documentation. Example shape: "${opts.responseCountHint} ${who} responses were collected... Overall satisfaction was high, with strong scores in [domains]. Free-text feedback highlighted [themes] as particular strengths. One area identified for continued development was [theme].")

${APPRAISAL_SECTION.STRENGTHS}
- (3-5 short theme bullets distilled from scores and free text — not verbatim quotes)
- ...

${APPRAISAL_SECTION.DEVELOPMENT}
- (2-4 short development theme bullets)
- ...
${gmcBlock}
${valuedHeader}
(First-person reflection: "I am pleased that my ${who} noted...")

${APPRAISAL_SECTION.SURPRISED}
(First-person: unexpected feedback or score patterns)

${APPRAISAL_SECTION.CONTINUE}
(First-person behaviours to maintain)

${APPRAISAL_SECTION.IMPROVE}
(First-person actionable improvements)

${APPRAISAL_SECTION.PDP}
- (1-3 concrete Personal Development Plan goals)
- ...

RULES:
1. Professional, reflective, UK clinical appraisal tone.
2. STRICTLY PLAIN TEXT. No markdown, asterisks, or hash headers.
3. Do not invent patient/colleague names or identifiable details.
4. Distil themes — do not dump raw quotes under TOP STRENGTHS / DEVELOPMENT THEMES.
5. Base claims on the provided quantitative scores and free-text feedback.
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
