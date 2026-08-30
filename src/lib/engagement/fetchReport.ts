import { supabaseService } from "@/lib/supabaseService";
import { tidyDisplayName, type EngagementPayload, type GrowthFunnel } from "./types";

export const fetchEngagementPayload = async (): Promise<EngagementPayload> => {
  const [engagement, growth] = await Promise.all([
    supabaseService.rpc("analytics_engagement_payload"),
    supabaseService.rpc("analytics_growth_funnel"),
  ]);

  if (engagement.error || !engagement.data) {
    throw new Error(engagement.error?.message || "Could not load engagement payload");
  }
  if (growth.error || !growth.data) {
    throw new Error(growth.error?.message || "Could not load growth funnel");
  }

  const payload = engagement.data as Omit<EngagementPayload, "growth">;
  const funnel = growth.data as GrowthFunnel;
  return {
    ...payload,
    top_users: (payload.top_users ?? []).map((user) => ({
      ...user,
      first_name: tidyDisplayName(user.first_name),
    })),
    growth: {
      funnel: funnel.funnel,
      heavy_by_grade: funnel.heavy_by_grade ?? [],
      heavy_tools: funnel.heavy_tools ?? [],
      acquisition: funnel.acquisition ?? [],
    },
  };
};
