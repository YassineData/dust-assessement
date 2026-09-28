import { Sparkle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Placeholder brand mark. Swap for the official Dust SVG when available.
export const DustMark = ({ className }: { className?: string }) => (
  <span
    className={cn('inline-flex items-center justify-center rounded-md bg-brand text-white', className)}
    aria-hidden
  >
    <Sparkle className="h-[60%] w-[60%]" strokeWidth={2} />
  </span>
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
