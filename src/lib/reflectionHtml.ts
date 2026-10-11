const ALLOWED_TAG =
  /<\s*(\/)?\s*(p|div|br|strong|b|em|i|u|ul|ol|li|span)\b([^>]*)>/gi;

const ALIGNMENT = /text-align\s*:\s*(left|center|right)/i;
const ALIGN_ATTR = /align\s*=\s*["']?(left|center|right)/i;

export type ReflectionAlign = "left" | "center" | "right";

export type ReflectionBlock =
  | { kind: "paragraph"; align: ReflectionAlign; text: string }
  | { kind: "list"; ordered: boolean; items: string[] };

const decodeEntities = (value: string): string =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

/** Keep a small set of formatting tags. Drop scripts, handlers, and everything else. */
export const sanitizeReflectionHtml = (value: string): string => {
  const withoutBlocks = String(value ?? "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed)\b[^>]*\/?\s*>/gi, "");

  ALLOWED_TAG.lastIndex = 0;
  const kept = withoutBlocks.replace(ALLOWED_TAG, (_match, closing, rawName, rawAttrs) => {
    const name = String(rawName).toLowerCase();
    const normalized = name === "b" ? "strong" : name === "i" ? "em" : name;
    if (closing) return normalized === "br" ? "" : `</${normalized}>`;
    if (normalized === "br") return "<br/>";
    const attrs = String(rawAttrs ?? "");
    const align = (ALIGNMENT.exec(attrs)?.[1] || ALIGN_ATTR.exec(attrs)?.[1])?.toLowerCase();
    if ((normalized === "p" || normalized === "div") && align) {
      return `<${normalized} style="text-align:${align}">`;
    }
    return `<${normalized}>`;
  });

  return kept
    .replace(/<\/?(?!p\b|div\b|br\b|strong\b|em\b|u\b|ul\b|ol\b|li\b|span\b)[a-z][^>]*>/gi, "")
    .trim();
};

export const stripModelFences = (value: string): string =>
  String(value ?? "")
    .trim()
    .replace(/^```(?:html|xml)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const visibleText = (html: string): string =>
  decodeEntities(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const reflectionToPlainText = (html: string): string => {
  const safe = sanitizeReflectionHtml(html);
  return visibleText(
    safe
      .replace(/<li>/gi, "\n• ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|ul|ol)>/gi, "\n")
  );
};

export const reflectionHasContent = (html: string): boolean =>
  reflectionToPlainText(html).trim().length > 0;

export const reflectionBlocks = (html: string): ReflectionBlock[] => {
  const safe = sanitizeReflectionHtml(html);
  if (!safe) return [];

  const blocks: ReflectionBlock[] = [];
  const pattern = /<(p|div|ul|ol)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  let cursor = 0;

  const pushLoose = (chunk: string) => {
    const text = visibleText(chunk);
    if (text) blocks.push({ kind: "paragraph", align: "left", text });
  };

  while ((match = pattern.exec(safe))) {
    if (match.index > cursor) pushLoose(safe.slice(cursor, match.index));
    const tag = match[1].toLowerCase();
    const attrs = match[2] ?? "";
    const inner = match[3];
    if (tag === "ul" || tag === "ol") {
      const items = [...inner.matchAll(/<li>([\s\S]*?)<\/li>/gi)]
        .map((item) => visibleText(item[1]))
        .filter(Boolean);
      if (items.length) blocks.push({ kind: "list", ordered: tag === "ol", items });
    } else {
      const align = ((ALIGNMENT.exec(attrs)?.[1] || ALIGN_ATTR.exec(attrs)?.[1])?.toLowerCase() ?? "left") as ReflectionAlign;
      const text = visibleText(inner);
      if (text) blocks.push({ kind: "paragraph", align, text });
    }
    cursor = match.index + match[0].length;
  }

  if (cursor < safe.length) pushLoose(safe.slice(cursor));
  return blocks;
};
