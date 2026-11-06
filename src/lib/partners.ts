import { supabase } from '@/integrations/supabase/client';
import type { Campaign } from '@/components/CampaignSelector';

/**
 * Deployment partners (supabase/008-partners.sql). A partner signs in with the email link and only
 * sees its own clients (enforced by the database); Dust sees every partner in the « Partenaires » tab.
 */
export interface Partner {
  id: string;
  name: string;
  domains: string[];
  logo_url: string | null;
  active: boolean;
  created_at: string;
}

/** The partner a signed-in person belongs to, as stored in the console session. */
export interface PartnerIdentity {
  id: string;
  name: string;
  logo_url: string | null;
}

const BASE = 'id, code, company_name, campaign_name, creator_email, creator_first_name, creator_last_name, created_at';

/** Campaign list for the console, with the partner when supabase/008 is installed (falls back without it). */
export const fetchCampaignList = async (): Promise<{ data: Campaign[] | null; error: unknown }> => {
  const res = await supabase.from('campaigns').select(`${BASE}, partner_id`).order('created_at', { ascending: false });
  if (!res.error) return { data: res.data as unknown as Campaign[], error: null };
  const old = await supabase.from('campaigns').select(BASE).order('created_at', { ascending: false });
  return { data: (old.data as unknown as Campaign[]) ?? null, error: old.error };
};

/** Null when the signed-in person is not a partner (or 008 is not installed). */
export const fetchPartnerMe = async (): Promise<PartnerIdentity | null> => {
  const { data, error } = await supabase.rpc('partner_me' as never);
  const rows = data as unknown as PartnerIdentity[] | null;
  if (error || !Array.isArray(rows) || !rows.length) return null;
  return rows[0];
};

export const normalizeDomains = (raw: string) =>
  [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((d) => d.trim().toLowerCase().replace(/^@/, '').replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
        .filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d) && d !== 'dust.tt')
    ),
  ];

/** Public email providers can never be a partner domain: everyone there would see the partner's clients. */
const PUBLIC_DOMAINS = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'hotmail.fr', 'live.com', 'live.fr', 'yahoo.com', 'yahoo.fr', 'icloud.com', 'me.com', 'orange.fr', 'free.fr', 'sfr.fr', 'laposte.net', 'wanadoo.fr', 'proton.me', 'protonmail.com', 'gmx.com', 'gmx.fr', 'aol.com']);
export const publicDomainsIn = (domains: string[]) => domains.filter((d) => PUBLIC_DOMAINS.has(d));
