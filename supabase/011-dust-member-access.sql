-- Dust team signed in with Google or an email link (@dust.tt) gets full access, like the admin key.
-- Only the access part of 002-dust-email-login.sql: its old hook_dust_only would undo 009 (partners).
-- Applied on 2026-11-17. Safe to re-run. Nothing deleted.

create or replace function public.is_dust_member() returns boolean
language sql stable as $$
  select coalesce(auth.role(), '') = 'authenticated'
     and lower(coalesce(auth.jwt() ->> 'email', '')) like '%@dust.tt'
$$;

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
