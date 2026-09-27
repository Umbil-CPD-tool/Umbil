"use client";

import Link from "next/link";
import { useUserEmail } from "@/hooks/useUserEmail";
import { ImportNewslettersButton } from "@/app/blog/admin/ImportNewslettersButton";

export const BlogAdminToolbar = () => {
  const { isAdmin, loading } = useUserEmail();

  if (loading || !isAdmin) {
    return null;
  }

  return (
    <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-start md:justify-end">
      <ImportNewslettersButton />
      <Link href="/blog/admin" className="btn btn--primary">
        Manage posts
      </Link>
    </div>
  );
};
