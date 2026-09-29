import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, LogIn, Loader2, ShieldAlert, Users, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SectionCard } from '@/components/console/SectionCard';
import { KpiCards } from '@/components/console/OverviewBlocks';

interface SignIn {
  id: number;
  email: string;
  success: boolean;
  reason: string | null;
  user_agent: string | null;
  created_at: string;
}

const browserOf = (ua: string | null) => {
  if (!ua) return '';
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : '';
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  return [br, os].filter(Boolean).join(' · ');
};

/** Who signed in to the console, when, and the refused attempts (Dust team only). */
export const SignInLog = ({ fr }: { fr: boolean }) => {
  const [rows, setRows] = useState<SignIn[] | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('sign_in_log' as never)
        .select('id, email, success, reason, user_agent, created_at')
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) {
        setMissing(true);
        setRows([]);
        return;
      }
      setRows((data as unknown as SignIn[]) ?? []);
    })();
  }, []);

  const stats = useMemo(() => {
    const list = rows ?? [];
    const since = Date.now() - 30 * 86400000;
    const recent = list.filter((r) => new Date(r.created_at).getTime() > since);
    const people = new Set(recent.filter((r) => r.success).map((r) => r.email));
    return { people: people.size, ok: recent.filter((r) => r.success).length, refused: recent.filter((r) => !r.success).length };
  }, [rows]);

  const byPerson = useMemo(() => {
    const map = new Map<string, { email: string; last: string; count: number }>();
    (rows ?? []).filter((r) => r.success).forEach((r) => {
      const cur = map.get(r.email);
      if (cur) cur.count += 1;
      else map.set(r.email, { email: r.email, last: r.created_at, count: 1 });
    });
    return [...map.values()];
  }, [rows]);

  const when = (iso: string) =>
    new Date(iso).toLocaleString(fr ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const reasonLabel = (r: string | null) =>
    r === 'not_dust' ? (fr ? 'Adresse non @dust.tt' : 'Not a @dust.tt address') : r === 'bad_key' ? (fr ? 'Mauvaise clé' : 'Wrong key') : (fr ? 'Refusée' : 'Refused');

  if (rows === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (missing) {
    return (
      <SectionCard title={fr ? 'Journal des connexions à activer' : 'Sign-in log not set up yet'}>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {fr
            ? 'Lancez le script supabase/003-sign-in-log.sql dans l’éditeur SQL de Supabase (projet Dust). Les connexions seront ensuite enregistrées ici.'
            : 'Run supabase/003-sign-in-log.sql in the Supabase SQL editor (Dust project). Sign-ins will then be recorded here.'}
        </p>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-5">
      <KpiCards
        items={[
          { icon: Users, label: fr ? 'Personnes connectées' : 'People signed in', value: String(stats.people), note: fr ? '30 derniers jours' : 'last 30 days' },
          { icon: LogIn, label: fr ? 'Connexions' : 'Sign-ins', value: String(stats.ok), note: fr ? '30 derniers jours' : 'last 30 days' },
          { icon: ShieldAlert, label: fr ? 'Tentatives refusées' : 'Refused attempts', value: String(stats.refused), note: fr ? '30 derniers jours' : 'last 30 days' },
        ]}
      />

      {byPerson.length > 0 && (
        <SectionCard title={fr ? 'Qui utilise la console' : 'Who uses the console'} description={fr ? 'Dernière connexion par personne' : 'Last sign-in per person'}>
          <ul className="divide-y divide-border">
            {byPerson.map((p) => (
              <li key={p.email} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                <span className="truncate font-medium text-foreground">{p.email}</span>
                <span className="shrink-0 text-muted-foreground">
                  {when(p.last)} · {p.count} {fr ? 'connexion(s)' : 'sign-in(s)'}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard title={fr ? 'Historique' : 'History'} description={fr ? 'Toutes les tentatives, les plus récentes en premier' : 'Every attempt, most recent first'}>
        {rows.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{fr ? 'Aucune connexion enregistrée pour l’instant.' : 'No sign-in recorded yet.'}</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5 text-[13px]">
                {r.success ? <CheckCircle2 className="h-4 w-4 shrink-0 text-ok-ink" /> : <XCircle className="h-4 w-4 shrink-0 text-risk-ink" />}
                <span className="min-w-0 flex-1 truncate text-foreground">{r.email || '—'}</span>
                <span className="hidden shrink-0 text-muted-foreground sm:inline">{browserOf(r.user_agent)}</span>
                {!r.success && <span className="shrink-0 text-[12px] text-risk-ink">{reasonLabel(r.reason)}</span>}
                <span className="shrink-0 tabular-nums text-muted-foreground">{when(r.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
};
