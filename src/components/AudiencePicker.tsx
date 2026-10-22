import { cn } from '@/lib/utils';
import { AUDIENCES, type SurveyAudience } from '@/lib/assessment-v2';

/** Who a deployment survey is for. The pre-sales diagnostic has no audience choice. */
const DEPLOYMENT_AUDIENCES: SurveyAudience[] = ['general', 'sales', 'success', 'builders'];

const KINDS = [
  {
    id: 'presales' as const,
    title: { fr: 'Diagnostic IA', en: 'AI diagnostic' },
    desc: {
      fr: 'Avant la signature. Questionnaire court et neutre, centré sur les irritants.',
      en: 'Before signature. Short, tool-agnostic survey focused on pain points.',
    },
  },
  {
    id: 'deployment' as const,
    title: { fr: 'Déploiement', en: 'Deployment' },
    desc: {
      fr: 'Client signé. Le questionnaire complet pour préparer le kickoff.',
      en: 'Signed customer. The full survey to prepare the kickoff.',
    },
  },
];

/** Two steps: diagnostic or deployment, then (for a deployment) who the survey is for. */
export const AudiencePicker = ({ value, onChange, fr }: { value: SurveyAudience; onChange: (a: SurveyAudience) => void; fr: boolean }) => {
  const kind = value === 'presales' ? 'presales' : 'deployment';
  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label={fr ? 'Type de campagne' : 'Campaign type'} className="grid gap-2 sm:grid-cols-2">
        {KINDS.map((k) => {
          const on = kind === k.id;
          return (
            <button
              key={k.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(k.id === 'presales' ? 'presales' : value === 'presales' ? 'general' : value)}
              className={cn(
                'rounded-lg p-3 text-left ring-1 transition-colors duration-150',
                on ? 'bg-ink text-white ring-ink' : 'bg-card text-foreground ring-border hover:bg-paper'
              )}
            >
              <span className="block text-[14px] font-semibold">{fr ? k.title.fr : k.title.en}</span>
              <span className={cn('mt-0.5 block text-[12px] leading-snug', on ? 'text-white/75' : 'text-muted-foreground')}>{fr ? k.desc.fr : k.desc.en}</span>
            </button>
          );
        })}
      </div>

      {kind === 'deployment' && (
        <div className="space-y-1.5">
          <p className="text-[12px] font-medium text-foreground">{fr ? 'Pour qui ?' : 'Who is it for?'}</p>
          <div role="radiogroup" aria-label={fr ? 'Public' : 'Audience'} className="flex flex-wrap gap-2">
            {DEPLOYMENT_AUDIENCES.map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={value === a}
                onClick={() => onChange(a)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[13px] font-medium ring-1 transition-colors duration-150',
                  value === a ? 'bg-ink text-white ring-ink' : 'bg-card text-foreground ring-border hover:bg-paper'
                )}
              >
                {fr ? AUDIENCES[a].label.fr : AUDIENCES[a].label.en}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-muted-foreground">
            {fr
              ? 'Change l’en-tête et les exemples du questionnaire. Les questions restent les mêmes.'
              : 'Changes the survey header and examples. The questions stay the same.'}
          </p>
        </div>
      )}
    </div>
  );
};
