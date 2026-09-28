import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAnimateOnce, CHART_ANIMATION_MS } from '@/hooks/useAnimateOnce';
import { cn } from '@/lib/utils';

interface ThematicBarChartProps {
  data: { thematic: string; score: number; benchmark?: number; position?: number }[];
  /** Kept for API compatibility; the ranking view is not used in the console. */
  showPosition?: boolean;
  showBenchmark?: boolean;
  animationKey?: string;
}

/**
 * Cohort vs benchmark per dimension, as a compact bar list:
 * cohort = brand bar, benchmark = light gray marker, delta colored by sign.
 * Values sit next to the data instead of in a distant legend.
 */
export const ThematicBarChart = ({ data, showBenchmark = false, animationKey = 'thematic-bars' }: ThematicBarChartProps) => {
  const { language } = useLanguage();
  const animate = useAnimateOnce(animationKey);
  const [grown, setGrown] = useState(!animate);

  useEffect(() => {
    if (!animate) return;
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, [animate]);

  return (
    <div className="w-full">
      <div className="mb-2 hidden grid-cols-[minmax(120px,200px)_1fr_40px_52px] items-center gap-3 sm:grid">
        <span />
        <div className="relative flex justify-between text-[11px] text-muted-foreground tabular-nums">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
        <span className="eyebrow text-right">{language === 'fr' ? 'Score' : 'Score'}</span>
        {showBenchmark ? <span className="eyebrow text-right">Δ</span> : <span />}
      </div>
      <ul className="divide-y divide-border">
        {data.map((d) => {
          const delta = d.benchmark !== undefined ? Math.round(d.score - d.benchmark) : undefined;
          return (
            <li
              key={d.thematic}
              className="grid grid-cols-[1fr_40px_52px] items-center gap-x-3 gap-y-1.5 py-2 sm:grid-cols-[minmax(120px,200px)_1fr_40px_52px]"
            >
              <span className="col-span-3 truncate text-[13px] text-foreground sm:col-span-1" title={d.thematic}>
                {d.thematic}
              </span>
              <div className="relative h-2 rounded-full bg-muted" aria-hidden>
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-brand"
                  style={{
                    width: `${grown ? Math.max(0, Math.min(100, d.score)) : 0}%`,
                    transition: animate ? `width ${CHART_ANIMATION_MS}ms ease-out` : undefined,
                  }}
                />
                {showBenchmark && d.benchmark !== undefined && (
                  <div
                    className="absolute -top-1 -bottom-1 w-[2px] rounded-full bg-chart-benchmark ring-2 ring-card"
                    style={{ left: `calc(${Math.max(0, Math.min(100, d.benchmark))}% - 1px)` }}
                    title={`Benchmark: ${d.benchmark}/100`}
                  />
                )}
              </div>
              <span className="text-right text-[13px] font-semibold tabular-nums text-foreground">{d.score}</span>
              {showBenchmark && delta !== undefined ? (
                <span
                  className={cn(
                    'text-right text-[12px] font-medium tabular-nums',
                    delta > 0 ? 'text-ok-ink' : delta < 0 ? 'text-risk-ink' : 'text-muted-foreground'
                  )}
                >
                  {delta > 0 ? '+' : delta === 0 ? '±' : ''}{delta} pts
                </span>
              ) : (
                <span />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
