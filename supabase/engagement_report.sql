-- Umbil engagement report
-- Apply once (SQL Editor → Run, or already applied on production).
-- Charts + extra stats: supabase/engagement_report_v2.sql
-- Monday automation emails /admin/engagement and /api/cron/engagement-report
--
-- Weekly / monthly in SQL Editor:
--   SELECT * FROM analytics_engagement_report();
--   SELECT analytics_engagement_payload();
--
-- Optional: save this week's headline numbers so you can compare later:
--   SELECT * FROM analytics_engagement_capture();
--   SELECT * FROM analytics_engagement_snapshots ORDER BY captured_at DESC;
--
-- Drill-down (CSV-friendly):
--   SELECT * FROM analytics_engagement_wau;
--   SELECT * FROM analytics_engagement_mau;
--   SELECT * FROM analytics_engagement_retention_weekly;
--   SELECT * FROM analytics_engagement_retention_monthly;
--   SELECT * FROM analytics_engagement_usage;
--
-- Active = logged-in user who asked a question (app_analytics.question_asked).
-- Do not use umbil_admin_dashboard — it reads empty tables.

CREATE OR REPLACE VIEW public.analytics_engagement_snapshot
WITH (security_invoker = true) AS
WITH asked AS (
  SELECT created_at, user_id
  FROM public.app_analytics
  WHERE event_type = 'question_asked'
    AND user_id IS NOT NULL
),
daily AS (
  SELECT
    created_at::date AS day,
    EXTRACT(ISODOW FROM created_at)::int AS dow,
    count(DISTINCT user_id) AS dau
  FROM asked
  WHERE created_at >= now() - interval '14 days'
  GROUP BY 1, 2
),
first_use AS (
  SELECT user_id, date_trunc('week', min(created_at))::date AS cohort_week
  FROM asked
  GROUP BY user_id
),
activity AS (
  SELECT DISTINCT user_id, date_trunc('week', created_at)::date AS activity_week
  FROM asked
),
cohort AS (
  SELECT
    f.cohort_week,
    count(DISTINCT f.user_id) AS cohort_size,
    count(DISTINCT f.user_id) FILTER (WHERE (a.activity_week - f.cohort_week) / 7 = 1) AS week_1,
    count(DISTINCT f.user_id) FILTER (WHERE (a.activity_week - f.cohort_week) / 7 = 4) AS week_4,
    count(DISTINCT f.user_id) FILTER (WHERE (a.activity_week - f.cohort_week) / 7 = 8) AS week_8,
    count(DISTINCT f.user_id) FILTER (WHERE (a.activity_week - f.cohort_week) / 7 = 12) AS week_12
  FROM first_use f
  JOIN activity a ON a.user_id = f.user_id
  GROUP BY f.cohort_week
),
this_week AS (
  SELECT date_trunc('week', now())::date AS week
),
retention AS (
  SELECT
    round(100.0 * sum(week_1) FILTER (WHERE cohort_week <= (SELECT week FROM this_week) - 14) /
      NULLIF(sum(cohort_size) FILTER (WHERE cohort_week <= (SELECT week FROM this_week) - 14), 0), 1) AS week1_pct,
    round(100.0 * sum(week_4) FILTER (WHERE cohort_week <= (SELECT week FROM this_week) - 35) /
      NULLIF(sum(cohort_size) FILTER (WHERE cohort_week <= (SELECT week FROM this_week) - 35), 0), 1) AS week4_pct,
    round(100.0 * sum(week_8) FILTER (WHERE cohort_week <= (SELECT week FROM this_week) - 63) /
      NULLIF(sum(cohort_size) FILTER (WHERE cohort_week <= (SELECT week FROM this_week) - 63), 0), 1) AS week8_pct,
    round(100.0 * sum(week_12) FILTER (WHERE cohort_week <= (SELECT week FROM this_week) - 91) /
      NULLIF(sum(cohort_size) FILTER (WHERE cohort_week <= (SELECT week FROM this_week) - 91), 0), 1) AS week12_pct
  FROM cohort
),
per_user AS (
  SELECT user_id, count(*) AS questions
  FROM asked
  GROUP BY user_id
),
ranked AS (
  SELECT
    questions,
    row_number() OVER (ORDER BY questions DESC) AS rn,
    count(*) OVER () AS n_users,
    sum(questions) OVER () AS total_q,
    sum(questions) OVER (ORDER BY questions DESC) AS cum_q
  FROM per_user
),
usage AS (
  SELECT
    count(*) AS asking_users,
    sum(questions) AS logged_in_questions,
    round(avg(questions), 1) AS mean_q,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY questions) AS median_q,
    count(*) FILTER (WHERE questions = 1) AS users_1,
    count(*) FILTER (WHERE questions BETWEEN 2 AND 5) AS users_2_5,
    count(*) FILTER (WHERE questions BETWEEN 6 AND 20) AS users_6_20,
    count(*) FILTER (WHERE questions BETWEEN 21 AND 50) AS users_21_50,
    count(*) FILTER (WHERE questions BETWEEN 51 AND 100) AS users_51_100,
    count(*) FILTER (WHERE questions > 100) AS users_100plus
  FROM per_user
),
concentration AS (
  SELECT
    round(100.0 * max(cum_q) FILTER (WHERE rn <= greatest(1, ceil(n_users * 0.05))) / max(total_q), 1) AS top5_share_pct,
    round(100.0 * max(cum_q) FILTER (WHERE rn <= greatest(1, ceil(n_users * 0.20))) / max(total_q), 1) AS top20_share_pct
  FROM ranked
)
SELECT
  now() AS generated_at,
  (SELECT count(DISTINCT user_id) FROM asked WHERE created_at >= now() - interval '1 day') AS dau,
  (SELECT round(avg(dau), 1) FROM daily WHERE dow < 6) AS weekday_dau,
  (SELECT count(DISTINCT user_id) FROM asked WHERE created_at >= now() - interval '7 days') AS wau,
  (SELECT count(DISTINCT user_id) FROM asked WHERE created_at >= now() - interval '30 days') AS mau,
  round(
    100.0
    * (SELECT count(DISTINCT user_id) FROM asked WHERE created_at >= now() - interval '7 days')
    / NULLIF((SELECT count(DISTINCT user_id) FROM asked WHERE created_at >= now() - interval '30 days'), 0)
  , 1) AS wau_mau_pct,
  (SELECT count(*) FROM asked WHERE created_at >= now() - interval '7 days') AS questions_7d,
  (SELECT count(*) FROM asked WHERE created_at >= now() - interval '30 days') AS questions_30d,
  (SELECT count(*) FROM asked) AS questions_logged_in,
  (SELECT count(*) FROM public.app_analytics WHERE event_type = 'question_asked') AS questions_all,
  (SELECT count(*) FROM public.profiles) AS signups,
  (SELECT count(*) FROM per_user) AS ever_asked,
  (SELECT count(*) FROM public.profiles WHERE is_pro) AS pro_flagged,
  (SELECT count(*) FROM public.profiles WHERE subscription_status = 'active') AS stripe_active,
  (SELECT week1_pct FROM retention) AS week1_retention_pct,
  (SELECT week4_pct FROM retention) AS week4_retention_pct,
  (SELECT week8_pct FROM retention) AS week8_retention_pct,
  (SELECT week12_pct FROM retention) AS week12_retention_pct,
  (SELECT asking_users FROM usage) AS asking_users,
  (SELECT mean_q FROM usage) AS mean_questions,
  (SELECT median_q FROM usage) AS median_questions,
  (SELECT users_1 FROM usage) AS users_1,
  (SELECT users_2_5 FROM usage) AS users_2_5,
  (SELECT users_6_20 FROM usage) AS users_6_20,
  (SELECT users_21_50 FROM usage) AS users_21_50,
  (SELECT users_51_100 FROM usage) AS users_51_100,
  (SELECT users_100plus FROM usage) AS users_100plus,
  (SELECT top5_share_pct FROM concentration) AS top5_share_pct,
  (SELECT top20_share_pct FROM concentration) AS top20_share_pct;

