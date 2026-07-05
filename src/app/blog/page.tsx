import Link from "next/link";
import { format } from "date-fns";
import { supabaseService } from "@/lib/supabaseService";

export const revalidate = 3600;

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
  let query = supabaseService
    .from("posts")
    .select("id, title, slug, excerpt, publish_date, cover_image_url, tags")
    .eq("status", "published")
    .lte("publish_date", new Date().toISOString())
    .order("publish_date", { ascending: false });

  if (filterTag) {
    query = query.contains("tags", [filterTag]);
  }

  const { data: posts, error } = await query;
  const visiblePosts = Array.isArray(posts) ? posts : [];

  return (
    <section className="main-content">
      <div className="container">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between" style={{ marginBottom: 24 }}>
          <div>
            <h1>Blog</h1>
            <p className="text-slate-500">Latest announcements and editorial content from Umbil.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/blog" className="btn btn--outline">
              All posts
            </Link>
            {filterTag && (
              <span className="rounded-full border border-slate-300 px-3 py-2 text-sm text-slate-700">
                Filter: {filterTag}
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {visiblePosts.map((post) => (
            <article key={post.id} className="card">
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
                <p className="text-slate-600 dark:text-slate-300 mb-4">{post.excerpt}</p>
                <div className="flex flex-wrap gap-2">
                  {post.tags?.map((tag: string) => (
                    <span key={tag} className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

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
