ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'cms',
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS posts_external_id_unique
  ON public.posts (external_id)
  WHERE external_id IS NOT NULL;
