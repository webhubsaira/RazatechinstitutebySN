create table public.enrollments (
  submission_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null check (char_length(btrim(full_name)) between 3 and 120),
  whatsapp_number text not null check (whatsapp_number ~ '^\+?[0-9]{10,15}$'),
  age_group text not null check (age_group in ('Under 18', '18-25', '26-40', '40+')),
  course text not null check (course in ('arabic', 'english', 'digital-marketing')),
  experience_level text not null check (experience_level in ('beginner', 'elementary', 'intermediate')),
  preferred_time text not null check (preferred_time in ('Flexible', 'Morning', 'Afternoon', 'Evening')),
  message text not null default '' check (char_length(message) <= 2000),
  created_at timestamptz not null default now()
);

alter table public.enrollments enable row level security;

create index enrollments_user_id_created_at_idx
  on public.enrollments (user_id, created_at desc);

revoke all on table public.enrollments from anon, authenticated;
grant select on table public.enrollments to authenticated;

create policy "Students can view their own enrollments"
  on public.enrollments
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create function public.submit_enrollment(
  p_submission_id uuid,
  p_full_name text,
  p_whatsapp_number text,
  p_age_group text,
  p_course text,
  p_experience_level text,
  p_preferred_time text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_email_confirmed_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Sign in is required to submit an enrollment.'
      using errcode = '42501';
  end if;

  select users.email, users.email_confirmed_at
    into v_email, v_email_confirmed_at
    from auth.users as users
    where users.id = v_user_id;

  if v_email is null or v_email_confirmed_at is null then
    raise exception 'Verify your email before submitting an enrollment.'
      using errcode = '42501';
  end if;

  insert into public.enrollments (
    submission_id,
    user_id,
    email,
    full_name,
    whatsapp_number,
    age_group,
    course,
    experience_level,
    preferred_time,
    message
  )
  values (
    p_submission_id,
    v_user_id,
    lower(v_email),
    p_full_name,
    p_whatsapp_number,
    p_age_group,
    p_course,
    p_experience_level,
    p_preferred_time,
    coalesce(p_message, '')
  )
  on conflict (submission_id) do nothing;

  return p_submission_id;
end;
$$;

revoke all on function public.submit_enrollment(uuid, text, text, text, text, text, text, text)
  from public, anon;
grant execute on function public.submit_enrollment(uuid, text, text, text, text, text, text, text)
  to authenticated;

create function public.save_verified_signup_enrollment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enrollment jsonb := new.raw_user_meta_data -> 'pending_enrollment';
begin
  if old.email_confirmed_at is not null or new.email_confirmed_at is null or v_enrollment is null then
    return new;
  end if;

  insert into public.enrollments (
    submission_id,
    user_id,
    email,
    full_name,
    whatsapp_number,
    age_group,
    course,
    experience_level,
    preferred_time,
    message
  )
  values (
    (v_enrollment ->> 'submission_id')::uuid,
    new.id,
    lower(new.email),
    v_enrollment ->> 'full_name',
    v_enrollment ->> 'whatsapp_number',
    v_enrollment ->> 'age_group',
    v_enrollment ->> 'course',
    v_enrollment ->> 'experience_level',
    v_enrollment ->> 'preferred_time',
    coalesce(v_enrollment ->> 'message', '')
  )
  on conflict (submission_id) do nothing;

  return new;
end;
$$;

revoke all on function public.save_verified_signup_enrollment() from public, anon, authenticated;

create trigger save_verified_signup_enrollment
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.save_verified_signup_enrollment();
