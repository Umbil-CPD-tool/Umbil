# Blog Feature Documentation

## Overview
This feature adds a blog system to the app with:
- public blog listing (`/blog`)
- blog post detail pages (`/blog/[slug]`)
- admin post management (`/blog/admin`, `/blog/admin/new`, `/blog/admin/[id]/edit`)
- Supabase-backed storage for cover images
- validation via Zod
- admin access gating using `profiles.is_admin`

## Routes

### Public
- `/blog`
  - Lists published posts.
  - Supports optional tag filtering using `searchParams.tag`.
- `/blog/[slug]`
  - Shows a single published blog post by slug.
  - Uses `generateMetadata()` to create SEO metadata from the post.

### Admin
- `/blog/admin`
  - Admin dashboard for blog post management.
  - Lists posts with status, publish date, and tags.
- `/blog/admin/new`
  - New post creation page.
  - Uses `PostForm` for input fields and file upload.
- `/blog/admin/[id]/edit`
  - Edit page for an existing post.
  - Loads post data and lets the admin update or delete posts.

## Implementation Details

### Validation
- Shared schema located at `src/lib/content/postSchema.ts`
- Uses Zod to enforce:
  - `title` non-empty
  - `slug` matches lowercase letters, numbers, and hyphens
  - `excerpt` max 280 characters
  - `content` required
  - `status` one of `draft`, `published`, or `scheduled`
  - `publishDate` optional date
  - `coverImageUrl` optional URL
  - `tags` array of strings

### Admin auth and access guard
- `src/app/blog/admin/layout.tsx`
  - Uses `createServerClient()` from `@supabase/ssr`
  - Reads cookies via `next/headers`
  - Validates that current user is authenticated and has `profiles.is_admin = true`
  - Redirects non-admin users to `/dashboard` or `/auth?next=/blog/admin`

### Server actions and Supabase integration
- `src/app/blog/admin/actions.ts`
- `requireAdminUser()`
  - Creates a Supabase server client using request cookies.
  - Calls `supabase.auth.getUser()` and reads `profiles.is_admin`.
- `listPosts()`
  - Returns posts for the admin dashboard.
- `getPostById(id)`
  - Loads a single post for editing.
- `getPublishedPostBySlug(slug)`
  - Loads a published post for the public detail page.
- `savePost(formData)`
  - Handles both create and update flows.
  - Validates `formData` against the Zod schema.
  - Uploads cover images to Supabase storage.
  - Writes or updates the `posts` table.
  - Inserts a revision record into `post_revisions` when editing.
  - Redirects back to `/blog/admin` on success.
- `deletePost(id)`
  - First attempts a soft delete by setting `deleted_at`.
  - If the DB schema does not support `deleted_at`, falls back to hard delete.

### Cover image upload
- `uploadCoverImage(file, slug)` in `actions.ts`
- Stores images in the Supabase storage bucket `post-covers`
- Uses folder prefix `covers`
- Generates a public URL using `getPublicUrl()`
- Returns the URL to store in `cover_image_url`

### UI components
- `src/app/blog/admin/PostForm.tsx`
  - Client component (`"use client"`)
  - Handles form fields for title, slug, excerpt, content, status, publish date, tags, and cover image
  - Auto-generates slug from title until the slug input is edited
  - Displays tag preview chips
- `src/app/blog/admin/DeletePostButton.tsx`
  - Client component that confirms deletion and calls the delete action

## Public blog listing
- `src/app/blog/page.tsx`
- Queries published posts from Supabase using `supabaseService`
- Filters by tag when `searchParams.tag` is present
- Uses `format()` from `date-fns` for publish dates
- Renders cover image, title, excerpt, and tags

## Blog post detail
- `src/app/blog/[slug]/page.tsx`
- Queries a single published post by slug
- Renders Markdown using `react-markdown` and `remark-gfm`
- Generates page metadata from the post title, excerpt, and cover image

## Supabase clients
- `src/lib/supabaseService.ts`
  - Admin Supabase client using `SUPABASE_SERVICE_KEY`
  - Used for server-side reads and writes
- `@supabase/ssr`
  - Used in admin server actions and layout to access auth state from cookies

## Dependencies introduced
- `zod`
  - For blog post validation
- `react-markdown`
  - For rendering blog content Markdown
- `remark-gfm`
  - For GitHub-flavored Markdown support
- `date-fns`
  - For formatting publish dates in the UI
- `@supabase/ssr`
  - For server-side Supabase auth in Next.js App Router

## Notes
- The admin layout gate is server-side and forces dynamic rendering with `export const dynamic = "force-dynamic"`.
- The public blog listing awaits `searchParams` before using it to satisfy Next.js App Router async dynamic API requirements.
- The feature uses `supabaseService` for most DB operations rather than a browser client.
- `blog-docs.md` is intentionally stored in `src/app/blog/` for easy discoverability by developers working in the blog folder.
