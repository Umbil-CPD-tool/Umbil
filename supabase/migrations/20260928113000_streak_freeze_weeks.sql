-- Weeks a learner chose to protect with a streak freeze.
-- Empty weeks are never frozen automatically.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS streak_freeze_weeks text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.profiles.streak_freeze_weeks IS
  'ISO week keys (YYYY-Www) the user chose to protect with a streak freeze.';
