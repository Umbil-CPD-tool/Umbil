-- Adds tools, learning, grade mix, cost estimates, and a single JSON payload
-- used by the Monday email / Slack report and /admin/engagement.
--
-- Weekly (SQL Editor):
--   SELECT analytics_engagement_payload();
--
-- App automation uses the same function.

CREATE OR REPLACE FUNCTION public.analytics_grade_bucket(grade text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN grade IS NULL OR btrim(grade) = '' OR grade ~ '@' THEN 'Unknown'
    WHEN grade ~* 'student' THEN 'Medical student'
    WHEN grade ~* '(anp|nurse|paramedic|pharmacist|fcp)' THEN 'AHP / nursing'
    WHEN grade ~* '(fy|st[0-9]|gpst|trainee|registrar|resident|foundation)' THEN 'Doctor in training'
    WHEN grade ~* '(gp|partner|principal)' THEN 'GP'
    ELSE 'Other'
  END;
$$;

CREATE OR REPLACE VIEW public.analytics_engagement_tools
WITH (security_invoker = true) AS
SELECT
  coalesce(nullif(tool_id, ''), 'unknown') AS tool_id,
  coalesce(nullif(tool_name, ''), tool_id, 'Unknown') AS tool_name,
  count(*) FILTER (WHERE created_at >= now() - interval '7 days') AS uses_7d,
  count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS uses_30d,
  count(*) AS uses_all,
  count(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '7 days') AS users_7d,
  count(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '30 days') AS users_30d
FROM public.tool_history
GROUP BY 1, 2;

CREATE OR REPLACE VIEW public.analytics_engagement_learning
WITH (security_invoker = true) AS
SELECT
  date_trunc('week', timestamp)::date AS week,
  count(*) AS entries,
  count(DISTINCT user_id) AS users
FROM public.cpd_entries
WHERE timestamp IS NOT NULL
GROUP BY 1;

CREATE OR REPLACE VIEW public.analytics_engagement_by_grade
WITH (security_invoker = true) AS
SELECT
  public.analytics_grade_bucket(p.grade) AS grade,
  count(DISTINCT a.user_id) AS active_30d,
  count(*) AS questions_30d
FROM public.app_analytics a
JOIN public.profiles p ON p.id = a.user_id
WHERE a.event_type = 'question_asked'
  AND a.user_id IS NOT NULL
  AND a.created_at >= now() - interval '30 days'
GROUP BY 1;

CREATE OR REPLACE FUNCTION public.analytics_engagement_payload()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH asked AS (
  SELECT created_at, user_id, metadata
  FROM public.app_analytics
  WHERE event_type = 'question_asked'
    AND user_id IS NOT NULL
),
snap AS (
  SELECT
    count(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '1 day') AS dau,
    count(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '7 days') AS wau,
    count(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '14 days' AND created_at < now() - interval '7 days') AS wau_prev,
    count(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '30 days') AS mau,
    count(*) FILTER (WHERE created_at >= now() - interval '7 days') AS questions_7d,
    count(*) FILTER (WHERE created_at >= now() - interval '14 days' AND created_at < now() - interval '7 days') AS questions_prev_7d,
    count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS questions_30d,
    count(*) AS questions_logged_in,
    sum(coalesce((metadata->>'total_tokens')::numeric, 0)) FILTER (WHERE created_at >= now() - interval '7 days') AS tokens_7d,
    sum(coalesce((metadata->>'total_tokens')::numeric, 0)) FILTER (WHERE created_at >= now() - interval '30 days') AS tokens_30d,
    round(sum(
      coalesce((metadata->>'total_tokens')::numeric, 0)
      * CASE WHEN metadata->>'provider' = 'openai' THEN 5.0 ELSE 0.26 END
      / 1000000.0
    ) FILTER (WHERE created_at >= now() - interval '7 days'), 2) AS estimated_usd_7d,
    round(sum(
      coalesce((metadata->>'total_tokens')::numeric, 0)
      * CASE WHEN metadata->>'provider' = 'openai' THEN 5.0 ELSE 0.26 END
      / 1000000.0
    ) FILTER (WHERE created_at >= now() - interval '30 days'), 2) AS estimated_usd_30d
  FROM asked
),
weekday AS (
  SELECT round(avg(dau), 1) AS weekday_dau
  FROM (
    SELECT count(DISTINCT user_id) AS dau
    FROM asked
    WHERE created_at >= now() - interval '14 days'
      AND EXTRACT(ISODOW FROM created_at) < 6
    GROUP BY created_at::date
  ) d
),
activity AS (
  SELECT
    (SELECT count(*) FROM public.tool_history WHERE created_at >= now() - interval '7 days') AS tools_7d,
    (SELECT count(*) FROM public.tool_history WHERE created_at >= now() - interval '14 days' AND created_at < now() - interval '7 days') AS tools_prev_7d,
    (SELECT count(*) FROM public.tool_history WHERE created_at >= now() - interval '30 days') AS tools_30d,
    (SELECT count(DISTINCT user_id) FROM public.tool_history WHERE created_at >= now() - interval '7 days') AS tool_users_7d,
    (SELECT count(*) FROM public.cpd_entries WHERE timestamp >= now() - interval '7 days') AS cpd_7d,
    (SELECT count(*) FROM public.cpd_entries WHERE timestamp >= now() - interval '14 days' AND timestamp < now() - interval '7 days') AS cpd_prev_7d,
    (SELECT count(*) FROM public.cpd_entries WHERE timestamp >= now() - interval '30 days') AS cpd_30d,
    (SELECT count(DISTINCT user_id) FROM public.cpd_entries WHERE timestamp >= now() - interval '7 days') AS cpd_users_7d,
    (SELECT count(*) FROM public.profiles WHERE created_at >= now() - interval '7 days') AS signups_7d,
    (SELECT count(*) FROM public.profiles WHERE created_at >= now() - interval '14 days' AND created_at < now() - interval '7 days') AS signups_prev_7d,
    (SELECT count(*) FROM public.profiles WHERE created_at >= now() - interval '30 days') AS signups_30d,
    (SELECT count(*) FROM public.profiles) AS signups,
    (SELECT count(DISTINCT user_id) FROM asked) AS ever_asked,
    (SELECT count(*) FROM public.profiles WHERE is_pro) AS pro_flagged,
    (SELECT count(*) FROM public.profiles WHERE subscription_status = 'active') AS stripe_active
),
first_use AS (
  SELECT user_id, date_trunc('week', min(created_at))::date AS cohort_week
  FROM asked
  GROUP BY user_id
),
week_activity AS (
  SELECT DISTINCT user_id, date_trunc('week', created_at)::date AS activity_week
  FROM asked
),
this_week AS (
  SELECT date_trunc('week', now())::date AS week
),
retention AS (
  SELECT
    round(100.0 * count(DISTINCT f.user_id) FILTER (
      WHERE (w.activity_week - f.cohort_week) / 7 = 1 AND f.cohort_week <= (SELECT week FROM this_week) - 14
    ) / NULLIF(count(DISTINCT f.user_id) FILTER (WHERE f.cohort_week <= (SELECT week FROM this_week) - 14), 0), 1) AS week1_pct,
    round(100.0 * count(DISTINCT f.user_id) FILTER (
      WHERE (w.activity_week - f.cohort_week) / 7 = 4 AND f.cohort_week <= (SELECT week FROM this_week) - 35
    ) / NULLIF(count(DISTINCT f.user_id) FILTER (WHERE f.cohort_week <= (SELECT week FROM this_week) - 35), 0), 1) AS week4_pct,
    round(100.0 * count(DISTINCT f.user_id) FILTER (
      WHERE (w.activity_week - f.cohort_week) / 7 = 8 AND f.cohort_week <= (SELECT week FROM this_week) - 63
    ) / NULLIF(count(DISTINCT f.user_id) FILTER (WHERE f.cohort_week <= (SELECT week FROM this_week) - 63), 0), 1) AS week8_pct,
    round(100.0 * count(DISTINCT f.user_id) FILTER (
      WHERE (w.activity_week - f.cohort_week) / 7 = 12 AND f.cohort_week <= (SELECT week FROM this_week) - 91
    ) / NULLIF(count(DISTINCT f.user_id) FILTER (WHERE f.cohort_week <= (SELECT week FROM this_week) - 91), 0), 1) AS week12_pct
  FROM first_use f
  JOIN week_activity w ON w.user_id = f.user_id
),
top_users AS (
  SELECT
    CASE
      WHEN p.full_name IS NULL OR btrim(p.full_name) = '' OR p.full_name ~ '@' THEN 'Member'
      ELSE split_part(btrim(p.full_name), ' ', 1)
    END AS first_name,
    public.analytics_grade_bucket(p.grade) AS grade,
    count(*) FILTER (WHERE a.created_at >= now() - interval '7 days') AS questions,
    coalesce((
      SELECT count(*) FROM public.tool_history t
      WHERE t.user_id = a.user_id AND t.created_at >= now() - interval '7 days'
    ), 0) AS tools,
    coalesce((
      SELECT count(*) FROM public.cpd_entries c
      WHERE c.user_id = a.user_id AND c.timestamp >= now() - interval '7 days'
    ), 0) AS learning
  FROM asked a
  JOIN public.profiles p ON p.id = a.user_id
  WHERE a.created_at >= now() - interval '7 days'
  GROUP BY a.user_id, p.full_name, p.grade
  ORDER BY questions DESC, tools DESC, learning DESC
  LIMIT 10
)
SELECT jsonb_build_object(
  'generated_at', now(),
  'timezone', 'Europe/London',
  'snapshot', jsonb_build_object(
    'dau', s.dau,
    'weekday_dau', w.weekday_dau,
    'wau', s.wau,
    'wau_prev', s.wau_prev,
    'mau', s.mau,
    'wau_mau_pct', round(100.0 * s.wau / NULLIF(s.mau, 0), 1),
    'questions_7d', s.questions_7d,
    'questions_prev_7d', s.questions_prev_7d,
    'questions_30d', s.questions_30d,
    'questions_logged_in', s.questions_logged_in,
    'week1_retention_pct', r.week1_pct,
    'week4_retention_pct', r.week4_pct,
    'week8_retention_pct', r.week8_pct,
    'week12_retention_pct', r.week12_pct
  ),
  'activity', jsonb_build_object(
    'tools_7d', a.tools_7d,
    'tools_prev_7d', a.tools_prev_7d,
    'tools_30d', a.tools_30d,
    'tool_users_7d', a.tool_users_7d,
    'cpd_7d', a.cpd_7d,
    'cpd_prev_7d', a.cpd_prev_7d,
    'cpd_30d', a.cpd_30d,
    'cpd_users_7d', a.cpd_users_7d,
    'signups_7d', a.signups_7d,
    'signups_prev_7d', a.signups_prev_7d,
    'signups_30d', a.signups_30d,
    'signups', a.signups,
    'ever_asked', a.ever_asked,
    'pro_flagged', a.pro_flagged,
    'stripe_active', a.stripe_active
  ),
  'costs', jsonb_build_object(
    'tokens_7d', coalesce(s.tokens_7d, 0),
    'tokens_30d', coalesce(s.tokens_30d, 0),
    'estimated_usd_7d', coalesce(s.estimated_usd_7d, 0),
    'estimated_usd_30d', coalesce(s.estimated_usd_30d, 0),
    'note', 'Estimated from stored token counts. Unknown model priced as Together gpt-oss-120b blended $0.26/1M. OpenAI priced conservatively at $5/1M. Token counts are character-based estimates, not provider invoices.'
  ),
  'tools', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'tool_id', t.tool_id,
      'tool_name', t.tool_name,
      'uses_7d', t.uses_7d,
      'uses_30d', t.uses_30d,
      'users_7d', t.users_7d
    ) ORDER BY t.uses_7d DESC)
    FROM public.analytics_engagement_tools t
    WHERE t.uses_30d > 0
  ), '[]'::jsonb),
  'grades', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'grade', g.grade,
      'active_30d', g.active_30d,
      'questions_30d', g.questions_30d
    ) ORDER BY g.active_30d DESC)
    FROM public.analytics_engagement_by_grade g
  ), '[]'::jsonb),
  'wau_history', coalesce((
    SELECT jsonb_agg(jsonb_build_object('week', x.week, 'wau', x.wau, 'questions', x.questions) ORDER BY x.week)
    FROM (
      SELECT week, wau, questions
      FROM public.analytics_engagement_wau
      ORDER BY week DESC
      LIMIT 16
    ) x
  ), '[]'::jsonb),
  'mau_history', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'month', m.month,
      'mau', m.mau,
      'avg_wau', m.avg_wau,
      'wau_mau_pct', m.wau_mau_pct,
      'questions', m.questions
    ) ORDER BY m.month)
    FROM (
      SELECT month, mau, avg_wau, wau_mau_pct, questions
      FROM public.analytics_engagement_mau
      ORDER BY month DESC
      LIMIT 12
    ) m
  ), '[]'::jsonb),
  'weekly_activity', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'week', w.week,
      'questions', w.questions,
      'tools', w.tools,
      'learning', w.learning
    ) ORDER BY w.week)
    FROM (
      SELECT
        weeks.week,
        coalesce(q.n, 0) AS questions,
        coalesce(t.n, 0) AS tools,
        coalesce(c.n, 0) AS learning
      FROM (
        SELECT generate_series(
          date_trunc('week', now())::date - 77,
          date_trunc('week', now())::date,
          interval '7 days'
        )::date AS week
      ) weeks
      LEFT JOIN (
        SELECT date_trunc('week', created_at)::date AS week, count(*) AS n
        FROM asked
        GROUP BY 1
      ) q ON q.week = weeks.week
      LEFT JOIN (
        SELECT date_trunc('week', created_at)::date AS week, count(*) AS n
        FROM public.tool_history
        GROUP BY 1
      ) t ON t.week = weeks.week
      LEFT JOIN (
        SELECT date_trunc('week', timestamp)::date AS week, count(*) AS n
        FROM public.cpd_entries
        WHERE timestamp IS NOT NULL
        GROUP BY 1
      ) c ON c.week = weeks.week
      ORDER BY weeks.week
    ) w
  ), '[]'::jsonb),
  'retention_monthly', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'cohort_month', rm.cohort_month,
      'cohort_size', rm.cohort_size,
      'month_1_pct', rm.month_1_pct,
      'month_2_pct', rm.month_2_pct,
      'month_3_pct', rm.month_3_pct
    ) ORDER BY rm.cohort_month)
    FROM public.analytics_engagement_retention_monthly rm
  ), '[]'::jsonb),
  'top_users', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'first_name', u.first_name,
      'grade', u.grade,
      'questions', u.questions,
      'tools', u.tools,
      'learning', u.learning
    ))
    FROM top_users u
  ), '[]'::jsonb)
)
FROM snap s
CROSS JOIN weekday w
CROSS JOIN activity a
CROSS JOIN retention r;
$$;

COMMENT ON FUNCTION public.analytics_engagement_payload() IS
  'Single JSON blob for the Monday engagement email, Slack post, and /admin/engagement.';

REVOKE ALL ON FUNCTION public.analytics_grade_bucket(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analytics_engagement_payload() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.analytics_engagement_tools FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.analytics_engagement_learning FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.analytics_engagement_by_grade FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.analytics_grade_bucket(text) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.analytics_engagement_payload() TO postgres, service_role;
GRANT SELECT ON public.analytics_engagement_tools TO postgres, service_role;
GRANT SELECT ON public.analytics_engagement_learning TO postgres, service_role;
GRANT SELECT ON public.analytics_engagement_by_grade TO postgres, service_role;
