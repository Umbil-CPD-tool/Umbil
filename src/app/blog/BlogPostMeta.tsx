import { format } from "date-fns";

type BlogPostMetaProps = {
  publishDate: string | null;
  readingMinutes: number;
};

export const BlogPostMeta = ({ publishDate, readingMinutes }: BlogPostMetaProps) => {
  const date = publishDate ? new Date(publishDate) : null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm text-[var(--umbil-muted)]">
      {date && <time dateTime={date.toISOString()}>{format(date, "d MMM yyyy")}</time>}
      {date && <span aria-hidden="true">·</span>}
      <span>{readingMinutes} min read</span>
    </p>
  );
};
