-- Survey type and optional custom intro, stored with each campaign.
-- Run once in the Supabase SQL editor of the Dust project (ithaolycriiylnsxvatw). Safe to re-run.
-- Nothing is deleted: existing campaigns get the default type ("general", all teams).

alter table public.campaigns add column if not exists audience text not null default 'general';
alter table public.campaigns drop constraint if exists campaigns_audience_check;
alter table public.campaigns add constraint campaigns_audience_check
  check (audience in ('general', 'sales', 'success', 'builders'));
-- Optional intro written by the Dust team for this client: {"title": "...", "body": "..."}
alter table public.campaigns add column if not exists intro jsonb;

-- The survey reads the type and intro from the campaign code (its return type changes, hence the drop).
drop function if exists public.get_campaign_by_code(text);
create function public.get_campaign_by_code(p_code text)
returns table (id uuid, company_name text, assessment_type public.assessment_type, language text, audience text, intro jsonb)
language sql stable security definer set search_path = public as $$
  select c.id, c.company_name, c.assessment_type, c.language, c.audience, c.intro
  from public.campaigns c where c.code = upper(trim(p_code))
$$;
revoke execute on function public.get_campaign_by_code(text) from public;
grant execute on function public.get_campaign_by_code(text) to anon, authenticated;
