"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type SessionState = {
  email: string | null;
  isPro: boolean;
  isAdmin: boolean;
  loading: boolean;
};

const SessionContext = createContext<SessionState | null>(null);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [email, setEmail] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let profileRequest = 0;

    const applyUser = (user: User | null) => {
      if (!mounted) return;
      setEmail(user?.email ?? null);
      if (!user) {
        profileRequest += 1;
        setIsPro(false);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const requestId = ++profileRequest;
      void supabase
        .from("profiles")
        .select("is_pro, is_admin")
        .eq("id", user.id)
        .single()
        .then(({ data, error }) => {
          if (!mounted || requestId !== profileRequest) return;
          if (error) console.error("Error fetching profile:", error);
          setIsPro(!!data?.is_pro);
          setIsAdmin(!!data?.is_admin);
          setLoading(false);
        });
    };

    const syncFromAuth = () => {
      void supabase.auth.getUser().then(({ data }) => {
        if (mounted) applyUser(data.user ?? null);
      });
    };

    syncFromAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
      applyUser(session?.user ?? null);
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") syncFromAuth();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const value = useMemo(
    () => ({ email, isPro, isAdmin, loading }),
    [email, isPro, isAdmin, loading]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export function useUserEmail() {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useUserEmail must be used within SessionProvider");
  }
  return session;
}
