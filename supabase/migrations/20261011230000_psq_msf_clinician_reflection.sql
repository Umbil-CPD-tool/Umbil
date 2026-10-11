alter table public.psq_surveys
  add column if not exists clinician_reflection text;

alter table public.msf_cycles
  add column if not exists clinician_reflection text;
