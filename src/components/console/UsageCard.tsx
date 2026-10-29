import { useRef, useState } from 'react';
import { FileUp, Loader2, Trash2 } from 'lucide-react';
import { SectionCard } from '@/components/console/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { readTable } from '@/lib/import-responses';
import { HEALTH_THRESHOLD, breadthOf, healthOf, parseUsage, recurrenceOf, type Health, type Usage } from '@/lib/usage-import';
import { waveLabel } from '@/lib/waves';
import type { TimelinePoint } from '@/hooks/useClientTimeline';

const HEALTH: Record<Health, { fr: string; en: string; cls: string; hint: { fr: string; en: string } }> = {
  healthy: { fr: 'En bonne santé', en: 'Healthy', cls: 'bg-ok-soft text-ok-ink', hint: { fr: 'Breadth et recurrence au-dessus de 70 %.', en: 'Breadth and recurrence above 70%.' } },
  watch: { fr: 'À surveiller', en: 'Watch', cls: 'bg-warn-soft text-warn-ink', hint: { fr: 'Un des deux à 70 % ou moins.', en: 'One of the two at or below 70%.' } },
  risk: { fr: 'À risque', en: 'At risk', cls: 'bg-risk-soft text-risk-ink', hint: { fr: 'Les deux à 70 % ou moins.', en: 'Both at or below 70%.' } },
  ramping: { fr: 'En montée', en: 'Ramping', cls: 'bg-muted text-muted-foreground', hint: { fr: 'Moins de 3 semaines de données : la recurrence ne se lit pas encore.', en: 'Less than 3 weeks of data: recurrence cannot be read yet.' } },
};

const pct = (x: number | null) => (x === null ? '·' : `${Math.round(x * 100)} %`);
const fmtDay = (d: string, fr: boolean) => new Date(d).toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' });

interface Props {
  point: TimelinePoint;
  /** Earlier wave with usage, for the « avant » figures. */
  previous?: TimelinePoint | null;
  fr: boolean;
  /** Admins import or replace the export; null removes it. */
  onSave?: (campaignId: string, usage: Usage | null) => Promise<boolean>;
}

