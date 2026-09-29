-- Dust team sign-in: @dust.tt email required, every attempt logged.
-- Run once in the Supabase SQL editor of the Dust project (ithaolycriiylnsxvatw). Safe to re-run.

create table if not exists public.sign_in_log (
  id bigserial primary key,
  email text not null,
  success boolean not null,
  reason text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists sign_in_log_created_at on public.sign_in_log (created_at desc);

alter table public.sign_in_log enable row level security;
drop policy if exists sign_in_log_read on public.sign_in_log;
-- Only the Dust team (admin key) can read the log; nobody writes to it directly.
create policy sign_in_log_read on public.sign_in_log for select using (public.is_admin());
revoke all on public.sign_in_log from anon, authenticated;
grant select on public.sign_in_log to anon, authenticated;

-- Checks the admin key (header) AND a @dust.tt email, and records the attempt.
-- Returns 'ok', 'not_dust', 'bad_key' or 'too_many'.
create or replace function public.dust_sign_in(p_email text) returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_email text := left(lower(trim(coalesce(p_email, ''))), 200);
  v_ua text := left(public.req_header('user-agent'), 300);
  v_ok boolean;
begin
  -- Basic brake on guessing: stop after 20 failures in 10 minutes.
  if (select count(*) from public.sign_in_log where not success and created_at > now() - interval '10 minutes') >= 20 then
    return 'too_many';
  end if;

  if v_email !~ '^[a-z0-9._%+-]+@dust\.tt$' then
    insert into public.sign_in_log (email, success, reason, user_agent) values (v_email, false, 'not_dust', v_ua);
    return 'not_dust';
  end if;

  v_ok := public.is_admin();
  insert into public.sign_in_log (email, success, reason, user_agent)
    values (v_email, v_ok, case when v_ok then null else 'bad_key' end, v_ua);
  return case when v_ok then 'ok' else 'bad_key' end;
end $$;

revoke execute on function public.dust_sign_in(text) from public;
grant execute on function public.dust_sign_in(text) to anon, authenticated;
