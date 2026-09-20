'use server';
import { cookies as nextCookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { Resend } from "resend";
import { supabaseService } from "@/lib/supabaseService";
import { postSchema, type Post, normalizeTag } from "@/lib/content/postSchema";
import {
  draftsFromCandidates,
  fetchNewsletterCandidates,
  type ResendNewsletterClient,
} from "@/lib/content/resendNewsletterImport";

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
    .map((tag) => normalizeTag(tag))
    .filter(Boolean);
}

const COVER_MAX_BYTES = 5 * 1024 * 1024;
const COVER_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

async function uploadCoverImage(file: File, slug: string) {
  if (file.size > COVER_MAX_BYTES) {
    throw new Error("Cover image must be 5MB or smaller.");
  }

  const extension = COVER_MIME_TO_EXT[file.type];
  if (!extension) {
    throw new Error("Cover image must be a JPEG, PNG, WebP, or GIF.");
  }

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
    .select("id, title, slug, status, publish_date, updated_at, tags, source")
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
    source: string | null;
  }>;
}

export type ResendImportResult = {
  imported: number;
  skipped: number;
  found: number;
  error?: string;
};

export async function importResendNewsletters(): Promise<ResendImportResult> {
  const user = await requireAdminUser();
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { imported: 0, skipped: 0, found: 0, error: "RESEND_API_KEY is not configured." };
  }

  try {
    const resend = new Resend(apiKey) as unknown as ResendNewsletterClient;
    const candidates = await fetchNewsletterCandidates(resend);

    const { data: existing, error: existingError } = await supabaseService
      .from("posts")
      .select("slug, external_id");

    if (existingError) {
      throw existingError;
    }

    const existingSlugs = new Set(
      (existing ?? []).map((row) => String(row.slug ?? "")).filter(Boolean)
    );
    const existingExternalIds = new Set(
      (existing ?? [])
        .map((row) => row.external_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    );

    const { imported, skipped } = draftsFromCandidates(
      candidates,
      existingExternalIds,
      existingSlugs
    );

    if (imported.length > 0) {
      const now = new Date().toISOString();
      const { error: insertError } = await supabaseService.from("posts").insert(
        imported.map((draft) => ({
          title: draft.title,
          slug: draft.slug,
          excerpt: draft.excerpt,
          content: draft.content,
          status: draft.status,
          publish_date: draft.publish_date,
          tags: draft.tags,
          source: draft.source,
          external_id: draft.external_id,
          author_id: user.id,
          created_at: now,
          updated_at: now,
        }))
      );

      if (insertError) {
        throw insertError;
      }
    }

    return {
      imported: imported.length,
      skipped,
      found: candidates.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resend import failed.";
    return { imported: 0, skipped: 0, found: 0, error: message };
  }
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
