import { Languages } from 'lucide-react';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const OPTIONS: { id: Language; label: string; short: string }[] = [
  { id: 'fr', label: 'Français', short: 'FR' },
  { id: 'en', label: 'English', short: 'EN' },
];

/**
 * Both languages always visible, so respondents see at a glance they can switch.
 * `compact` shows FR / EN only, for crowded toolbars (console, kit).
 */
export const LanguageSwitcher = ({ compact = false }: { compact?: boolean }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      role="radiogroup"
      aria-label={language === 'fr' ? 'Langue' : 'Language'}
      className="inline-flex items-center gap-1 rounded-full bg-brand-soft p-1 ring-1 ring-sky"
    >
      <Languages className="ml-1.5 h-4 w-4 text-brand-ink" aria-hidden="true" />
      {OPTIONS.map((o) => {
        const on = language === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            lang={o.id}
            onClick={() => setLanguage(o.id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 sm:px-2.5 sm:py-1',
              on ? 'bg-brand-strong text-white shadow-sm' : 'text-brand-ink hover:bg-white/70'
            )}
          >
            {compact ? (
              <span title={o.label}>{o.short}</span>
            ) : (
              <>
                <span className="hidden sm:inline">{o.label}</span>
                <span className="sm:hidden">{o.short}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
};
