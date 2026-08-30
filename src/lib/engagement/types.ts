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
