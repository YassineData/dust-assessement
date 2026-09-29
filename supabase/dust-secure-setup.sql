-- =====================================================================
-- Dust AI Maturity Assessment: secure database setup
-- Run ONCE in a NEW, empty Supabase project (SQL Editor → New query → Run).
--
-- Access model
--   • Public site (anon key) sees NOTHING directly. Respondents only go through
--     the functions below, which only touch their own row (per-respondent token).
--   • Dust admins send header `x-admin-key`; the key is stored hashed (bcrypt) in
--     app_secrets and never ships in the front-end bundle.
--   • A client opens its private results link (/dashboard?key=…) and sends
--     header `x-access-key`: it only sees its own campaign.
--
-- After running this file, set the admin key (see the last section).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
do $$ begin
  create type public.assessment_status as enum ('not_started', 'in_progress', 'completed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.assessment_type as enum ('sales', 'generic');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.campaign_member_role as enum ('participant', 'manager', 'admin', 'consultant');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.participant_profile as enum ('traditional', 'novice', 'curious', 'performer', 'ambassador');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  code varchar(8) not null unique,
  company_name text not null,
  campaign_name text,
  creator_email text not null,
  creator_first_name text not null default 'Dust',
  creator_last_name text not null default '-',
  assessment_type public.assessment_type not null default 'generic',
  language text not null default 'en',
  template_id uuid,
  -- Secret of the client's private results link. Never readable by the public.
  access_key text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  company_name text not null,
  company_domain text,
  team text,
  status public.assessment_status not null default 'in_progress',
  responses jsonb,
  item_scores jsonb,
  global_score integer,
  profile public.participant_profile,
  started_at timestamptz default now(),
  completed_at timestamptz,
  autoconnect_token text not null default encode(extensions.gen_random_bytes(16), 'hex'),
  -- Secret held by the respondent's browser: the only way to read or update this row publicly.
  respondent_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, email)
);
create index if not exists participants_campaign_idx on public.participants (campaign_id);

create table if not exists public.campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  email text not null,
  role public.campaign_member_role not null default 'manager',
  created_at timestamptz not null default now()
);

-- Server-side secrets (hashed admin key). No policy: unreadable through the API.
create table if not exists public.app_secrets (
  name text primary key,
  value text not null
);

-- updated_at
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists campaigns_touch on public.campaigns;
create trigger campaigns_touch before update on public.campaigns for each row execute function public.touch_updated_at();
drop trigger if exists participants_touch on public.participants;
create trigger participants_touch before update on public.participants for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Access helpers (read the request headers sent by the app)
-- ---------------------------------------------------------------------
create or replace function public.req_header(p_name text) returns text
language sql stable as $$
  select coalesce((current_setting('request.headers', true)::json) ->> lower(p_name), '')
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select public.req_header('x-admin-key') <> ''
     and exists (
       select 1 from public.app_secrets s
       where s.name = 'admin_key'
         and s.value = extensions.crypt(public.req_header('x-admin-key'), s.value)
     )
$$;

