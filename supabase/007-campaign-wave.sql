-- Client follow-up (« Suivi » tab).
-- 1. campaigns.wave: where a campaign sits in a client's journey.
--    baseline = before the kickoff, remeasure = same survey later, pulse = short check during the rollout, review = end of rollout.
--    Empty is allowed: the console then reads the client's first campaign as the baseline and later ones as re-measures.
-- 2. campaigns.workflows: the workflows agreed at the kickoff and their status at that wave, [{id, title, team, status}].
-- 2b. campaigns.usage: actual Dust usage at that wave, imported from a workspace usage export (agents, messages, active users; totals only).
-- 3. get_campaign_by_code also returns the wave, so a pulse or review link opens the matching survey.
-- 4. get_client_timeline: lets a client (private results link) see the follow-up of their own company,
--    read only, scores and statements only (no names, emails or open answers of other campaigns).
-- Run once in the Supabase SQL editor of the Dust project (ithaolycriiylnsxvatw). Safe to re-run. Nothing is deleted.

alter table public.campaigns add column if not exists wave text;
alter table public.campaigns drop constraint if exists campaigns_wave_check;
alter table public.campaigns add constraint campaigns_wave_check
  check (wave is null or wave in ('baseline', 'remeasure', 'pulse', 'review'));

alter table public.campaigns add column if not exists workflows jsonb;
alter table public.campaigns add column if not exists usage jsonb;

drop function if exists public.get_campaign_by_code(text);
create function public.get_campaign_by_code(p_code text)
returns table (id uuid, company_name text, assessment_type public.assessment_type, language text, audience text, intro jsonb, wave text)
language sql stable security definer set search_path = public as $$
  select c.id, c.company_name, c.assessment_type, c.language, c.audience, c.intro, c.wave
  from public.campaigns c where c.code = upper(trim(p_code))
$$;
revoke execute on function public.get_campaign_by_code(text) from public;
grant execute on function public.get_campaign_by_code(text) to anon, authenticated;

drop function if exists public.get_client_timeline();
create function public.get_client_timeline()
returns table (id uuid, code text, company_name text, campaign_name text, created_at timestamptz, audience text, wave text, workflows jsonb, usage jsonb, results jsonb)
language sql stable security definer set search_path = public as $$
  with mine as (
    select lower(trim(c.company_name)) as company
    from public.campaigns c
    where public.req_header('x-access-key') <> '' and c.access_key = public.req_header('x-access-key')
    limit 1
  )
  select c.id, c.code, c.company_name, c.campaign_name, c.created_at, c.audience, c.wave, c.workflows, c.usage,
    coalesce((
      select jsonb_agg(jsonb_build_object('item_scores', p.item_scores, 'answers', p.responses -> 'answers', 'dims', p.responses -> 'dims'))
      from public.participants p
      where p.campaign_id = c.id and p.status = 'completed'
    ), '[]'::jsonb)
  from public.campaigns c, mine
  where lower(trim(c.company_name)) = mine.company
  order by c.created_at
$$;
revoke execute on function public.get_client_timeline() from public;
grant execute on function public.get_client_timeline() to anon, authenticated;
