'use server';
import { cookies as nextCookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { supabaseService } from "@/lib/supabaseService";
import { postSchema, type Post } from "@/lib/content/postSchema";

const STORAGE_BUCKET = "post-covers";
const STORAGE_FOLDER = "covers";

function serverSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          const requestCookies = await nextCookies();
          return requestCookies.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
      },
    }
  );
}

async function requireAdminUser() {
  const supabase = serverSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    throw new Error("Unauthorized");
  }
  return user;
}

function normalizeTags(value: FormDataEntryValue | null) {
  if (!value) return [] as string[];
  const raw = String(value);
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function uploadCoverImage(file: File, slug: string) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${STORAGE_FOLDER}/${slug}-${Date.now()}.${extension}`;

  const { data: uploadData, error: uploadError } = await supabaseService.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: true });

  if (uploadError || !uploadData) {
    throw uploadError ?? new Error("Cover image upload failed");
  }

  const { data: publicData } = supabaseService.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(uploadData.path);

  if (!publicData?.publicUrl) {
    throw new Error("Unable to generate public image URL");
  }

  return publicData.publicUrl;
}

export async function listPosts() {
  await requireAdminUser();
  const { data, error } = await supabaseService
    .from("posts")
    .select("id, title, slug, status, publish_date, updated_at, tags")
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    publish_date: string | null;
    updated_at: string | null;
    tags: string[] | null;
  }>;
}

export async function getPostById(id: string) {
  await requireAdminUser();

  const { data, error } = await supabaseService
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }
  return data as Record<string, any> | null;
}

export async function getPublishedPostBySlug(slug: string) {
  const { data, error } = await supabaseService
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .lte("publish_date", new Date().toISOString())
    .single();

  if (error) {
    return null;
  }
  return data as Record<string, any> | null;
}

export async function savePost(formData: FormData) {
  const user = await requireAdminUser();
  const id = formData.get("id")?.toString();
  const coverImageFile = formData.get("coverImage");

  const rawData = {
    title: formData.get("title")?.toString() ?? "",
    slug: formData.get("slug")?.toString() ?? "",
    excerpt: formData.get("excerpt")?.toString() ?? "",
    content: formData.get("content")?.toString() ?? "",
    status: formData.get("status")?.toString() ?? "draft",
    publishDate: formData.get("publishDate")?.toString() || undefined,
    coverImageUrl: formData.get("coverImageUrl")?.toString() || undefined,
    tags: normalizeTags(formData.get("tags")),
  };

  const parsed = postSchema.safeParse(rawData);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join("; "));
  }

  const postData = parsed.data as Post & { coverImageUrl?: string };

  if (postData.status === "scheduled" && !postData.publishDate) {
    throw new Error("Scheduled posts require a publish date.");
  }

  if (coverImageFile instanceof File && coverImageFile.size > 0) {
    postData.coverImageUrl = await uploadCoverImage(coverImageFile, postData.slug);
  }

  const payload: Record<string, any> = {
    title: postData.title,
    slug: postData.slug,
    excerpt: postData.excerpt,
    content: postData.content,
    status: postData.status,
    publish_date: postData.publishDate ? new Date(postData.publishDate).toISOString() : null,
    cover_image_url: postData.coverImageUrl ?? null,
    tags: postData.tags,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data: existingPost, error: findError } = await supabaseService
      .from("posts")
      .select("*")
      .eq("id", id)
      .single();

    if (findError || !existingPost) {
      throw findError ?? new Error("Post not found.");
    }

    await supabaseService.from("post_revisions").insert({
      post_id: id,
      content_snapshot: existingPost,
      edited_by: user.id,
    });

    const { error } = await supabaseService
      .from("posts")
      .update(payload)
      .eq("id", id);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabaseService.from("posts").insert({
      ...payload,
      author_id: user.id,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }
  }

  redirect("/blog/admin");
}

export async function deletePost(id: string) {
  await requireAdminUser();
  const { error: softError } = await supabaseService
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (softError) {
    const { error: hardError } = await supabaseService.from("posts").delete().eq("id", id);
    if (hardError) {
      throw hardError;
    }
  }

  redirect("/blog/admin");
}
