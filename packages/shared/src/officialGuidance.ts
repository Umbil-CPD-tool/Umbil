export type OfficialGuidanceLink = {
  title: string;
  url: string;
  publisher: string;
};

export const GUIDANCE_OPEN = "[[GUIDANCE]]";
export const GUIDANCE_CLOSE = "[[/GUIDANCE]]";

/** Curated topic/drug map powers the footer. Live Tavily search stays off. */
export const ENABLE_OFFICIAL_GUIDANCE = true;

const REJECT_PATH_RE =
  /\/(news|about|about-us|search|login|signin|contact|jobs|careers|cookies|privacy|accessibility|terms|blog|press|shop)(\/|$)/i;

const HOST_PUBLISHER: Record<string, string> = {
  "cks.nice.org.uk": "NICE CKS",
  "bnf.nice.org.uk": "BNF",
  "bnfc.nice.org.uk": "BNFC",
  "nice.org.uk": "NICE",
  "sign.ac.uk": "SIGN",
  "nhs.uk": "NHS",
  "bestpractice.bmj.com": "BMJ Best Practice",
  "rcog.org.uk": "RCOG",
  "fsrh.org": "FSRH",
  "bashhguidelines.org": "BASHH",
  "pcds.org.uk": "PCDS",
  "dermnetnz.org": "DermNet",
  "gov.uk": "UKHSA / GOV.UK",
  "brit-thoracic.org.uk": "BTS",
};

export const publisherForHost = (host: string): string | null => {
  const normalised = host.toLowerCase().replace(/^www\./, "");
  return HOST_PUBLISHER[normalised] ?? null;
};

const hasTrustedPublisherPath = (url: URL, publisher: string): boolean => {
  const path = url.pathname.toLowerCase();
  if (publisher === "BMJ Best Practice") return /\/topics\//.test(path);
  if (publisher === "RCOG") return /\/guidance\//.test(path);
  if (publisher === "FSRH") return /\/(standards-and-guidance|documents)\//.test(path);
  if (publisher === "BASHH") return /\/(current-guidelines|guidelines)\//.test(path);
  if (publisher === "PCDS") return /\/clinical-guidance\//.test(path);
  if (publisher === "DermNet") return /\/topics\//.test(path);
  if (publisher === "BTS") return /\/(quality-improvement|guideline|quality-standards)\//.test(path);
  if (publisher === "UKHSA / GOV.UK") {
    return /^\/(guidance|government\/(publications|collections))\b/.test(path);
  }
  return true;
};

export const isTrustedOfficialUrl = (rawUrl: string): URL | null => {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return null;
    const publisher = publisherForHost(url.hostname);
    if (!publisher) return null;
    if (url.pathname === "/" || url.pathname === "") return null;
    if (REJECT_PATH_RE.test(url.pathname)) return null;
    if (!hasTrustedPublisherPath(url, publisher)) return null;
    return url;
  } catch {
    return null;
  }
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

export const formatOfficialGuidanceShare = (links: OfficialGuidanceLink[]): string =>
  links.length === 0
    ? ""
    : `\n\nRelated official guidance:\n${links
        .map((link) => `- ${link.publisher}: ${link.title} (${link.url})`)
        .join("\n")}`;
