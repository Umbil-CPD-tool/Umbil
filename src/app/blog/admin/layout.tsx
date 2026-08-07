import type { ReactNode } from "react";
import { cookies as nextCookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export default async function BlogAdminLayout({ children }: { children: ReactNode }) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          const requestCookies = await nextCookies();
          return requestCookies.getAll();
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth?next=/blog/admin");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (error || !profile?.is_admin) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
