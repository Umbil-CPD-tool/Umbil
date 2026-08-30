import { supabaseService } from "@/lib/supabaseService";
import { tidyDisplayName, type EngagementPayload } from "./types";

export const fetchEngagementPayload = async (): Promise<EngagementPayload> => {
  const { data, error } = await supabaseService.rpc("analytics_engagement_payload");
  if (error || !data) {
    throw new Error(error?.message || "Could not load engagement payload");
  }

  const payload = data as EngagementPayload;
  return {
    ...payload,
    top_users: (payload.top_users ?? []).map((user) => ({
      ...user,
      first_name: tidyDisplayName(user.first_name),
    })),
  };
};
