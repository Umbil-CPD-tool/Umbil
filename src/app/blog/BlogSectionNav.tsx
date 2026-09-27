import Link from "next/link";
import { NEWSLETTER_TAG } from "@/lib/content/postSchema";

type BlogSectionNavProps = {
  tags: string[];
  active?: string;
};

export const BlogSectionNav = ({ tags, active }: BlogSectionNavProps) => {
  const otherTags = tags.filter((tag) => tag !== NEWSLETTER_TAG);
  const chipClass = (isActive: boolean) =>
    `rounded-full border px-3 py-2 text-sm ${
      isActive
        ? "border-teal-500 bg-teal-50 text-teal-800"
        : "border-slate-300 text-slate-700 hover:border-teal-300"
    }`;

  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/blog" className={chipClass(!active)}>
        All posts
      </Link>
      <Link href="/blog/newsletter" className={chipClass(active === NEWSLETTER_TAG)}>
        Newsletter
      </Link>
      {otherTags.map((tag) => (
        <Link
          key={tag}
          href={`/blog/topic/${encodeURIComponent(tag)}`}
          className={chipClass(active === tag)}
        >
          {tag}
        </Link>
      ))}
    </div>
  );
};
