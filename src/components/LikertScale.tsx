import { forwardRef } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

type AnswerValue = 'disagree' | 'somewhatDisagree' | 'neutral' | 'somewhatAgree' | 'agree';

interface LikertScaleProps {
  questionId: string;
  /** Statement already localized by the caller. */
  text: string;
  value?: AnswerValue;
  onChange: (value: AnswerValue) => void;
  onAutoAdvance?: () => void;
  isActive?: boolean;
  questionNumber?: number;
}

const SCALE: AnswerValue[] = ['disagree', 'somewhatDisagree', 'neutral', 'somewhatAgree', 'agree'];

export const LikertScale = forwardRef<HTMLDivElement, LikertScaleProps>(
  ({ questionId, text, value, onChange, onAutoAdvance, isActive = true, questionNumber }, ref) => {
    const { language } = useLanguage();

    // Une question est "active" seulement si elle n'a pas de réponse ET qu'elle est la question courante
    const isCurrentActive = isActive && !value;

    const handleClick = (bubbleValue: AnswerValue) => {
      // Permettre de cliquer seulement si c'est la question active sans réponse
      if (!isCurrentActive) return;

      onChange(bubbleValue);
      if (onAutoAdvance) {
        setTimeout(() => {
          onAutoAdvance();
        }, 300);
      }
    };

    const questionText = text;

    const bubbleLabels: Record<AnswerValue, string> = language === 'fr'
      ? {
          disagree: "Pas du tout d'accord",
          somewhatDisagree: "Plutôt pas d'accord",
          neutral: 'Neutre',
          somewhatAgree: "Plutôt d'accord",
          agree: "Tout à fait d'accord",
        }
      : {
          disagree: 'Strongly disagree',
          somewhatDisagree: 'Somewhat disagree',
          neutral: 'Neutral',
          somewhatAgree: 'Somewhat agree',
          agree: 'Strongly agree',
        };

    const isAnswered = !!value;
    const isUpcoming = !isCurrentActive && !isAnswered;

    return (
      <div
        ref={ref}
        className={cn(
          'w-full rounded-lg border p-5 transition-colors duration-150 sm:p-6',
          isCurrentActive && 'border-brand/40 bg-card shadow-sm ring-1 ring-brand/10',
          isAnswered && 'border-border bg-brand-soft/60',
          isUpcoming && 'pointer-events-none border-border bg-card opacity-55'
        )}
        aria-disabled={!isCurrentActive || undefined}
      >
        <div className="flex items-start gap-3">
          {questionNumber && (
            <span
              className={cn(
                'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums',
                isAnswered ? 'bg-brand-strong text-white' : isCurrentActive ? 'bg-brand-soft text-accent-foreground' : 'bg-muted text-muted-foreground'
              )}
              aria-hidden
            >
              {isAnswered ? <Check className="h-3.5 w-3.5" /> : questionNumber}
            </span>
          )}
          <h2
            id={`q-${questionId}`}
            className={cn('text-[15px] font-medium leading-relaxed sm:text-base', isUpcoming ? 'text-muted-foreground' : 'text-foreground')}
          >
            {questionText}
          </h2>
        </div>

        <div className="mt-5 sm:pl-9">
          <div
            role="radiogroup"
            aria-labelledby={`q-${questionId}`}
            className="flex items-center justify-between gap-2 sm:max-w-[420px]"
          >
            {SCALE.map((option, i) => {
              const selected = value === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={bubbleLabels[option]}
                  title={bubbleLabels[option]}
                  onClick={() => handleClick(option)}
                  disabled={!isCurrentActive}
                  className={cn(
                    'group relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors duration-150 sm:h-11 sm:w-11',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
                    selected
                      ? 'border-brand bg-brand-strong text-white'
                      : isCurrentActive
                        ? 'border-line bg-card text-muted-foreground hover:border-brand hover:bg-brand-soft'
                        : 'border-line bg-card text-muted-foreground'
                  )}
                >
                  {selected ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-[12px] font-medium tabular-nums">{i + 1}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[12px] text-muted-foreground sm:max-w-[420px]">
            <span>{bubbleLabels.disagree}</span>
            <span className="text-right">{bubbleLabels.agree}</span>
          </div>
          {isAnswered && value && (
            <p className="mt-3 text-[13px] text-foreground">
              <span className="text-muted-foreground">{language === 'fr' ? 'Votre réponse : ' : 'Your answer: '}</span>
              <span className="font-medium">{bubbleLabels[value]}</span>
            </p>
          )}
        </div>
      </div>
    );
  }
);

LikertScale.displayName = 'LikertScale';
