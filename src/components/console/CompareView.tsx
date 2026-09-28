import type { ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { COMPARISON_COLORS, COMPARISON_COLOR_BY_INDEX } from '@/components/CompareSelector';
import { SectionCard } from '@/components/console/SectionCard';
import { useAnimateOnce, CHART_ANIMATION_MS } from '@/hooks/useAnimateOnce';
import { cn } from '@/lib/utils';

interface CompareDimension {
  key: string;
  name: string;
  cohort: number;
  benchmark?: number;
  /** One value per selected series, same order as `series`. */
  values: number[];
}

interface CompareViewProps {
  selector: ReactNode;
  dimensions: CompareDimension[];
  cohortLabel: string;
  showCohort: boolean;
  series: { id: string; label: string }[];
  radar: ReactNode;
  radarTitle: string;
  radarDescription: string;
}

const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

export const CompareView = ({
  selector,
  dimensions,
  cohortLabel,
  showCohort,
  series,
  radar,
  radarTitle,
  radarDescription,
}: CompareViewProps) => {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const animate = useAnimateOnce('compare-grouped');

  const cohortMean = mean(dimensions.map((d) => d.cohort));
  const rows = [
    ...(showCohort ? [{ id: 'cohort', label: cohortLabel, color: COMPARISON_COLORS.average, get: (d: CompareDimension) => d.cohort }] : []),
    ...series.map((s, i) => ({
      id: s.id,
      label: s.label,
      color: COMPARISON_COLOR_BY_INDEX[i] ?? COMPARISON_COLORS.first,
      get: (d: CompareDimension) => d.values[i] ?? 0,
    })),
  ];
  const summaries = rows.map((r) => ({ ...r, overall: mean(dimensions.map(r.get)) }));
  const best = summaries.length > 1 ? Math.max(...summaries.map((s) => s.overall)) : null;

  const statusFor = (overall: number, isCohort: boolean) => {
    if (isCohort) return { text: fr ? 'Référence' : 'Reference', cls: 'pill-brand' };
    if (best !== null && overall === best) return { text: fr ? 'En tête' : 'Leading', cls: 'pill-green' };
    const d = overall - cohortMean;
    if (d >= 0) return { text: fr ? 'Au-dessus' : 'Above', cls: 'pill-lav' };
    if (d > -10) return { text: fr ? 'Proche' : 'Close', cls: 'pill-amber' };
    return { text: fr ? 'Écart marqué' : 'Wide gap', cls: 'pill-red' };
  };

  return (
    <div className="space-y-5">
      <section className="card-elevated p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="eyebrow">{fr ? 'Comparaison' : 'Comparing'}</p>
          <p className="text-[12px] text-muted-foreground">
            {fr ? 'Jusqu’à 4 séries : participants, campagnes ou secteurs' : 'Up to 4 series: participants, campaigns or sectors'}
          </p>
        </div>
        {selector}
      </section>

      {summaries.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaries.map((s) => {
            const isCohort = s.id === 'cohort';
            const status = statusFor(s.overall, isCohort);
            const delta = s.overall - cohortMean;
            return (
              <div key={s.id} className="card-elevated overflow-hidden">
                <div className="h-1" style={{ backgroundColor: s.color }} />
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-foreground">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.label}</span>
                    </p>
                    <span className={cn('pill shrink-0', status.cls)}>{status.text}</span>
                  </div>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className="text-[32px] font-semibold leading-none tracking-tight tabular-nums text-foreground">{s.overall}</span>
                    <span className="mono text-[12px] text-outline">/ 100</span>
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{fr ? 'Moyenne des thématiques' : 'Theme average'}</span>
                    {!isCohort && showCohort && (
                      <span className={cn('mono font-semibold', delta > 0 ? 'text-ok-ink' : delta < 0 ? 'text-risk-ink' : 'text-muted-foreground')}>
                        {delta > 0 ? '+' : delta === 0 ? '±' : ''}{delta} {fr ? 'vs cohorte' : 'vs cohort'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SectionCard
        title={fr ? 'Comparaison thématique par thématique' : 'Theme-by-theme comparison'}
        description={fr ? 'Scores normalisés /100 pour chaque série sélectionnée' : 'Normalized /100 scores for each selected series'}
        actions={
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            {summaries.map((s) => (
              <span key={s.id} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: s.color }} />
                <span className="max-w-[140px] truncate">{s.label}</span>
              </span>
            ))}
          </div>
        }
      >
        {summaries.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-muted-foreground">
            {fr ? 'Sélectionnez au moins une série à comparer.' : 'Select at least one series to compare.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {dimensions.map((d) => (
              <li key={d.key} className="grid gap-3 md:grid-cols-[200px_minmax(0,1fr)] md:items-center">
                <div>
                  <p className="text-[13px] font-medium text-foreground">{d.name}</p>
                  {d.benchmark !== undefined && (
                    <p className="mono text-[11px] text-outline">Benchmark {d.benchmark}</p>
                  )}
                </div>
                <div className="space-y-1 rounded-md bg-lav-50 p-2.5">
                  {rows.map((r) => {
                    const v = r.get(d);
                    return (
                      <div key={r.id} className="grid grid-cols-[minmax(0,110px)_32px_minmax(0,1fr)] items-center gap-2">
                        <span className="truncate text-[11px] text-muted-foreground" title={r.label}>{r.label}</span>
                        <span className="mono text-right text-[11px] font-semibold text-foreground">{v}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-lav-100">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${Math.max(0, Math.min(100, v))}%`,
                              backgroundColor: r.color,
                              animation: animate ? `grow-x ${CHART_ANIMATION_MS}ms ease-out` : undefined,
                              transformOrigin: 'left',
                            }}
                          />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={radarTitle} description={radarDescription}>
        {radar}
      </SectionCard>
    </div>
  );
};