COMMENT ON VIEW public.analytics_engagement_snapshot IS
  'One-row headline engagement metrics. Active = logged-in question_asked.';

CREATE OR REPLACE VIEW public.analytics_engagement_wau
WITH (security_invoker = true) AS
SELECT
  date_trunc('week', created_at)::date AS week,
  count(DISTINCT user_id) AS wau,
  count(*) AS questions
FROM public.app_analytics
WHERE event_type = 'question_asked'
  AND user_id IS NOT NULL
GROUP BY 1
ORDER BY 1 DESC;

COMMENT ON VIEW public.analytics_engagement_wau IS
  'Weekly active logged-in users (asked a question) and question volume.';

CREATE OR REPLACE VIEW public.analytics_engagement_mau
WITH (security_invoker = true) AS
WITH monthly AS (
  SELECT
    date_trunc('month', created_at)::date AS month,
    count(DISTINCT user_id) AS mau,
    count(*) AS questions
  FROM public.app_analytics
  WHERE event_type = 'question_asked'
    AND user_id IS NOT NULL
  GROUP BY 1
),
weekly AS (
  SELECT
    date_trunc('month', date_trunc('week', created_at))::date AS month,
    date_trunc('week', created_at)::date AS week,
    count(DISTINCT user_id) AS wau
  FROM public.app_analytics
  WHERE event_type = 'question_asked'
    AND user_id IS NOT NULL
  GROUP BY 1, 2
),
avg_wau AS (
  SELECT month, round(avg(wau), 1) AS avg_wau
  FROM weekly
  GROUP BY month
)
SELECT
  m.month,
  m.mau,
  a.avg_wau,
  round(100.0 * a.avg_wau / NULLIF(m.mau, 0), 1) AS wau_mau_pct,
  m.questions
