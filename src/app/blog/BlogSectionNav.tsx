import Link from "next/link";
import { NEWSLETTER_TAG } from "@/lib/content/postSchema";

type BlogSectionNavProps = {
  tags: string[];
  active?: string;
};

export const BlogSectionNav = ({ tags, active }: BlogSectionNavProps) => {
  const otherTags = tags.filter((tag) => tag !== NEWSLETTER_TAG);
  const chipClass = (isActive: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? "border-[var(--umbil-brand-teal)] bg-[var(--umbil-hover-bg)] text-[var(--umbil-brand-teal)]"
        : "blog-link-muted border-[var(--umbil-divider)] hover:border-[var(--umbil-brand-teal)]"
    }`;

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Blog sections">
      <Link href="/blog" className={chipClass(!active)} aria-current={!active ? "page" : undefined}>
        All posts
      </Link>
      <Link
        href="/blog/newsletter"
        className={chipClass(active === NEWSLETTER_TAG)}
        aria-current={active === NEWSLETTER_TAG ? "page" : undefined}
      >
        Newsletter
      </Link>
      {otherTags.map((tag) => (
        <Link
          key={tag}
          href={`/blog/topic/${encodeURIComponent(tag)}`}
          className={chipClass(active === tag)}
          aria-current={active === tag ? "page" : undefined}
        >
          {tag}
        </Link>
      ))}
    </nav>
  );
};
