import type { Metadata } from "next";
import Link from "next/link";
import { BlogPostCard } from "@/app/blog/BlogPostCard";
import { BlogSectionNav } from "@/app/blog/BlogSectionNav";
import {
  NEWSLETTER_TAG,
  listPublishedPosts,
  postHasTag,
  uniquePostTags,
} from "@/lib/content/blogPosts";

export const revalidate = 3600;

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

export default async function BlogIndexPage({ searchParams }: BlogPageProps) {
  const resolvedSearchParams = await searchParams;
  const filterTag = resolvedSearchParams?.tag?.toString();
  const allPosts = await listPublishedPosts();
  const tags = uniquePostTags(allPosts);
  const visiblePosts = filterTag
    ? allPosts.filter((post) => postHasTag(post, filterTag))
    : allPosts;
  const newsletterPosts = allPosts.filter((post) => postHasTag(post, NEWSLETTER_TAG)).slice(0, 3);
  const otherPosts = allPosts.filter((post) => !postHasTag(post, NEWSLETTER_TAG));
  const showHubSections = !filterTag;

  return (
    <section className="main-content">
      <div className="container">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between" style={{ marginBottom: 24 }}>
          <div>
            <h1 className="pb-4 text-5xl font-bold">Blog</h1>
            <p className="text-slate-500">
              Weekly newsletters and editorial notes on clinical workflow, documentation, and Umbil product updates.
            </p>
          </div>
          <BlogSectionNav tags={tags} active={filterTag ? filterTag.toLowerCase() : undefined} />
        </div>

        <hr className="p-2 text-zinc-200"></hr>

        {showHubSections && newsletterPosts.length > 0 && (
          <section className="mb-10">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Newsletter</h2>
                <p className="text-slate-500">The weekly Umbil briefing, archived for the web.</p>
              </div>
              <Link href="/blog/newsletter" className="btn btn--outline">
                All newsletters
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {newsletterPosts.map((post) => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

        <section>
          {showHubSections && otherPosts.length > 0 && (
            <h2 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">Latest posts</h2>
          )}
          <div className="grid gap-6 md:grid-cols-2">
            {(showHubSections ? otherPosts : visiblePosts).map((post) => (
              <BlogPostCard key={post.id} post={post} />
            ))}
          </div>
        </section>

        {visiblePosts.length === 0 && (
          <div className="card">
            <div className="card__body">
              <p className="text-slate-600">No posts found. Try a different tag or check back later.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