FROM monthly m
JOIN avg_wau a ON a.month = m.month
ORDER BY m.month DESC;

COMMENT ON VIEW public.analytics_engagement_mau IS
  'Monthly active logged-in users, average WAU that month, and stickiness.';

CREATE OR REPLACE VIEW public.analytics_engagement_retention_weekly
WITH (security_invoker = true) AS
WITH first_use AS (
  SELECT user_id, date_trunc('week', min(created_at))::date AS cohort_week
  FROM public.app_analytics
  WHERE event_type = 'question_asked'
    AND user_id IS NOT NULL
  GROUP BY user_id
),
activity AS (
  SELECT DISTINCT user_id, date_trunc('week', created_at)::date AS activity_week
  FROM public.app_analytics
  WHERE event_type = 'question_asked'
    AND user_id IS NOT NULL
),
this_week AS (
  SELECT date_trunc('week', now())::date AS week
)
SELECT
  f.cohort_week,
  count(DISTINCT f.user_id) AS cohort_size,
  CASE WHEN f.cohort_week <= (SELECT week FROM this_week) - 14
    THEN round(100.0 * count(DISTINCT f.user_id) FILTER (WHERE (a.activity_week - f.cohort_week) / 7 = 1) / count(DISTINCT f.user_id), 1)
  END AS week_1_pct,
  CASE WHEN f.cohort_week <= (SELECT week FROM this_week) - 35
    THEN round(100.0 * count(DISTINCT f.user_id) FILTER (WHERE (a.activity_week - f.cohort_week) / 7 = 4) / count(DISTINCT f.user_id), 1)
  END AS week_4_pct,
  CASE WHEN f.cohort_week <= (SELECT week FROM this_week) - 63
    THEN round(100.0 * count(DISTINCT f.user_id) FILTER (WHERE (a.activity_week - f.cohort_week) / 7 = 8) / count(DISTINCT f.user_id), 1)
  END AS week_8_pct,
  CASE WHEN f.cohort_week <= (SELECT week FROM this_week) - 91
    THEN round(100.0 * count(DISTINCT f.user_id) FILTER (WHERE (a.activity_week - f.cohort_week) / 7 = 12) / count(DISTINCT f.user_id), 1)
  END AS week_12_pct
