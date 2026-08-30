-- Run in the Supabase SQL editor to let patient feedback links be closed.
-- msf_cycles already has this column; psq_surveys did not, so a PSQ link stayed
-- open indefinitely and kept accepting anonymous responses.

ALTER TABLE public.psq_surveys
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';

COMMENT ON COLUMN public.psq_surveys.status IS
  'open | closed — a closed survey rejects new anonymous responses at /api/public/psq';
