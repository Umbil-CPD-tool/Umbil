-- 14-day notice window for complimentary Pro that is not an admin, paying, or trial account.
-- Admins (contributors, promoters, and internal test logins) are left on complimentary Pro.

create table if not exists public.pro_access_notices (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  offer text not null check (offer in ('student', 'clinician')),
  access_until timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.pro_access_notices enable row level security;

revoke all on table public.pro_access_notices from anon, authenticated;
grant all on table public.pro_access_notices to service_role;

comment on table public.pro_access_notices is
  'Server-only complimentary Pro notice. Clients cannot read or write it.';

insert into public.pro_access_notices (user_id, offer, access_until)
select
  p.id,
  case
    when coalesce(p.grade, '') ~* 'student|pre[[:space:]-]*med|[1-6](st|nd|rd|th)[[:space:]]+year|(^|[^a-z])y[1-6]([^a-z]|$)'
      and coalesce(p.grade, '') !~* '(^|[^a-z])(gp|anp)([^a-z]|$)|fy[[:space:]]*[12]|paramedic|consultant|registrar|doctor|educator|pharmacist'
      then 'student'
    when coalesce(p.grade, '') ~* '(^|[^a-z])(gp|anp)([^a-z]|$)|fy[[:space:]]*[12]|paramedic|consultant|registrar|doctor|educator|pharmacist'
      and coalesce(p.grade, '') !~* 'student|pre[[:space:]-]*med|[1-6](st|nd|rd|th)[[:space:]]+year|(^|[^a-z])y[1-6]([^a-z]|$)'
      then 'clinician'
    when coalesce(p.email, '') ~* '@([a-z0-9.-]+\.)?(student|study)\.'
      or coalesce(p.academic_email, '') ~* '@([a-z0-9.-]+\.)?(student|study)\.'
      or split_part(coalesce(p.email, ''), '@', 1) ~* 'student'
      or split_part(coalesce(p.academic_email, ''), '@', 1) ~* 'student'
      then 'student'
    when coalesce(p.email, '') ~* '\.ac\.uk$'
      or coalesce(p.academic_email, '') ~* '\.ac\.uk$'
      then 'student'
    else 'clinician'
  end,
  timestamptz '2026-11-29 23:59:59+00'
from public.profiles p
where p.is_pro is true
  and p.is_admin is not true
  and lower(coalesce(p.email, '')) <> 'umbil.support@gmail.com'
  and coalesce(p.subscription_status, '') not in ('active', 'trialing', 'past_due')
on conflict (user_id) do nothing;

-- Authenticated clients can edit their own profile, but not billing or admin flags.
create or replace function public.protect_profile_billing_fields()
returns trigger
language plpgsql
security invoker
as $$
begin
  if auth.role() is null or auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_pro := false;
    new.is_admin := false;
    new.subscription_status := null;
    new.stripe_customer_id := null;
    new.plan_type := null;
    new.current_period_end := null;
    return new;
  end if;

  new.is_pro := old.is_pro;
  new.is_admin := old.is_admin;
  new.subscription_status := old.subscription_status;
  new.stripe_customer_id := old.stripe_customer_id;
  new.plan_type := old.plan_type;
  new.current_period_end := old.current_period_end;
  return new;
end;
$$;

drop trigger if exists protect_profile_billing_fields on public.profiles;
create trigger protect_profile_billing_fields
  before insert or update on public.profiles
  for each row
  execute function public.protect_profile_billing_fields();

revoke all on function public.protect_profile_billing_fields() from public, anon, authenticated;
