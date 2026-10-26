const STOPWORDS = new Set([
  "that",
  "this",
  "with",
  "from",
  "what",
  "when",
  "where",
  "were",
  "have",
  "about",
  "last",
  "week",
  "month",
  "yesterday",
  "earlier",
  "pick",
  "decide",
  "decided",
  "discussed",
  "conversation",
  "remember",
  "please",
  "could",
  "would",
  "there",
  "their",
  "them",
  "they",
  "your",
  "into",
  "just",
  "some",
  "than",
  "then",
  "also",
  "been",
  "being",
  "does",
  "did",
  "doing",
]);

export type ConversationNote = {
  conversationId: string;
  title: string;
  summary: string;
  updatedAt: string;
};

const PRIOR_PATTERNS: RegExp[] = [
  /\blast (?:week|month|time)\b/i,
  /\byesterday\b/i,
  /\bthe other day\b/i,
  /\bwhere (?:did|were) we\b/i,
  /\bpick(?:\s+this)? up\b/i,
  /\bwhat did we (?:decide|say|agree)\b/i,
  /\bwe (?:discussed|talked about|decided)\b/i,
  /\bthat (?:project|article|piece|referral|case) we\b/i,
  /\bcontinue (?:from|where|the)\b/i,
  /\bearlier conversation\b/i,
];

export const redactClinicalIdentifiers = (value: string): string =>
  value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b(?:\+44\s?|0)\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g, "[phone]")
    .replace(/\b\d{3}[-\s]?\d{3}[-\s]?\d{4}\b/g, "[number]")
    .replace(/\b\d{10}\b/g, "[number]")
    .replace(/\b(?:nhs|hospital|dob)\s*(?:no|number|#)?\s*[:#]?\s*[A-Z0-9-]{6,}/gi, "[identifier]");

export const clipNoteText = (value: string, max: number): string => {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1)).trim()}…`;
};

const stripAnswerChrome = (answer: string): string =>
  answer
    .replace(/\[\[TOOL:[^\]]+\]\]/g, "")
    .replace(/\[\[GUIDANCE\]\][\s\S]*$/i, "")
    .replace(/\[\[ACTION:[^\]]+\]\]/g, "");

export const buildTurnPoint = (question: string, answer: string): string => {
  const asked = clipNoteText(redactClinicalIdentifiers(question), 160);
  const reply = clipNoteText(redactClinicalIdentifiers(stripAnswerChrome(answer)), 180);
  if (!asked && !reply) return "";
  return `Asked: ${asked || "a follow-up"}. Reply: ${reply || "no reply saved"}.`;
};

const clipRolling = (text: string, max: number): string => {
  if (text.length <= max) return text;
  const head = text.slice(0, 180).trim();
  const tail = text.slice(-(max - 200)).trim();
  return `${head}\n…\n${tail}`;
};

export const mergeConversationNote = (
  previous: { title: string; summary: string } | null,
  question: string,
  answer: string
): { title: string; summary: string } | null => {
  const point = buildTurnPoint(question, answer);
  if (!point) return previous;
  const title = previous?.title?.trim() || clipNoteText(redactClinicalIdentifiers(question), 90) || "Earlier conversation";
  const combined = previous?.summary ? `${previous.summary}\n${point}` : point;
  return { title, summary: clipRolling(combined, 700) };
};

export const wantsPriorWork = (message: string): boolean => {
  const text = message.replace(/\s+/g, " ").trim();
  if (!text || /\bremember that i\b/i.test(text)) return false;
  return PRIOR_PATTERNS.some((pattern) => pattern.test(text));
};

export const priorWindowDays = (message: string): number => {
  if (/\byesterday\b/i.test(message)) return 2;
  if (/\blast week\b/i.test(message)) return 14;
  if (/\blast month\b/i.test(message)) return 40;
  return 120;
};

const keywords = (message: string): string[] =>
  message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));

const byRecent = (left: ConversationNote, right: ConversationNote): number =>
  new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();

export const selectRelatedNotes = (
  message: string,
  notes: ConversationNote[],
  now: Date = new Date()
): ConversationNote[] => {
  if (!wantsPriorWork(message) || notes.length === 0) return [];

  const cutoff = now.getTime() - priorWindowDays(message) * 24 * 60 * 60 * 1000;
  const inWindow = notes.filter((note) => new Date(note.updatedAt).getTime() >= cutoff);
  const pool = inWindow.length > 0 ? inWindow : [...notes].sort(byRecent).slice(0, 5);
  const tokens = keywords(message);
  const recencyPhrase = /\b(last week|last month|yesterday|where (?:did|were) we|pick up|earlier)\b/i.test(message);

  if (tokens.length === 0) return [...pool].sort(byRecent).slice(0, 3);

  const scored = pool
    .map((note) => {
      const haystack = `${note.title} ${note.summary}`.toLowerCase();
      const score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
      return { note, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || byRecent(left.note, right.note));

  if (scored.length === 0 && recencyPhrase) return [...pool].sort(byRecent).slice(0, 3);
  return scored.slice(0, 3).map((item) => item.note);
};

export const formatContinuityBlock = (
  current: { title: string; summary: string } | null,
  related: ConversationNote[]
): string => {
  const parts: string[] = [];
  if (current?.summary.trim()) {
    parts.push(
      `EARLIER IN THIS CONVERSATION (${current.title}):\n${current.summary.trim()}\nThis is the same conversation. Do not carry these details into a different case.`
    );
  }
  if (related.length > 0) {
    const lines = related.map((note) => `- ${note.title}: ${note.summary.replace(/\s+/g, " ").trim()}`);
    parts.push(
      `RELATED EARLIER WORK (this clinician's own previous chats):\n${lines.join("\n")}\nUse this only when they are clearly continuing that work. Do not copy details from one case into another, and do not treat it as a new clinical fact.`
    );
  }
  return parts.length ? `\n${parts.join("\n\n")}\n` : "";
};
