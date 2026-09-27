import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAdminUser, getSessionUser } from "@/lib/engagement/requireAdmin";

export const dynamic = "force-dynamic";

export default async function BlogAdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth?next=/blog/admin");
  }

  const admin = await getAdminUser();
  if (!admin) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
