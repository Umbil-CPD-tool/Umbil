export type OfficialGuidanceLink = {
  title: string;
  url: string;
  publisher: string;
};

export type GuidanceSearchHit = {
  title: string;
  url: string;
  content: string;
};

export const OFFICIAL_GUIDANCE_DOMAINS = [
  "nice.org.uk",
  "www.nice.org.uk",
  "cks.nice.org.uk",
  "bnf.nice.org.uk",
  "bnfc.nice.org.uk",
  "sign.ac.uk",
  "www.sign.ac.uk",
  "nhs.uk",
  "www.nhs.uk",
] as const;

export const GUIDANCE_OPEN = "[[GUIDANCE]]";
export const GUIDANCE_CLOSE = "[[/GUIDANCE]]";
export const MAX_OFFICIAL_GUIDANCE = 3;
export const GUIDANCE_SEARCH_TIMEOUT_MS = 5000;

const GUIDELINE_CODE_RE = /\b(?:ng|cg|qs|ta)\s*\d+\b/gi;
const DOSE_RE = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|micrograms?|grams?|g|ml|units?|puffs?|mmol)\b/gi;
const DURATION_RE = /\b\d+\s*(?:days?|weeks?|months?|hours?|hrs?)\b/gi;
const REJECT_PATH_RE =
  /\/(news|about|about-us|search|login|signin|contact|jobs|careers|cookies|privacy|accessibility|terms)(\/|$)/i;
const SKIP_QUESTION_RE = [
  /^(hi|hey|hello|thanks|thank you|ok|okay|yes|no|cheers|ta|please|pls)\s*[.!]?\s*$/i,
  /\b(remember (that )?i|what(?:'s| is) my|do you remember|my name|custom instructions|your memory)\b/i,
  /^(who are you|what (?:are you|can you do)|how do you work)\b/i,
];

const STOPWORDS = new Set([
  "the", "and", "for", "with", "this", "that", "from", "your", "have", "has",
  "are", "was", "were", "been", "being", "into", "than", "then", "also", "only",
  "more", "most", "some", "such", "when", "what", "which", "while", "about",
  "after", "before", "should", "would", "could", "must", "may", "might", "not",
  "but", "use", "used", "using", "patient", "patients", "treatment", "management",
  "clinical", "first", "line", "nice", "guideline", "guidelines", "uk", "nhs",
  "consider", "offer", "advise", "recommended", "recommend", "including",
  "without", "within", "please", "need", "does", "did", "can", "how", "why",
  "who", "where", "when", "is", "it", "in", "on", "of", "to", "a", "an", "or",
]);

const HOST_PUBLISHER: Record<string, string> = {
  "cks.nice.org.uk": "NICE CKS",
  "bnf.nice.org.uk": "BNF",
  "bnfc.nice.org.uk": "BNFC",
  "nice.org.uk": "NICE",
  "www.nice.org.uk": "NICE",
  "sign.ac.uk": "SIGN",
  "www.sign.ac.uk": "SIGN",
  "nhs.uk": "NHS",
  "www.nhs.uk": "NHS",
};

const PUBLISHER_RANK: Record<string, number> = {
  "NICE CKS": 5,
  BNF: 5,
  BNFC: 5,
  NICE: 4,
  SIGN: 4,
  NHS: 2,
};

export const publisherForHost = (host: string): string | null => {
  const normalised = host.toLowerCase().replace(/^www\./, "");
  if (normalised === "cks.nice.org.uk") return "NICE CKS";
  if (normalised === "bnf.nice.org.uk") return "BNF";
  if (normalised === "bnfc.nice.org.uk") return "BNFC";
  if (normalised === "nice.org.uk") return "NICE";
  if (normalised === "sign.ac.uk") return "SIGN";
  if (normalised === "nhs.uk") return "NHS";
  return HOST_PUBLISHER[host.toLowerCase()] ?? null;
};

export const isTrustedOfficialUrl = (rawUrl: string): URL | null => {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return null;
    if (!publisherForHost(url.hostname)) return null;
    if (url.pathname === "/" || url.pathname === "") return null;
    if (REJECT_PATH_RE.test(url.pathname)) return null;
    return url;
  } catch {
    return null;
  }
};

export const shouldAttachOfficialGuidance = (userMessage: string): boolean => {
  const text = userMessage.trim();
  if (text.length < 8) return false;
  return !SKIP_QUESTION_RE.some((re) => re.test(text));
};

const uniqueMatches = (text: string, re: RegExp): string[] => {
  const found = text.toLowerCase().match(re) ?? [];
  return [...new Set(found.map((item) => item.replace(/\s+/g, " ").trim()))];
};

export const extractClaimTokens = (text: string): {
  codes: string[];
  quantities: string[];
  words: string[];
} => {
  const codes = uniqueMatches(text, GUIDELINE_CODE_RE);
  const quantities = [
    ...uniqueMatches(text, DOSE_RE),
    ...uniqueMatches(text, DURATION_RE),
  ];
  const words = [...new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 4 && !STOPWORDS.has(word))
  )];
  return { codes, quantities, words };
};

