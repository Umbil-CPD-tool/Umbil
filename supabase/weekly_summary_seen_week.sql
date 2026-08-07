-- Run in Supabase SQL editor for the Weekly Summary feature.
-- Stores which ISO week the user last dismissed the end-of-week popup (multi-device sync).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weekly_summary_seen_week text;

COMMENT ON COLUMN public.profiles.weekly_summary_seen_week IS
  'ISO week key (e.g. 2026-W29) of the last weekly summary popup the user dismissed';
