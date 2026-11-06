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
  /** Only these addresses may sign in (supabase/009); empty = anyone on the domains. */
  emails?: string[];
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

export const normalizeEmails = (raw: string) => [
  ...new Set(
    raw
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^\s@]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(e) && !e.endsWith('@dust.tt'))
  ),
];

/** Public email providers can never be a partner domain: everyone there would see the partner's clients. */
const PUBLIC_DOMAINS = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'hotmail.fr', 'live.com', 'live.fr', 'yahoo.com', 'yahoo.fr', 'icloud.com', 'me.com', 'orange.fr', 'free.fr', 'sfr.fr', 'laposte.net', 'wanadoo.fr', 'proton.me', 'protonmail.com', 'gmx.com', 'gmx.fr', 'aol.com']);
export const publicDomainsIn = (domains: string[]) => domains.filter((d) => PUBLIC_DOMAINS.has(d));

/** Ready-to-send invitation for a partner: where to sign in, with which address, what they will find. */
export const partnerInvite = (p: Pick<Partner, 'name' | 'domains' | 'emails'>, origin: string, lang: 'fr' | 'en') => {
  const link = `${origin}/login?partenaire`;
  const named = p.emails?.length ? p.emails : null;
  const domains = named ? (lang === 'fr' ? 'celle à laquelle vous avez reçu ce message' : 'the one this message was sent to') : p.domains.map((d) => `@${d}`).join(lang === 'fr' ? ' ou ' : ' or ');
  const who = named
    ? lang === 'fr'
      ? `L'accès est réservé à : ${named.join(', ')}. Pour ajouter quelqu'un, demandez-le à votre contact Dust.`
      : `Access is limited to: ${named.join(', ')}. To add someone, ask your Dust contact.`
    : lang === 'fr'
      ? `Toute l'équipe peut se connecter de la même façon avec une adresse ${domains}.`
      : `Your whole team can sign in the same way with a ${domains} address.`;
  return lang === 'fr'
    ? `Bonjour,

Votre espace partenaire Dust Assessment est ouvert pour ${p.name}. Vous y retrouvez vos clients, leurs campagnes de diagnostic et de déploiement, leurs résultats et leur suivi.

Pour vous connecter :
1. Ouvrez ${link}
2. Saisissez votre adresse e-mail professionnelle (${domains})
3. Cliquez sur le lien de connexion reçu par e-mail : pas de mot de passe

${who}

Ce que vous pouvez faire :
- créer une campagne pour un client (diagnostic IA ou déploiement) et lui envoyer le lien du questionnaire ;
- suivre les réponses et les résultats, équipe par équipe ;
- exporter les données et les analyser avec Dust, puis suivre l'évolution du client dans l'onglet Suivi.

Vous ne voyez que vos propres clients, et vos clients ne voient que leurs propres résultats.

À très vite,`
    : `Hello,

Your Dust Assessment partner space is open for ${p.name}. You will find your clients, their diagnostic and rollout campaigns, their results and their follow-up.

To sign in:
1. Open ${link}
2. Enter your work email address (${domains})
3. Click the sign-in link you receive by email: no password

${who}

What you can do:
- create a campaign for a client (AI diagnostic or rollout) and send them the survey link;
- follow answers and results, team by team;
- export the data and analyse it with Dust, then follow the client's progress in the Progress tab.

You only see your own clients, and your clients only see their own results.

Talk soon,`;
};
