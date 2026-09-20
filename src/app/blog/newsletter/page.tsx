import type { Metadata } from "next";
import { BlogPostCard } from "@/app/blog/BlogPostCard";
import { BlogSectionNav } from "@/app/blog/BlogSectionNav";
import { NEWSLETTER_TAG, listPublishedPosts, uniquePostTags } from "@/lib/content/blogPosts";

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
  const [newsletterPosts, allPosts] = await Promise.all([
    listPublishedPosts(NEWSLETTER_TAG),
    listPublishedPosts(),
  ]);
  const tags = uniquePostTags(allPosts);

  return (
    <section className="main-content">
      <div className="container">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between" style={{ marginBottom: 24 }}>
          <div>
            <h1 className="pb-4 text-5xl font-bold">Newsletter</h1>
            <p className="text-slate-500">
              Weekly notes for clinicians using Umbil — archived here so every issue is searchable and shareable.
            </p>
          </div>
          <BlogSectionNav tags={tags} active={NEWSLETTER_TAG} />
        </div>

        <hr className="p-2 text-zinc-200"></hr>

        <div className="grid gap-6 md:grid-cols-2">
          {newsletterPosts.map((post) => (
            <BlogPostCard key={post.id} post={post} />
          ))}
        </div>

        {newsletterPosts.length === 0 && (
          <div className="card">
            <div className="card__body">
              <p className="text-slate-600">
                Newsletter issues will appear here once they are reviewed and published from the blog admin.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
