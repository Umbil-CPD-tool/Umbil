import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { NEWSLETTER_TAG, normalizeTag, reservedPostSlugSet } from "./postSchema";

export type NewsletterCandidate = {
  externalId: string;
  title: string;
  html?: string | null;
  text?: string | null;
  previewText?: string | null;
  sentAt?: string | null;
};

export type NewsletterDraft = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: "draft";
  publish_date: string | null;
  tags: string[];
  source: "resend";
  external_id: string;
};

export type ResendListPage<T> = {
  object?: string;
  has_more?: boolean;
  data?: T[];
};

type ResendResult<T> = {
  data: T | null;
  error: { message?: string } | null;
};

export type ResendNewsletterClient = {
  broadcasts: {
    list: (opts?: { limit?: number; after?: string }) => Promise<ResendResult<ResendListPage<ResendBroadcastSummary>>>;
    get: (id: string) => Promise<ResendResult<ResendBroadcast>>;
  };
  emails: {
    list: (opts?: { limit?: number; after?: string }) => Promise<ResendResult<ResendListPage<ResendEmailSummary>>>;
    get: (id: string) => Promise<ResendResult<ResendEmail>>;
  };
};

type ResendBroadcastSummary = {
  id: string;
  name?: string | null;
  status?: string | null;
  sent_at?: string | null;
};

type ResendBroadcast = ResendBroadcastSummary & {
  subject?: string | null;
  html?: string | null;
  text?: string | null;
  preview_text?: string | null;
};

type ResendEmailSummary = {
  id: string;
  from?: string | null;
  subject?: string | null;
  created_at?: string | null;
};

type ResendEmail = ResendEmailSummary & {
  html?: string | null;
  text?: string | null;
};

const TRANSACTIONAL_SUBJECT =
  /msf|multi-?source feedback|welcome to umbil|engagement report|weekly (usage|engagement) report|password|verify your|sign[- ]in code|invited you|colleague requested/i;

const NEWSLETTER_SUBJECT =
  /newsletter|weekly update|weekly round|this week at umbil|umbil weekly|clinical tips|tips & best practices|best practices/i;

const MAX_PAGES = 20;
const PAGE_SIZE = 100;

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function uniqueSlug(base: string, existingSlugs: Set<string>) {
  let candidate = base || "umbil-newsletter";
  if (reservedPostSlugSet.has(candidate)) {
    candidate = `${candidate}-post`;
  }

  if (!existingSlugs.has(candidate)) {
    return candidate;
  }

  let index = 2;
  while (existingSlugs.has(`${candidate}-${index}`)) {
    index += 1;
  }
  return `${candidate}-${index}`;
}

export function isTransactionalEmail(from: string, subject: string) {
  return TRANSACTIONAL_SUBJECT.test(subject) || /noreply@/i.test(from);
}

export function isLikelyNewsletterEmail(from: string, subject: string) {
  if (isTransactionalEmail(from, subject)) return false;
  if (NEWSLETTER_SUBJECT.test(subject)) return true;
  return /notifications\.umbil\.co\.uk/i.test(from) && /umbil/i.test(subject);
}

export function excerptFromText(value: string, max = 280) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).trimEnd()}…`;
}

export function cleanNewsletterHtml(html: string) {
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe").remove();

  $("img").each((_, el) => {
    const img = $(el);
    const width = img.attr("width");
    const height = img.attr("height");
    const src = img.attr("src") ?? "";
    const isTrackingPixel =
      (width === "1" && height === "1") ||
      /pixel|tracking|open\.gif|r\.resend/i.test(src);
    if (isTrackingPixel) {
      img.remove();
    }
  });

  $("a").each((_, el) => {
    const anchor = $(el);
    const href = anchor.attr("href") ?? "";
    const text = anchor.text();
    if (/unsubscribe|manage (your )?preferences|email-preferences/i.test(`${href} ${text}`)) {
      const wrapper = anchor.closest("p, td, div, li, table");
      if (wrapper.length) {
        wrapper.remove();
      } else {
        anchor.remove();
      }
    }
  });

  let output = $("body").html() ?? $.root().html() ?? "";
  output = output
    .replace(/\{\{\{[^}]+\}\}\}/g, "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/&nbsp;/g, " ");
  return output.trim();
}

export function htmlToMarkdown(html: string) {
  const cleaned = cleanNewsletterHtml(html);
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });
  return turndown.turndown(cleaned).replace(/\n{3,}/g, "\n\n").trim();
}

export function draftFromNewsletter(
  candidate: NewsletterCandidate,
  existingSlugs: Set<string>
): NewsletterDraft {
  const sentAt = candidate.sentAt ? new Date(candidate.sentAt) : null;
  const sentDate = sentAt && !Number.isNaN(sentAt.getTime())
    ? sentAt.toISOString().slice(0, 10)
    : null;

  const title = candidate.title.trim() || (sentDate ? `Umbil newsletter ${sentDate}` : "Umbil newsletter");
  const markdown = candidate.html
    ? htmlToMarkdown(candidate.html)
    : (candidate.text ?? "").trim();
  const excerptSource = candidate.previewText?.trim() || markdown.replace(/[#*_`>\[\]()]/g, " ");
  const slugBase = slugify([title, sentDate].filter(Boolean).join(" "));

  return {
    title,
    slug: uniqueSlug(slugBase, existingSlugs),
    excerpt: excerptFromText(excerptSource || title),
    content: markdown || title,
    status: "draft",
    publish_date: sentAt && !Number.isNaN(sentAt.getTime()) ? sentAt.toISOString() : null,
    tags: [NEWSLETTER_TAG],
    source: "resend",
    external_id: candidate.externalId,
  };
}

