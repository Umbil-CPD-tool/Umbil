-- Keep a non-versioned copy for local docs / manual apply.
-- Prefer supabase/migrations/20260924220000_acquisition_touches.sql.

CREATE TABLE IF NOT EXISTS public.acquisition_touches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  source text NOT NULL,
  medium text,
  campaign text,
  content text,
  click_id text,
  captured_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  claimed_at timestamptz
);

CREATE INDEX IF NOT EXISTS acquisition_touches_device_unclaimed_idx
  ON public.acquisition_touches (device_id, captured_at)
  WHERE claimed_by IS NULL;

ALTER TABLE public.acquisition_touches ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.acquisition_touches FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.acquisition_touches TO service_role;
