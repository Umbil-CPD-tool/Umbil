-- Upgrade-journey events live in app_analytics (limit_reached, pricing_viewed,
-- upgrade_clicked, checkout_started, trial_started, subscribed, cancelled).
-- analytics_conversion_baseline marks when tracking started and, later, when
-- free limits are tightened. Until limits_changed_at is set, every new event
-- stays in the before window.
-- Applied to the linked production project. CREATE OR REPLACE and IF NOT EXISTS
-- keep a re-run from moving the baseline clock.

CREATE TABLE IF NOT EXISTS public.analytics_conversion_baseline (
  id text PRIMARY KEY,
  tracking_started_at timestamptz NOT NULL DEFAULT now(),
  limits_changed_at timestamptz,
  CONSTRAINT analytics_conversion_baseline_id_check CHECK (id = 'free_limits'),
  CONSTRAINT analytics_conversion_baseline_order_check CHECK (
    limits_changed_at IS NULL OR limits_changed_at >= tracking_started_at
  )
);

INSERT INTO public.analytics_conversion_baseline (id)
VALUES ('free_limits')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.analytics_conversion_baseline ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.analytics_conversion_baseline FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.analytics_conversion_baseline TO service_role;

COMMENT ON TABLE public.analytics_conversion_baseline IS
  'Clock for the free-limit experiment. tracking_started_at is the before window. limits_changed_at opens the after window.';

CREATE INDEX IF NOT EXISTS app_analytics_questions_user_created_idx
  ON public.app_analytics (user_id, created_at)
  WHERE event_type = 'question_asked' AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS app_analytics_conversion_events_idx
  ON public.app_analytics (event_type, created_at DESC)
  WHERE event_type IN (
    'limit_reached',
    'pricing_viewed',
    'upgrade_clicked',
    'upgrade_dismissed',
    'checkout_started',
    'trial_started',
    'subscribed',
    'cancelled'
  );

CREATE UNIQUE INDEX IF NOT EXISTS app_analytics_stripe_event_once_idx
  ON public.app_analytics ((metadata->>'stripe_event_id'))
  WHERE metadata->>'stripe_event_id' IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS app_analytics_billing_once_idx
  ON public.app_analytics (event_type, (metadata->>'stripe_subscription_id'))
  WHERE event_type IN ('trial_started', 'subscribed', 'cancelled')
    AND metadata->>'stripe_subscription_id' IS NOT NULL;

