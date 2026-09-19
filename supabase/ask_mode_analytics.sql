-- Clinic / Standard / Deep Dive breakdown for /admin/engagement.
-- Apply once in the Supabase SQL editor (same as engagement_report_v2.sql).
--
-- Uses app_analytics.metadata.style (written by /api/ask).
-- Older rows without style: clinic_mode=true counts as Clinic, otherwise Standard.
--
--   SELECT analytics_ask_mode_stats();

CREATE OR REPLACE FUNCTION public.analytics_ask_style(metadata jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(coalesce(metadata->>'style', '')) IN ('clinic') THEN 'clinic'
    WHEN lower(coalesce(metadata->>'style', '')) IN ('deepdive', 'deep_dive', 'deep-dive') THEN 'deepDive'
    WHEN lower(coalesce(metadata->>'style', '')) IN ('standard') THEN 'standard'
    WHEN lower(coalesce(metadata->>'clinic_mode', '')) IN ('true', 't') THEN 'clinic'
    ELSE 'standard'
  END;
$$;

CREATE OR REPLACE FUNCTION public.analytics_ask_mode_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH asked AS (
  SELECT
    created_at,
    user_id,
    public.analytics_ask_style(metadata) AS style
  FROM public.app_analytics
  WHERE event_type = 'question_asked'
    AND user_id IS NOT NULL
),
labels AS (
  SELECT * FROM (VALUES
    ('clinic', 'Clinic', 1),
    ('standard', 'Standard', 2),
    ('deepDive', 'Deep Dive', 3)
  ) AS v(style, label, sort_order)
),
counts AS (
  SELECT
    style,
    count(*) FILTER (WHERE created_at >= now() - interval '7 days') AS questions_7d,
    count(*) FILTER (
      WHERE created_at >= now() - interval '14 days'
        AND created_at < now() - interval '7 days'
    ) AS questions_prev_7d,
    count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS questions_30d,
    count(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '7 days') AS users_7d,
    count(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '30 days') AS users_30d,
    count(*) AS questions_all,
    count(DISTINCT user_id) AS users_all
  FROM asked
  GROUP BY style
)
SELECT jsonb_build_object(
  'modes', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'style', l.style,
      'label', l.label,
      'questions_7d', coalesce(c.questions_7d, 0),
      'questions_prev_7d', coalesce(c.questions_prev_7d, 0),
      'questions_30d', coalesce(c.questions_30d, 0),
      'users_7d', coalesce(c.users_7d, 0),
      'users_30d', coalesce(c.users_30d, 0),
      'questions_all', coalesce(c.questions_all, 0),
      'users_all', coalesce(c.users_all, 0)
    ) ORDER BY l.sort_order)
    FROM labels l
    LEFT JOIN counts c ON c.style = l.style
  ), '[]'::jsonb),
  'weekly', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'week', w.week,
      'clinic', w.clinic,
      'standard', w.standard,
      'deepDive', w.deepDive
    ) ORDER BY w.week)
    FROM (
      SELECT
        weeks.week,
        count(*) FILTER (WHERE a.style = 'clinic') AS clinic,
        count(*) FILTER (WHERE a.style = 'standard') AS standard,
        count(*) FILTER (WHERE a.style = 'deepDive') AS deepDive
      FROM (
        SELECT generate_series(
          date_trunc('week', now())::date - 77,
          date_trunc('week', now())::date,
          interval '7 days'
        )::date AS week
      ) weeks
      LEFT JOIN asked a ON date_trunc('week', a.created_at)::date = weeks.week
      GROUP BY weeks.week
    ) w
  ), '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.analytics_ask_style(jsonb) IS
  'Maps ask analytics metadata to clinic, standard, or deepDive.';

COMMENT ON FUNCTION public.analytics_ask_mode_stats() IS
  'Clinic / Standard / Deep Dive question counts for /admin/engagement.';

REVOKE ALL ON FUNCTION public.analytics_ask_style(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analytics_ask_mode_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_ask_style(jsonb) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.analytics_ask_mode_stats() TO postgres, service_role;
