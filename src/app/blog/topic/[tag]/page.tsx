import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BlogPostRow } from "@/app/blog/BlogPostRow";
import { BlogPageHeader } from "@/app/blog/BlogPageHeader";
import { BlogSectionNav } from "@/app/blog/BlogSectionNav";
import { BlogAdminToolbar } from "@/app/blog/BlogAdminToolbar";
import {
  NEWSLETTER_TAG,
  listPublishedPostPreviews,
  normalizeTag,
  postHasTag,
  uniquePostTags,
} from "@/lib/content/blogPosts";

export const revalidate = 3600;

type TopicPageProps = {
  params: Promise<{
    tag: string;
  }>;
};

function topicLabel(tag: string) {
  return tag
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { tag } = await params;
  const normalized = normalizeTag(decodeURIComponent(tag));
  if (!normalized) {
    return { title: "Topic not found" };
  }
  const label = topicLabel(normalized);
  return {
    title: `${label} articles`,
    description: `Umbil writing on ${label.toLowerCase()} for clinicians.`,
    alternates: { canonical: `https://umbil.co.uk/blog/topic/${encodeURIComponent(normalized)}` },
  };
}

export default async function BlogTopicPage({ params }: TopicPageProps) {
  const { tag } = await params;
  const normalized = normalizeTag(decodeURIComponent(tag));
  if (!normalized) {
    notFound();
  }
  if (normalized === NEWSLETTER_TAG) {
    redirect("/blog/newsletter");
  }

  const allPosts = await listPublishedPostPreviews();
  const topicPosts = allPosts.filter((post) => postHasTag(post, normalized));
  const tags = uniquePostTags(allPosts);
  const label = topicLabel(normalized);

  return (
    <section className="main-content">
      <div className="container">
        <BlogPageHeader title={label} description={`Articles tagged ${label.toLowerCase()} from the Umbil blog.`}>
          <BlogSectionNav tags={tags} active={normalized} />
        </BlogPageHeader>

        <BlogAdminToolbar />

        <section>
          {topicPosts.map((post) => (
            <BlogPostRow key={post.id} post={post} headingLevel="h2" />
          ))}
        </section>

        {topicPosts.length === 0 && (
          <p className="rounded-xl border border-[var(--umbil-divider)] p-6 text-[var(--umbil-muted)]">
            No published posts in this topic yet.
          </p>
        )}
      </div>
    </section>
  );
}
