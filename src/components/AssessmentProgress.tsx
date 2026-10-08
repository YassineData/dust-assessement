import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface AssessmentProgressProps {
  /** Dimensions in the order they are answered. */
  thematics: string[];
  currentThematic: string;
  answeredInThematic: number;
  totalQuestionsInThematic: number;
  completedThematics: string[];
  /** Highest dimension index the respondent may jump to (completed ones + the current one). */
  maxReachableIndex: number;
  onSelectThematic: (index: number) => void;
  labelFor?: (thematic: string) => string;
  stepLabel?: string;
  /** Name of one section in the header ("Dimension" by default). */
  unitLabel?: string;
}

export const AssessmentProgress = ({
  thematics,
  currentThematic,
  answeredInThematic,
  totalQuestionsInThematic,
  completedThematics,
  maxReachableIndex,
  onSelectThematic,
  labelFor,
  stepLabel,
  unitLabel = 'Dimension',
}: AssessmentProgressProps) => {
  const { t, language } = useLanguage();
  const fr = language === 'fr';

  const translate = (thematic: string) => labelFor ? labelFor(thematic) : (language === 'en' ? t(`thematics.${thematic}`) : thematic);
  const currentIndex = thematics.indexOf(currentThematic);

  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">
            {stepLabel ? `${stepLabel} · ` : ''}{unitLabel} {currentIndex + 1}/{thematics.length}
          </p>
          <h1 className="mt-0.5 flex items-center gap-2 truncate text-[15px] font-semibold text-foreground">
            <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden />
            {translate(currentThematic)}
          </h1>
        </div>
        <p className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{answeredInThematic}</span>/{totalQuestionsInThematic}{' '}
          {fr ? 'répondues' : 'answered'}
        </p>
      </div>

      <nav className="mt-3 flex gap-1" aria-label={fr ? 'Thématiques' : 'Themes'}>
        {thematics.map((thematic, index) => {
          const isCompleted = completedThematics.includes(thematic);
          const isCurrent = thematic === currentThematic;
          const reachable = index <= maxReachableIndex;
          const label = translate(thematic);
          return (
            <button
              key={thematic}
              type="button"
              onClick={() => reachable && !isCurrent && onSelectThematic(index)}
              disabled={!reachable}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`${index + 1}. ${label}${isCompleted ? (fr ? ' (terminée)' : ' (completed)') : ''}`}
              title={label}
              className={cn(
                'group flex h-4 flex-1 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
                reachable && !isCurrent ? 'cursor-pointer' : 'cursor-default'
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-full rounded-full transition-colors duration-150',
                  isCurrent
                    ? 'bg-brand'
                    : isCompleted
                      ? 'bg-ok group-hover:bg-ok/80'
                      : 'bg-muted'
                )}
              />
            </button>
          );
        })}
      </nav>
    </div>
  );
};
