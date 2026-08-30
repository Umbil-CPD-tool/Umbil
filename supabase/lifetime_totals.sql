-- All-time totals for /admin/engagement (questions, tools, learning, concentration).

CREATE OR REPLACE FUNCTION public.analytics_lifetime_totals()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH asked AS (
  SELECT user_id, created_at, metadata
  FROM public.app_analytics
  WHERE event_type = 'question_asked'
),
per_user AS (
  SELECT user_id, count(*) AS questions
  FROM asked
  WHERE user_id IS NOT NULL
  GROUP BY user_id
),
conc AS (
  SELECT
    coalesce(sum(questions) FILTER (WHERE quintile = 1), 0) AS top20_questions,
    coalesce(sum(questions), 0) AS all_questions
  FROM (
    SELECT questions, ntile(5) OVER (ORDER BY questions DESC) AS quintile
    FROM per_user
  ) q
)
SELECT jsonb_build_object(
  'first_question_at', (SELECT min(created_at) FROM asked),
  'questions_logged_in', (SELECT count(*) FROM asked WHERE user_id IS NOT NULL),
  'questions_anonymous', (SELECT count(*) FROM asked WHERE user_id IS NULL),
  'questions_total', (SELECT count(*) FROM asked),
  'users_ever_asked', (SELECT count(*) FROM per_user),
  'signups', (SELECT count(*) FROM public.profiles),
  'tools_total', (SELECT count(*) FROM public.tool_history),
  'tool_users', (SELECT count(DISTINCT user_id) FROM public.tool_history),
  'cpd_total', (SELECT count(*) FROM public.cpd_entries),
  'cpd_users', (SELECT count(DISTINCT user_id) FROM public.cpd_entries),
  'median_questions', coalesce((SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY questions)) FROM per_user), 0),
  'mean_questions', coalesce((SELECT round(avg(questions), 1) FROM per_user), 0),
  'asked_once', (SELECT count(*) FROM per_user WHERE questions = 1),
  'asked_5', (SELECT count(*) FROM per_user WHERE questions >= 5),
  'asked_50', (SELECT count(*) FROM per_user WHERE questions >= 50),
  'asked_100', (SELECT count(*) FROM per_user WHERE questions >= 100),
  'top20_question_share_pct', (
    SELECT round(100.0 * top20_questions / NULLIF(all_questions, 0), 1) FROM conc
  ),
  'tokens_all', coalesce((
    SELECT sum(coalesce((metadata->>'total_tokens')::numeric, 0)) FROM asked
  ), 0),
  'estimated_usd_all', coalesce((
    SELECT round(sum(
      coalesce((metadata->>'total_tokens')::numeric, 0)
      * CASE WHEN metadata->>'provider' = 'openai' THEN 5.0 ELSE 0.26 END
      / 1000000.0
    ), 2)
    FROM asked
  ), 0),
  'tools', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'tool_name', x.tool_name,
      'uses', x.uses,
      'users', x.users
    ) ORDER BY x.uses DESC)
    FROM (
      SELECT
        coalesce(nullif(tool_name, ''), tool_id, 'Unknown') AS tool_name,
        count(*) AS uses,
        count(DISTINCT user_id) AS users
      FROM public.tool_history
      GROUP BY 1
    ) x
  ), '[]'::jsonb),
  'grades', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'grade', g.grade,
      'users', g.users,
      'questions', g.questions
    ) ORDER BY g.users DESC)
    FROM (
      SELECT
        public.analytics_grade_bucket(p.grade) AS grade,
        count(DISTINCT a.user_id) AS users,
        count(*) AS questions
      FROM asked a
      JOIN public.profiles p ON p.id = a.user_id
      WHERE a.user_id IS NOT NULL
      GROUP BY 1
    ) g
  ), '[]'::jsonb)
);
$$;

REVOKE ALL ON FUNCTION public.analytics_lifetime_totals() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_lifetime_totals() TO postgres, service_role;