FROM first_use f
JOIN activity a ON a.user_id = f.user_id
GROUP BY f.cohort_week
ORDER BY f.cohort_week;

COMMENT ON VIEW public.analytics_engagement_retention_weekly IS
  'First-question weekly cohorts. NULL % means that horizon is not finished yet.';

CREATE OR REPLACE VIEW public.analytics_engagement_retention_monthly
WITH (security_invoker = true) AS
WITH first_use AS (
  SELECT user_id, date_trunc('month', min(created_at))::date AS cohort_month
  FROM public.app_analytics
  WHERE event_type = 'question_asked'
    AND user_id IS NOT NULL
  GROUP BY user_id
),
activity AS (
  SELECT DISTINCT user_id, date_trunc('month', created_at)::date AS activity_month
  FROM public.app_analytics
  WHERE event_type = 'question_asked'
    AND user_id IS NOT NULL
),
this_month AS (
  SELECT date_trunc('month', now())::date AS month
)
SELECT
  f.cohort_month,
  count(DISTINCT f.user_id) AS cohort_size,
  CASE WHEN f.cohort_month <= (SELECT month FROM this_month) - interval '1 month'
    THEN round(100.0 * count(DISTINCT f.user_id) FILTER (
      WHERE ((extract(year FROM age(a.activity_month, f.cohort_month)) * 12)
           + extract(month FROM age(a.activity_month, f.cohort_month)))::int = 1
    ) / count(DISTINCT f.user_id), 1)
  END AS month_1_pct,
  CASE WHEN f.cohort_month <= (SELECT month FROM this_month) - interval '2 months'
    THEN round(100.0 * count(DISTINCT f.user_id) FILTER (
      WHERE ((extract(year FROM age(a.activity_month, f.cohort_month)) * 12)
           + extract(month FROM age(a.activity_month, f.cohort_month)))::int = 2
    ) / count(DISTINCT f.user_id), 1)
  END AS month_2_pct,
  CASE WHEN f.cohort_month <= (SELECT month FROM this_month) - interval '3 months'
    THEN round(100.0 * count(DISTINCT f.user_id) FILTER (
      WHERE ((extract(year FROM age(a.activity_month, f.cohort_month)) * 12)
           + extract(month FROM age(a.activity_month, f.cohort_month)))::int = 3
    ) / count(DISTINCT f.user_id), 1)
  END AS month_3_pct
FROM first_use f
JOIN activity a ON a.user_id = f.user_id
GROUP BY f.cohort_month
ORDER BY f.cohort_month;

COMMENT ON VIEW public.analytics_engagement_retention_monthly IS
  'First-question monthly cohorts. NULL % means that horizon is not finished yet.';

CREATE OR REPLACE VIEW public.analytics_engagement_usage
WITH (security_invoker = true) AS
SELECT
  asking_users,
  questions_logged_in,
  mean_questions,
  median_questions,
  users_1,
  users_2_5,
  users_6_20,
  users_21_50,
  users_51_100,
  users_100plus,
  top5_share_pct,
  top20_share_pct
FROM public.analytics_engagement_snapshot;

COMMENT ON VIEW public.analytics_engagement_usage IS
  'Question-count distribution among logged-in users.';

