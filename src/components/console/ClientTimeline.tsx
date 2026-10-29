import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Loader2, PlusCircle, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { SectionCard } from '@/components/console/SectionCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DIMENSIONS, dimensionLabel, getReadinessBand, type RoleId } from '@/lib/assessment-v2';
import { PILLARS, WAVES, waveLabel, type Wave, type Workflow } from '@/lib/waves';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { TimelinePoint } from '@/hooks/useClientTimeline';
import { WorkflowsCard, workflowProgress } from '@/components/console/WorkflowsCard';

const ROLE_LABEL: Record<RoleId, { fr: string; en: string }> = {
  champion: { fr: 'Champions', en: 'Champions' },
  trainer: { fr: 'Formateurs', en: 'Trainers' },
  builder: { fr: 'Builders', en: 'Builders' },
  sponsor: { fr: 'Sponsors', en: 'Sponsors' },
};

const fmtDate = (iso: string, fr: boolean) =>
  new Date(iso).toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const Delta = ({ value, suffix = '' }: { value: number | null; suffix?: string }) => {
  if (value === null) return <span className="text-[12px] text-muted-foreground">·</span>;
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums',
        value > 0 ? 'bg-ok-soft text-ok-ink' : value < 0 ? 'bg-risk-soft text-risk-ink' : 'bg-muted text-muted-foreground'
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {value > 0 ? '+' : ''}
      {value}
      {suffix}
    </span>
  );
};

const pillarScore = (p: TimelinePoint, dims: string[]) => {
  const vals = dims.map((d) => p.dimensions[d]).filter((v): v is number => typeof v === 'number');
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
};

interface Props {
  companyName: string;
  points: TimelinePoint[];
  isLoading: boolean;
  fr: boolean;
  onCreateCampaign?: (wave: Wave) => void;
  /** Admins only: saves the kickoff workflows on a campaign. */
  onSaveWorkflows?: (campaignId: string, workflows: Workflow[]) => Promise<boolean>;
  /** Client view (private results link): no internal notes. */
  client?: boolean;
}

