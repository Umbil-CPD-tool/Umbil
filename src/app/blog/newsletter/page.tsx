import type { Metadata } from "next";
import { BlogFeaturedPost } from "@/app/blog/BlogFeaturedPost";
import { BlogPostRow } from "@/app/blog/BlogPostRow";
import { BlogPageHeader } from "@/app/blog/BlogPageHeader";
import { BlogSectionNav } from "@/app/blog/BlogSectionNav";
import { BlogAdminToolbar } from "@/app/blog/BlogAdminToolbar";
import { NEWSLETTER_TAG, listPublishedPostPreviews, postHasTag, uniquePostTags } from "@/lib/content/blogPosts";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Weekly newsletter",
  description:
    "Archive of Umbil's weekly clinical workflow newsletter: tips, product notes, and practice updates.",
  alternates: { canonical: "https://umbil.co.uk/blog/newsletter" },
  openGraph: {
    title: "Umbil weekly newsletter",
    description:
      "Archive of Umbil's weekly clinical workflow newsletter: tips, product notes, and practice updates.",
    url: "https://umbil.co.uk/blog/newsletter",
  },
};

export default async function BlogNewsletterPage() {
  const allPosts = await listPublishedPostPreviews();
  const newsletterPosts = allPosts.filter((post) => postHasTag(post, NEWSLETTER_TAG));
  const tags = uniquePostTags(allPosts);
  const [latestIssue, ...earlierIssues] = newsletterPosts;

  return (
    <section className="main-content">
      <div className="container">
        <BlogPageHeader
          title="Newsletter"
          description="Weekly notes for clinicians using Umbil, archived here so every issue is searchable and shareable."
        >
          <BlogSectionNav tags={tags} active={NEWSLETTER_TAG} />
        </BlogPageHeader>

        <BlogAdminToolbar />

        {latestIssue && (
          <BlogFeaturedPost post={latestIssue} kicker="Latest issue" callToAction="Read this issue" />
        )}

        {earlierIssues.length > 0 && (
          <section>
            <h2 className="mb-2 border-b border-[var(--umbil-divider)] pb-3 text-xl font-bold text-[var(--umbil-text)]">
              All issues
            </h2>
            <div className="pt-4">
              {earlierIssues.map((post) => (
                <BlogPostRow key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

        {newsletterPosts.length === 0 && (
          <p className="rounded-xl border border-[var(--umbil-divider)] p-6 text-[var(--umbil-muted)]">
            Newsletter issues will appear here once they are reviewed and published from the blog admin.
          </p>
        )}
      </div>
    </section>
  );
}
