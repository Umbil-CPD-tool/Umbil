import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAdminUser, getSessionUser } from "@/lib/engagement/requireAdmin";

export const dynamic = "force-dynamic";

const AdminLayout = async ({ children }: { children: ReactNode }) => {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth?next=/admin/engagement");
  }

  const admin = await getAdminUser();
  if (!admin) {
    redirect("/dashboard");
  }

  return <>{children}</>;
};

export default AdminLayout;
