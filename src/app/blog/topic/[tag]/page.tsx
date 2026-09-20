import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BlogPostCard } from "@/app/blog/BlogPostCard";
import { BlogSectionNav } from "@/app/blog/BlogSectionNav";
import {
  NEWSLETTER_TAG,
  listPublishedPosts,
  normalizeTag,
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

  const [topicPosts, allPosts] = await Promise.all([
    listPublishedPosts(normalized),
    listPublishedPosts(),
  ]);
  const tags = uniquePostTags(allPosts);
  const label = topicLabel(normalized);

  return (
    <section className="main-content">
      <div className="container">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between" style={{ marginBottom: 24 }}>
          <div>
            <h1 className="pb-4 text-5xl font-bold">{label}</h1>
            <p className="text-slate-500">Articles tagged {label.toLowerCase()} from the Umbil blog.</p>
          </div>
          <BlogSectionNav tags={tags} active={normalized} />
        </div>

        <hr className="p-2 text-zinc-200"></hr>

        <div className="grid gap-6 md:grid-cols-2">
          {topicPosts.map((post) => (
            <BlogPostCard key={post.id} post={post} />
          ))}
        </div>

        {topicPosts.length === 0 && (
          <div className="card">
            <div className="card__body">
              <p className="text-slate-600">No published posts in this topic yet.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
