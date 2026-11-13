-- HubSpot export (« Exporter vers HubSpot » button, Dust team only).
--   • campaigns.hubspot_domain: the client's domain, used by the @hubspot-assessment agent to find the HubSpot Company.
--     Stored normalised by the app (lowercase, no https://, no www., no trailing /).
--   • campaigns.hubspot_exported_at: last time the export was generated, shown under the button.
-- Existing policies already cover these columns (whoever can update a campaign). Safe to re-run. Nothing deleted.

alter table public.campaigns add column if not exists hubspot_domain text;
alter table public.campaigns add column if not exists hubspot_exported_at timestamptz;

alter table public.campaigns drop constraint if exists campaigns_hubspot_domain_check;
alter table public.campaigns add constraint campaigns_hubspot_domain_check
  check (hubspot_domain is null or hubspot_domain ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$');
