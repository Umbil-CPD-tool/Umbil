import { notFound } from "next/navigation";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabaseService } from "@/lib/supabaseService";
import type { Metadata } from "next";

export const revalidate = 3600;

type PageProps = {
  params: {
    slug: string;
  };
};

async function getPost(slug: string) {
  const now = new Date().toISOString();
  const { data, error } = await supabaseService
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .or(`publish_date.is.null,publish_date.lte.${now}`)
    .single();

  if (error || !data) {
    return null;
  }
  return data as Record<string, any>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) {
    return {
      title: "Post not found",
      description: "This blog post is unavailable.",
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.cover_image_url ? [{ url: post.cover_image_url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.cover_image_url ? [post.cover_image_url] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const post = await getPost(params.slug);
  if (!post) {
    notFound();
  }

  return (
    <article className="main-content">
      <div className="container">
        {post.cover_image_url && (
          <div className="mb-8 rounded-3xl overflow-hidden border border-slate-200">
            <img src={post.cover_image_url} alt={post.title} className="w-full object-cover h-72" />
          </div>
        )}

        <div className="mb-6 space-y-3">
          <div className="text-sm text-slate-500">
            {post.publish_date ? format(new Date(post.publish_date), "PPP") : "Unpublished"}
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{post.title}</h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">{post.excerpt}</p>
          <div className="flex flex-wrap gap-2">
            {post.tags?.map((tag: string) => (
              <span key={tag} className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="prose max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>
      </div>
    </article>
  );
}