CREATE OR REPLACE FUNCTION public.analytics_engagement_report()
RETURNS TABLE (
  section text,
  metric text,
  value text,
  note text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT report.section, report.metric, report.value, report.note
  FROM (
    SELECT
      1 AS section_ord,
      row_number() OVER () AS row_ord,
      '1. Snapshot' AS section,
      v.metric,
      v.value,
      v.note
    FROM public.analytics_engagement_snapshot s
    CROSS JOIN LATERAL (
      VALUES
        ('Generated at', timezone('Europe/London', s.generated_at)::text, 'Europe/London'),
        ('DAU last 24h', s.dau::text, 'Low on weekends — use Weekday DAU for the update'),
        ('Weekday DAU', s.weekday_dau::text, 'Average Mon–Fri over the last 14 days'),
        ('WAU last 7 days', s.wau::text, 'Logged-in users who asked a question'),
        ('MAU last 30 days', s.mau::text, 'Logged-in users who asked a question'),
        ('WAU / MAU %', s.wau_mau_pct::text, 'How regularly monthly users come back'),
        ('Questions last 7 days', s.questions_7d::text, NULL),
        ('Questions last 30 days', s.questions_30d::text, NULL),
        ('Questions all time (logged in)', s.questions_logged_in::text, NULL),
        ('Questions all time (incl anonymous)', s.questions_all::text, 'Matches the 35k figure'),
        ('Signups', s.signups::text, 'profiles rows'),
        ('Ever asked a question', s.ever_asked::text, 'Share of signups who have used Umbil'),
        ('Pro flagged', s.pro_flagged::text, 'Includes comps — do not treat as paid'),
        ('Stripe active', s.stripe_active::text, 'Paid subscriptions'),
        ('Retention week 1 %', s.week1_retention_pct::text, 'Matured weekly cohorts only'),
        ('Retention week 4 %', s.week4_retention_pct::text, 'Matured weekly cohorts only'),
        ('Retention week 8 %', s.week8_retention_pct::text, 'Matured weekly cohorts only'),
        ('Retention week 12 %', s.week12_retention_pct::text, 'Matured weekly cohorts only'),
        ('Median questions / user', s.median_questions::text, NULL),
        ('Mean questions / user', s.mean_questions::text, 'Pulled up by heavy users'),
        ('Users with 1 question', s.users_1::text, NULL),
        ('Users with 2–5 questions', s.users_2_5::text, NULL),
        ('Users with 6–20 questions', s.users_6_20::text, NULL),
        ('Users with 21–50 questions', s.users_21_50::text, NULL),
        ('Users with 51–100 questions', s.users_51_100::text, NULL),
        ('Users with 100+ questions', s.users_100plus::text, NULL),
        ('Top 5% share of questions %', s.top5_share_pct::text, NULL),
        ('Top 20% share of questions %', s.top20_share_pct::text, NULL)
    ) AS v(metric, value, note)

    UNION ALL

    SELECT
      2,
      row_number() OVER (ORDER BY week DESC),
      '2. WAU history',
      week::text,
      wau::text,
      questions::text || ' questions'
    FROM (
      SELECT week, wau, questions
      FROM public.analytics_engagement_wau
      ORDER BY week DESC
      LIMIT 16
    ) w

    UNION ALL

    SELECT
      3,
      row_number() OVER (ORDER BY month DESC),
      '3. MAU history',
      month::text,
      mau::text,
      'avg WAU ' || avg_wau::text || ' · stickiness ' || wau_mau_pct::text || '%'
    FROM (
      SELECT month, mau, avg_wau, wau_mau_pct
      FROM public.analytics_engagement_mau
      ORDER BY month DESC
      LIMIT 12
    ) m

    UNION ALL

    SELECT
      4,
      row_number() OVER (ORDER BY cohort_week DESC),
      '4. Weekly cohorts',
      cohort_week::text,
      'n=' || cohort_size::text,
      'W1 ' || coalesce(week_1_pct::text, '—')
        || '% · W4 ' || coalesce(week_4_pct::text, '—')
        || '% · W8 ' || coalesce(week_8_pct::text, '—')
        || '% · W12 ' || coalesce(week_12_pct::text, '—') || '%'
    FROM (
      SELECT cohort_week, cohort_size, week_1_pct, week_4_pct, week_8_pct, week_12_pct
      FROM public.analytics_engagement_retention_weekly
      ORDER BY cohort_week DESC
      LIMIT 20
    ) c

    UNION ALL

    SELECT
      5,
      row_number() OVER (ORDER BY cohort_month DESC),
      '5. Monthly cohorts',
      cohort_month::text,
      'n=' || cohort_size::text,
      'M1 ' || coalesce(month_1_pct::text, '—')
        || '% · M2 ' || coalesce(month_2_pct::text, '—')
        || '% · M3 ' || coalesce(month_3_pct::text, '—') || '%'
    FROM public.analytics_engagement_retention_monthly
  ) AS report
  ORDER BY report.section_ord, report.row_ord;
$$;

COMMENT ON FUNCTION public.analytics_engagement_report() IS
  'Run weekly or monthly: SELECT * FROM analytics_engagement_report();';

CREATE TABLE IF NOT EXISTS public.analytics_engagement_snapshots (
  captured_at timestamptz PRIMARY KEY DEFAULT now(),
  dau integer,
  weekday_dau numeric,
  wau integer,
  mau integer,
  wau_mau_pct numeric,
  questions_7d integer,
  questions_30d integer,
  questions_logged_in integer,
  questions_all integer,
  signups integer,
  ever_asked integer,
  pro_flagged integer,
  stripe_active integer,
  week1_retention_pct numeric,
  week4_retention_pct numeric,
  week8_retention_pct numeric,
  week12_retention_pct numeric,
  asking_users integer,
  mean_questions numeric,
  median_questions numeric,
  top5_share_pct numeric,
  top20_share_pct numeric
);

COMMENT ON TABLE public.analytics_engagement_snapshots IS
  'Point-in-time headline engagement snapshots. Written by analytics_engagement_capture().';

ALTER TABLE public.analytics_engagement_snapshots ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.analytics_engagement_capture()
RETURNS SETOF public.analytics_engagement_snapshots
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
  INSERT INTO public.analytics_engagement_snapshots (
    dau, weekday_dau, wau, mau, wau_mau_pct,
    questions_7d, questions_30d, questions_logged_in, questions_all,
    signups, ever_asked, pro_flagged, stripe_active,
    week1_retention_pct, week4_retention_pct, week8_retention_pct, week12_retention_pct,
    asking_users, mean_questions, median_questions, top5_share_pct, top20_share_pct
  )
  SELECT
    dau, weekday_dau, wau, mau, wau_mau_pct,
    questions_7d, questions_30d, questions_logged_in, questions_all,
    signups, ever_asked, pro_flagged, stripe_active,
    week1_retention_pct, week4_retention_pct, week8_retention_pct, week12_retention_pct,
    asking_users, mean_questions, median_questions, top5_share_pct, top20_share_pct
  FROM public.analytics_engagement_snapshot
  RETURNING *;
$$;

COMMENT ON FUNCTION public.analytics_engagement_capture() IS
  'Saves the current headline snapshot. Run after reviewing analytics_engagement_report().';

REVOKE ALL ON public.analytics_engagement_snapshot FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.analytics_engagement_wau FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.analytics_engagement_mau FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.analytics_engagement_retention_weekly FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.analytics_engagement_retention_monthly FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.analytics_engagement_usage FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.analytics_engagement_snapshots FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analytics_engagement_report() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analytics_engagement_capture() FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.analytics_engagement_snapshot TO postgres, service_role;
GRANT SELECT ON public.analytics_engagement_wau TO postgres, service_role;
GRANT SELECT ON public.analytics_engagement_mau TO postgres, service_role;
GRANT SELECT ON public.analytics_engagement_retention_weekly TO postgres, service_role;
GRANT SELECT ON public.analytics_engagement_retention_monthly TO postgres, service_role;
GRANT SELECT ON public.analytics_engagement_usage TO postgres, service_role;
GRANT SELECT, INSERT ON public.analytics_engagement_snapshots TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.analytics_engagement_report() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.analytics_engagement_capture() TO postgres, service_role;
