-- =============================================================================
-- Umbil DEMO SEED: fill PSQ + MSF so Results unlock and AI output can be tested
-- =============================================================================
-- HOW TO USE (Supabase Dashboard → SQL Editor):
-- 1. Replace YOUR_USER_ID below with your auth.users / profiles.id (uuid).
-- 2. Run the whole script once.
-- 3. Open Portfolio → PSQ / MSF → open the "Demo …" cycle → Results & Reflection.
-- 4. Pro accounts can click Auto-Draft / wait for AI appraisal pack generation.
--
-- SAFETY: Creates NEW demo surveys/cycles only. Does not delete existing data.
-- Cleanup:
--   delete from public.psq_surveys where title like 'Demo PSQ%';
--   delete from public.msf_cycles where title like 'Demo MSF%';
-- =============================================================================

DO $$
DECLARE
  v_user_id_text text := 'YOUR_USER_ID';  -- <<< REPLACE THIS with your uuid
  v_user_id uuid;
  v_psq_id uuid;
  v_msf_id uuid;
  i int;
  v_appt text;
  v_role text;
  v_scores jsonb;
  v_answers jsonb;
  v_good text;
  v_improve text;
  v_strengths text;
  v_example text;
  v_dev text;
BEGIN
  IF v_user_id_text = 'YOUR_USER_ID'
     OR v_user_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Replace YOUR_USER_ID with your real profiles.id uuid before running.';
  END IF;

  v_user_id := v_user_id_text::uuid;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'No profiles row found for %. Check the uuid.', v_user_id;
  END IF;

  -- --------------------------------------------------------------------------
  -- PSQ: 34 responses (default unlock threshold)
  -- --------------------------------------------------------------------------
  INSERT INTO public.psq_surveys (user_id, title, required_responses, created_at)
  VALUES (
    v_user_id,
    'Demo PSQ — Appraisal Output Test',
    34,
    now() - interval '21 days'
  )
  RETURNING id INTO v_psq_id;

  -- If status column exists (from psq_survey_status.sql), keep survey open for collection UX.
  BEGIN
    EXECUTE 'UPDATE public.psq_surveys SET status = $1 WHERE id = $2'
      USING 'open', v_psq_id;
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  FOR i IN 1..34 LOOP
    v_appt := (ARRAY['Face-to-face','Phone','Video','Face-to-face','Face-to-face','Other'])[1 + ((i - 1) % 6)];
    v_good := (ARRAY[
      'Listened carefully and did not rush me.',
      'Explained my options clearly in plain English.',
      'Very respectful and made me feel comfortable.',
      'Took time to answer my questions thoroughly.',
      'Clear plan and I understood what happens next.',
      'Showed genuine care and concern for how I was feeling.'
    ])[1 + ((i - 1) % 6)];
    v_improve := CASE
      WHEN i % 5 = 0 THEN 'Could have explained the waiting time better.'
      WHEN i % 7 = 0 THEN 'Would like clearer follow-up information in writing.'
      WHEN i % 11 = 0 THEN 'More shared decision making about treatment choices.'
      ELSE NULL
    END;

    v_answers := jsonb_build_object(
      '1', 4 + (i % 2),
      '2', 4 + ((i + 1) % 2),
      '3', 5,
      '4', 5,
      '5', 4 + (i % 2),
      '6', CASE WHEN i % 9 = 0 THEN 3 ELSE 4 + (i % 2) END,
      '7', 4 + ((i + 2) % 2),
      '8', 5,
      '9', 5,
      '10', 4 + (i % 2),
      '11', 5,
      '12', v_good,
      '14', v_appt
    );
    IF v_improve IS NOT NULL THEN
      v_answers := v_answers || jsonb_build_object('13', v_improve);
    END IF;

    INSERT INTO public.psq_responses (survey_id, answers, created_at)
    VALUES (
      v_psq_id,
      v_answers,
      now() - ((34 - i) || ' days')::interval
    );
  END LOOP;

  -- --------------------------------------------------------------------------
  -- MSF: 15 responses (default unlock threshold) + close cycle
  -- --------------------------------------------------------------------------
  INSERT INTO public.msf_cycles (user_id, title, required_responses, status, created_at, updated_at)
  VALUES (
    v_user_id,
    'Demo MSF — Appraisal Output Test',
    15,
    'closed',
    now() - interval '14 days',
    now()
  )
  RETURNING id INTO v_msf_id;

  FOR i IN 1..15 LOOP
    v_role := (ARRAY[
      'Senior Doctor / Consultant',
      'Junior Doctor / Peer',
      'Nurse / Midwife',
      'Allied Health Professional (Physio, Pharmacist, etc.)',
      'Management / Administrative Staff',
      'Other'
    ])[1 + ((i - 1) % 6)];

    v_scores := jsonb_build_object(
      'q1', 4 + (i % 2),
      'q2', 5,
      'q3', 5,
      'q4', 5,
      'q5', 4 + ((i + 1) % 2),
      'q6', 4 + (i % 2),
      'q7', 5,
      'q8', 4 + ((i + 2) % 2),
      'q9', CASE WHEN i % 4 = 0 THEN 3 ELSE 4 END,
      'q10', 5
    );

    v_strengths := (ARRAY[
      'Excellent communicator and always approachable.',
      'Strong team player who supports juniors.',
      'Reliable, professional and calm under pressure.',
      'Clear teaching style and supportive to learners.',
      'Treats everyone with dignity and respect.'
    ])[1 + ((i - 1) % 5)];

    v_example := (ARRAY[
      'Stepped in to help during a busy clinic without being asked.',
      'Gave constructive feedback after a difficult case discussion.',
      'Explained a complex plan clearly to the wider MDT.',
      'Supported a new starter settling into the team.',
      'Raised a safety concern thoughtfully and followed it through.'
    ])[1 + ((i - 1) % 5)];

    v_dev := CASE
      WHEN i % 3 = 0 THEN 'Could delegate more during high-demand clinics.'
      WHEN i % 5 = 0 THEN 'Would benefit from sharing leadership tasks more widely.'
      ELSE NULL
    END;

    INSERT INTO public.msf_responses (
      cycle_id, role_type, scores,
      strengths_text, example_text, improvements_text, additional_comments, created_at
    ) VALUES (
      v_msf_id,
      v_role,
      v_scores,
      v_strengths,
      v_example,
      v_dev,
      CASE WHEN i % 6 = 0 THEN 'Would be happy for family to be cared for by this doctor.' ELSE NULL END,
      now() - ((15 - i) || ' days')::interval
    );
  END LOOP;

  RAISE NOTICE 'Seeded PSQ survey % with 34 responses', v_psq_id;
  RAISE NOTICE 'Seeded MSF cycle % with 15 responses (status=closed)', v_msf_id;
END $$;
