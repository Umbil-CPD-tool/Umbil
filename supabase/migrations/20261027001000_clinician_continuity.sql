-- Habits Umbil has noticed but not yet applied, plus a short note per conversation
-- so a later question can pick up earlier work. Notes are delivery context, not guidelines.

CREATE TABLE public.clinician_memory_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  signal_key text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'communication',
  count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'counting',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clinician_memory_signals_count_check CHECK (count BETWEEN 1 AND 20),
  CONSTRAINT clinician_memory_signals_body_len CHECK (char_length(body) BETWEEN 5 AND 400),
  CONSTRAINT clinician_memory_signals_category_check CHECK (
    category IN ('role', 'communication', 'workflow', 'learning', 'general')
  ),
  CONSTRAINT clinician_memory_signals_status_check CHECK (
    status IN ('counting', 'promoted', 'dismissed')
  ),
  CONSTRAINT clinician_memory_signals_user_key UNIQUE (user_id, signal_key)
);

COMMENT ON TABLE public.clinician_memory_signals IS
  'Repeated style corrections. Promoted into clinician_memories after three of the same kind.';

CREATE INDEX clinician_memory_signals_user_idx
  ON public.clinician_memory_signals (user_id, status);

ALTER TABLE public.clinician_memory_signals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.clinician_memory_signals FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON public.clinician_memory_signals TO authenticated;
GRANT ALL ON public.clinician_memory_signals TO service_role;

CREATE POLICY clinician_memory_signals_select_own
  ON public.clinician_memory_signals
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY clinician_memory_signals_update_own
  ON public.clinician_memory_signals
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE TABLE public.conversation_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  conversation_id text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversation_notes_title_len CHECK (char_length(title) BETWEEN 1 AND 120),
  CONSTRAINT conversation_notes_summary_len CHECK (char_length(summary) BETWEEN 1 AND 800),
  CONSTRAINT conversation_notes_user_conversation UNIQUE (user_id, conversation_id)
);

COMMENT ON TABLE public.conversation_notes IS
  'Short redacted note per chat so Umbil can continue earlier work for the same clinician.';

CREATE INDEX conversation_notes_user_updated_idx
  ON public.conversation_notes (user_id, updated_at DESC);

ALTER TABLE public.conversation_notes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.conversation_notes FROM PUBLIC, anon;
GRANT SELECT ON public.conversation_notes TO authenticated;
GRANT ALL ON public.conversation_notes TO service_role;

CREATE POLICY conversation_notes_select_own
  ON public.conversation_notes
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