CREATE OR REPLACE FUNCTION public.analytics_conversion_funnel()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH bounds AS (
  SELECT
    coalesce(b.tracking_started_at, now()) AS tracking_started_at,
    b.limits_changed_at,
    floor(extract(epoch FROM (now() - coalesce(b.tracking_started_at, now()))) / 86400)::int AS days_elapsed
  FROM (SELECT 1) AS seed
  LEFT JOIN public.analytics_conversion_baseline b ON b.id = 'free_limits'
),
events AS (
  SELECT
    a.event_type,
    a.user_id,
    a.created_at,
    coalesce(nullif(btrim(a.metadata->>'grade'), ''), 'Unknown') AS grade,
    coalesce(nullif(btrim(a.metadata->>'usage_tier'), ''), 'unknown') AS usage_tier,
    coalesce(nullif(btrim(a.metadata->>'surface'), ''), 'unknown') AS surface,
    coalesce(nullif(btrim(a.metadata->>'feature'), ''), 'unknown') AS feature,
    coalesce(nullif(btrim(a.metadata->>'source'), ''), 'unknown') AS source,
    CASE
      WHEN coalesce(a.metadata->>'mrr_pence', '') ~ '^[0-9]+$' THEN (a.metadata->>'mrr_pence')::integer
      ELSE 0
    END AS mrr_pence,
    CASE
      WHEN coalesce(a.metadata->>'list_mrr_pence', '') ~ '^[0-9]+$' THEN (a.metadata->>'list_mrr_pence')::integer
      ELSE 0
    END AS list_mrr_pence,
    nullif(btrim(a.metadata->>'stripe_subscription_id'), '') AS stripe_subscription_id
  FROM public.app_analytics a
  CROSS JOIN bounds b
  WHERE a.created_at >= b.tracking_started_at
    AND a.event_type IN (
      'limit_reached',
      'pricing_viewed',
      'upgrade_clicked',
      'upgrade_dismissed',
      'checkout_started',
      'trial_started',
      'subscribed',
      'cancelled'
    )
),
event_counts AS (
  SELECT event_type, count(*) AS events, count(DISTINCT user_id) AS users
  FROM events
  GROUP BY event_type
),
activity AS (
  SELECT a.user_id, a.created_at
  FROM public.app_analytics a
  CROSS JOIN bounds b
  WHERE a.event_type = 'question_asked'
    AND a.user_id IS NOT NULL
    AND a.created_at >= b.tracking_started_at - interval '60 days'
    AND a.created_at <= now()
),
windows AS (
  SELECT key, start_at, end_at
  FROM bounds b
  CROSS JOIN LATERAL (
    VALUES
      ('prior_30d'::text, b.tracking_started_at - interval '60 days', b.tracking_started_at - interval '30 days'),
      ('before'::text, b.tracking_started_at, coalesce(b.limits_changed_at, now())),
      ('after'::text, b.limits_changed_at, now())
  ) AS v(key, start_at, end_at)
  WHERE start_at IS NOT NULL AND end_at IS NOT NULL AND start_at < end_at
),
anchors AS (
  SELECT w.key, a.user_id, min(a.created_at) AS anchor
  FROM windows w
  JOIN activity a ON a.created_at >= w.start_at AND a.created_at < w.end_at
  GROUP BY w.key, a.user_id
),
scored AS (
  SELECT
    n.key,
    n.days,
    n.user_id,
    n.anchor <= now() - make_interval(days => n.days) AS matured,
    EXISTS (
      SELECT 1
      FROM activity r
      WHERE r.user_id = n.user_id
        AND r.created_at > n.anchor
        AND (r.created_at AT TIME ZONE 'Europe/London')::date > (n.anchor AT TIME ZONE 'Europe/London')::date
        AND r.created_at <= n.anchor + make_interval(days => n.days)
    ) AS returned
  FROM (
    SELECT anchors.key, anchors.user_id, anchors.anchor, d.days
    FROM anchors
    CROSS JOIN (VALUES (7), (14), (30)) AS d(days)
  ) n
),
window_stats AS (
  SELECT
    key,
    count(DISTINCT user_id)::int AS users,
    count(*) FILTER (WHERE days = 7 AND matured)::int AS matured_7d,
    count(*) FILTER (WHERE days = 7 AND matured AND returned)::int AS returned_7d,
    count(*) FILTER (WHERE days = 14 AND matured)::int AS matured_14d,
    count(*) FILTER (WHERE days = 14 AND matured AND returned)::int AS returned_14d,
    count(*) FILTER (WHERE days = 30 AND matured)::int AS matured_30d,
    count(*) FILTER (WHERE days = 30 AND matured AND returned)::int AS returned_30d
  FROM scored
  GROUP BY key
),
window_json AS (
  SELECT
    key,
    jsonb_build_object(
      'users', users,
      'matured_7d', matured_7d,
      'returned_7d', returned_7d,
      'return_7d_pct', CASE WHEN matured_7d = 0 THEN NULL ELSE round(100.0 * returned_7d / matured_7d, 1) END,
      'matured_14d', matured_14d,
      'returned_14d', returned_14d,
      'return_14d_pct', CASE WHEN matured_14d = 0 THEN NULL ELSE round(100.0 * returned_14d / matured_14d, 1) END,
      'matured_30d', matured_30d,
      'returned_30d', returned_30d,
      'return_30d_pct', CASE WHEN matured_30d = 0 THEN NULL ELSE round(100.0 * returned_30d / matured_30d, 1) END
    ) AS payload
  FROM window_stats
),
known_tiers AS (
  SELECT * FROM (VALUES
    ('guest', 1),
    ('new', 2),
    ('light', 3),
    ('regular', 4),
    ('heavy', 5),
    ('power', 6)
  ) AS v(segment, sort_order)
),
tier_counts AS (
  SELECT
    usage_tier AS segment,
    count(*) FILTER (WHERE event_type = 'limit_reached')::int AS limit_reached,
    count(*) FILTER (WHERE event_type = 'pricing_viewed')::int AS pricing_viewed,
    count(*) FILTER (WHERE event_type = 'upgrade_clicked')::int AS upgrade_clicked,
    count(*) FILTER (WHERE event_type = 'checkout_started')::int AS checkout_started,
    count(*) FILTER (WHERE event_type = 'trial_started')::int AS trial_started,
    count(*) FILTER (WHERE event_type = 'subscribed')::int AS subscribed,
    count(*) FILTER (WHERE event_type = 'cancelled')::int AS cancelled
  FROM events
  GROUP BY usage_tier
),
open_trials AS (
  SELECT e.stripe_subscription_id, max(e.list_mrr_pence) AS list_mrr_pence
  FROM events e
  WHERE e.event_type = 'trial_started'
    AND e.stripe_subscription_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM events later
      WHERE later.stripe_subscription_id = e.stripe_subscription_id
        AND later.event_type IN ('subscribed', 'cancelled')
    )
  GROUP BY e.stripe_subscription_id
)
SELECT jsonb_build_object(
  'tracking_started_at', b.tracking_started_at,
  'limits_changed_at', b.limits_changed_at,
  'days_elapsed', b.days_elapsed,
  'baseline_ready', b.days_elapsed >= 7,
  'baseline_preferred', b.days_elapsed >= 14,
  'events', jsonb_build_object(
    'limit_reached', coalesce((SELECT events FROM event_counts WHERE event_type = 'limit_reached'), 0),
    'pricing_viewed', coalesce((SELECT events FROM event_counts WHERE event_type = 'pricing_viewed'), 0),
    'upgrade_clicked', coalesce((SELECT events FROM event_counts WHERE event_type = 'upgrade_clicked'), 0),
    'upgrade_dismissed', coalesce((SELECT events FROM event_counts WHERE event_type = 'upgrade_dismissed'), 0),
    'checkout_started', coalesce((SELECT events FROM event_counts WHERE event_type = 'checkout_started'), 0),
    'trial_started', coalesce((SELECT events FROM event_counts WHERE event_type = 'trial_started'), 0),
    'subscribed', coalesce((SELECT events FROM event_counts WHERE event_type = 'subscribed'), 0),
    'cancelled', coalesce((SELECT events FROM event_counts WHERE event_type = 'cancelled'), 0)
  ),
  'users', jsonb_build_object(
    'limit_reached', coalesce((SELECT users FROM event_counts WHERE event_type = 'limit_reached'), 0),
    'pricing_viewed', coalesce((SELECT users FROM event_counts WHERE event_type = 'pricing_viewed'), 0),
    'upgrade_clicked', coalesce((SELECT users FROM event_counts WHERE event_type = 'upgrade_clicked'), 0),
    'upgrade_dismissed', coalesce((SELECT users FROM event_counts WHERE event_type = 'upgrade_dismissed'), 0),
    'checkout_started', coalesce((SELECT users FROM event_counts WHERE event_type = 'checkout_started'), 0),
    'trial_started', coalesce((SELECT users FROM event_counts WHERE event_type = 'trial_started'), 0),
    'subscribed', coalesce((SELECT users FROM event_counts WHERE event_type = 'subscribed'), 0),
    'cancelled', coalesce((SELECT users FROM event_counts WHERE event_type = 'cancelled'), 0)
  ),
  'surfaces', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'surface', s.surface,
      'events', coalesce(c.events, 0),
      'users', coalesce(c.users, 0)
    ) ORDER BY s.sort_order)
    FROM (VALUES ('question', 1), ('tool', 2), ('cpd', 3)) AS s(surface, sort_order)
    LEFT JOIN (
      SELECT surface, count(*) AS events, count(DISTINCT user_id) AS users
      FROM events
      WHERE event_type = 'limit_reached'
      GROUP BY surface
    ) c ON c.surface = s.surface
  ), '[]'::jsonb),
  'limit_features', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'feature', feature,
      'surface', surface,
      'events', events,
      'users', users
    ) ORDER BY events DESC, feature)
    FROM (
      SELECT feature, surface, count(*) AS events, count(DISTINCT user_id) AS users
      FROM events
      WHERE event_type = 'limit_reached'
      GROUP BY feature, surface
    ) f
  ), '[]'::jsonb),
  'by_grade', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'segment', segment,
      'limit_reached', limit_reached,
      'pricing_viewed', pricing_viewed,
      'upgrade_clicked', upgrade_clicked,
      'checkout_started', checkout_started,
      'trial_started', trial_started,
      'subscribed', subscribed,
      'cancelled', cancelled
    ) ORDER BY limit_reached DESC, subscribed DESC, segment)
    FROM (
      SELECT
        grade AS segment,
        count(*) FILTER (WHERE event_type = 'limit_reached')::int AS limit_reached,
        count(*) FILTER (WHERE event_type = 'pricing_viewed')::int AS pricing_viewed,
        count(*) FILTER (WHERE event_type = 'upgrade_clicked')::int AS upgrade_clicked,
        count(*) FILTER (WHERE event_type = 'checkout_started')::int AS checkout_started,
        count(*) FILTER (WHERE event_type = 'trial_started')::int AS trial_started,
        count(*) FILTER (WHERE event_type = 'subscribed')::int AS subscribed,
        count(*) FILTER (WHERE event_type = 'cancelled')::int AS cancelled
      FROM events
      GROUP BY grade
    ) g
  ), '[]'::jsonb),
  'by_tier', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'segment', segment,
      'limit_reached', limit_reached,
      'pricing_viewed', pricing_viewed,
      'upgrade_clicked', upgrade_clicked,
      'checkout_started', checkout_started,
      'trial_started', trial_started,
      'subscribed', subscribed,
      'cancelled', cancelled
    ) ORDER BY sort_order, segment)
    FROM (
      SELECT
        t.segment,
        t.sort_order,
        coalesce(c.limit_reached, 0) AS limit_reached,
        coalesce(c.pricing_viewed, 0) AS pricing_viewed,
        coalesce(c.upgrade_clicked, 0) AS upgrade_clicked,
        coalesce(c.checkout_started, 0) AS checkout_started,
        coalesce(c.trial_started, 0) AS trial_started,
        coalesce(c.subscribed, 0) AS subscribed,
        coalesce(c.cancelled, 0) AS cancelled
      FROM known_tiers t
      LEFT JOIN tier_counts c ON c.segment = t.segment
      UNION ALL
      SELECT
        c.segment,
        99,
        c.limit_reached,
        c.pricing_viewed,
        c.upgrade_clicked,
        c.checkout_started,
        c.trial_started,
        c.subscribed,
        c.cancelled
      FROM tier_counts c
      WHERE c.segment NOT IN ('guest', 'new', 'light', 'regular', 'heavy', 'power')
    ) tiers
  ), '[]'::jsonb),
  'pricing_sources', coalesce((
    SELECT jsonb_agg(jsonb_build_object('source', source, 'events', events, 'users', users) ORDER BY events DESC)
    FROM (
      SELECT source, count(*) AS events, count(DISTINCT user_id) AS users
      FROM events
      WHERE event_type = 'pricing_viewed'
      GROUP BY source
    ) s
  ), '[]'::jsonb),
  'upgrade_sources', coalesce((
    SELECT jsonb_agg(jsonb_build_object('source', source, 'events', events, 'users', users) ORDER BY events DESC)
    FROM (
      SELECT source, count(*) AS events, count(DISTINCT user_id) AS users
      FROM events
      WHERE event_type = 'upgrade_clicked'
      GROUP BY source
    ) s
  ), '[]'::jsonb),
  'limit_then_paid', coalesce((
    SELECT count(DISTINCT l.user_id)
    FROM events l
    JOIN events s ON s.user_id = l.user_id
    WHERE l.event_type = 'limit_reached'
      AND s.event_type = 'subscribed'
      AND s.created_at >= l.created_at
  ), 0),
  'mrr', jsonb_build_object(
    'subscribed_pence', coalesce((SELECT sum(mrr_pence) FROM events WHERE event_type = 'subscribed'), 0),
    'cancelled_pence', coalesce((SELECT sum(mrr_pence) FROM events WHERE event_type = 'cancelled'), 0),
    'trial_open_count', coalesce((SELECT count(*) FROM open_trials), 0),
    'trial_open_pence', coalesce((SELECT sum(list_mrr_pence) FROM open_trials), 0)
  ),
  'return_rates', jsonb_build_object(
    'prior_30d', coalesce(
      (SELECT payload FROM window_json WHERE key = 'prior_30d'),
      jsonb_build_object(
        'users', 0, 'matured_7d', 0, 'returned_7d', 0, 'return_7d_pct', NULL,
        'matured_14d', 0, 'returned_14d', 0, 'return_14d_pct', NULL,
        'matured_30d', 0, 'returned_30d', 0, 'return_30d_pct', NULL
      )
    ),
    'before', coalesce(
      (SELECT payload FROM window_json WHERE key = 'before'),
      jsonb_build_object(
        'users', 0, 'matured_7d', 0, 'returned_7d', 0, 'return_7d_pct', NULL,
        'matured_14d', 0, 'returned_14d', 0, 'return_14d_pct', NULL,
        'matured_30d', 0, 'returned_30d', 0, 'return_30d_pct', NULL
      )
    ),
    'after', CASE
      WHEN b.limits_changed_at IS NULL THEN NULL
      ELSE coalesce(
        (SELECT payload FROM window_json WHERE key = 'after'),
        jsonb_build_object(
          'users', 0, 'matured_7d', 0, 'returned_7d', 0, 'return_7d_pct', NULL,
          'matured_14d', 0, 'returned_14d', 0, 'return_14d_pct', NULL,
          'matured_30d', 0, 'returned_30d', 0, 'return_30d_pct', NULL
        )
      )
    END
  )
)
FROM bounds b;
$$;

COMMENT ON FUNCTION public.analytics_conversion_funnel() IS
  'Upgrade funnel, grade and usage-tier splits, MRR gained and lost, and 7/14/30-day return rates before and after the free-limit change.';

REVOKE ALL ON FUNCTION public.analytics_conversion_funnel() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_conversion_funnel() TO postgres, service_role;
