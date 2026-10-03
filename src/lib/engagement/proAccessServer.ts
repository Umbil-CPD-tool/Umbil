import { supabaseService } from "@/lib/supabaseService";
import type { ProProfile } from "@/lib/engagement/proAccess";

export const fetchProProfiles = async (): Promise<ProProfile[]> => {
  const { data, error } = await supabaseService
    .from("profiles")
    .select("is_pro, subscription_status")
    .eq("is_pro", true)
    .limit(1000);

  if (error) throw new Error(error.message);
  return (data ?? []) as ProProfile[];
};
