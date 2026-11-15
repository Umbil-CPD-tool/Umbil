import { supabaseService } from "@/lib/supabaseService";
import {
  tidyDisplayName,
  type ConversionFunnelReport,
  type EngagementAskModeRow,
  type EngagementAskModeWeekRow,
  type EngagementPayload,
  type GrowthFunnel,
  type LifetimeTotals,
} from "./types";

const EMPTY_ASK_MODES: EngagementAskModeRow[] = [
  {
    style: "clinic",
    label: "Clinic",
    questions_7d: 0,
    questions_prev_7d: 0,
    questions_30d: 0,
    users_7d: 0,
    users_30d: 0,
    questions_all: 0,
    users_all: 0,
  },
  {
    style: "standard",
    label: "Standard",
    questions_7d: 0,
    questions_prev_7d: 0,
    questions_30d: 0,
    users_7d: 0,
    users_30d: 0,
    questions_all: 0,
    users_all: 0,
  },
  {
    style: "deepDive",
    label: "Deep Dive",
    questions_7d: 0,
    questions_prev_7d: 0,
    questions_30d: 0,
    users_7d: 0,
    users_30d: 0,
    questions_all: 0,
    users_all: 0,
  },
];

type AskModeStats = {
  modes?: EngagementAskModeRow[];
  weekly?: EngagementAskModeWeekRow[];
};

const parseConversion = (data: unknown): ConversionFunnelReport | null => {
  if (!data) return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as ConversionFunnelReport;
    } catch {
      return null;
    }
  }
  return data as ConversionFunnelReport;
};

export const loadConversionFunnel = async (): Promise<ConversionFunnelReport | null> => {
  const conversion = await supabaseService.rpc("analytics_conversion_funnel");
  if (conversion.error) {
    console.error("Could not load conversion funnel:", conversion.error.message);
    return null;
  }
  return parseConversion(conversion.data);
};

export const fetchEngagementPayload = async (): Promise<EngagementPayload> => {
  const [engagement, growth, lifetime, askModes, conversion] = await Promise.all([
    supabaseService.rpc("analytics_engagement_payload"),
    supabaseService.rpc("analytics_growth_funnel"),
    supabaseService.rpc("analytics_lifetime_totals"),
    supabaseService.rpc("analytics_ask_mode_stats"),
    loadConversionFunnel(),
  ]);

  if (engagement.error || !engagement.data) {
    throw new Error(engagement.error?.message || "Could not load engagement payload");
  }
  if (growth.error || !growth.data) {
    throw new Error(growth.error?.message || "Could not load growth funnel");
  }
  if (lifetime.error || !lifetime.data) {
    throw new Error(lifetime.error?.message || "Could not load lifetime totals");
  }

  const payload = engagement.data as Omit<
    EngagementPayload,
    "growth" | "lifetime" | "ask_modes" | "ask_mode_weekly" | "ask_modes_ready"
  >;
  const funnel = growth.data as GrowthFunnel;
  const totals = lifetime.data as LifetimeTotals;
  let modeStats: AskModeStats | null = null;
  if (askModes.error) {
    console.error("Could not load ask mode stats:", askModes.error.message);
  } else if (typeof askModes.data === "string") {
    try {
      modeStats = JSON.parse(askModes.data) as AskModeStats;
    } catch {
      modeStats = null;
    }
  } else {
    modeStats = askModes.data as AskModeStats | null;
  }
  return {
    ...payload,
    top_users: (payload.top_users ?? []).map((user) => ({
      ...user,
      first_name: tidyDisplayName(user.first_name),
    })),
    ask_modes: modeStats?.modes?.length ? modeStats.modes : EMPTY_ASK_MODES,
    ask_mode_weekly: modeStats?.weekly ?? [],
    ask_modes_ready: !askModes.error && Boolean(modeStats?.modes?.length),
    growth: {
      funnel: funnel.funnel,
      heavy_by_grade: funnel.heavy_by_grade ?? [],
      heavy_tools: funnel.heavy_tools ?? [],
      acquisition: funnel.acquisition ?? [],
    },
    lifetime: {
      ...totals,
      tools: totals.tools ?? [],
      grades: totals.grades ?? [],
    },
    conversion,
  };
};