function unwrapList<T>(payload: ResendListPage<T> | T[] | null | undefined): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload.data) ? payload.data : [];
}

async function paginateList<T extends { id: string }>(
  list: (opts?: { limit?: number; after?: string }) => Promise<ResendResult<ResendListPage<T>>>
) {
  const items: T[] = [];
  let after: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await list({ limit: PAGE_SIZE, after });
    if (error) {
      throw new Error(error.message ?? "Resend list failed");
    }
    const batch = unwrapList(data);
    items.push(...batch);
    const hasMore = Boolean(data && !Array.isArray(data) && data.has_more) || batch.length === PAGE_SIZE;
    if (!hasMore || batch.length === 0) break;
    after = batch[batch.length - 1]?.id;
    if (!after) break;
  }
  return items;
}

export async function fetchNewsletterCandidates(
  resend: ResendNewsletterClient
): Promise<NewsletterCandidate[]> {
  const broadcasts = await paginateList((opts) => resend.broadcasts.list(opts));
  const sentBroadcasts = broadcasts.filter((item) => item.status === "sent");

  if (sentBroadcasts.length > 0) {
    const candidates: NewsletterCandidate[] = [];
    for (const summary of sentBroadcasts) {
      const { data, error } = await resend.broadcasts.get(summary.id);
      if (error || !data) continue;
      candidates.push({
        externalId: data.id,
        title: data.subject || data.name || "Umbil newsletter",
        html: data.html,
        text: data.text,
        previewText: data.preview_text,
        sentAt: data.sent_at ?? summary.sent_at,
      });
    }
    return candidates;
  }

  const emails = await paginateList((opts) => resend.emails.list(opts));
  const newsletterEmails = emails.filter((email) =>
    isLikelyNewsletterEmail(email.from ?? "", email.subject ?? "")
  );

  const uniqueBySubject = new Map<string, ResendEmailSummary>();
  for (const email of newsletterEmails) {
    const key = `${email.subject ?? ""}|${(email.created_at ?? "").slice(0, 10)}`;
    if (!uniqueBySubject.has(key)) {
      uniqueBySubject.set(key, email);
    }
  }

  const candidates: NewsletterCandidate[] = [];
  for (const summary of uniqueBySubject.values()) {
    const { data, error } = await resend.emails.get(summary.id);
    if (error || !data) continue;
    candidates.push({
      externalId: data.id,
      title: data.subject || "Umbil newsletter",
      html: data.html,
      text: data.text,
      sentAt: data.created_at ?? summary.created_at,
    });
  }
  return candidates;
}

export function draftsFromCandidates(
  candidates: NewsletterCandidate[],
  existingExternalIds: Set<string>,
  existingSlugs: Set<string>
) {
  const imported: NewsletterDraft[] = [];
  let skipped = 0;

  for (const candidate of candidates) {
    if (existingExternalIds.has(candidate.externalId)) {
      skipped += 1;
      continue;
    }
    const draft = draftFromNewsletter(candidate, existingSlugs);
    existingSlugs.add(draft.slug);
    imported.push(draft);
  }

  return { imported, skipped };
}

export function normalizeImportedTags(tags: string[]) {
  const unique = new Set(tags.map(normalizeTag).filter(Boolean));
  unique.add(NEWSLETTER_TAG);
  return [...unique];
}
