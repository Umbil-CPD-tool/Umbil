import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabaseService } from "@/lib/supabaseService";
import { reservedPostSlugSet } from "@/lib/content/postSchema";
import { stripHiddenEmailChars } from "@/lib/content/resendNewsletterImport";
import { cleanArticleMarkdown, estimateReadingMinutes } from "@/lib/content/postPreview";
import {
  NEWSLETTER_TAG,
  listPublishedPostPreviews,
  normalizeTag,
  postHasTag,
} from "@/lib/content/blogPosts";
import { BlogPostMeta } from "@/app/blog/BlogPostMeta";
import { BlogPostRow } from "@/app/blog/BlogPostRow";
import { BlogShareButtons } from "@/app/blog/BlogShareButtons";
import type { Metadata } from "next";

export const revalidate = 3600;

const SITE_URL = "https://umbil.co.uk";
const RELATED_POSTS_LIMIT = 3;

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

async function getPost(slug: string) {
  if (reservedPostSlugSet.has(slug)) {
    return null;
  }
  const now = new Date().toISOString();
  const { data, error } = await supabaseService
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .or(`publish_date.is.null,publish_date.lte.${now}`)
    .single();

  if (error || !data) {
    return null;
  }
  return data as Record<string, any>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    return {
      title: "Post not found",
      description: "This blog post is unavailable.",
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `${SITE_URL}/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `${SITE_URL}/blog/${post.slug}`,
      publishedTime: post.publish_date ?? undefined,
      images: post.cover_image_url ? [{ url: post.cover_image_url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.cover_image_url ? [post.cover_image_url] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    notFound();
  }

  const postUrl = `${SITE_URL}/blog/${post.slug}`;
  const tags: string[] = (post.tags ?? []).map(normalizeTag).filter(Boolean);
  const isNewsletter = postHasTag(post, NEWSLETTER_TAG);
  const topicTags = tags.filter((tag) => tag !== NEWSLETTER_TAG);
  const content = stripHiddenEmailChars(post.content ?? "");
  const articleMarkdown = cleanArticleMarkdown(content, post.excerpt);
  const readingMinutes = estimateReadingMinutes(content);

  const otherPosts = (await listPublishedPostPreviews()).filter((candidate) => candidate.id !== post.id);
  const sameSection = otherPosts.filter((candidate) =>
    isNewsletter ? postHasTag(candidate, NEWSLETTER_TAG) : topicTags.some((tag) => postHasTag(candidate, tag))
  );
  const relatedPosts = [...sameSection, ...otherPosts.filter((candidate) => !sameSection.includes(candidate))].slice(
    0,
    RELATED_POSTS_LIMIT
  );

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publish_date ?? undefined,
    dateModified: post.updated_at ?? post.publish_date ?? undefined,
    image: post.cover_image_url ?? undefined,
    mainEntityOfPage: postUrl,
    url: postUrl,
    author: { "@type": "Organization", name: "Umbil", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Umbil", url: SITE_URL },
  };

  return (
    <article className="main-content">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <div className="container">
        <div className="mx-auto max-w-[720px]">
          <Link
            href={isNewsletter ? "/blog/newsletter" : "/blog"}
            className="mb-6 inline-block text-sm font-semibold text-[var(--umbil-brand-teal)] hover:underline"
          >
            <span aria-hidden="true">←</span> {isNewsletter ? "All newsletters" : "All posts"}
          </Link>

          <header className="mb-8 flex flex-col gap-4 border-b border-[var(--umbil-divider)] pb-8">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--umbil-brand-teal)]">
              {isNewsletter ? "Weekly briefing" : topicTags[0] ?? "Umbil blog"}
            </p>
            <h1 className="text-3xl font-bold leading-tight text-[var(--umbil-text)] md:text-4xl">{post.title}</h1>
            {post.excerpt && (
              <p className="text-lg leading-relaxed text-[var(--umbil-muted)] md:text-xl">{post.excerpt}</p>
            )}
            <BlogPostMeta publishDate={post.publish_date ?? null} readingMinutes={readingMinutes} />
            <BlogShareButtons url={postUrl} title={post.title} />
          </header>

          {post.cover_image_url && (
            <div className="mb-8 overflow-hidden rounded-2xl border border-[var(--umbil-divider)]">
              <img src={post.cover_image_url} alt="" className="aspect-[16/9] w-full object-cover" />
            </div>
          )}

          <div className="blog-article">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{articleMarkdown}</ReactMarkdown>
          </div>

          {topicTags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2">
              {topicTags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog/topic/${encodeURIComponent(tag)}`}
                  className="blog-link-muted rounded-full border border-[var(--umbil-divider)] px-3 py-1 text-sm hover:border-[var(--umbil-brand-teal)]"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-10 border-t border-[var(--umbil-divider)] pt-6">
            <BlogShareButtons url={postUrl} title={post.title} label="Found this useful? Share it with a colleague" />
          </div>

          <aside className="mt-10 rounded-2xl border border-[var(--umbil-divider)] bg-[var(--umbil-surface)] p-6">
            <p className="text-lg font-bold text-[var(--umbil-text)]">Clinical answers in seconds.</p>
            <p className="mt-1 text-[var(--umbil-muted)]">
              Ask complex questions in plain English. Get structured summaries sourced strictly from National Clinical Guidelines.
            </p>
            <Link href="/" className="btn btn--primary mt-4">
              Try Umbil free
            </Link>
          </aside>

          {relatedPosts.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-2 border-b border-[var(--umbil-divider)] pb-3 text-xl font-bold text-[var(--umbil-text)]">
                Keep reading
              </h2>
              <div className="pt-4">
                {relatedPosts.map((related) => (
                  <BlogPostRow key={related.id} post={related} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </article>
  );
}
