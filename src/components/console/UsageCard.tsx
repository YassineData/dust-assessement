import { useRef, useState } from 'react';
import { FileUp, Loader2, Trash2 } from 'lucide-react';
import { SectionCard } from '@/components/console/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { readTable } from '@/lib/import-responses';
import { breadthOf, healthOf, parseUsage, recurrenceOf, spanDays, thresholdOf, toneOf, type Health, type Tone, type Usage } from '@/lib/usage-import';
import { waveLabel } from '@/lib/waves';
import type { TimelinePoint } from '@/hooks/useClientTimeline';

const HEALTH: Record<Health, { fr: string; en: string; cls: string; hint: { fr: string; en: string } }> = {
  healthy: { fr: 'En bonne santé', en: 'Healthy', cls: 'bg-ok-soft text-ok-ink', hint: { fr: 'Breadth et recurrence au-dessus de la cible.', en: 'Breadth and recurrence above target.' } },
  watch: { fr: 'À surveiller', en: 'Watch', cls: 'bg-warn-soft text-warn-ink', hint: { fr: 'Un des deux à la cible ou en dessous.', en: 'One of the two at or below target.' } },
  risk: { fr: 'À risque', en: 'At risk', cls: 'bg-risk-soft text-risk-ink', hint: { fr: 'Les deux à la cible ou en dessous.', en: 'Both at or below target.' } },
  ramping: { fr: 'En montée', en: 'Ramping', cls: 'bg-muted text-muted-foreground', hint: { fr: 'Moins de 28 jours de données : pas encore de statut.', en: 'Under 28 days of data: no status yet.' } },
};

const TONE_CLASS: Record<Tone, string> = {
  ok: 'bg-ok-soft/60 ring-ok-ink/20',
  warn: 'bg-warn-soft/60 ring-warn-ink/20',
  risk: 'bg-risk-soft/60 ring-risk-ink/20',
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
  const target = thresholdOf(u);
  const span = spanDays(u);

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
      tone: toneOf(breadth, target),
    },
    {
      id: 'recurrence',
      label: 'Recurrence',
      value: pct(recurrence),
      sub:
        recurrence !== null
          ? fr ? `${u.recurringUsers} reviennent 3 des 4 dernières semaines` : `${u.recurringUsers} came back 3 of the last 4 weeks`
          : fr ? 'Il faut au moins 28 jours de données' : 'Needs at least 28 days of data',
      tone: toneOf(recurrence, target),
    },
  ];

  const facts = [
    { label: fr ? 'Agents utilisés' : 'Agents used', value: u.agents.length, was: before?.agents.length },
    { label: fr ? 'Messages' : 'Messages', value: u.totalMessages, was: before?.totalMessages },
    { label: fr ? 'Utilisateurs actifs' : 'Active users', value: u.activeUsers, was: before?.activeUsers },
    { label: 'Multiplayer conversations', value: shared !== null ? pct(shared) : undefined, was: undefined },
  ].filter((f) => f.value !== undefined);

  return (
    <SectionCard
      title={title}
      description={
        <>
          {waveLabel(point.wave, fr)}
          {u.period ? ` · ${fmtDay(u.period.from, fr)} → ${fmtDay(u.period.to, fr)}` : ''}
          {span ? ` · ${span} ${fr ? 'jours' : 'days'}` : ''}
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

      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {fr ? 'Santé du déploiement' : 'Deployment health'}
        <span className="ml-2 font-normal normal-case tracking-normal">{fr ? '· ce qui prédit le renouvellement' : '· what predicts renewal'}</span>
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.id} className={cn('rounded-lg p-3.5 ring-1', t.tone ? TONE_CLASS[t.tone] : 'bg-paper ring-border')}>
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
          <p className="mt-1 text-[12px] opacity-80">
            {fr ? 'Cible' : 'Target'} {Math.round(target * 100)} %{u.consumption ? (fr ? ' (facturation à la consommation)' : ' (consumption pricing)') : ''}
          </p>
          {onSave && (
            <label className="mt-2 flex cursor-pointer items-center gap-1.5 text-[12px]">
              <input
                type="checkbox"
                checked={!!u.consumption}
                disabled={busy}
                onChange={async (e) => {
                  setBusy(true);
                  await onSave(point.id, { ...u, consumption: e.target.checked });
                  setBusy(false);
                }}
              />
              {fr ? 'Facturé à la consommation (cible 60 %)' : 'Consumption-priced (60% target)'}
            </label>
          )}
        </div>
      </div>

      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {fr ? 'Leviers' : 'Levers'}
        <span className="ml-2 font-normal normal-case tracking-normal">{fr ? '· ce sur quoi on peut agir' : '· what we can act on'}</span>
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
          ? 'Définitions des métriques de déploiement (v2). Vert : au-dessus de la cible · orange : jusqu’à 10 points en dessous · rouge : plus de 10 points en dessous. Cibles provisoires.'
          : 'Deployment metrics definitions (v2). Green: above target · amber: up to 10 points below · red: more than 10 points below. Targets are provisional.'}
      </p>
    </SectionCard>
  );
};
