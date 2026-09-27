import Link from "next/link";
import { format } from "date-fns";
import type { PublicPost } from "@/lib/content/blogPosts";

type BlogPostCardProps = {
  post: PublicPost;
};

export const BlogPostCard = ({ post }: BlogPostCardProps) => {
  return (
    <article className="card">
      <div className="card__body">
        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="mb-4 rounded-xl object-cover w-full h-48"
          />
        )}
        <div className="mb-3 text-sm text-slate-500">
          {post.publish_date ? format(new Date(post.publish_date), "PPP") : "Unscheduled"}
        </div>
        <h2 className="mb-3 text-xl font-semibold text-slate-900 dark:text-slate-100">
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>
        <p className="text-zinc-700 dark:text-slate-300 mb-4">{post.excerpt}</p>
        <div className="flex flex-wrap gap-2">
          {post.tags?.map((tag) => (
            <Link
              key={tag}
              href={tag.toLowerCase() === "newsletter" ? "/blog/newsletter" : `/blog/topic/${encodeURIComponent(tag)}`}
              className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:border-teal-300 hover:text-teal-700"
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
};
