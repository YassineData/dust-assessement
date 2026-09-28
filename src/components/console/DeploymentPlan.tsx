import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CampaignParticipant } from '@/hooks/useCampaignParticipants';
import { RESULT_CLASSES, getDimension } from '@/lib/assessment-v2';
import { PROFILE_BADGE } from '@/lib/profile-style';
import { SectionCard } from '@/components/console/SectionCard';
import { cn } from '@/lib/utils';

interface DeploymentPlanProps {
  participants: CampaignParticipant[];
  /** Readiness dimension averages for the cohort. */
  dimensions: { id: string; name: string; score: number }[];
  onSelectParticipant?: (id: string) => void;
}

/** Who does what in the rollout, straight from the spec's "Result classes" and "Dimensions" sheets. */
export const DeploymentPlan = ({ participants, dimensions, onSelectParticipant }: DeploymentPlanProps) => {
  const { language } = useLanguage();
  const fr = language !== 'en';
  const completed = participants.filter((p) => p.status === 'completed');
  const blockers = [...dimensions].filter((d) => d.score < 50).sort((a, b) => a.score - b.score);
  const fragile = [...dimensions].filter((d) => d.score >= 50 && d.score < 70).sort((a, b) => a.score - b.score);

  return (
    <div className="space-y-5">
      <SectionCard
        title={fr ? 'Plan de déploiement par profil' : 'Rollout plan by profile'}
        description={fr ? 'Ce qu’il faut faire avec chaque groupe. Des signaux, pas des verdicts.' : 'What to do with each group. Signals, not verdicts.'}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {RESULT_CLASSES.map((c) => {
            const people = completed.filter((p) => p.profile.id === c.id);
            const mismatch = people.filter((p) => p.roleMismatch).length;
            return (
              <div key={c.id} className="flex flex-col rounded-md p-4 ring-1 ring-border">
                <div className="flex items-center justify-between gap-2">
                  <span className={PROFILE_BADGE[c.id]}>{fr ? c.name.fr : c.name.en}</span>
                  <span className="text-[22px] font-semibold tabular-nums text-foreground">{people.length}</span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-foreground">{fr ? c.action.fr : c.action.en}</p>
                {mismatch > 0 && (
                  <p className="mt-2 flex gap-1.5 rounded-md bg-warn-soft px-2.5 py-1.5 text-[12px] text-warn-ink">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {fr
                      ? `${mismatch} sans rôle de formation déclaré : à confirmer avant de les nommer.`
                      : `${mismatch} did not declare a training role: confirm before naming them.`}
                  </p>
                )}
                {people.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                    {people.slice(0, 8).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onSelectParticipant?.(p.id)}
                        className={cn(
                          'rounded-sm bg-lav-50 px-2 py-1 text-[12px] text-foreground transition-colors duration-150 hover:bg-lav-100',
                          p.roleMismatch && 'ring-1 ring-warn/50'
                        )}
                      >
                        {p.firstName} {p.lastName}
                      </button>
                    ))}
                    {people.length > 8 && <span className="px-1 py-1 text-[12px] text-muted-foreground">+{people.length - 8}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title={fr ? 'Actions par dimension' : 'Actions by dimension'}
        description={fr ? 'Bloquant (< 50) : à traiter avant l’étape suivante · Fragile (50–69) : à mentionner au kickoff' : 'Blocker (< 50): address before the next stage · Fragile (50–69): one line in the kickoff'}
      >
        {blockers.length === 0 && fragile.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{fr ? 'Aucune dimension sous 70 : rien à corriger en priorité.' : 'No dimension below 70: nothing to fix first.'}</p>
        ) : (
          <ol className="space-y-2">
            {[...blockers, ...fragile].map((d) => {
              const def = getDimension(d.id);
              const blocker = d.score < 50;
              return (
                <li key={d.id} className="flex gap-3 rounded-md bg-lav-50 p-3">
                  <span className={cn('pill mt-0.5 h-fit', blocker ? 'pill-red' : 'pill-amber')}>{d.score}</span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">
                      {d.name}
                      <span className={cn('ml-2 text-[11px] font-semibold', blocker ? 'text-risk-ink' : 'text-warn-ink')}>
                        {blocker ? (fr ? 'Bloquant' : 'Blocker') : (fr ? 'Fragile' : 'Fragile')}
                      </span>
                    </p>
                    <p className="text-[13px] leading-relaxed text-foreground/75">{def ? (fr ? def.lowAction.fr : def.lowAction.en) : ''}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </SectionCard>
    </div>
  );
};
