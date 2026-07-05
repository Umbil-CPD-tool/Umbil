import { z } from "zod";

export const postSchema = z.object({
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  excerpt: z.string().max(280),
  content: z.string(),
  status: z.enum(["draft", "published", "scheduled"]).default("draft"),
  publishDate: z.coerce.date().optional(),
  coverImageUrl: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
});

export type Post = z.infer<typeof postSchema>;
