-- 012 · Partner logos: Dust or the partner itself uploads an image; the console shows it.
-- Additive only: one public storage bucket, its write rules, and one function. Nothing existing changes.

-- 1. Bucket: public read (the logo is shown in the console), images only, 1 MB max. No SVG (can carry scripts).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('partner-logos', 'partner-logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 2. Who can write: Dust (is_admin) anywhere in the bucket, a partner only in its own folder "<partner id>/".
drop policy if exists partner_logos_insert on storage.objects;
create policy partner_logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'partner-logos'
    and (public.is_admin() or (storage.foldername(name))[1] = public.my_partner_id()::text));

drop policy if exists partner_logos_update on storage.objects;
create policy partner_logos_update on storage.objects for update to authenticated
  using (bucket_id = 'partner-logos'
    and (public.is_admin() or (storage.foldername(name))[1] = public.my_partner_id()::text));

drop policy if exists partner_logos_delete on storage.objects;
create policy partner_logos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'partner-logos'
    and (public.is_admin() or (storage.foldername(name))[1] = public.my_partner_id()::text));

-- 3. A partner sets its own logo (and nothing else of its row): only an image of its own folder in this bucket, or none.
create or replace function public.set_my_partner_logo(p_url text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner uuid := public.my_partner_id();
  v_prefix text;
begin
  if v_partner is null then
    raise exception 'Not a partner';
  end if;
  if p_url is not null and p_url <> '' then
    -- Exactly this project's public bucket, in the partner's own folder (no other host, no tricks).
    v_prefix := 'https://ithaolycriiylnsxvatw.supabase.co/storage/v1/object/public/partner-logos/' || v_partner::text || '/';
    if left(p_url, length(v_prefix)) <> v_prefix or p_url ~ '[\s"''<>]' or p_url like '%..%' then
      raise exception 'Logo must be uploaded to the partner-logos bucket';
    end if;
  end if;
  update public.partners set logo_url = nullif(p_url, '') where id = v_partner;
  return nullif(p_url, '');
end $$;

revoke all on function public.set_my_partner_logo(text) from public, anon;
grant execute on function public.set_my_partner_logo(text) to authenticated;
