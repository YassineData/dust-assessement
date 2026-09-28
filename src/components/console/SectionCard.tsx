import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Header separated by a rule, body without padding (for tables and lists). */
  flush?: boolean;
}

export const SectionCard = ({ title, description, actions, children, className, flush }: SectionCardProps) => (
  <section className={cn('card-elevated', !flush && 'p-5', className)}>
    {(title || actions) && (
      <div className={cn('flex flex-wrap items-start justify-between gap-3', flush ? 'border-b border-border px-5 py-3' : children ? 'mb-4' : '')}>
        <div className="min-w-0 flex-1">
          {title && <h3 className="card-title">{title}</h3>}
          {description && <div className="mt-0.5 text-[12px] text-muted-foreground">{description}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);
