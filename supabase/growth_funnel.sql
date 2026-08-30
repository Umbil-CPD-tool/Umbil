-- Funnel + heavy-user breakdown for /admin/engagement.
-- Acquisition columns let Meta/Google ads be judged on use, not just signups.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS acquisition_source text,
  ADD COLUMN IF NOT EXISTS acquisition_medium text,
  ADD COLUMN IF NOT EXISTS acquisition_campaign text,
  ADD COLUMN IF NOT EXISTS acquisition_content text,
  ADD COLUMN IF NOT EXISTS acquisition_click_id text,
  ADD COLUMN IF NOT EXISTS acquisition_at timestamptz;

COMMENT ON COLUMN public.profiles.acquisition_source IS
  'First-touch utm_source or inferred paid click (facebook/google). Write-once.';

CREATE OR REPLACE FUNCTION public.protect_acquisition_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.acquisition_source IS NOT NULL THEN
    NEW.acquisition_source := OLD.acquisition_source;
    NEW.acquisition_medium := OLD.acquisition_medium;
    NEW.acquisition_campaign := OLD.acquisition_campaign;
    NEW.acquisition_content := OLD.acquisition_content;
    NEW.acquisition_click_id := OLD.acquisition_click_id;
    NEW.acquisition_at := OLD.acquisition_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_acquisition_fields ON public.profiles;
CREATE TRIGGER protect_acquisition_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_acquisition_fields();

CREATE OR REPLACE FUNCTION public.analytics_growth_funnel()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH asked AS (
  SELECT
    user_id,
    count(*) AS questions,
    min(created_at) AS first_q,
    count(DISTINCT date_trunc('week', created_at)) AS weeks_active
  FROM public.app_analytics
  WHERE event_type = 'question_asked'
    AND user_id IS NOT NULL
  GROUP BY user_id
),
funnel AS (
  SELECT
    count(*) AS signups,
    count(*) FILTER (WHERE a.user_id IS NOT NULL) AS ever_asked,
    count(*) FILTER (WHERE a.user_id IS NULL) AS never_asked,
    count(*) FILTER (WHERE a.first_q <= p.created_at + interval '1 day') AS asked_within_1d,
    count(*) FILTER (WHERE a.first_q <= p.created_at + interval '7 days') AS asked_within_7d,
    count(*) FILTER (WHERE a.questions >= 5) AS reached_5,
    count(*) FILTER (WHERE a.questions >= 50) AS reached_50,
    count(*) FILTER (WHERE a.questions >= 100) AS reached_100,
    count(*) FILTER (WHERE p.is_pro) AS pro_flagged,
    count(*) FILTER (WHERE p.subscription_status = 'active') AS stripe_active,
    count(*) FILTER (WHERE a.questions >= 100 AND p.is_pro) AS heavy_and_pro,
    count(*) FILTER (WHERE a.questions >= 100 AND p.subscription_status = 'active') AS heavy_and_stripe
  FROM public.profiles p
  LEFT JOIN asked a ON a.user_id = p.id
),
heavy AS (
  SELECT a.*, p.grade, p.is_pro, p.subscription_status
  FROM asked a
  JOIN public.profiles p ON p.id = a.user_id
  WHERE a.questions >= 100
)
SELECT jsonb_build_object(
  'funnel', jsonb_build_object(
    'signups', f.signups,
    'never_asked', f.never_asked,
    'ever_asked', f.ever_asked,
    'asked_within_1d', f.asked_within_1d,
    'asked_within_7d', f.asked_within_7d,
    'reached_5', f.reached_5,
    'reached_50', f.reached_50,
    'reached_100', f.reached_100,
    'pro_flagged', f.pro_flagged,
    'stripe_active', f.stripe_active,
    'heavy_and_pro', f.heavy_and_pro,
    'heavy_and_stripe', f.heavy_and_stripe
  ),
  'heavy_by_grade', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'grade', s.grade,
      'users', s.cnt,
      'avg_questions', s.avg_questions,
      'avg_weeks_active', s.avg_weeks_active,
      'pro_flagged', s.pro_flagged,
      'stripe_active', s.stripe_active
    ) ORDER BY s.cnt DESC)
    FROM (
      SELECT
        public.analytics_grade_bucket(h.grade) AS grade,
        count(*) AS cnt,
        round(avg(h.questions), 0) AS avg_questions,
        round(avg(h.weeks_active), 1) AS avg_weeks_active,
        count(*) FILTER (WHERE h.is_pro) AS pro_flagged,
        count(*) FILTER (WHERE h.subscription_status = 'active') AS stripe_active
      FROM heavy h
      GROUP BY 1
    ) s
  ), '[]'::jsonb),
  'heavy_tools', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'tool_name', x.tool_name,
      'uses', x.uses,
      'heavy_users', x.heavy_users
    ) ORDER BY x.uses DESC)
    FROM (
      SELECT
        coalesce(nullif(t.tool_name, ''), t.tool_id, 'Unknown') AS tool_name,
        count(*) AS uses,
        count(DISTINCT t.user_id) AS heavy_users
      FROM public.tool_history t
      JOIN heavy h ON h.user_id = t.user_id
      GROUP BY 1
    ) x
  ), '[]'::jsonb),
  'acquisition', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'source', coalesce(nullif(p.acquisition_source, ''), '(none)'),
      'signups', cnt,
      'ever_asked', ever_asked,
      'reached_5', reached_5
    ) ORDER BY cnt DESC)
    FROM (
      SELECT
        p.acquisition_source,
        count(*) AS cnt,
        count(*) FILTER (WHERE a.user_id IS NOT NULL) AS ever_asked,
        count(*) FILTER (WHERE a.questions >= 5) AS reached_5
      FROM public.profiles p
      LEFT JOIN asked a ON a.user_id = p.id
      GROUP BY 1
    ) p
  ), '[]'::jsonb)
)
FROM funnel f;
$$;

REVOKE ALL ON FUNCTION public.analytics_growth_funnel() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_acquisition_fields() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_growth_funnel() TO postgres, service_role;
