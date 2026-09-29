import { useMemo, useState } from 'react';
import { OPEN_FIELDS, type OpenField } from '@/lib/assessment-v2';
import type { CampaignParticipant } from '@/hooks/useCampaignParticipants';
import { SectionCard } from '@/components/console/SectionCard';
import { cn } from '@/lib/utils';

const PREVIEW = 6;

/** Every open answer of the campaign, grouped by question: raw material for the first use cases. */
export const OpenAnswersCard = ({ participants, fr }: { participants: CampaignParticipant[]; fr: boolean }) => {
  const byField = useMemo(() => {
    const map = {} as Record<OpenField['id'], { text: string; who: string; team: string | null }[]>;
    OPEN_FIELDS.forEach((f) => {
      map[f.id] = participants
        .filter((p) => (p.open?.[f.id] ?? '').trim())
        .map((p) => ({ text: (p.open[f.id] as string).trim(), who: `${p.firstName} ${p.lastName}`.trim(), team: p.team }));
    });
    return map;
  }, [participants]);

  const firstWithAnswers = OPEN_FIELDS.find((f) => byField[f.id].length > 0)?.id ?? OPEN_FIELDS[0].id;
  const [active, setActive] = useState<OpenField['id']>(firstWithAnswers);
  const [expanded, setExpanded] = useState(false);
  const total = OPEN_FIELDS.reduce((n, f) => n + byField[f.id].length, 0);
  if (total === 0) return null;

  const field = OPEN_FIELDS.find((f) => f.id === active) ?? OPEN_FIELDS[0];
  const answers = byField[field.id];
  const shown = expanded ? answers : answers.slice(0, PREVIEW);

  return (
    <SectionCard
      title={fr ? 'Ce que les équipes nous disent' : 'What people told us'}
      description={fr ? 'Réponses ouvertes, par question : la matière première des premiers cas d’usage' : 'Open answers by question: raw material for the first use cases'}
      actions={<span className="mono text-[12px] text-outline">{total} {fr ? 'réponses' : 'answers'}</span>}
    >
      <div role="tablist" className="flex flex-wrap gap-1.5">
        {OPEN_FIELDS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={f.id === active}
            onClick={() => { setActive(f.id); setExpanded(false); }}
            className={cn(
              'rounded-full px-3 py-1 text-[12px] font-medium ring-1 transition-colors duration-150',
              f.id === active ? 'bg-ink text-white ring-ink' : 'bg-card text-foreground ring-border hover:bg-paper'
            )}
          >
            {fr ? f.label.fr : f.label.en} <span className="tabular-nums opacity-70">({byField[f.id].length})</span>
          </button>
        ))}
      </div>

      {answers.length === 0 ? (
        <p className="mt-4 text-[13px] text-muted-foreground">{fr ? 'Pas encore de réponse à cette question.' : 'No answer to this question yet.'}</p>
      ) : (
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {shown.map((a, i) => (
            <li key={`${a.who}-${i}`} className="rounded-md bg-paper p-3 ring-1 ring-border">
              <p className="text-[13px] leading-relaxed text-foreground">« {a.text} »</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {a.who}{a.team ? ` · ${a.team}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
      {answers.length > PREVIEW && (
        <button type="button" className="mt-3 text-[13px] font-medium text-brand-ink hover:underline" onClick={() => setExpanded((v) => !v)}>
          {expanded ? (fr ? 'Voir moins' : 'Show less') : (fr ? `Voir les ${answers.length} réponses` : `Show all ${answers.length} answers`)}
        </button>
      )}
    </SectionCard>
  );
};
