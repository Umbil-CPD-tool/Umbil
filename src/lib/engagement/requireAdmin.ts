import { cookies as nextCookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseService } from "@/lib/supabaseService";

export const getSessionUser = async () => {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

export const getAdminUser = async () => {
  const user = await getSessionUser();
  if (!user) return null;

  const { data: profile, error } = await supabaseService
    .from("profiles")
    .select("is_admin, email")
    .eq("id", user.id)
    .single();

  if (error || !profile?.is_admin) return null;
  return { id: user.id, email: profile.email ?? user.email ?? null };
};
