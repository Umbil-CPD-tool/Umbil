import Link from "next/link";
import type { PublicPostPreview } from "@/lib/content/blogPosts";
import { BlogPostMeta } from "@/app/blog/BlogPostMeta";

type BlogFeaturedPostProps = {
  post: PublicPostPreview;
  kicker: string;
  callToAction: string;
};

export const BlogFeaturedPost = ({ post, kicker, callToAction }: BlogFeaturedPostProps) => {
  const showHeadline = post.headline && post.headline.toLowerCase() !== post.title.toLowerCase();

  return (
    <article className="blog-featured mb-12">
      <Link
        href={`/blog/${post.slug}`}
        className={`group grid gap-6 rounded-2xl border border-[var(--umbil-divider)] bg-[var(--umbil-surface)] p-5 transition-shadow hover:shadow-[var(--umbil-shadow-lg)] md:p-6 ${
          post.coverImage ? "md:grid-cols-[1.1fr_1fr] md:items-center" : ""
        }`}
      >
        {post.coverImage && (
          <div className="overflow-hidden rounded-xl bg-[var(--umbil-hover-bg)]">
            <img
              src={post.coverImage.url}
              alt={post.coverImage.alt}
              className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
        )}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--umbil-brand-teal)]">{kicker}</p>
          <h2 className="text-2xl font-bold leading-tight text-[var(--umbil-text)] md:text-3xl">{post.title}</h2>
          {showHeadline && (
            <p className="font-semibold text-[var(--umbil-text)] opacity-80">In this issue: {post.headline}</p>
          )}
          <p className="text-base leading-relaxed text-[var(--umbil-muted)] md:text-lg">{post.teaser}</p>
          <BlogPostMeta publishDate={post.publish_date} readingMinutes={post.readingMinutes} />
          <span className="mt-1 font-semibold text-[var(--umbil-brand-teal)]">
            {callToAction} <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span>
          </span>
        </div>
      </Link>
    </article>
  );
};
