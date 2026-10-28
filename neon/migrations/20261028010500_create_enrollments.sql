create table if not exists public.enrollments (
  submission_id uuid primary key,
  full_name text not null check (char_length(btrim(full_name)) between 3 and 120),
  whatsapp_number text not null check (whatsapp_number ~ '^\+?[0-9]{10,15}$'),
  age_group text not null check (age_group in ('Under 18', '18-25', '26-40', '40+')),
  course text not null check (course in ('arabic', 'english', 'digital-marketing')),
  experience_level text not null check (experience_level in ('beginner', 'elementary', 'intermediate')),
  preferred_time text not null check (preferred_time in ('Flexible', 'Morning', 'Afternoon', 'Evening')),
  message text not null default '' check (char_length(message) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists enrollments_created_at_idx
  on public.enrollments (created_at desc);

create schema if not exists private;

create table if not exists private.enrollment_rate_limits (
  ip_hash text primary key check (ip_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

create or replace function public.submit_public_enrollment(
  p_submission_id uuid,
  p_full_name text,
  p_whatsapp_number text,
  p_age_group text,
  p_course text,
  p_experience_level text,
  p_preferred_time text,
  p_message text,
  p_ip_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  if p_submission_id is null
    or p_ip_hash is null
    or p_ip_hash !~ '^[a-f0-9]{64}$'
    or p_full_name is null
    or char_length(btrim(p_full_name)) not between 3 and 120
    or p_whatsapp_number is null
    or p_whatsapp_number !~ '^\+?[0-9]{10,15}$'
    or p_age_group not in ('Under 18', '18-25', '26-40', '40+')
    or p_course not in ('arabic', 'english', 'digital-marketing')
    or p_experience_level not in ('beginner', 'elementary', 'intermediate')
    or p_preferred_time not in ('Flexible', 'Morning', 'Afternoon', 'Evening')
    or char_length(coalesce(p_message, '')) > 2000 then
    raise exception 'invalid_enrollment'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_ip_hash, 0));

  delete from private.enrollment_rate_limits
    where window_started_at < pg_catalog.now() - interval '24 hours';

  select rate_limits.window_started_at, rate_limits.request_count
    into v_window_started_at, v_request_count
    from private.enrollment_rate_limits as rate_limits
    where rate_limits.ip_hash = p_ip_hash
    for update;

  if not found then
    insert into private.enrollment_rate_limits (ip_hash, window_started_at, request_count)
      values (p_ip_hash, pg_catalog.now(), 1);
  elsif v_window_started_at <= pg_catalog.now() - interval '15 minutes' then
    update private.enrollment_rate_limits
      set window_started_at = pg_catalog.now(), request_count = 1
      where ip_hash = p_ip_hash;
  elsif v_request_count >= 5 then
    raise exception 'rate_limited'
      using errcode = 'P0001';
  else
    update private.enrollment_rate_limits
      set request_count = request_count + 1
      where ip_hash = p_ip_hash;
  end if;

  insert into public.enrollments (
    submission_id,
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
    btrim(p_full_name),
    p_whatsapp_number,
    p_age_group,
    p_course,
    p_experience_level,
    p_preferred_time,
    coalesce(btrim(p_message), '')
  );

  return p_submission_id;
end;
$$;

revoke all on function public.submit_public_enrollment(uuid, text, text, text, text, text, text, text, text)
  from public;
