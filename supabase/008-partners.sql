-- Deployment partners: a partner sees its own clients, Dust sees everything (and a « Partenaires » view),
-- a partner never sees Dust's direct clients or another partner's.
--
--   • public.partners: name, email domains (who can sign in for that partner), optional logo. Only Dust edits it.
--   • campaigns.partner_id: the partner a campaign belongs to (empty = Dust direct).
--   • A person signed in with the email link whose domain belongs to an active partner reads and edits
--     that partner's campaigns and their answers, and can create campaigns for it. Enforced here (RLS),
--     not only in the app.
--   • hook_dust_only now also lets partner domains receive a sign-in link (still nobody else).
--
-- Run once in the Supabase SQL editor of the Dust project (ithaolycriiylnsxvatw), after 007. Safe to re-run.
-- Nothing is deleted. Existing access (admin key, @dust.tt, client results links) is unchanged.

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  domains text[] not null default '{}',
  logo_url text check (logo_url is null or logo_url ~ '^https://'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.partners enable row level security;

alter table public.campaigns add column if not exists partner_id uuid references public.partners(id) on delete set null;
create index if not exists campaigns_partner_idx on public.campaigns(partner_id);

-- Partner of the signed-in person, from their email domain (null for everyone else).
create or replace function public.my_partner_id() returns uuid
language sql stable security definer set search_path = public as $$
  select p.id from public.partners p
  where p.active
    and coalesce(auth.role(), '') = 'authenticated'
    and split_part(lower(coalesce(auth.jwt() ->> 'email', '')), '@', 2) = any(p.domains)
  order by p.created_at
  limit 1
$$;

create or replace function public.is_partner_of(p_campaign uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.campaigns c
    where c.id = p_campaign and c.partner_id is not null and c.partner_id = public.my_partner_id()
  )
$$;

-- What the console needs to open the partner space: who am I for which partner.
create or replace function public.partner_me() returns table (id uuid, name text, logo_url text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.logo_url from public.partners p where p.id = public.my_partner_id()
$$;

-- Dust only: one row per partner with its clients, campaigns, answers and average readiness.
create or replace function public.partner_overview()
returns table (partner_id uuid, campaigns bigint, clients bigint, completed bigint, readiness numeric)
language sql stable security definer set search_path = public as $$
  select c.partner_id,
    count(distinct c.id),
    count(distinct lower(trim(c.company_name))),
    count(p.id) filter (where p.status = 'completed'),
    round(avg((p.item_scores ->> 'readiness')::numeric) filter (where p.status = 'completed' and p.item_scores ? 'readiness'))
  from public.campaigns c
  left join public.participants p on p.campaign_id = c.id
  where public.is_admin() and c.partner_id is not null
  group by c.partner_id
$$;

-- Partners table: partners read their own row, Dust does everything.
drop policy if exists partners_read on public.partners;
create policy partners_read on public.partners for select using (public.is_admin() or id = public.my_partner_id());
drop policy if exists partners_write on public.partners;
create policy partners_write on public.partners for all using (public.is_admin()) with check (public.is_admin());

-- Campaigns: + the partner's own.
drop policy if exists campaigns_read on public.campaigns;
create policy campaigns_read on public.campaigns for select
  using (public.is_admin() or public.has_campaign_access(id) or (partner_id is not null and partner_id = public.my_partner_id()));
drop policy if exists campaigns_insert on public.campaigns;
create policy campaigns_insert on public.campaigns for insert
  with check (public.is_admin() or (partner_id is not null and partner_id = public.my_partner_id()));
drop policy if exists campaigns_update on public.campaigns;
create policy campaigns_update on public.campaigns for update
  using (public.is_admin() or public.has_campaign_access(id) or (partner_id is not null and partner_id = public.my_partner_id()));
drop policy if exists campaigns_delete on public.campaigns;
create policy campaigns_delete on public.campaigns for delete
  using (public.is_admin() or (partner_id is not null and partner_id = public.my_partner_id()));

-- Only Dust moves a campaign from one partner to another.
create or replace function public.guard_campaign_partner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.partner_id is distinct from old.partner_id and not public.is_admin() then
    raise exception 'Only Dust can change the partner of a campaign';
  end if;
  return new;
end $$;
drop trigger if exists campaigns_partner_guard on public.campaigns;
create trigger campaigns_partner_guard before update on public.campaigns for each row execute function public.guard_campaign_partner();

-- Answers of the partner's campaigns.
drop policy if exists participants_read on public.participants;
create policy participants_read on public.participants for select
  using (public.is_admin() or public.has_campaign_access(campaign_id) or public.is_partner_of(campaign_id));
drop policy if exists participants_update on public.participants;
create policy participants_update on public.participants for update
  using (public.is_admin() or public.has_campaign_access(campaign_id) or public.is_partner_of(campaign_id));
drop policy if exists participants_delete on public.participants;
create policy participants_delete on public.participants for delete
  using (public.is_admin() or public.has_campaign_access(campaign_id) or public.is_partner_of(campaign_id));
drop policy if exists participants_insert on public.participants;
create policy participants_insert on public.participants for insert
  with check (public.is_admin() or public.is_partner_of(campaign_id));

drop policy if exists members_all on public.campaign_members;
create policy members_all on public.campaign_members for all
  using (public.is_admin() or public.has_campaign_access(campaign_id) or public.is_partner_of(campaign_id))
  with check (public.is_admin() or public.has_campaign_access(campaign_id) or public.is_partner_of(campaign_id));

-- The survey shows the partner next to Dust (name and logo only).
drop function if exists public.get_campaign_by_code(text);
create function public.get_campaign_by_code(p_code text)
returns table (id uuid, company_name text, assessment_type public.assessment_type, language text, audience text, intro jsonb, wave text, partner_name text, partner_logo text)
language sql stable security definer set search_path = public as $$
  select c.id, c.company_name, c.assessment_type, c.language, c.audience, c.intro, c.wave, p.name, p.logo_url
  from public.campaigns c left join public.partners p on p.id = c.partner_id and p.active
  where c.code = upper(trim(p_code))
$$;

-- Sign-in links: @dust.tt, or a domain of an active partner. Nobody else gets an email.
create or replace function public.hook_dust_only(event jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(coalesce(event -> 'user' ->> 'email', ''));
begin
  if v_email like '%@dust.tt'
     or exists (select 1 from public.partners p where p.active and split_part(v_email, '@', 2) = any(p.domains)) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object('http_code', 403, 'message', 'Only Dust and its partners can sign in.')
  );
end $$;

revoke execute on function public.my_partner_id() from public;
revoke execute on function public.is_partner_of(uuid) from public;
revoke execute on function public.partner_me() from public;
revoke execute on function public.partner_overview() from public;
revoke execute on function public.get_campaign_by_code(text) from public;
revoke execute on function public.hook_dust_only(jsonb) from authenticated, anon, public;
grant execute on function public.my_partner_id() to anon, authenticated;
grant execute on function public.is_partner_of(uuid) to anon, authenticated;
grant execute on function public.partner_me() to anon, authenticated;
grant execute on function public.partner_overview() to anon, authenticated;
grant execute on function public.get_campaign_by_code(text) to anon, authenticated;
grant execute on function public.hook_dust_only(jsonb) to supabase_auth_admin;
grant select on public.partners to supabase_auth_admin;
grant select, insert, update, delete on public.partners to anon, authenticated;
