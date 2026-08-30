import { supabaseService } from "@/lib/supabaseService";
import type { EngagementPayload } from "./types";

export const fetchEngagementPayload = async (): Promise<EngagementPayload> => {
  const { data, error } = await supabaseService.rpc("analytics_engagement_payload");
  if (error || !data) {
    throw new Error(error?.message || "Could not load engagement payload");
  }
  return data as EngagementPayload;
};