const tidyTitle = (title: string, url: string, publisher: string): string => {
  const stripped = title
    .replace(/\s+/g, " ")
    .replace(/\s*[|\-–—].{0,48}\b(NICE|CKS|BNF|BNFC|NHS|SIGN)\b.*$/i, "")
    .trim();
  if (stripped.length >= 8) return stripped.slice(0, 90);
  try {
    const leaf = decodeURIComponent(new URL(url).pathname)
      .split("/")
      .filter(Boolean)
      .pop()
      ?.replace(/[-_]+/g, " ")
      .trim();
    if (leaf && leaf.length >= 8) return leaf.slice(0, 90);
  } catch {
    // Fall through to publisher
  }
  return publisher;
};

const pathQuality = (url: URL, publisher: string): number => {
  const path = url.pathname.toLowerCase();
  if (publisher === "NICE CKS") return 3;
  if (publisher === "BNF" || publisher === "BNFC") {
    return /\/(drugs?|medicinal-forms)\b/.test(path) ? 3 : 2;
  }
  if (publisher === "NICE" && /\/guidance\/(ng|cg|qs|ta)\d+/.test(path)) return 3;
  if (publisher === "SIGN" && /guideline/.test(path)) return 3;
  if (publisher === "NHS" && /\/conditions\//.test(path)) return 2;
  return 1;
};

export const scoreGuidanceHit = (
  hit: GuidanceSearchHit,
  question: string,
  answer: string
): { score: number; url: URL; publisher: string; title: string } | null => {
  const url = isTrustedOfficialUrl(hit.url);
  if (!url) return null;

  const publisher = publisherForHost(url.hostname);
  if (!publisher) return null;

  const haystack = `${hit.title} ${hit.content}`.toLowerCase();
  const questionClaims = extractClaimTokens(question);
  const answerClaims = extractClaimTokens(answer);
  const codes = [...new Set([...questionClaims.codes, ...answerClaims.codes])];
  const quantities = [...new Set([...questionClaims.quantities, ...answerClaims.quantities])];
  const words = [...new Set([...questionClaims.words, ...answerClaims.words])];

  let score = pathQuality(url, publisher);

  for (const code of codes) {
    if (haystack.includes(code)) score += 4;
  }
  for (const quantity of quantities) {
    if (haystack.includes(quantity)) score += 2;
  }

  const overlappingWords = words.filter((word) => haystack.includes(word));
  score += Math.min(overlappingWords.length, 6);

  const titleWords = extractClaimTokens(hit.title).words;
  const questionOverlap = questionClaims.words.filter((word) => titleWords.includes(word));
  if (questionOverlap.length >= 2) score += 2;

  const hasClaimOverlap =
    codes.some((code) => haystack.includes(code)) ||
    quantities.some((quantity) => haystack.includes(quantity)) ||
    overlappingWords.length >= 1;

  if (!hasClaimOverlap || score < 3) return null;

  return {
    score,
    url,
    publisher,
    title: tidyTitle(hit.title || "", url.toString(), publisher),
  };
};

export const pickOfficialGuidance = (
  hits: GuidanceSearchHit[],
  question: string,
  answer: string
): OfficialGuidanceLink[] => {
  const ranked = hits
    .map((hit) => scoreGuidanceHit(hit, question, answer))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (PUBLISHER_RANK[b.publisher] ?? 0) - (PUBLISHER_RANK[a.publisher] ?? 0);
    });

  const seenUrls = new Set<string>();
  const seenPublishers = new Set<string>();
  const selected: OfficialGuidanceLink[] = [];

  const consider = (item: NonNullable<ReturnType<typeof scoreGuidanceHit>>, requireNewPublisher: boolean) => {
    const href = `${item.url.origin}${item.url.pathname}`.toLowerCase();
    if (seenUrls.has(href)) return;
    if (requireNewPublisher && seenPublishers.has(item.publisher) && selected.length > 0) return;
    seenUrls.add(href);
    seenPublishers.add(item.publisher);
    selected.push({
      title: item.title,
      url: `${item.url.origin}${item.url.pathname}${item.url.search}`,
      publisher: item.publisher,
    });
  };

  for (const item of ranked) {
    if (selected.length >= MAX_OFFICIAL_GUIDANCE) break;
    consider(item, true);
  }
  for (const item of ranked) {
    if (selected.length >= MAX_OFFICIAL_GUIDANCE) break;
    consider(item, false);
  }

  return selected;
};

