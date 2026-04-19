// src/hooks/useUser.ts
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useUserEmail() {
  const [email, setEmail] = useState<string | null>(null);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true; 

    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', userId)
        .single();
      
      if (isMounted) {
        setIsPro(data?.subscription_status === 'active');
      }
    };

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (isMounted) {
        setEmail(data.user?.email ?? null);
        if (data.user) {
          await fetchProfile(data.user.id);
        } else {
          setIsPro(false);
        }
        setLoading(false);
      }
    };
    
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted) {
        setEmail(session?.user?.email ?? null);
        if (session?.user) {
          fetchProfile(session.user.id).then(() => {
            if(isMounted) setLoading(false);
          });
        } else {
          setIsPro(false);
          setLoading(false); 
        }
      }
    });

    init();

    return () => {
      isMounted = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  // We keep the hook named useUserEmail to not break your existing app imports,
  // but we now return `isPro` as well so any component can destruct it.
  return { email, isPro, loading };
}