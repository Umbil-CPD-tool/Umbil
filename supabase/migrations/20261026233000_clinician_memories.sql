-- One row per thing Umbil remembers about a clinician.
-- Explicit notes (asked to remember, or typed on Profile) and, later, inferred ones.
-- Clinical facts stay out of this table. Delivery preferences live here.

CREATE TABLE public.clinician_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  source text NOT NULL DEFAULT 'explicit',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clinician_memories_body_len CHECK (char_length(body) BETWEEN 5 AND 400),
  CONSTRAINT clinician_memories_category_check CHECK (
    category IN ('role', 'communication', 'workflow', 'learning', 'general')
  ),
  CONSTRAINT clinician_memories_source_check CHECK (
    source IN ('explicit', 'manual', 'inferred', 'legacy')
  ),
  CONSTRAINT clinician_memories_status_check CHECK (status IN ('active', 'dismissed'))
);

COMMENT ON TABLE public.clinician_memories IS
  'Per-clinician memory notes used by Ask and tools. Delivery preferences only, not clinical facts.';

CREATE INDEX clinician_memories_user_active_idx
  ON public.clinician_memories (user_id, created_at)
  WHERE status = 'active';

CREATE UNIQUE INDEX clinician_memories_user_body_active_uidx
  ON public.clinician_memories (user_id, body)
  WHERE status = 'active';

ALTER TABLE public.clinician_memories ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.clinician_memories FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinician_memories TO authenticated;
GRANT ALL ON public.clinician_memories TO service_role;

CREATE POLICY clinician_memories_select_own
  ON public.clinician_memories
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY clinician_memories_insert_own
  ON public.clinician_memories
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY clinician_memories_update_own
  ON public.clinician_memories
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY clinician_memories_delete_own
  ON public.clinician_memories
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
