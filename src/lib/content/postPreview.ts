const WORDS_PER_MINUTE = 220;
const TEASER_TARGET_LENGTH = 180;
const TEASER_MAX_LENGTH = 240;
const GREETING_SEARCH_DEPTH = 6;
const PRE_GREETING_MAX_BLOCK_LENGTH = 160;

const INVISIBLE_CHARS = /[\u00A0\u00AD\u034F\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
const IMAGE_PATTERN = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/;
const GREETING_PATTERN = /^(hi|hello|hey|dear|good (morning|afternoon|evening))\b[^.!?\n]{0,40}[,.!]?$/i;
const LEADING_PLEASANTRY_PATTERN =
  /^(i )?hope (you|everyone)(['’]ve| have| are| all| had| is)?[^.!?]{0,40}\b(week|weekend|well|break)\b[^.!?]{0,20}[.!]\s*/i;
const BOILERPLATE_PATTERN = /unsubscribe|view (this|it)? ?in (your )?browser|heads up! umbil is sending/i;
const RULE_PATTERN = /^(\*\s*){3,}$|^(-\s*){3,}$|^(_\s*){3,}$/;

export type PostCoverImage = {
  url: string;
  alt: string;
};

export type PostPreviewSource = {
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
};

export type PostPreviewDetails = {
  teaser: string;
  headline: string | null;
  coverImage: PostCoverImage | null;
  readingMinutes: number;
};

function splitBlocks(markdown: string) {
  return markdown
    .replace(INVISIBLE_CHARS, " ")
    .replace(/\r\n/g, "\n")
    .split(/\n(?:[ \t]*\n)+/)
    .filter((block) => block.trim().length > 0);
}

function normaliseForComparison(value: string) {
  return stripInlineMarkdown(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function stripInlineMarkdown(value: string) {
  return value
    .replace(INVISIBLE_CHARS, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*(?:[*+-]|\d+[.)])\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(?<!\.)\.\.(?!\.)/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

function teaserText(block: string) {
  return stripInlineMarkdown(block).replace(LEADING_PLEASANTRY_PATTERN, "").trim();
}

function isHeading(block: string) {
  return /^#{1,6}\s+/.test(block.trim());
}

function isImageOnly(block: string) {
  return stripInlineMarkdown(block).length === 0 && IMAGE_PATTERN.test(block);
}

function isGreeting(block: string) {
  return GREETING_PATTERN.test(stripInlineMarkdown(block));
}

function isSkippableBlock(block: string, excerptKey: string) {
  const text = teaserText(block);
  if (!text) return true;
  if (RULE_PATTERN.test(block.trim())) return true;
  if (isHeading(block) || isImageOnly(block)) return true;
  if (isGreeting(block)) return true;
  if (BOILERPLATE_PATTERN.test(text)) return true;
  if (excerptKey && normaliseForComparison(block) === excerptKey) return true;
  return false;
}

function leadingBlocksToDrop(blocks: string[]) {
  const searchDepth = Math.min(blocks.length, GREETING_SEARCH_DEPTH);
  for (let index = 0; index < searchDepth; index += 1) {
    if (!isGreeting(blocks[index])) continue;
    const preamble = blocks.slice(0, index);
    const preambleIsShort = preamble.every(
      (block) => stripInlineMarkdown(block).length <= PRE_GREETING_MAX_BLOCK_LENGTH
    );
    return preambleIsShort ? index : 0;
  }
  return 0;
}

export function truncateAtWord(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const slice = value.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > maxLength * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.replace(/[\s,;:.–—-]+$/, "")}…`;
}

export function buildPostTeaser(post: Pick<PostPreviewSource, "excerpt" | "content">) {
  const excerpt = stripInlineMarkdown(post.excerpt ?? "");
  const blocks = splitBlocks(post.content ?? "");
  const excerptKey = normaliseForComparison(excerpt);
  const body = blocks.slice(leadingBlocksToDrop(blocks));

  const parts: string[] = [];
  let length = 0;
  for (const block of body) {
    if (isSkippableBlock(block, excerptKey)) continue;
    const text = teaserText(block);
    parts.push(text);
    length += text.length + 1;
    if (length >= TEASER_TARGET_LENGTH) break;
  }

  const teaser = parts.join(" ").trim();
  if (teaser.length < 60) return excerpt || truncateAtWord(teaser, TEASER_MAX_LENGTH);
  return truncateAtWord(teaser, TEASER_MAX_LENGTH);
}

export function findPostHeadline(content: string | null) {
  for (const block of splitBlocks(content ?? "")) {
    if (!isHeading(block)) continue;
    const text = stripInlineMarkdown(block);
    if (text && !BOILERPLATE_PATTERN.test(text)) return text;
  }
  return null;
}

export function findPostCoverImage(post: Pick<PostPreviewSource, "content" | "cover_image_url">): PostCoverImage | null {
  if (post.cover_image_url) {
    return { url: post.cover_image_url, alt: "" };
  }
  const match = (post.content ?? "").match(IMAGE_PATTERN);
  if (!match) return null;
  return { url: match[2], alt: match[1].trim() };
}

export function estimateReadingMinutes(content: string | null) {
  const words = stripInlineMarkdown(content ?? "").split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function cleanArticleMarkdown(content: string | null, excerpt: string | null) {
  const blocks = splitBlocks(content ?? "");
  const excerptKey = normaliseForComparison(excerpt ?? "");
  let start = leadingBlocksToDrop(blocks);
  if (start === 0 && blocks.length > 0 && excerptKey && normaliseForComparison(blocks[0]) === excerptKey) {
    start = 1;
  }
  return blocks.slice(start).join("\n\n").trimEnd();
}

export function buildPostPreview(post: PostPreviewSource): PostPreviewDetails {
  return {
    teaser: buildPostTeaser(post),
    headline: findPostHeadline(post.content),
    coverImage: findPostCoverImage(post),
    readingMinutes: estimateReadingMinutes(post.content),
  };
}
