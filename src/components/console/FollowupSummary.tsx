import { ArrowRight, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getReadinessBand } from '@/lib/assessment-v2';
import { healthOf, type Health } from '@/lib/usage-import';
import { waveLabel } from '@/lib/waves';
import { workflowProgress } from '@/components/console/WorkflowsCard';
import type { TimelinePoint } from '@/hooks/useClientTimeline';

const HEALTH_LABEL: Record<Health, { fr: string; en: string; cls: string }> = {
  healthy: { fr: 'En bonne santé', en: 'Healthy', cls: 'bg-ok-soft text-ok-ink' },
  watch: { fr: 'À surveiller', en: 'Watch', cls: 'bg-warn-soft text-warn-ink' },
  risk: { fr: 'À risque', en: 'At risk', cls: 'bg-risk-soft text-risk-ink' },
  ramping: { fr: 'En montée', en: 'Ramping', cls: 'bg-muted text-muted-foreground' },
};

/** Change since the first wave of the client, at the top of the overview. Only when there is something to compare. */
export const readinessGain = (points: TimelinePoint[]) => {
  const withAnswers = points.filter((p) => p.respondents > 0 && p.readiness !== null);
  if (withAnswers.length < 2) return null;
  const A = withAnswers[0];
  const B = withAnswers[withAnswers.length - 1];
  return { A, B, delta: (B.readiness as number) - (A.readiness as number) };
};

export const FollowupSummary = ({ points, fr, onOpen }: { points: TimelinePoint[]; fr: boolean; onOpen: () => void }) => {
  const gain = readinessGain(points);
  if (!gain) return null;
  const { A, B, delta } = gain;
  const usagePoint = [...points].reverse().find((p) => p.usage);
  const health = usagePoint?.usage ? healthOf(usagePoint.usage) : null;
  const wf = workflowProgress([...points].reverse().find((p) => p.workflows)?.workflows ?? null);
  const band = getReadinessBand(B.readiness as number).headline;

  const facts = [
    {
      label: fr ? 'Indice' : 'Index',
      value: (
        <>
          {A.readiness} <ArrowRight className="inline h-3.5 w-3.5 text-muted-foreground" /> <b className="text-foreground">{B.readiness}</b>
          <span className={cn('ml-1.5 rounded-full px-1.5 py-0.5 text-[12px] font-semibold', delta >= 0 ? 'bg-ok-soft text-ok-ink' : 'bg-risk-soft text-risk-ink')}>
            {delta > 0 ? '+' : ''}
            {delta}
          </span>
        </>
      ),
    },
    { label: fr ? 'Niveau' : 'Level', value: <b className="text-foreground">{fr ? band.fr : band.en}</b> },
    health && {
      label: fr ? 'Usage Dust' : 'Dust usage',
      value: <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-semibold', HEALTH_LABEL[health].cls)}>{fr ? HEALTH_LABEL[health].fr : HEALTH_LABEL[health].en}</span>,
    },
    wf && {
      label: 'Workflows',
      value: (
        <>
          <b className="text-foreground">
            {wf.live}/{wf.total}
          </b>{' '}
          {fr ? 'en place' : 'live'}
        </>
      ),
    },
  ].filter(Boolean) as { label: string; value: React.ReactNode }[];

  return (
    <section className="card-elevated flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
      <div className="flex items-start gap-3 lg:w-[300px] lg:shrink-0">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
          <TrendingUp className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-foreground">{fr ? 'Depuis le point de départ' : 'Since the baseline'}</p>
          <p className="text-[12px] text-muted-foreground">
            {waveLabel(A.wave, fr)} → {waveLabel(B.wave, fr)} · {points.length} {fr ? 'passages' : 'waves'}
          </p>
        </div>
      </div>
      <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label}>
            <dt className="text-[12px] text-muted-foreground">{f.label}</dt>
            <dd className="mt-0.5 text-[14px] tabular-nums text-muted-foreground">{f.value}</dd>
          </div>
        ))}
      </dl>
      <Button variant="outline" onClick={onOpen} className="lg:shrink-0">
        {fr ? 'Voir le suivi' : 'See the follow-up'}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </section>
  );
};
