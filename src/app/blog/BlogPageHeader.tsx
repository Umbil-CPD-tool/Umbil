import type { ReactNode } from "react";

type BlogPageHeaderProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export const BlogPageHeader = ({ title, description, children }: BlogPageHeaderProps) => (
  <header className="mb-8 flex flex-col gap-4">
    <div>
      <h1 className="pb-3 text-4xl font-bold text-[var(--umbil-text)] md:text-5xl">{title}</h1>
      <p className="max-w-2xl text-lg leading-relaxed text-[var(--umbil-muted)]">{description}</p>
    </div>
    {children}
  </header>
);
