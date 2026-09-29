-- =====================================================================
-- Step 2: Dust team login by email (magic link), @dust.tt only.
-- Run ONCE in the SQL Editor, after dust-secure-setup.sql.
--
--   • A signed-in user whose email ends with @dust.tt gets full access (same as the admin key).
--   • The admin key keeps working as a fallback.
--   • hook_dust_only() refuses to create any account outside @dust.tt, so no login email is
--     ever sent to another address. Enable it in: Authentication → Hooks → "Before User Created"
--     → Postgres function → public.hook_dust_only.
-- =====================================================================

-- Signed-in Dust team member (email proven by the magic link)
create or replace function public.is_dust_member() returns boolean
language sql stable as $$
  select coalesce(auth.role(), '') = 'authenticated'
     and lower(coalesce(auth.jwt() ->> 'email', '')) like '%@dust.tt'
$$;

-- Full access: Dust team member OR admin key
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select public.is_dust_member()
      or (
        public.req_header('x-admin-key') <> ''
        and exists (
          select 1 from public.app_secrets s
          where s.name = 'admin_key'
            and s.value = extensions.crypt(public.req_header('x-admin-key'), s.value)
        )
      )
$$;

grant execute on function public.is_dust_member() to anon, authenticated;

-- Auth hook: only @dust.tt addresses can get an account (and therefore a login email)
create or replace function public.hook_dust_only(event jsonb) returns jsonb
language plpgsql as $$
begin
  if lower(coalesce(event -> 'user' ->> 'email', '')) like '%@dust.tt' then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object('http_code', 403, 'message', 'Only @dust.tt addresses can sign in.')
  );
end $$;

grant execute on function public.hook_dust_only(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_dust_only(jsonb) from authenticated, anon, public;
