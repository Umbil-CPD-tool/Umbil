import Link from "next/link";
import { NEWSLETTER_TAG, normalizeTag, type PublicPostPreview } from "@/lib/content/blogPosts";
import { BlogPostMeta } from "@/app/blog/BlogPostMeta";

type BlogPostRowProps = {
  post: PublicPostPreview;
  headingLevel?: "h2" | "h3";
};

export const BlogPostRow = ({ post, headingLevel = "h3" }: BlogPostRowProps) => {
  const Heading = headingLevel;
  const href = `/blog/${post.slug}`;
  const topicTags = (post.tags ?? []).map(normalizeTag).filter((tag) => tag && tag !== NEWSLETTER_TAG);

  return (
    <article className="flex gap-4 border-b border-[var(--umbil-divider)] py-6 first:pt-0 last:border-b-0 md:gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <BlogPostMeta publishDate={post.publish_date} readingMinutes={post.readingMinutes} />
        <Heading className="text-lg font-bold leading-snug text-[var(--umbil-text)] md:text-xl">
          <Link href={href} className="blog-link">
            {post.title}
          </Link>
        </Heading>
        <p className="line-clamp-3 leading-relaxed text-[var(--umbil-muted)]">{post.teaser}</p>
        {topicTags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {topicTags.map((tag) => (
              <Link
                key={tag}
                href={`/blog/topic/${encodeURIComponent(tag)}`}
                className="blog-link-muted rounded-full border border-[var(--umbil-divider)] px-3 py-0.5 text-xs hover:border-[var(--umbil-brand-teal)]"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}
      </div>
      {post.coverImage && (
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden="true"
          className="h-20 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--umbil-hover-bg)] md:h-24 md:w-32"
        >
          <img src={post.coverImage.url} alt="" loading="lazy" className="h-full w-full object-cover" />
        </Link>
      )}
    </article>
  );
};
