-- Copy a missing login email onto the profile so the student Pro trigger can see it.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  ON CONFLICT (id) DO UPDATE
  SET email = COALESCE(public.profiles.email, EXCLUDED.email)
  WHERE public.profiles.email IS NULL;
  RETURN NEW;
END;
$function$;

-- Confirmed .ac.uk accounts whose profile never stored the email stayed on the free search cap.
UPDATE public.profiles AS p
SET
  email = u.email,
  is_pro = true
FROM auth.users AS u
WHERE p.id = u.id
  AND u.email_confirmed_at IS NOT NULL
  AND u.email ILIKE '%.ac.uk'
  AND (
    p.email IS NULL
    OR COALESCE(p.is_pro, false) = false
  );
