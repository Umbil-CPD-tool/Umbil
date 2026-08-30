// src/lib/askIntent.ts
// Deterministic intent detection for the chat box: does this message ask us to draft one of
// the six documents, or is it an ordinary clinical question?
//
// Kept free of env vars and Supabase imports so it can be unit tested directly.
//
// Two properties matter more than raw recall:
//   1. A concept question ("what goes in an SBAR?") must never open a document card.
//   2. The instruction is often at the END, after a pasted clinical note.

import { CHAT_TOOL_IDS, type ChatToolId } from "@/lib/tools/types";

export type AskIntent = ChatToolId | "standard";

/** Clinicians paste the note first and the instruction last, so both ends are scanned. */
const HEAD_CHARS = 400;
const TAIL_CHARS = 350;

const SPECIALTY =
  "(?:gastro(?:enterology)?|ent|orthopaedics?|orthopedics?|ortho|t&o|cardio(?:logy)?|derm(?:atology)?|urology|urol|rheum(?:atology)?|neuro(?:logy)?|psych(?:iatry)?|cmht|paeds|paediatrics|gynae(?:cology)?|obs and gynae|o&g|respiratory|resp|chest clinic|endocrin(?:e|ology)|endo|haem(?:atology)?|oncology|onc|vascular|colorectal|upper gi|lower gi|breast|msk|physio(?:therapy)?|pain clinic|memory clinic|surgery|surgical|general surgery|ophthalmology|eye clinic|maxfax|max fax|plastics|renal|nephrology|palliative|tia clinic|epu|sdec|itu|icu|hdu|outreach|micro(?:biology)?|anaesthetics|anaesthesia|dietetics|podiatry|falls clinic|diabetes team|specialist|consultant|secondary care|the hospital|hospital team)";

/**
 * Verbs that mean "produce a document for me". Deliberately excludes "explain", "turn" and
 * "put" on their own: "how do I explain sepsis to a patient" and "how do I turn off e-consult"
 * are questions, not drafting requests. Those verbs are handled by TRANSFORM below, which
 * requires a deictic object pointing at pasted text.
 */
const DRAFT_VERB =
  "(?:writ(?:e|es|ing)|draft(?:s|ing)?|redraft|rewrite|re-?word|generat(?:e|es|ing)|creat(?:e|es|ing)|compos(?:e|es|ing)|mak(?:e|es|ing)|prep(?:are|aring)?|typ(?:e|es|ing)|structur(?:e|es|ing)|summaris(?:e|es|ing)|summariz(?:e|es|ing)|sort|knock up|draw up|fill in|do (?:the|this|a|an|my|it|these))";

const DRAFT_VERB_RE = new RegExp(`\\b${DRAFT_VERB}\\b`);

/** "turn this into…", "put this in…" — only counts when it points at pasted content. */
const TRANSFORM_RE =
  /\b(?:turn|put|convert|change|format|reformat|structure|make|rewrite|word)\s+(?:this|it|that|these|those|the above|the below|my notes?|the notes?|these notes?)\b/;

/**
 * Asking ABOUT a document rather than asking FOR one. Checked before the drafting-verb
 * escape hatch, because "who writes the discharge summary" contains "writes" and
 * "do i need to do an sbar" contains "do an".
 */
const HARD_CONCEPT_VETO: RegExp[] = [
  /^who\b/,
  /^why\b/,
  /^(?:do|does|did) (?:i|we|you|they|a|an|the)\b/,
  /^(?:should|shall|must|would|could) (?:i|we|you)\b/,
  /^can (?:i|we|a|an|nurses|pharmacists?|midwives|the gp|the trust)\b/,
  /^how (?:do|does|long|often|many|much|specific|accurate)\b/,
  /\bstands? for\b/,
  /\bwhat goes in\b/,
  /\bdifferences? between\b/,
  /\bcriteria\b/,
  /\bthreshold\b/,
  /\bevidence (?:base|for)\b/,
  /\btrust policy\b/,
  /\bpolicy on\b/,
  /\bper prsb\b/,
  /\breading age\b/,
  /\bhow long (?:does|do|has|have|is)\b/,
  /\bhow many\b/,
  /\bwhere can i find\b/,
  /\bis there a\b/,
  /\bwhat happens after\b/,
];

