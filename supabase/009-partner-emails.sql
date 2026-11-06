-- Partners: restrict access to named people instead of a whole email domain.
--   • partners.emails empty  → anyone with an address on one of the partner's domains (as in 008);
--   • partners.emails filled → only those addresses, nobody else at the partner.
-- Applies everywhere at once: who receives a sign-in link (hook) and what the database returns (RLS).
-- Run once in the Supabase SQL editor, after 008. Safe to re-run. Nothing is deleted.

alter table public.partners add column if not exists emails text[] not null default '{}';

-- One rule for both places: is this address allowed in for this partner?
create or replace function public.partner_allows(p public.partners, p_email text) returns boolean
language sql immutable as $$
  select p.active and (
    case when cardinality(p.emails) > 0
      then lower(coalesce(p_email, '')) = any(p.emails)
      else split_part(lower(coalesce(p_email, '')), '@', 2) = any(p.domains)
    end
  )
$$;

create or replace function public.my_partner_id() returns uuid
language sql stable security definer set search_path = public as $$
  select p.id from public.partners p
  where coalesce(auth.role(), '') = 'authenticated'
    and public.partner_allows(p, auth.jwt() ->> 'email')
  order by p.created_at
  limit 1
$$;

create or replace function public.hook_dust_only(event jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(coalesce(event -> 'user' ->> 'email', ''));
begin
  if v_email like '%@dust.tt'
     or exists (select 1 from public.partners p where public.partner_allows(p, v_email)) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object('http_code', 403, 'message', 'Only Dust and its partners can sign in.')
  );
end $$;

revoke execute on function public.partner_allows(public.partners, text) from public;
grant execute on function public.partner_allows(public.partners, text) to anon, authenticated, supabase_auth_admin;
revoke execute on function public.hook_dust_only(jsonb) from authenticated, anon, public;
grant execute on function public.hook_dust_only(jsonb) to supabase_auth_admin;
