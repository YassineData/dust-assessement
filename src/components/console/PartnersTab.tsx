import { useEffect, useMemo, useState } from 'react';
import { Eye, Handshake, Link2, Loader2, Pencil, Plus, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { SectionCard } from '@/components/console/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { normalizeDomains, publicDomainsIn, type Partner, type PartnerIdentity } from '@/lib/partners';
import type { Campaign } from '@/components/CampaignSelector';

type Stats = { partner_id: string; campaigns: number; clients: number; completed: number; readiness: number | null };

interface Props {
  fr: boolean;
  campaigns: Campaign[];
  /** Local update after attaching or detaching clients (the database is already updated). */
  onCampaignsChanged: (list: Campaign[]) => void;
  onOpenCampaign: (c: Campaign) => void;
  /** Dust previews the console exactly as this partner sees it. */
  onViewAs: (p: PartnerIdentity) => void;
}

const empty = { name: '', domains: '', logo: '' };

/** Dust only: every deployment partner, their clients and how they are doing. */
export const PartnersTab = ({ fr, campaigns, onCampaignsChanged, onOpenCampaign, onViewAs }: Props) => {
  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [missing, setMissing] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [attach, setAttach] = useState<Record<string, string>>({});

  const load = async () => {
    const { data, error } = await supabase.from('partners' as never).select('*').order('name');
    if (error) {
      setMissing(true);
      setPartners([]);
      return;
    }
    setPartners((data as unknown as Partner[]) ?? []);
    const { data: s } = await supabase.rpc('partner_overview' as never);
    const map: Record<string, Stats> = {};
    ((s as unknown as Stats[]) ?? []).forEach((r) => (map[r.partner_id] = r));
    setStats(map);
  };
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clients = campaigns grouped by company name.
  const clientsOf = (partnerId: string | null) => {
    const m = new Map<string, Campaign[]>();
    campaigns
      .filter((c) => (c.partner_id ?? null) === partnerId)
      .forEach((c) => {
        const k = c.company_name.trim();
        m.set(k, [...(m.get(k) ?? []), c]);
      });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };
  const unassigned = useMemo(() => clientsOf(null).map(([company]) => company), [campaigns]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    const name = form.name.trim();
    const domains = normalizeDomains(form.domains);
    const logo = form.logo.trim();
    if (!name || !domains.length) {
      toast.error(fr ? 'Indiquez un nom et au moins un domaine e-mail.' : 'Enter a name and at least one email domain.');
      return;
    }
    const pub = publicDomainsIn(domains);
    if (pub.length) {
      toast.error(fr ? `${pub.join(', ')} est une messagerie publique : tout le monde y a une adresse.` : `${pub.join(', ')} is a public email provider: anyone has an address there.`);
      return;
    }
    if (logo && !/^https:\/\//.test(logo)) {
      toast.error(fr ? 'Le logo doit être une adresse https://' : 'The logo must be an https:// address');
      return;
    }
    const taken = (partners ?? []).find((p) => p.id !== editing && p.domains.some((d) => domains.includes(d)));
    if (taken) {
      toast.error(fr ? `Domaine déjà utilisé par ${taken.name}.` : `Domain already used by ${taken.name}.`);
      return;
    }
    setSaving(true);
    const row = { name, domains, logo_url: logo || null };
    const res =
      editing === 'new'
        ? await supabase.from('partners' as never).insert(row as never).select('*').maybeSingle()
        : await supabase.from('partners' as never).update(row as never).eq('id', editing!).select('*').maybeSingle();
    setSaving(false);
    if (res.error) {
      toast.error(fr ? 'Enregistrement impossible.' : 'Could not save.');
      return;
    }
    const prev = (partners ?? []).find((p) => p.id === editing);
    const saved = { ...(prev ?? { active: true, created_at: new Date().toISOString() }), ...row, ...((res.data as object | null) ?? {}) } as Partner;
    if (!saved.id) saved.id = editing === 'new' ? `local-${Date.now()}` : (editing as string);
    setPartners((prev) => [...(prev ?? []).filter((p) => p.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name)));
    setEditing(null);
    setForm(empty);
    toast.success(fr ? 'Partenaire enregistré' : 'Partner saved');
  };

  const setActive = async (p: Partner, active: boolean) => {
    const { error } = await supabase.from('partners' as never).update({ active } as never).eq('id', p.id);
    if (error) return toast.error(fr ? 'Modification impossible.' : 'Could not update.');
    setPartners((prev) => (prev ?? []).map((x) => (x.id === p.id ? { ...x, active } : x)));
  };

  /** Attach (or detach) every campaign of a client: the partner then sees all of them. */
  const assign = async (company: string, partnerId: string | null) => {
    const ids = campaigns.filter((c) => c.company_name.trim() === company).map((c) => c.id);
    const { error } = await supabase.from('campaigns').update({ partner_id: partnerId } as never).in('id', ids);
    if (error) return toast.error(fr ? 'Modification impossible.' : 'Could not update.');
    onCampaignsChanged(campaigns.map((c) => (ids.includes(c.id) ? { ...c, partner_id: partnerId } : c)));
    toast.success(partnerId ? (fr ? `${company} rattaché` : `${company} attached`) : fr ? `${company} détaché` : `${company} detached`);
  };

  if (partners === null) {
    return (
      <div className="flex items-center gap-2 py-16 text-[13px] text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {fr ? 'Chargement…' : 'Loading…'}
      </div>
    );
  }

  const editor = (
    <div className="grid gap-2 rounded-lg bg-paper p-4 ring-1 ring-border sm:grid-cols-[1fr_1.4fr_1.4fr_auto]">
      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={fr ? 'Nom du partenaire' : 'Partner name'} maxLength={120} />
      <Input value={form.domains} onChange={(e) => setForm({ ...form, domains: e.target.value })} placeholder={fr ? 'Domaines e-mail (ex. cabinet.fr)' : 'Email domains (e.g. firm.com)'} />
      <Input value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} placeholder={fr ? 'Logo https:// (facultatif)' : 'Logo https:// (optional)'} />
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {fr ? 'Enregistrer' : 'Save'}
        </Button>
        <Button variant="ghost" onClick={() => { setEditing(null); setForm(empty); }}>
          {fr ? 'Annuler' : 'Cancel'}
        </Button>
      </div>
      <p className="text-[12px] text-muted-foreground sm:col-span-4">
        {fr
          ? 'Toute personne avec une adresse sur ces domaines pourra se connecter à l’espace partenaire et verra les clients rattachés à ce partenaire, et seulement eux.'
          : 'Anyone with an address on these domains can sign in to the partner space and sees the clients attached to this partner, and only those.'}
      </p>
    </div>
  );

  return (
    <div className="space-y-5">
      {missing && (
        <p className="rounded-md bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">
          {fr ? 'Les partenaires ne sont pas encore activés : lancez supabase/008-partners.sql dans Supabase.' : 'Partners are not enabled yet: run supabase/008-partners.sql in Supabase.'}
        </p>
      )}

      <SectionCard
        title={fr ? 'Partenaires de déploiement' : 'Deployment partners'}
        description={
          fr
            ? 'Chaque partenaire voit ses propres clients dans son espace, jamais les clients Dust ni ceux des autres partenaires. Adresse de connexion à leur donner : /login?partenaire'
            : 'Each partner sees its own clients in its space, never Dust’s clients or other partners’. Sign-in address to give them: /login?partenaire'
        }
        actions={
          !missing &&
          editing === null && (
            <Button variant="outline" size="sm" onClick={() => { setEditing('new'); setForm(empty); }}>
              <Plus className="h-4 w-4" />
              {fr ? 'Ajouter un partenaire' : 'Add a partner'}
            </Button>
          )
        }
      >
        {editing === 'new' && editor}
        {!partners.length && editing !== 'new' && (
          <p className="text-[13px] text-muted-foreground">{fr ? 'Aucun partenaire pour l’instant.' : 'No partner yet.'}</p>
        )}
      </SectionCard>

      {partners.map((p) => {
        const s = stats[p.id];
        const clients = clientsOf(p.id);
        return (
          <SectionCard
            key={p.id}
            title={
              <span className="flex items-center gap-2">
                {p.logo_url ? <img src={p.logo_url} alt="" className="h-6 w-6 rounded object-contain" /> : <Handshake className="h-5 w-5 text-brand-ink" />}
                {p.name}
                {!p.active && <span className="pill pill-neutral">{fr ? 'Désactivé' : 'Disabled'}</span>}
              </span>
            }
            description={p.domains.map((d) => `@${d}`).join(' · ')}
            actions={
              <div className="flex flex-wrap gap-1.5">
                <Button variant="outline" size="sm" onClick={() => onViewAs({ id: p.id, name: p.name, logo_url: p.logo_url })}>
                  <Eye className="h-4 w-4" />
                  {fr ? 'Voir comme ce partenaire' : 'View as this partner'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditing(p.id); setForm({ name: p.name, domains: p.domains.join(', '), logo: p.logo_url ?? '' }); }} aria-label={fr ? 'Modifier' : 'Edit'}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setActive(p, !p.active)}>
                  {p.active ? (fr ? 'Désactiver' : 'Disable') : fr ? 'Réactiver' : 'Enable'}
                </Button>
              </div>
            }
          >
            {editing === p.id && <div className="mb-4">{editor}</div>}

            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { l: fr ? 'Clients' : 'Clients', v: clients.length },
                { l: fr ? 'Campagnes' : 'Campaigns', v: s?.campaigns ?? clients.reduce((n, [, list]) => n + list.length, 0) },
                { l: fr ? 'Réponses' : 'Answers', v: s?.completed ?? '·' },
                { l: fr ? 'Indice moyen' : 'Average index', v: s?.readiness ?? '·' },
              ].map((x) => (
                <div key={x.l} className="rounded-md bg-paper px-3 py-2.5 ring-1 ring-border">
                  <dt className="text-[12px] text-muted-foreground">{x.l}</dt>
                  <dd className="mt-0.5 text-[20px] font-semibold tabular-nums text-foreground">{x.v}</dd>
                </div>
              ))}
            </dl>

            <ul className="mt-4 divide-y divide-border rounded-md ring-1 ring-border">
              {clients.map(([company, list]) => (
                <li key={company} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <span className="min-w-[160px] flex-1 text-[13px] font-medium text-foreground">{company}</span>
                  <span className="text-[12px] text-muted-foreground">
                    {list.length} {fr ? (list.length > 1 ? 'campagnes' : 'campagne') : list.length > 1 ? 'campaigns' : 'campaign'}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => onOpenCampaign(list[0])}>
                    {fr ? 'Ouvrir' : 'Open'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => assign(company, null)} aria-label={fr ? 'Détacher' : 'Detach'}>
                    <Unlink className="h-4 w-4" />
                  </Button>
                </li>
              ))}
              {!clients.length && <li className="px-3 py-2 text-[13px] text-muted-foreground">{fr ? 'Aucun client rattaché.' : 'No client attached.'}</li>}
            </ul>

            {unassigned.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  className={cn('h-9 min-w-[220px] rounded-md border border-input bg-card px-2 text-[13px]')}
                  value={attach[p.id] ?? ''}
                  onChange={(e) => setAttach({ ...attach, [p.id]: e.target.value })}
                >
                  <option value="">{fr ? 'Rattacher un client Dust…' : 'Attach a Dust client…'}</option>
                  {unassigned.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <Button variant="outline" size="sm" disabled={!attach[p.id]} onClick={() => { assign(attach[p.id], p.id); setAttach({ ...attach, [p.id]: '' }); }}>
                  <Link2 className="h-4 w-4" />
                  {fr ? 'Rattacher' : 'Attach'}
                </Button>
              </div>
            )}
          </SectionCard>
        );
      })}
    </div>
  );
};