create or replace function public.has_campaign_access(p_campaign uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.req_header('x-access-key') <> ''
     and exists (
       select 1 from public.campaigns c
       where c.id = p_campaign and c.access_key = public.req_header('x-access-key')
     )
$$;

-- ---------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------
alter table public.campaigns enable row level security;
alter table public.participants enable row level security;
alter table public.campaign_members enable row level security;
alter table public.app_secrets enable row level security;

drop policy if exists campaigns_read on public.campaigns;
create policy campaigns_read on public.campaigns for select using (public.is_admin() or public.has_campaign_access(id));
drop policy if exists campaigns_insert on public.campaigns;
create policy campaigns_insert on public.campaigns for insert with check (public.is_admin());
drop policy if exists campaigns_update on public.campaigns;
create policy campaigns_update on public.campaigns for update using (public.is_admin() or public.has_campaign_access(id));
drop policy if exists campaigns_delete on public.campaigns;
create policy campaigns_delete on public.campaigns for delete using (public.is_admin());

drop policy if exists participants_read on public.participants;
create policy participants_read on public.participants for select using (public.is_admin() or public.has_campaign_access(campaign_id));
drop policy if exists participants_update on public.participants;
create policy participants_update on public.participants for update using (public.is_admin() or public.has_campaign_access(campaign_id));
drop policy if exists participants_delete on public.participants;
create policy participants_delete on public.participants for delete using (public.is_admin() or public.has_campaign_access(campaign_id));
-- No insert policy: respondents register through start_participant().

drop policy if exists members_all on public.campaign_members;
create policy members_all on public.campaign_members for all
  using (public.is_admin() or public.has_campaign_access(campaign_id))
  with check (public.is_admin() or public.has_campaign_access(campaign_id));

-- ---------------------------------------------------------------------
-- Functions used by the public survey (the only public entry points)
-- ---------------------------------------------------------------------

-- Campaign code generator (8 chars, unique)
create or replace function public.generate_campaign_code() returns varchar
language plpgsql security definer set search_path = public as $$
declare v_code varchar(8);
begin
  loop
    v_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
    exit when not exists (select 1 from public.campaigns where code = v_code);
  end loop;
  return v_code;
end $$;

-- What a respondent needs to know about a campaign, and nothing more
create or replace function public.get_campaign_by_code(p_code text)
returns table (id uuid, company_name text, assessment_type public.assessment_type, language text)
language sql stable security definer set search_path = public as $$
  select c.id, c.company_name, c.assessment_type, c.language
  from public.campaigns c where c.code = upper(trim(p_code))
$$;

-- Register (or resume, with the token held by this browser)
create or replace function public.start_participant(
  p_code text, p_first_name text, p_last_name text, p_email text, p_token uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_campaign public.campaigns%rowtype;
  v_p public.participants%rowtype;
  v_email text := lower(trim(p_email));
begin
  select * into v_campaign from public.campaigns where code = upper(trim(p_code));
  if not found then return jsonb_build_object('error', 'invalid_code'); end if;

  select * into v_p from public.participants where campaign_id = v_campaign.id and lower(email) = v_email;
  if found then
    if p_token is not null and v_p.respondent_token = p_token then
      return jsonb_build_object('id', v_p.id, 'token', v_p.respondent_token, 'status', v_p.status,
        'responses', v_p.responses, 'resumed', true);
    end if;
    -- Someone already answered with this email from another browser: never expose their answers.
    return jsonb_build_object('error', 'already_registered', 'status', v_p.status);
  end if;

  insert into public.participants (campaign_id, first_name, last_name, email, company_name, status, started_at, respondent_token)
  values (v_campaign.id, left(trim(p_first_name), 120), left(trim(p_last_name), 120), v_email, v_campaign.company_name,
          'in_progress', now(), coalesce(p_token, gen_random_uuid()))
  returning * into v_p;
  return jsonb_build_object('id', v_p.id, 'token', v_p.respondent_token, 'status', v_p.status, 'resumed', false);
end $$;

-- Save progress / submit (only with the respondent's own token)
create or replace function public.save_participant(
  p_id uuid, p_token uuid, p_responses jsonb, p_item_scores jsonb, p_team text,
  p_completed boolean, p_global_score integer
) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.participants set
    responses = p_responses,
    item_scores = p_item_scores,
    team = left(p_team, 120),
    status = case when p_completed then 'completed'::public.assessment_status else status end,
    completed_at = case when p_completed then now() else completed_at end,
    global_score = case when p_completed then p_global_score else global_score end,
    profile = null
  where id = p_id and respondent_token = p_token;
  return found;
end $$;

-- Benchmark across all rollouts: scores only, no names or emails
create or replace function public.global_benchmark() returns setof jsonb
language sql stable security definer set search_path = public as $$
  select item_scores from public.participants where status = 'completed' and item_scores is not null
$$;

-- Login checks used by the console
create or replace function public.check_admin() returns boolean
language sql stable security definer set search_path = public as $$ select public.is_admin() $$;

-- ---------------------------------------------------------------------
-- Grants: the public role can only call these functions
-- ---------------------------------------------------------------------
revoke all on public.app_secrets from anon, authenticated;
revoke execute on function public.is_admin() from public;
revoke execute on function public.has_campaign_access(uuid) from public;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.has_campaign_access(uuid) to anon, authenticated;
grant execute on function public.req_header(text) to anon, authenticated;
grant execute on function public.generate_campaign_code() to anon, authenticated;
grant execute on function public.get_campaign_by_code(text) to anon, authenticated;
grant execute on function public.start_participant(text, text, text, text, uuid) to anon, authenticated;
grant execute on function public.save_participant(uuid, uuid, jsonb, jsonb, text, boolean, integer) to anon, authenticated;
grant execute on function public.global_benchmark() to anon, authenticated;
grant execute on function public.check_admin() to anon, authenticated;
grant select, insert, update, delete on public.campaigns, public.participants, public.campaign_members to anon, authenticated;

-- =====================================================================
-- LAST STEP: set the Dust admin key (choose your own, long and secret).
-- Replace the text between quotes, run this line alone, then delete it from the editor.
--
--   insert into public.app_secrets (name, value)
--   values ('admin_key', extensions.crypt('CHOOSE-A-LONG-SECRET-KEY', extensions.gen_salt('bf')))
--   on conflict (name) do update set value = excluded.value;
--
-- Share this key only with the Dust team members who need full access.
-- =====================================================================
