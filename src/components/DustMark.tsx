import { cn } from '@/lib/utils';

// Dust logo mark (same drawing as public/favicon.svg).
export const DustMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 136 136" className={cn('inline-block', className)} aria-hidden focusable="false">
    <rect x="0" y="0" width="34" height="68" fill="#418B5C" />
    <path d="M34 0 A34 34 0 0 1 34 68 Z" fill="#E2F78C" />
    <rect x="68" y="0" width="68" height="34" fill="#E14322" />
    <path d="M68 34 H136 A34 34 0 0 1 68 34 Z" fill="#FFC3DF" />
    <path d="M33 68 H136 V102 H33 A17 17 0 0 1 33 68 Z" fill="#3B82F6" />
    <path d="M17 102 H51 V136 H17 A17 17 0 0 1 17 102 Z" fill="#9FDBFF" />
    <rect x="68" y="102" width="34" height="34" fill="#FE9C1A" />
  </svg>
);

/** Logo + product name, for light top bars (respondent flow, landing). */
export const DustWordmark = ({ className, subtitle }: { className?: string; subtitle?: string }) => (
  <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
    <DustMark className="h-6 w-6 shrink-0" />
    <span className="text-[15px] font-semibold tracking-tight text-foreground">Dust</span>
    {subtitle && (
      <>
        <span className="h-4 w-px shrink-0 bg-border" aria-hidden />
        <span className="truncate text-[13px] text-muted-foreground">{subtitle}</span>
      </>
    )}
  </span>
);
