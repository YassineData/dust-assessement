-- Pre-sales diagnostic as a campaign type (shorter, tool-agnostic questionnaire for pre-pilots).
-- Run once in the Supabase SQL editor of the Dust project (ithaolycriiylnsxvatw). Safe to re-run. Nothing is deleted.

alter table public.campaigns drop constraint if exists campaigns_audience_check;
alter table public.campaigns add constraint campaigns_audience_check
  check (audience in ('general', 'sales', 'success', 'builders', 'presales'));