/** Interrogative openers. Only veto when no drafting verb is present. */
const QUESTION_OPENER =
  /^(?:what|whats|when|whens|why|which|where|wheres|how|hows|is|are|was|were|do|does|did|should|shall|must|has|have|any|am i)\b/;

/** "do i…", "should we…" mid-sentence — asking about practice, not asking for a document. */
const SELF_QUERY_RE =
  /\b(?:do|does|should|shall|must|can|could|would) (?:i|we|you|a|an|nurses|pharmacists?|the gp|the trust)\b/;

/** A message that ends on a question is asking something, even if it names a document first. */
const TRAILING_QUESTION_RE =
  /(?:^|[.,;:\-—]\s*)(?:what|when|why|who|which|where|how|do|does|is|are|should|can|could|would)\b[^.?!]*\?\s*$/;

type Pattern = { re: RegExp; weight: number };

/**
 * Weights: 3 = names the document outright, 2 = strong contextual phrasing, 1 = supporting hint.
 * Scores are summed so a message naming two documents resolves to the stronger one.
 */
const TOOL_PATTERNS: Record<ChatToolId, Pattern[]> = {
  referral: [
    { re: /\b(?:referr?al|referal|refferal|referall|referalls)\b/, weight: 3 },
    { re: /\b(?:2\s?ww|two week wait|2 week wait|usc|urgent suspected cancer)\b/, weight: 2 },
    { re: new RegExp(`\\brefer (?:to|him|her|them|this|for)\\b[\\s\\S]{0,40}${SPECIALTY}`), weight: 3 },
    { re: new RegExp(`\\b(?:letter|write|writing) to (?:the )?${SPECIALTY}`), weight: 3 },
    { re: new RegExp(`\\bsend (?:this )?to (?:the )?${SPECIALTY}`), weight: 3 },
    { re: new RegExp(`\\bref(?:er)? (?:to )?${SPECIALTY}`), weight: 2 },
    // Abbreviated forms only — plain "referral" is already scored above, and double
    // counting it would let "sbar for icu referral" outrank the SBAR it actually asks for.
    { re: new RegExp(`${SPECIALTY}\\s+(?:2\\s?ww|usc)?\\s?(?:ref|refs|letter)\\b`), weight: 3 },
    { re: new RegExp(`${SPECIALTY}\\s+(?:2\\s?ww|usc)\\b`), weight: 3 },
    { re: new RegExp(`\\b(?:2\\s?ww|usc)\\s+${SPECIALTY}`), weight: 3 },
    { re: /\b(?:2\s?ww|usc|urgent suspected cancer)\s+(?:referr?al|letter)\b/, weight: 3 },
    { re: /\brefer (?:for|under) (?:suspected|urgent|\?)/, weight: 3 },
    { re: /\bref letter\b/, weight: 3 },
    { re: /\bletter (?:to|for) (?:the )?(?:consultant|specialist|hospital|clinic)\b/, weight: 3 },
    { re: /\bformal (?:letter|referral)\b/, weight: 2 },
    { re: /\brefer(?:ring)? (?:this|the) (?:pt|patient|lady|gentleman|man|woman|child)\b/, weight: 2 },
    { re: /\bneeds? referring\b/, weight: 3 },
    { re: /\bplease refer\b/, weight: 2 },
  ],

  safety_netting: [
    { re: /\b(?:safety|saftey|safte?y|safty)[\s-]?net(?:ting|ted)?\b/, weight: 3 },
    { re: /\bsafetynett?ing\b/, weight: 3 },
    { re: /\bsn (?:advice|note|entry|paragraph|bit|pls|please|for)\b/, weight: 3 },
    { re: /\b(?:a|the|some) sn\b/, weight: 2 },
    { re: /\bcome back if\b/, weight: 3 },
    { re: /\bwhat to (?:do|look out for) if (?:worse|worried|no better)\b/, weight: 3 },
    { re: /\bwhen to (?:seek help|re-?attend|come back|worry)\b/, weight: 2 },
    { re: /\b(?:advised|told|tell) (?:them|the pt|the patient) to look out for\b/, weight: 3 },
    { re: /\bred flags? (?:advice|sheet|paragraph|entry|i told)\b/, weight: 2 },
    { re: /\bmedicolegal note\b/, weight: 3 },
    { re: /\bfor the (?:record|notes)\b/, weight: 1 },
    { re: /\b(?:emis|systmone|system ?one)\b/, weight: 1 },
  ],

  digital_triage: [
    { re: /\bdigital[\s-]?triage\b/, weight: 3 },
    { re: /\btriage (?:this|reply|response|msg|message|it)\b/, weight: 3 },
    { re: /\b(?:accurx|accu[\s-]?rx|e[\s-]?consult|econsult|patchs|online consult(?:ation)?|online form|systmone online)\b/, weight: 2 },
    { re: /\b(?:reply|response|respond|write back|send back|msg back|message back)\b/, weight: 2 },
    { re: /\bpt (?:msg|message|has messaged|sent this|submitted|says)\b/, weight: 2 },
    { re: /\b(?:patient|pt) (?:reply|response|message|query)\b/, weight: 2 },
    { re: /\bscreening (?:qs|questions)\b/, weight: 3 },
    { re: /\bwhat (?:do|should) i send back\b/, weight: 3 },
    { re: /\b(?:draft|write|send|need) (?:a |the |this )?(?:short |quick )?(?:reply|response|message back)\b/, weight: 3 },
    { re: /\b(?:reply|respond|response|message|msg)\b[\s\S]{0,40}\bask(?:ing|s)?\b/, weight: 3 },
    { re: /\bbefore i (?:can advise|book|ring)\b/, weight: 2 },
    { re: /\bdont (?:diagnose|give a diagnosis)\b/, weight: 2 },
    { re: /\bask(?:ing)? (?:about |the |for )?(?:red flags?|duration|more info|the (?:right|key) questions)\b/, weight: 2 },
  ],

  discharge_summary: [
    { re: /\b(?:discharge|discharg|dischage|discarge|dicharge)\b/, weight: 2 },
    { re: /\b(?:discharge|discharg|dischage|discarge|dicharge)\s*(?:summary|letter|note|report|paperwork)\b/, weight: 3 },
    { re: /\bd\s?\/?\s?c (?:summary|letter|paperwork)\b/, weight: 3 },
    { re: /\btt[oa]s?\b/, weight: 2 },
    { re: /\btt[oa]s?\s*(?:letter|summary|paperwork)\b/, weight: 3 },
    { re: /\btt[oa]s\b[\s\S]{0,40}\bletter\b/, weight: 3 },
    { re: /\b(?:summaris|summariz)(?:e|es|ing) (?:this|the) admission\b/, weight: 3 },
    { re: /\b(?:draft|write|do) (?:the |a |this )?(?:discharge|dischage|discarge)\b/, weight: 3 },
    { re: /\b(?:letter|write|writing) to (?:the )?gp\b/, weight: 3 },
    { re: /\bgp letter\b/, weight: 2 },
    { re: /\bward notes?\b/, weight: 2 },
    { re: /\bthis admission\b/, weight: 2 },
    { re: /\b(?:going home|for home|home today|self-?discharged)\b/, weight: 1 },
    { re: /\bhand this admission over\b/, weight: 3 },
  ],

  sbar: [
    // "SBAR" is unambiguous and unshared, so it outranks any other document named alongside it.
    { re: /\bs[\s.\-]?b[\s.\-]?a[\s.\-]?r\b/, weight: 5 },
    { re: /\besbars?\b/, weight: 5 },
    { re: /\bsituation background assessment recommendation\b/, weight: 3 },
    { re: /\bhand[\s-]?over\b/, weight: 2 },
    { re: /\bstructured handover\b/, weight: 3 },
    { re: /\bescalat(?:e|ing|ion)\b/, weight: 1 },
    { re: /\b(?:call|calling|ring|ringing|phone|phoning|bleep) (?:the )?(?:reg|registrar|consultant|med reg|surgical reg|on call|itu|icu|outreach|micro|crisis team)\b/, weight: 2 },
    { re: /\bfor (?:the )?(?:med reg|surgical reg|paeds reg|cardiology reg|reg|registrar|night team|ambulance crew|crisis team|psych liaison)\b/, weight: 2 },
  ],

  patient_friendly: [
    { re: /\bpils?\b/, weight: 3 },
    { re: /\b(?:patient|pt\.?)[\s-]?(?:friendly|facing)\b/, weight: 3 },
    { re: /\b(?:hand\s?out|handout|leaflet|info sheet|information sheet)\b/, weight: 3 },
    { re: /\b(?:patient|pt\.?) (?:info|information|guide|education|version)\b/, weight: 3 },
    { re: /\blay (?:summary|explanation|guide|terms|version)\b/, weight: 3 },
    { re: /\bplain english\b/, weight: 3 },
    { re: /\bsimple language\b/, weight: 3 },
    { re: /\bdumb (?:this |it )?down\b/, weight: 3 },
    { re: /\bexplain (?:this|it|the results) to (?:the )?(?:pt|patient|parents|her|him|them)\b/, weight: 3 },
    { re: /\bword this for (?:the )?(?:pt|patient)\b/, weight: 3 },
    { re: /\b(?:for|give) (?:the )?(?:pt|patient|parents|her|him|them) to (?:take home|read|understand|keep)\b/, weight: 3 },
    { re: /\bso a \d+ year old could understand\b/, weight: 3 },
    { re: /\bprint(?:able)? (?:for|guide)\b/, weight: 3 },
    { re: /\b(?:something|anything) i can (?:give|print|hand)\b/, weight: 3 },
    { re: /\b(?:something|anything|a version|version)\b[\s\S]{0,20}\b(?:pt|patient|parents|they|she|he) can (?:understand|read|follow)\b/, weight: 3 },
    { re: /\b(?:give|for) (?:the )?(?:pt|patient|parents|mum|dad|family)\b/, weight: 2 },
    { re: /\bfor the (?:pt|patient|parents)\b/, weight: 1 },
    { re: /\bhealth literacy\b/, weight: 2 },
  ],
};

