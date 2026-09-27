import type { Metadata } from "next";
import Link from "next/link";
import { BlogFeaturedPost } from "@/app/blog/BlogFeaturedPost";
import { BlogPostRow } from "@/app/blog/BlogPostRow";
import { BlogPageHeader } from "@/app/blog/BlogPageHeader";
import { BlogSectionNav } from "@/app/blog/BlogSectionNav";
import { BlogAdminToolbar } from "@/app/blog/BlogAdminToolbar";
import {
  NEWSLETTER_TAG,
  listPublishedPostPreviews,
  postHasTag,
  uniquePostTags,
} from "@/lib/content/blogPosts";

export const revalidate = 3600;

const EARLIER_BRIEFINGS_LIMIT = 4;

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Weekly newsletters, product updates, and clinical workflow writing from Umbil.",
  alternates: { canonical: "https://umbil.co.uk/blog" },
  openGraph: {
    title: "Umbil Blog",
    description:
      "Weekly newsletters, product updates, and clinical workflow writing from Umbil.",
    url: "https://umbil.co.uk/blog",
  },
};

type BlogPageProps = {
  searchParams?: {
    tag?: string;
  } | Promise<{
    tag?: string;
  } | undefined>;
};

const SectionHeading = ({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) => (
  <div className="mb-2 flex items-baseline justify-between gap-4 border-b border-[var(--umbil-divider)] pb-3">
    <h2 className="text-xl font-bold text-[var(--umbil-text)]">{title}</h2>
    {href && linkLabel && (
      <Link href={href} className="text-sm font-semibold text-[var(--umbil-brand-teal)] hover:underline">
        {linkLabel} <span aria-hidden="true">→</span>
      </Link>
    )}
  </div>
);

export default async function BlogIndexPage({ searchParams }: BlogPageProps) {
  const resolvedSearchParams = await searchParams;
  const filterTag = resolvedSearchParams?.tag?.toString();
  const allPosts = await listPublishedPostPreviews();
  const tags = uniquePostTags(allPosts);

  const newsletterPosts = allPosts.filter((post) => postHasTag(post, NEWSLETTER_TAG));
  const otherPosts = allPosts.filter((post) => !postHasTag(post, NEWSLETTER_TAG));
  const featuredPost = newsletterPosts[0] ?? allPosts[0];
  const featuredIsNewsletter = Boolean(featuredPost && postHasTag(featuredPost, NEWSLETTER_TAG));
  const earlierBriefings = newsletterPosts
    .filter((post) => post.id !== featuredPost?.id)
    .slice(0, EARLIER_BRIEFINGS_LIMIT);
  const latestPosts = otherPosts.filter((post) => post.id !== featuredPost?.id);
  const filteredPosts = filterTag ? allPosts.filter((post) => postHasTag(post, filterTag)) : [];

  return (
    <section className="main-content">
      <div className="container">
        <BlogPageHeader
          title="Blog"
          description="Weekly clinical briefings and editorial notes on clinical workflow, documentation, and Umbil product updates."
        >
          <BlogSectionNav tags={tags} active={filterTag ? filterTag.toLowerCase() : undefined} />
        </BlogPageHeader>

        <BlogAdminToolbar />

        {filterTag ? (
          <section>
            {filteredPosts.map((post) => (
              <BlogPostRow key={post.id} post={post} headingLevel="h2" />
            ))}
          </section>
        ) : (
          <>
            {featuredPost && (
              <BlogFeaturedPost
                post={featuredPost}
                kicker={featuredIsNewsletter ? "This week's briefing" : "Latest post"}
                callToAction={featuredIsNewsletter ? "Read this week's briefing" : "Read the post"}
              />
            )}

            {earlierBriefings.length > 0 && (
              <section className="mb-12">
                <SectionHeading title="Earlier briefings" href="/blog/newsletter" linkLabel="All newsletters" />
                <div className="pt-4">
                  {earlierBriefings.map((post) => (
                    <BlogPostRow key={post.id} post={post} />
                  ))}
                </div>
              </section>
            )}

            {latestPosts.length > 0 && (
              <section className="mb-12">
                <SectionHeading title="Latest posts" />
                <div className="pt-4">
                  {latestPosts.map((post) => (
                    <BlogPostRow key={post.id} post={post} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {(filterTag ? filteredPosts.length === 0 : allPosts.length === 0) && (
          <p className="rounded-xl border border-[var(--umbil-divider)] p-6 text-[var(--umbil-muted)]">
            No posts found. Try a different tag or check back later.
          </p>
        )}
      </div>
    </section>
  );
}
