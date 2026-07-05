"use client";

import { useEffect, useMemo, useState } from "react";
import { type Post } from "@/lib/content/postSchema";

type AdminPostFormProps = {
  action: (formData: FormData) => Promise<void>;
  initialPost?: Record<string, any>;
  mode: "new" | "edit";
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");

export function PostForm({ action, initialPost, mode }: AdminPostFormProps) {
  const [title, setTitle] = useState(initialPost?.title ?? "");
  const [slug, setSlug] = useState(initialPost?.slug ?? "");
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt ?? "");
  const [content, setContent] = useState(initialPost?.content ?? "");
  const [status, setStatus] = useState(initialPost?.status ?? "draft");
  const [publishDate, setPublishDate] = useState(
    initialPost?.publish_date ? initialPost.publish_date.slice(0, 16) : ""
  );
  const [tags, setTags] = useState((initialPost?.tags ?? []).join(", "));
  const [coverImageUrl, setCoverImageUrl] = useState(initialPost?.cover_image_url ?? "");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(title));
    }
  }, [title, slugTouched]);

  const tagPreview = useMemo<string[]>(() => {
    return tags
      .split(",")
      .map((tag: string) => tag.trim())
      .filter(Boolean)
      .slice(0, 6);
  }, [tags]);

  const submitLabel = mode === "new" ? "Create post" : "Save changes";

  return (
    <form action={action} method="post" encType="multipart/form-data" className="space-y-6">
      {mode === "edit" && initialPost?.id && (
        <input type="hidden" name="id" value={initialPost.id} />
      )}
      <input type="hidden" name="coverImageUrl" value={coverImageUrl} />

      <div className="form-group">
        <label className="form-label">Title</label>
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="form-control"
          placeholder="Post title"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Slug</label>
        <input
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          className="form-control"
          placeholder="post-title-example"
          required
        />
        <p className="text-sm text-slate-500 mt-2">
          Lowercase letters, numbers, and hyphens only.
        </p>
      </div>

      <div className="form-group">
        <label className="form-label">Excerpt</label>
        <textarea
          name="excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          className="form-control"
          placeholder="Short summary for list and SEO"
          rows={3}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Content</label>
        <textarea
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="form-control"
          placeholder="Write Markdown here. This can later be swapped for a WYSIWYG/MDX editor without changing the schema."
          rows={12}
          required
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="form-group">
          <label className="form-label">Status</label>
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="form-control"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Publish date</label>
          <input
            name="publishDate"
            type="datetime-local"
            value={publishDate}
            onChange={(e) => setPublishDate(e.target.value)}
            className="form-control"
          />
          {status === "scheduled" && (
            <p className="text-sm text-slate-500 mt-2">
              Scheduled posts require a future publish date.
            </p>
          )}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Tags</label>
        <input
          name="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="form-control"
          placeholder="newsletter, announcement, product"
        />
        {tagPreview.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {tagPreview.map((tag: string) => (
              <span
                key={tag}
                className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Cover image</label>
        <input
          name="coverImage"
          type="file"
          accept="image/*"
          onChange={(e) => setCoverImageFile(e.target.files?.[0] ?? null)}
          className="form-control"
        />
        {coverImageUrl && !coverImageFile && (
          <div className="mt-3 rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-700">Current cover image</p>
            <img
              src={coverImageUrl}
              alt="Current cover"
              className="mt-2 w-full max-w-lg rounded-xl object-cover"
            />
          </div>
        )}
      </div>

      <button type="submit" className="btn btn--primary">
        {submitLabel}
      </button>
    </form>
  );
}
