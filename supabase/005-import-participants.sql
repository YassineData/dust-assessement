-- Lets the Dust team import answers from another form (Google Forms, Tally…) into a campaign.
-- Run once in the Supabase SQL editor of the Dust project (ithaolycriiylnsxvatw). Safe to re-run.
-- Only the admin key can insert rows; respondents still register through start_participant().

drop policy if exists participants_insert on public.participants;
create policy participants_insert on public.participants for insert with check (public.is_admin());