/** Order used to break exact score ties — most specific document wins. */
const TIE_BREAK: ChatToolId[] = [
  "sbar",
  "discharge_summary",
  "referral",
  "digital_triage",
  "safety_netting",
  "patient_friendly",
];

export const normalizeForIntent = (message: string): string =>
  message
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[_\\|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** The instruction sits at one end or the other; the middle is usually the pasted note. */
const intentZones = (text: string): string[] =>
  text.length <= HEAD_CHARS + TAIL_CHARS
    ? [text]
    : [text.slice(0, HEAD_CHARS), text.slice(-TAIL_CHARS)];

const matchesAnyZone = (zones: string[], re: RegExp): boolean => zones.some((zone) => re.test(zone));

/** True when the message asks about a document rather than asking for one. */
export const isConceptQuestion = (text: string): boolean => {
  if (HARD_CONCEPT_VETO.some((re) => re.test(text))) return true;

  // An explicit drafting instruction outranks the softer question signals below.
  if (DRAFT_VERB_RE.test(text) || TRANSFORM_RE.test(text)) return false;

  return QUESTION_OPENER.test(text) || SELF_QUERY_RE.test(text) || TRAILING_QUESTION_RE.test(text);
};

const scoreTools = (zones: string[]): Map<ChatToolId, number> => {
  const scores = new Map<ChatToolId, number>();

  for (const tool of CHAT_TOOL_IDS) {
    let score = 0;
    for (const { re, weight } of TOOL_PATTERNS[tool]) {
      if (matchesAnyZone(zones, re)) score += weight;
    }
    if (score > 0) scores.set(tool, score);
  }

  return scores;
};

/**
 * Returns the document tool this message is asking for, or "standard" for ordinary Q&A.
 * Naming a document is itself the request — clinicians type "discharge summary - NSTEMI, PCI
 * to LAD" without a verb — so the guard against hijacking a clinical question is the concept
 * check plus the requirement that some pattern actually named the document.
 */
export const resolveAskIntent = (userMessage: string): AskIntent => {
  if (!userMessage?.trim()) return "standard";

  const text = normalizeForIntent(userMessage);
  if (isConceptQuestion(text)) return "standard";

  const zones = intentZones(text);
  const scores = scoreTools(zones);
  if (scores.size === 0) return "standard";

  let best: ChatToolId | null = null;
  let bestScore = 0;

  for (const [tool, score] of scores) {
    const isBetter =
      score > bestScore ||
      (score === bestScore && best !== null && TIE_BREAK.indexOf(tool) < TIE_BREAK.indexOf(best));

    if (isBetter) {
      best = tool;
      bestScore = score;
    }
  }

  // A weight-3 pattern means the document was named. Anything less is circumstantial.
  if (!best || bestScore < 3) return "standard";

  return best;
};