/** One client's follow-up: every wave of the survey, and what changed between two of them. */
export const ClientTimeline = ({ companyName, points, isLoading, fr, onCreateCampaign, onSaveWorkflows, client = false }: Props) => {
  const withAnswers = points.filter((p) => p.respondents > 0);
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);

  // Default comparison: first wave with answers against the latest one.
  useEffect(() => {
    if (withAnswers.length >= 2) {
      setFromId((cur) => (cur && withAnswers.some((p) => p.id === cur) ? cur : withAnswers[0].id));
      setToId((cur) => (cur && withAnswers.some((p) => p.id === cur) ? cur : withAnswers[withAnswers.length - 1].id));
    }
  }, [points]); // eslint-disable-line react-hooks/exhaustive-deps

  const A = withAnswers.find((p) => p.id === fromId) ?? withAnswers[0];
  const B = withAnswers.find((p) => p.id === toId) ?? withAnswers[withAnswers.length - 1];
  const comparable = !!A && !!B && A.id !== B.id;

  const shared = useMemo(
    () => (comparable ? DIMENSIONS.filter((d) => typeof A.dimensions[d.id] === 'number' && typeof B.dimensions[d.id] === 'number') : []),
    [A, B, comparable]
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-[13px] text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {fr ? 'Chargement du suivi…' : 'Loading the follow-up…'}
      </div>
    );
  }

  const timeline = (
    <SectionCard
      title={fr ? `Le parcours de ${companyName}` : `${companyName}'s journey`}
      description={
        fr
          ? `${points.length} passage${points.length > 1 ? 's' : ''} du questionnaire, du plus ancien au plus récent. Cliquez sur deux passages pour les comparer.`
          : `${points.length} survey wave${points.length > 1 ? 's' : ''}, oldest first. Click two waves to compare them.`
      }
      actions={
        onCreateCampaign && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <PlusCircle className="h-4 w-4" />
                {fr ? 'Nouveau passage' : 'New wave'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" className="w-72">
              {WAVES.filter((w) => w.id !== 'baseline').map((w) => (
                <DropdownMenuItem key={w.id} onSelect={() => onCreateCampaign(w.id)} className="flex-col items-start gap-0.5 py-2">
                  <span className="text-[13px] font-medium">{fr ? w.label.fr : w.label.en}</span>
                  <span className="text-[12px] text-muted-foreground">{fr ? w.hint.fr : w.hint.en}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    >
      <ol className="flex gap-3 overflow-x-auto pb-1">
        {points.map((p, i) => {
          const prev = withAnswers.filter((x) => x.createdAt < p.createdAt).pop();
          const delta = p.readiness !== null && prev?.readiness != null ? p.readiness - prev.readiness : null;
          const isA = comparable && p.id === A.id;
          const isB = comparable && p.id === B.id;
          return (
            <li key={p.id} className="flex shrink-0 items-stretch gap-3">
              {i > 0 && <ArrowRight className="mt-12 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
              <button
                type="button"
                disabled={!p.respondents}
                onClick={() => {
                  // First click picks the start, second the end (kept in date order).
                  if (!A || p.createdAt <= A.createdAt) setFromId(p.id);
                  else setToId(p.id);
                }}
                className={cn(
                  'w-[210px] rounded-lg p-3.5 text-left ring-1 transition-colors',
                  isA || isB ? 'bg-brand-soft ring-brand' : 'bg-card ring-border hover:bg-paper',
                  !p.respondents && 'cursor-default opacity-60'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('pill', p.wave === 'baseline' ? 'pill-neutral' : 'pill-blue')}>{waveLabel(p.wave, fr)}</span>
                  {(isA || isB) && <span className="text-[11px] font-semibold text-brand-ink">{isA ? (fr ? 'Départ' : 'From') : fr ? 'Arrivée' : 'To'}</span>}
                </div>
                <p className="mt-2 truncate text-[13px] font-medium text-foreground" title={p.name}>{p.name}</p>
                <p className="text-[12px] text-muted-foreground">
                  {fmtDate(p.createdAt, fr)} · {p.respondents} {fr ? 'réponses' : 'answers'}
                  {p.audience === 'presales' ? (fr ? ' · Diagnostic IA' : ' · AI diagnostic') : ''}
                </p>
                {workflowProgress(p.workflows) && (
                  <p className="text-[12px] text-muted-foreground">
                    {workflowProgress(p.workflows)!.live}/{workflowProgress(p.workflows)!.total} {fr ? 'workflows en place' : 'workflows live'}
                  </p>
                )}
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-[26px] font-semibold leading-none tabular-nums text-foreground">
                    {p.readiness ?? '·'}
                    <span className="text-[12px] font-normal text-muted-foreground"> /100</span>
                  </span>
                  <Delta value={delta} />
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );

  if (!comparable) {
    return (
      <div className="space-y-5">
        {points.length > 0 && timeline}
        <WorkflowsCard points={points} fr={fr} onSave={onSaveWorkflows} />
        <SectionCard title={fr ? (client ? 'Voir votre évolution' : 'Voir l’évolution de ce client') : client ? 'See how you evolve' : 'See how this client evolves'}>
          <ol className="grid gap-3 sm:grid-cols-3">
            {[
              {
                t: fr ? 'Point de départ' : 'Baseline',
                d: fr ? 'Le premier questionnaire, avant le kickoff. Il sert de référence (T0).' : 'The first survey, before the kickoff. It is the reference (T0).',
              },
              {
                t: fr ? 'Re-mesure' : 'Re-measure',
                d: client
                  ? fr
                    ? 'Quelques semaines après le lancement, l’équipe Dust renvoie le même questionnaire.'
                    : 'A few weeks after the launch, the Dust team sends the same survey again.'
                  : fr
                    ? 'Quelques semaines ou mois après, créez une nouvelle campagne avec le même nom de client et le même type de questionnaire.'
                    : 'A few weeks or months later, create a new campaign with the same client name and the same survey type.',
              },
              {
                t: fr ? 'L’évolution apparaît ici' : 'The change shows up here',
                d: fr ? 'Indice, dimensions, piliers et personnes clés, du départ à aujourd’hui.' : 'Index, dimensions, pillars and key people, from the start to today.',
              },
            ].map((s, i) => (
              <li key={s.t} className="rounded-lg bg-paper p-4 ring-1 ring-border">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-white">{i + 1}</span>
                <p className="mt-2 text-[14px] font-semibold text-foreground">{s.t}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
          {onCreateCampaign && (
            <Button className="mt-4" onClick={() => onCreateCampaign('remeasure')}>
              <PlusCircle className="h-4 w-4" />
              {fr ? 'Créer la re-mesure' : 'Create the re-measure'}
            </Button>
          )}
        </SectionCard>
      </div>
    );
  }

  const dimRows = shared
    .map((d) => ({ d, from: A.dimensions[d.id] as number, to: B.dimensions[d.id] as number }))
    .sort((x, y) => y.to - y.from - (x.to - x.from));
  const readinessDelta = A.readiness !== null && B.readiness !== null ? B.readiness - A.readiness : null;
  // Pre-sales and pulse surveys measure fewer dimensions than the full one.
  const differentSurveys = (A.audience === 'presales') !== (B.audience === 'presales') || (A.wave === 'pulse') !== (B.wave === 'pulse');
  const weeks = Math.max(1, Math.round((new Date(B.createdAt).getTime() - new Date(A.createdAt).getTime()) / (7 * 24 * 3600 * 1000)));
  const bandA = A.readiness !== null ? getReadinessBand(A.readiness).headline : null;
  const bandB = B.readiness !== null ? getReadinessBand(B.readiness).headline : null;
  const best = dimRows[0];

  // One headline sentence, then the four numbers that matter, then the detail.
  const kpis = [
    { id: 'readiness', label: fr ? 'Indice de préparation' : 'Readiness index', from: A.readiness, to: B.readiness, main: true },
    ...PILLARS.map((pl) => ({ id: pl.id, label: fr ? pl.label.fr : pl.label.en, from: pillarScore(A, pl.dims), to: pillarScore(B, pl.dims), main: false })),
  ];

  return (
    <div className="space-y-5">
      {timeline}

      <SectionCard
        title={fr ? 'Avant / après' : 'Before / after'}
        description={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span className="pill pill-neutral">{waveLabel(A.wave, fr)} · {fmtDate(A.createdAt, fr)}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            <span className="pill pill-blue">{waveLabel(B.wave, fr)} · {fmtDate(B.createdAt, fr)}</span>
            <span className="text-[12px]">
              · {weeks} {fr ? (weeks > 1 ? 'semaines' : 'semaine') : weeks > 1 ? 'weeks' : 'week'}
            </span>
          </span>
        }
      >
        {bandA && bandB && readinessDelta !== null && (
          <p className="text-[15px] leading-relaxed text-foreground">
            {fr ? (
              <>
                En {weeks} semaine{weeks > 1 ? 's' : ''}, l’indice passe de <b>{A.readiness}</b> à <b>{B.readiness}</b>
                {bandA.fr !== bandB.fr ? (
                  <>
                    {' '}: de « {bandA.fr} » à <b>« {bandB.fr} »</b>
                  </>
                ) : null}
                .{best && best.to - best.from > 0 ? <> Plus forte progression : {dimensionLabel(best.d.id, 'fr').toLowerCase()} (+{best.to - best.from}).</> : null}
              </>
            ) : (
              <>
                In {weeks} week{weeks > 1 ? 's' : ''}, the index goes from <b>{A.readiness}</b> to <b>{B.readiness}</b>
                {bandA.en !== bandB.en ? (
                  <>
                    : from “{bandA.en}” to <b>“{bandB.en}”</b>
                  </>
                ) : null}
                .{best && best.to - best.from > 0 ? <> Biggest gain: {dimensionLabel(best.d.id, 'en').toLowerCase()} (+{best.to - best.from}).</> : null}
              </>
            )}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.id} className={cn('rounded-lg p-3.5 ring-1', k.main ? 'bg-brand-soft ring-brand/30' : 'bg-paper ring-border')}>
              <p className="text-[12px] font-medium text-muted-foreground">{k.label}</p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-[28px] font-semibold leading-none tabular-nums text-foreground">{k.to ?? '·'}</span>
                {k.from !== null && <span className="text-[12px] tabular-nums text-muted-foreground">{fr ? 'avant' : 'was'} {k.from}</span>}
              </div>
              <div className="mt-2">
                <Delta value={k.from !== null && k.to !== null ? k.to - k.from : null} />
              </div>
            </div>
          ))}
        </div>

        {differentSurveys && (
          <p className="mt-3 rounded-md bg-warn-soft px-3 py-2 text-[12px] text-warn-ink">
            {fr
              ? 'Les deux passages n’utilisent pas le même questionnaire : seules les dimensions mesurées dans les deux sont comparées.'
              : 'The two waves do not use the same survey: only dimensions measured in both are compared.'}
          </p>
        )}
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <SectionCard
          title={fr ? 'Dimension par dimension' : 'Dimension by dimension'}
          description={fr ? 'Classées de la plus forte progression à la plus faible.' : 'From the biggest gain to the smallest.'}
          actions={
            <span className="flex items-center gap-3 text-[12px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[hsl(var(--chart-benchmark))]" />
                {fr ? 'Avant' : 'Before'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                {fr ? 'Après' : 'After'}
              </span>
            </span>
          }
        >
          <ul className="space-y-3">
            {dimRows.map(({ d, from, to }) => {
              const lo = Math.min(from, to);
              const hi = Math.max(from, to);
              return (
                <li key={d.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[190px_1fr_92px]">
                  <span className="truncate text-[13px] text-foreground" title={dimensionLabel(d.id, fr ? 'fr' : 'en')}>
                    {dimensionLabel(d.id, fr ? 'fr' : 'en')}
                  </span>
                  {/* Dumbbell: grey dot before, blue dot after, the bar is the gap. */}
                  <div className="relative order-last col-span-2 h-4 sm:order-none sm:col-span-1" aria-hidden>
                    <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
                    <span
                      className={cn('absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full', to >= from ? 'bg-brand/30' : 'bg-risk-soft')}
                      style={{ left: `${lo}%`, width: `${hi - lo}%` }}
                    />
                    <span className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(var(--chart-benchmark))]" style={{ left: `${from}%` }} />
                    <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand ring-2 ring-card" style={{ left: `${to}%` }} />
                  </div>
                  <span className="flex items-center justify-end gap-2 text-[12px] tabular-nums">
                    <span className="font-semibold text-foreground">{to}</span>
                    <Delta value={to - from} />
                  </span>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        <SectionCard
          title={fr ? 'Les personnes clés' : 'Key people'}
          description={fr ? 'Profils repérés à chaque passage. Une personne peut cumuler plusieurs rôles.' : 'Profiles found at each wave. One person can hold several roles.'}
        >
          <div className="grid grid-cols-2 gap-2">
            {(['champion', 'trainer', 'builder', 'sponsor'] as RoleId[]).map((r) => (
              <div key={r} className="rounded-lg bg-paper p-3 ring-1 ring-border">
                <p className="text-[12px] font-medium text-muted-foreground">{fr ? ROLE_LABEL[r].fr : ROLE_LABEL[r].en}</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-[22px] font-semibold leading-none tabular-nums text-foreground">{B.roles[r]}</span>
                  <span className="text-[12px] tabular-nums text-muted-foreground">{fr ? 'avant' : 'was'} {A.roles[r]}</span>
                </div>
                <div className="mt-1.5">
                  <Delta value={B.roles[r] - A.roles[r]} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] tabular-nums text-muted-foreground">
            {fr ? 'Réponses' : 'Answers'} : {A.respondents} → {B.respondents}
          </p>
        </SectionCard>
      </div>

      <WorkflowsCard points={points} fr={fr} onSave={onSaveWorkflows} />

      {!client && (
        <p className="text-[12px] text-muted-foreground">
          {fr
            ? 'Ici : le perçu et l’évolution, tirés du questionnaire. L’usage réel (breadth, recurrence) vient des métriques produit de l’équipe Data.'
            : 'Here: perception and change, from the survey. Actual usage (breadth, recurrence) comes from the Data team’s product metrics.'}
        </p>
      )}
    </div>
  );
};