export const encodeOfficialGuidanceTag = (links: OfficialGuidanceLink[]): string => {
  if (links.length === 0) return "";
  return `\n\n${GUIDANCE_OPEN}${JSON.stringify({ links })}${GUIDANCE_CLOSE}`;
};

export const splitOfficialGuidance = (
  text: string
): { content: string; guidance?: OfficialGuidanceLink[]; incomplete: boolean } => {
  const openAt = text.lastIndexOf(GUIDANCE_OPEN);
  if (openAt === -1) {
    const dangling = text.lastIndexOf("[[");
    if (dangling !== -1) {
      const tail = text.slice(dangling);
      if (GUIDANCE_OPEN.startsWith(tail) || GUIDANCE_CLOSE.startsWith(tail)) {
        return { content: text.slice(0, dangling).trimEnd(), incomplete: true };
      }
    }
    return { content: text, incomplete: false };
  }

  const jsonStart = openAt + GUIDANCE_OPEN.length;
  const closeAt = text.indexOf(GUIDANCE_CLOSE, jsonStart);
  if (closeAt === -1) {
    return { content: text.slice(0, openAt).trimEnd(), incomplete: true };
  }

  try {
    const parsed = JSON.parse(text.slice(jsonStart, closeAt)) as { links?: unknown };
    const links = Array.isArray(parsed.links)
      ? parsed.links.filter((item): item is OfficialGuidanceLink => {
          if (!item || typeof item !== "object") return false;
          const link = item as OfficialGuidanceLink;
          return Boolean(
            typeof link.title === "string" &&
            typeof link.url === "string" &&
            typeof link.publisher === "string" &&
            isTrustedOfficialUrl(link.url)
          );
        })
      : [];
    return {
      content: text.slice(0, openAt).trimEnd(),
      guidance: links.length > 0 ? links : undefined,
      incomplete: false,
    };
  } catch {
    return { content: text.slice(0, openAt).trimEnd(), incomplete: false };
  }
};

export const fetchOfficialGuidanceHits = async (
  query: string,
  search: ((q: string) => Promise<GuidanceSearchHit[]>) | null
): Promise<GuidanceSearchHit[]> => {
  if (!search || !query.trim()) return [];
  try {
    return await Promise.race([
      search(query),
      new Promise<GuidanceSearchHit[]>((resolve) => {
        setTimeout(() => resolve([]), GUIDANCE_SEARCH_TIMEOUT_MS);
      }),
    ]);
  } catch (err) {
    console.error("[Umbil] Official guidance search failed:", err);
    return [];
  }
};
