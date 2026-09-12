-- Professional fields used to personalise answers and (later) aggregate
-- de-identified workforce reporting. All new columns are nullable so existing
-- rows stay valid. Run in the Supabase SQL editor or via migration.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS nation text,
  ADD COLUMN IF NOT EXISTS workplace_setting text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_nation_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_nation_check
  CHECK (
    nation IS NULL
    OR nation IN ('England', 'Scotland', 'Wales', 'Northern Ireland')
  );

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_workplace_setting_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_workplace_setting_check
  CHECK (
    workplace_setting IS NULL
    OR workplace_setting IN (
      'GP / Primary care',
      'Hospital',
      'Community',
      'Medical school',
      'Other'
    )
  );

COMMENT ON COLUMN public.profiles.specialty IS
  'Clinical specialty (free text with suggested values). Used to pitch answers and for aggregated reporting.';

COMMENT ON COLUMN public.profiles.nation IS
  'UK nation of practice. Used for NICE vs SIGN pitch and aggregated reporting.';

COMMENT ON COLUMN public.profiles.workplace_setting IS
  'Usual workplace setting. Used to choose community vs hospital framing.';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    grade,
    specialty,
    nation,
    workplace_setting
  )
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(BTRIM(meta->>'full_name'), ''),
    NULLIF(BTRIM(meta->>'grade'), ''),
    NULLIF(BTRIM(meta->>'specialty'), ''),
    NULLIF(BTRIM(meta->>'nation'), ''),
    NULLIF(BTRIM(meta->>'workplace_setting'), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
