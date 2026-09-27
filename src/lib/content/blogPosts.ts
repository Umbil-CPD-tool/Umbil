import { supabaseService } from "@/lib/supabaseService";
import { NEWSLETTER_TAG, normalizeTag } from "@/lib/content/postSchema";

export type PublicPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  publish_date: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
};

const PUBLIC_POST_COLUMNS =
  "id, title, slug, excerpt, publish_date, cover_image_url, tags";

export { NEWSLETTER_TAG, normalizeTag };

export function postHasTag(post: { tags?: string[] | null }, tag: string) {
  const wanted = normalizeTag(tag);
  return (post.tags ?? []).some((value) => normalizeTag(value) === wanted);
}

export function uniquePostTags(posts: Array<{ tags?: string[] | null }>) {
  const tags = new Set<string>();
  for (const post of posts) {
    for (const tag of post.tags ?? []) {
      const normalized = normalizeTag(tag);
      if (normalized) tags.add(normalized);
    }
  }
  return [...tags].sort();
}

function publishedQuery() {
  return supabaseService
    .from("posts")
    .select(PUBLIC_POST_COLUMNS)
    .eq("status", "published")
    .lte("publish_date", new Date().toISOString())
    .order("publish_date", { ascending: false });
}

export async function listPublishedPosts(tag?: string) {
  const { data, error } = await publishedQuery();
  if (error) {
    console.error("Failed to list published posts", error);
    return [];
  }

  const posts = (Array.isArray(data) ? data : []) as PublicPost[];
  if (!tag) return posts;
  return posts.filter((post) => postHasTag(post, tag));
}

export async function listPublishedPostSlugs() {
  const { data, error } = await supabaseService
    .from("posts")
    .select("slug, tags, updated_at, publish_date")
    .eq("status", "published")
    .lte("publish_date", new Date().toISOString())
    .order("publish_date", { ascending: false });

  if (error) {
    console.error("Failed to list published post slugs", error);
    return [];
  }

  return (Array.isArray(data) ? data : []) as Array<{
    slug: string;
    tags: string[] | null;
    updated_at: string | null;
    publish_date: string | null;
  }>;
}
