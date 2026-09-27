"use client";

import { useEffect, useState } from "react";

type BlogShareButtonsProps = {
  url: string;
  title: string;
  label?: string;
};

const pillClass =
  "blog-link inline-flex cursor-pointer items-center rounded-full border border-[var(--umbil-divider)] bg-transparent px-3 py-1.5 text-sm font-medium hover:border-[var(--umbil-brand-teal)]";

export const BlogShareButtons = ({ url, title, label = "Share" }: BlogShareButtonsProps) => {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const shareLinks = [
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { name: "X", href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}` },
    { name: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` },
    { name: "Email", href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}` },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      return;
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
      <span className="mr-1 text-sm font-semibold text-[var(--umbil-muted)]">{label}</span>
      {canNativeShare && (
        <button type="button" onClick={handleNativeShare} className={pillClass}>
          Share…
        </button>
      )}
      {shareLinks.map((link) => (
        <a
          key={link.name}
          href={link.href}
          target={link.name === "Email" ? undefined : "_blank"}
          rel="noopener noreferrer"
          className={pillClass}
          aria-label={`Share on ${link.name}`}
        >
          {link.name}
        </a>
      ))}
      <button type="button" onClick={handleCopy} className={pillClass} aria-live="polite">
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
};