/** What the rollout actually produced in Dust, read from a workspace usage export, next to the survey. */
export const UsageCard = ({ point, previous, fr, onSave }: Props) => {
  const u = point.usage;
  const before = previous?.usage ?? null;
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState('');

  if (!u && !onSave) return null;

  const onFile = async (file: File) => {
    if (!onSave) return;
    setError(null);
    setBusy(true);
    try {
      const parsed = parseUsage(await readTable(file), file.name);
      if (!parsed) {
        setError(fr ? 'Ce fichier n’a pas de colonne d’agent : ce n’est pas un export d’usage Dust.' : 'This file has no agent column: it is not a Dust usage export.');
      } else {
        await onSave(point.id, { ...parsed, scope: u?.scope });
      }
    } catch {
      setError(fr ? 'Fichier illisible. Utilisez le CSV ou le .xlsx exporté depuis Dust.' : 'Unreadable file. Use the CSV or .xlsx exported from Dust.');
    }
    setBusy(false);
  };

  const picker = (
    <input
      ref={fileRef}
      type="file"
      accept=".csv,.tsv,.txt,.xlsx"
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onFile(f);
        e.target.value = '';
      }}
    />
  );

  const title = fr ? 'Usage réel dans Dust' : 'Actual usage in Dust';

  if (!u) {
    return (
      <SectionCard
        title={title}
        description={fr ? `Rattaché au passage « ${waveLabel(point.wave, fr)} » du ${new Date(point.createdAt).toLocaleDateString('fr-FR')}.` : `Attached to the ${waveLabel(point.wave, fr)} wave.`}
      >
        {picker}
        <div className="rounded-lg border border-dashed border-border bg-paper px-5 py-6 text-center">
          <p className="text-[14px] font-medium text-foreground">{fr ? 'Ajoutez l’export d’usage du workspace du client' : 'Add the client workspace usage export'}</p>
          <p className="mx-auto mt-1 max-w-[520px] text-[13px] leading-relaxed text-muted-foreground">
            {fr
              ? 'Le fichier CSV des messages ou des agents, exporté depuis Dust. On en tire les agents utilisés, les utilisateurs actifs, la breadth et la recurrence, avec les mêmes définitions que les métriques de déploiement. Seuls les totaux et les noms d’agents sont gardés.'
              : 'The messages or agents CSV exported from Dust. It gives the agents used, active users, breadth and recurrence, with the same definitions as the deployment metrics. Only totals and agent names are kept.'}
          </p>
          <Button className="mt-4" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            {fr ? 'Importer l’export' : 'Import the export'}
          </Button>
          {error && <p className="mt-3 text-[12px] text-risk-ink">{error}</p>}
        </div>
      </SectionCard>
    );
  }

  const health = healthOf(u);
  const breadth = breadthOf(u);
  const recurrence = recurrenceOf(u);
  const maxMsg = Math.max(1, ...u.agents.map((a) => a.messages));
  const shared = u.conversations ? (u.sharedConversations ?? 0) / u.conversations : null;

  const saveScope = async () => {
    const n = Math.round(Number(scope));
    if (!onSave || !n || n < 1) return;
    setBusy(true);
    await onSave(point.id, { ...u, scope: n });
    setBusy(false);
    setScope('');
  };

  const tiles = [
    {
      id: 'breadth',
      label: 'Breadth',
      value: pct(breadth),
      sub: u.activeUsers
        ? u.scope
          ? fr ? `${u.activeUsers} personnes sur ${u.scope} concernées` : `${u.activeUsers} people out of ${u.scope} in scope`
          : fr ? `${u.activeUsers} personnes actives · indiquez le nombre de personnes concernées` : `${u.activeUsers} active people · set the people in scope`
        : fr ? 'Il faut un export par message' : 'Needs a per-message export',
      good: breadth !== null ? breadth > HEALTH_THRESHOLD : null,
    },
    {
      id: 'recurrence',
      label: 'Recurrence',
      value: pct(recurrence),
      sub:
        recurrence !== null
          ? fr ? `${u.recurringUsers} reviennent 3 des 4 dernières semaines` : `${u.recurringUsers} came back 3 of the last 4 weeks`
          : fr ? 'Il faut au moins 3 semaines de données' : 'Needs at least 3 weeks of data',
      good: recurrence !== null ? recurrence > HEALTH_THRESHOLD : null,
    },
  ];

  const facts = [
    { label: fr ? 'Agents utilisés' : 'Agents used', value: u.agents.length, was: before?.agents.length },
    { label: fr ? 'Messages' : 'Messages', value: u.totalMessages, was: before?.totalMessages },
    { label: fr ? 'Utilisateurs actifs' : 'Active users', value: u.activeUsers, was: before?.activeUsers },
    { label: fr ? 'Conversations à plusieurs' : 'Shared conversations', value: shared !== null ? pct(shared) : undefined, was: undefined },
  ].filter((f) => f.value !== undefined);

  return (
    <SectionCard
      title={title}
      description={
        <>
          {waveLabel(point.wave, fr)}
          {u.period ? ` · ${fmtDay(u.period.from, fr)} → ${fmtDay(u.period.to, fr)}` : ''}
          {u.weeks ? ` · ${u.weeks} ${fr ? 'sem.' : 'wk'}` : ''}
          {u.fileName ? ` · ${u.fileName}` : ''}
        </>
      }
      actions={
        onSave && (
          <div className="flex items-center gap-1">
            {picker}
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              {fr ? 'Remplacer' : 'Replace'}
            </Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => onSave(point.id, null)} aria-label={fr ? 'Retirer l’export' : 'Remove the export'}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      }
    >
      {error && <p className="mb-3 text-[12px] text-risk-ink">{error}</p>}

      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{fr ? 'Santé d’usage' : 'Usage health'}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.id} className={cn('rounded-lg p-3.5 ring-1', t.good === true ? 'bg-ok-soft/60 ring-ok-ink/20' : t.good === false ? 'bg-warn-soft/60 ring-warn-ink/20' : 'bg-paper ring-border')}>
            <p className="text-[12px] font-medium text-muted-foreground">{t.label}</p>
            <p className="mt-1 text-[28px] font-semibold leading-none tabular-nums text-foreground">{t.value}</p>
            <p className="mt-1.5 text-[12px] text-muted-foreground">{t.sub}</p>
            {t.id === 'breadth' && onSave && u.activeUsers && (
              <form
                className="mt-2 flex gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveScope();
                }}
              >
                <Input
                  type="number"
                  min={1}
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  placeholder={u.scope ? String(u.scope) : fr ? 'Personnes concernées' : 'People in scope'}
                  className="h-8 text-[12px]"
                />
                <Button type="submit" size="sm" variant="outline" className="h-8" disabled={!scope || busy}>
                  OK
                </Button>
              </form>
            )}
          </div>
        ))}
        <div className={cn('rounded-lg p-3.5', health ? HEALTH[health].cls : 'bg-paper ring-1 ring-border')}>
          <p className="text-[12px] font-medium opacity-80">{fr ? 'Statut' : 'Status'}</p>
          <p className="mt-1 text-[20px] font-semibold leading-tight">{health ? (fr ? HEALTH[health].fr : HEALTH[health].en) : '·'}</p>
          <p className="mt-1.5 text-[12px] opacity-80">
            {health ? (fr ? HEALTH[health].hint.fr : HEALTH[health].hint.en) : fr ? 'Indiquez les personnes concernées pour le calculer.' : 'Set the people in scope to compute it.'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="rounded-md bg-paper px-3 py-2.5 ring-1 ring-border">
            <p className="text-[12px] text-muted-foreground">{f.label}</p>
            <p className="mt-0.5 text-[18px] font-semibold tabular-nums text-foreground">
              {typeof f.value === 'number' ? f.value.toLocaleString(fr ? 'fr-FR' : 'en-US') : f.value}
              {typeof f.was === 'number' && (
                <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">
                  {fr ? 'avant' : 'was'} {f.was.toLocaleString(fr ? 'fr-FR' : 'en-US')}
                </span>
              )}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{fr ? 'Les agents les plus utilisés' : 'Most used agents'}</p>
      <ul className="mt-2 space-y-1.5">
        {u.agents.slice(0, 8).map((a) => (
          <li key={a.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[220px_1fr_auto]">
            <span className="truncate text-[13px] text-foreground" title={a.name}>{a.name}</span>
            <span className="order-last col-span-2 h-1.5 rounded-full bg-muted sm:order-none sm:col-span-1" aria-hidden>
              <span className="block h-full rounded-full bg-brand" style={{ width: `${(a.messages / maxMsg) * 100}%` }} />
            </span>
            <span className="text-right text-[12px] tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">{a.messages.toLocaleString(fr ? 'fr-FR' : 'en-US')}</span> msg
              {a.users ? ` · ${a.users} ${fr ? 'pers.' : 'ppl'}` : ''}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12px] text-muted-foreground">
        {fr
          ? 'Définitions des métriques de déploiement de l’équipe Data. Le seuil de 70 % est provisoire (60 % pour les comptes facturés à la consommation).'
          : 'Definitions from the Data team’s deployment metrics. The 70% threshold is provisional (60% for consumption-priced accounts).'}
      </p>
    </SectionCard>
  );
};
