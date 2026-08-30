export type EngagementToolRow = {
  tool_id: string;
  tool_name: string;
  uses_7d: number;
  uses_30d: number;
  users_7d: number;
};

export type EngagementGradeRow = {
  grade: string;
  active_30d: number;
  questions_30d: number;
};

export type EngagementWeekRow = {
  week: string;
  wau?: number;
  questions: number;
  tools?: number;
  learning?: number;
};

export type EngagementMonthRow = {
  month: string;
  mau: number;
  avg_wau: number;
  wau_mau_pct: number;
  questions: number;
};

export type EngagementRetentionRow = {
  cohort_month: string;
  cohort_size: number;
  month_1_pct: number | null;
  month_2_pct: number | null;
  month_3_pct: number | null;
};

export type EngagementTopUser = {
  first_name: string;
  grade: string;
  questions: number;
  tools: number;
  learning: number;
};

export type GrowthFunnelCounts = {
  signups: number;
  never_asked: number;
  ever_asked: number;
  asked_within_1d: number;
  asked_within_7d: number;
  reached_5: number;
  reached_50: number;
  reached_100: number;
  pro_flagged: number;
  stripe_active: number;
  heavy_and_pro: number;
  heavy_and_stripe: number;
};

export type HeavyUserGradeRow = {
  grade: string;
  users: number;
  avg_questions: number;
  avg_weeks_active: number;
  pro_flagged: number;
  stripe_active: number;
};

export type HeavyUserToolRow = {
  tool_name: string;
  uses: number;
  heavy_users: number;
};

export type AcquisitionRow = {
  source: string;
  signups: number;
  ever_asked: number;
  reached_5: number;
};

export type GrowthFunnel = {
  funnel: GrowthFunnelCounts;
  heavy_by_grade: HeavyUserGradeRow[];
  heavy_tools: HeavyUserToolRow[];
  acquisition: AcquisitionRow[];
};

export type LifetimeToolRow = {
  tool_name: string;
  uses: number;
  users: number;
};

export type LifetimeGradeRow = {
  grade: string;
  users: number;
  questions: number;
};

export type LifetimeTotals = {
  first_question_at: string | null;
  questions_logged_in: number;
  questions_anonymous: number;
  questions_total: number;
  users_ever_asked: number;
  signups: number;
  tools_total: number;
  tool_users: number;
  cpd_total: number;
  cpd_users: number;
  median_questions: number;
  mean_questions: number;
  asked_once: number;
  asked_5: number;
  asked_50: number;
  asked_100: number;
  top20_question_share_pct: number;
  tokens_all: number;
  estimated_usd_all: number;
  tools: LifetimeToolRow[];
  grades: LifetimeGradeRow[];
};

export type EngagementPayload = {
  generated_at: string;
  timezone: string;
  snapshot: {
    dau: number;
    weekday_dau: number;
    wau: number;
    wau_prev: number;
    mau: number;
    wau_mau_pct: number;
    questions_7d: number;
    questions_prev_7d: number;
    questions_30d: number;
    questions_logged_in: number;
    week1_retention_pct: number | null;
    week4_retention_pct: number | null;
    week8_retention_pct: number | null;
    week12_retention_pct: number | null;
  };
  activity: {
    tools_7d: number;
    tools_prev_7d: number;
    tools_30d: number;
    tool_users_7d: number;
    cpd_7d: number;
    cpd_prev_7d: number;
    cpd_30d: number;
    cpd_users_7d: number;
    signups_7d: number;
    signups_prev_7d: number;
    signups_30d: number;
    signups: number;
    ever_asked: number;
    pro_flagged: number;
    stripe_active: number;
  };
  costs: {
    tokens_7d: number;
    tokens_30d: number;
    estimated_usd_7d: number;
    estimated_usd_30d: number;
    note: string;
  };
  tools: EngagementToolRow[];
  grades: EngagementGradeRow[];
  wau_history: EngagementWeekRow[];
  mau_history: EngagementMonthRow[];
  weekly_activity: EngagementWeekRow[];
  retention_monthly: EngagementRetentionRow[];
  top_users: EngagementTopUser[];
  growth: GrowthFunnel;
  lifetime: LifetimeTotals;
};

export const changePct = (current: number, previous: number): number | null => {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

export const formatChange = (current: number, previous: number): string => {
  const pct = changePct(current, previous);
  if (pct === null) return "—";
  if (pct > 0) return `+${pct}%`;
  return `${pct}%`;
};

const TITLE_ONLY = /^(dr|doctor|mr|mrs|ms|miss|mx|prof|professor|sir)\.?$/i;

export const tidyDisplayName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed || /^member$/i.test(trimmed) || TITLE_ONLY.test(trimmed)) {
    return "Clinician";
  }
  return trimmed;
};
