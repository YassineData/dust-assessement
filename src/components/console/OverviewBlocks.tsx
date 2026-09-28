import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, BellRing, LineChart, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnimateOnce, CHART_ANIMATION_MS } from '@/hooks/useAnimateOnce';

/* ------------------------------------------------------------------ */
/* Shared bits                                                          */
/* ------------------------------------------------------------------ */

export const DeltaPill = ({ delta, suffix = 'pts', className }: { delta: number; suffix?: string; className?: string }) => (
  <span
    className={cn(
      'pill',
      delta > 0 ? 'pill-green' : delta < 0 ? 'pill-red' : 'pill-neutral',
      className
    )}
  >
    {delta > 0 ? '+' : delta === 0 ? '±' : ''}
    {delta} {suffix}
  </span>
);

const useGrow = (key: string) => {
  const animate = useAnimateOnce(key);
  const [grown, setGrown] = useState(!animate);
  useEffect(() => {
    if (!animate) return;
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, [animate]);
  return { animate, grown };
};

/* ------------------------------------------------------------------ */
/* Level 1 — Hero diagnostic                                            */
/* ------------------------------------------------------------------ */

interface PillarTile {
  eyebrow: string;
  name: string;
  score: number;
  delta?: number;
  deltaLabel: string;
}

interface HeroDiagnosticProps {
  score: number;
  max?: number;
  eyebrow: string;
  benchmarkDelta?: { value: number; label: string };
  title: string;
  subtitle: string;
  synthesisTitle: string;
  synthesis: string;
  strongest?: PillarTile;
  weakest?: PillarTile;
}

export const HeroDiagnostic = ({
  score,
  max = 100,
  eyebrow,
  benchmarkDelta,
  title,
  subtitle,
  synthesisTitle,
  synthesis,
  strongest,
  weakest,
}: HeroDiagnosticProps) => {
  const { animate, grown } = useGrow('hero-ring');
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / max));

  const tile = (p: PillarTile) => (
    <div className="rounded-md bg-lav-100 p-3">
      <p className="mono text-[10px] uppercase tracking-wider text-outline">{p.eyebrow}</p>
      <p className="mt-0.5 text-[13px] font-semibold leading-snug text-foreground">
        {p.name} <span className="tabular-nums">({p.score})</span>
      </p>
      {p.delta !== undefined && (
        <p className={cn('text-[11px] font-medium tabular-nums', p.delta > 0 ? 'text-ok-ink' : p.delta < 0 ? 'text-risk-ink' : 'text-muted-foreground')}>
          {p.delta > 0 ? '+' : p.delta === 0 ? '±' : ''}{p.delta} pts {p.deltaLabel}
        </p>
      )}
    </div>
  );

  return (
    <section className="card-elevated p-5">
      <div className="grid items-center gap-5 lg:grid-cols-12">
        <div className="flex items-center gap-5 lg:col-span-4">
          <div className="relative h-28 w-28 shrink-0" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={score} aria-label={eyebrow}>
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--lav-100))" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="hsl(var(--brand))"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={grown ? c * (1 - pct) : c}
                style={{ transition: animate ? `stroke-dashoffset ${CHART_ANIMATION_MS}ms ease-out` : undefined }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[28px] font-bold leading-none tabular-nums text-foreground">{score}</span>
              <span className="mono mt-1 text-[10px] uppercase tracking-wider text-outline">/ {max}</span>
            </div>
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow">{eyebrow}</span>
              {benchmarkDelta && <DeltaPill delta={benchmarkDelta.value} suffix={benchmarkDelta.label} />}
            </div>
            <h2 className="text-xl font-semibold leading-snug tracking-tight text-foreground">{title}</h2>
            <p className="text-[12px] text-outline">{subtitle}</p>
          </div>
        </div>

        <div className="rounded-md bg-lav-50 p-3.5 lg:col-span-5">
          <div className="flex items-start gap-2.5">
            <LineChart className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" />
            <div className="space-y-1">
              <p className="text-[12px] font-semibold text-foreground">{synthesisTitle}</p>
              <p className="text-[13px] leading-relaxed text-foreground/75">{synthesis}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:col-span-3">
          {strongest && tile(strongest)}
          {weakest && tile(weakest)}
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Level 2 — KPI cards                                                  */
/* ------------------------------------------------------------------ */

type Tone = 'brand' | 'green' | 'amber' | 'red' | 'neutral';

const TONE_TILE: Record<Tone, string> = {
  brand: 'bg-brand-soft text-brand-ink',
  green: 'bg-ok-soft text-ok-ink',
  amber: 'bg-warn-soft text-warn-ink',
  red: 'bg-risk-soft text-risk-ink',
  neutral: 'bg-lav-50 text-brand-ink',
};
const TONE_PILL: Record<Tone, string> = {
  brand: 'pill-brand',
  green: 'pill-green',
  amber: 'pill-amber',
  red: 'pill-red',
  neutral: 'pill-neutral',
};

export interface KpiItem {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  suffix?: ReactNode;
  chip?: ReactNode;
  /** Plain footnote instead of a chip (e.g. "84% completion"). */
  note?: ReactNode;
  tone?: Tone;
}

export const KpiCards = ({ items }: { items: KpiItem[] }) => (
  <section className={cn('grid grid-cols-2 gap-3', items.length >= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4')}>
    {items.map((kpi) => {
      const Icon = kpi.icon;
      const tone = kpi.tone ?? 'neutral';
      return (
        <div key={kpi.label} className="card-elevated flex items-start justify-between gap-2 p-4">
          <div className="min-w-0 space-y-1">
            <p className="eyebrow truncate">{kpi.label}</p>
            <p className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-[28px] font-semibold leading-9 tracking-tight tabular-nums text-foreground">{kpi.value}</span>
              {kpi.suffix && <span className="truncate text-[12px] text-outline">{kpi.suffix}</span>}
            </p>
            {kpi.chip && <span className={cn('pill', TONE_PILL[tone])}>{kpi.chip}</span>}
            {kpi.note && (
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                {kpi.note}
              </p>
            )}
          </div>
          <span className={cn('hidden h-10 w-10 shrink-0 items-center justify-center rounded-md sm:flex', TONE_TILE[tone])}>
            <Icon className="h-5 w-5" />
          </span>
        </div>
      );
    })}
  </section>
);

/* ------------------------------------------------------------------ */
/* Level 3 — Dimension bars (cohort vs benchmark)                       */
/* ------------------------------------------------------------------ */

export const DimensionBars = ({
  rows,
  vsLabel,
  animationKey = 'dimension-bars',
}: {
  rows: { name: string; score: number; benchmark?: number }[];
  vsLabel: string;
  animationKey?: string;
}) => {
  const { animate, grown } = useGrow(animationKey);
  return (
    <ul className="space-y-3.5">
      {rows.map((d) => {
        const delta = d.benchmark !== undefined ? Math.round(d.score - d.benchmark) : undefined;
        const critical = d.score < 40;
        return (
          <li key={d.name} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-[13px] font-medium text-foreground" title={d.name}>{d.name}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="mono text-[12px] font-semibold text-foreground">{d.score}</span>
                {d.benchmark !== undefined && <span className="mono text-[12px] text-outline">{vsLabel} {d.benchmark}</span>}
                {delta !== undefined && <DeltaPill delta={delta} />}
              </span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-lav-100">
              {d.benchmark !== undefined && (
                <div className="absolute inset-y-0 left-0 rounded-full bg-lav-200" style={{ width: `${Math.max(0, Math.min(100, d.benchmark))}%` }} />
              )}
              <div
                className={cn('absolute inset-y-0 left-0 rounded-full', critical ? 'bg-risk' : 'bg-brand')}
                style={{
                  width: `${grown ? Math.max(0, Math.min(100, d.score)) : 0}%`,
                  transition: animate ? `width ${CHART_ANIMATION_MS}ms ease-out` : undefined,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

/* ------------------------------------------------------------------ */
/* Ranked people list                                                   */
/* ------------------------------------------------------------------ */

export const RankedList = ({
  rows,
}: {
  rows: { id: string; name: string; meta?: string; badge?: ReactNode; score: number; onClick?: () => void }[];
}) => (
  <ol className="space-y-1">
    {rows.map((r, i) => {
      const first = i === 0;
      const Tag = r.onClick ? 'button' : 'div';
      return (
        <li key={r.id}>
          <Tag
            {...(r.onClick ? { type: 'button' as const, onClick: r.onClick } : {})}
            className={cn(
              'flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left transition-colors duration-150',
              first ? 'bg-brand-soft' : 'hover:bg-lav-50'
            )}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className={cn('mono w-5 text-[12px] font-semibold', first ? 'text-brand-ink' : 'text-outline')}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-foreground">{r.name}</span>
                {r.meta && <span className="block truncate text-[11px] text-outline">{r.meta}</span>}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {r.badge}
              <span className={cn('w-8 text-right text-base font-semibold tabular-nums', first ? 'text-brand-ink' : 'text-foreground')}>
                {r.score}
              </span>
            </span>
          </Tag>
        </li>
      );
    })}
  </ol>
);

/* ------------------------------------------------------------------ */
/* Pending banner (calm, amber-tinted)                                  */
/* ------------------------------------------------------------------ */

export const PendingBanner = ({
  title,
  description,
  actions,
  icon: Icon = BellRing,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: LucideIcon;
}) => (
  <section className="relative flex flex-col gap-3 overflow-hidden rounded-lg bg-warn-soft/60 p-4 pl-5 ring-1 ring-warn/20 sm:flex-row sm:items-center">
    <span className="absolute inset-y-0 left-0 w-[3px] bg-warn" aria-hidden />
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-warn-soft text-warn-ink">
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description && <p className="text-[13px] text-foreground/70">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </section>
);

/* ------------------------------------------------------------------ */
/* Recommended next steps                                               */
/* ------------------------------------------------------------------ */

export const NextSteps = ({
  steps,
}: {
  steps: { title: string; tag: string; tone: 'red' | 'brand' | 'green' | 'amber'; body: string }[];
}) => {
  const tagColor = { red: 'text-risk-ink', brand: 'text-brand-ink', green: 'text-ok-ink', amber: 'text-warn-ink' };
  const numColor = { red: 'bg-risk-soft text-risk-ink', brand: 'bg-brand-soft text-brand-ink', green: 'bg-ok-soft text-ok-ink', amber: 'bg-warn-soft text-warn-ink' };
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => (
        <li key={s.title} className="flex gap-3 rounded-md bg-lav-50 p-3">
          <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-[12px] font-semibold', numColor[s.tone])}>
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-[13px] font-semibold text-foreground">{s.title}</p>
              <span className={cn('text-[11px] font-semibold', tagColor[s.tone])}>{s.tag}</span>
            </div>
            <p className="mt-0.5 line-clamp-3 text-[13px] leading-relaxed text-foreground/70">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
};

export const CardLink = ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1 rounded-sm text-[12px] font-semibold text-brand-ink transition-colors duration-150 hover:text-primary-hover"
  >
    {children}
    <ArrowRight className="h-3.5 w-3.5" />
  </button>
);
