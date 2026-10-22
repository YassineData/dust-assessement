import { useMemo, useState } from 'react';
import { CONTEXT_FIELDS, OPEN_FIELDS } from '@/lib/assessment-v2';
import { PRESALES_FOLLOW_UPS, PRESALES_ONLY_OPEN_FIELDS, PRESALES_OPEN_FIELDS } from '@/lib/presales';

const ALL_OPEN_FIELDS = [...OPEN_FIELDS, ...PRESALES_ONLY_OPEN_FIELDS];

/** Pre-sales campaigns show the diagnostic's own questions, worded as respondents saw them. */
export const isPresalesCohort = (participants: CampaignParticipant[]) =>
  participants.some((p) => PRESALES_ONLY_OPEN_FIELDS.some((f) => (p.open?.[f.id] ?? '').trim()));
import type { CampaignParticipant } from '@/hooks/useCampaignParticipants';
import { SectionCard } from '@/components/console/SectionCard';
import { cn } from '@/lib/utils';

const PREVIEW = 6;
const OTHER_TAB = 'other';

/** Every open answer of the campaign, grouped by question: raw material for the first use cases. */
export const OpenAnswersCard = ({ participants, fr, showEmpty = false }: { participants: CampaignParticipant[]; fr: boolean; showEmpty?: boolean }) => {
  // The open questions, plus one tab for the "Other: ..." notes typed in the first step.
  const tabs = useMemo(() => {
    const fields = isPresalesCohort(participants) ? [...PRESALES_OPEN_FIELDS, ...PRESALES_FOLLOW_UPS] : OPEN_FIELDS;
    return [...fields.map((f) => ({ id: f.id as string, label: f.label })), { id: OTHER_TAB, label: { en: '"Other" notes', fr: 'Précisions « Autre »' } }];
  }, [participants]);
  const byField = useMemo(() => {
    const map: Record<string, { text: string; who: string; team: string | null }[]> = {};
    const who = (p: CampaignParticipant) => `${p.firstName} ${p.lastName}`.trim();
    ALL_OPEN_FIELDS.forEach((f) => {
      map[f.id] = participants
        .filter((p) => (p.open?.[f.id] ?? '').trim())
        .map((p) => ({ text: (p.open[f.id] as string).trim(), who: who(p), team: p.team }));
    });
    map[OTHER_TAB] = participants.flatMap((p) =>
      CONTEXT_FIELDS.filter((f) => p.context?.other?.[f.id]?.trim()).map((f) => ({
        text: `${fr ? f.label.fr : f.label.en}: ${p.context.other![f.id]!.trim()}`,
        who: who(p),
        team: p.team,
      }))
    );
    return map;
  }, [participants, fr]);

  const firstWithAnswers = tabs.find((f) => byField[f.id].length > 0)?.id ?? tabs[0].id;
  const [active, setActive] = useState<string>(firstWithAnswers);
  const [expanded, setExpanded] = useState(false);
  const total = tabs.reduce((n, f) => n + byField[f.id].length, 0);
  if (total === 0) {
    if (!showEmpty) return null;
    return (
      <SectionCard title={fr ? 'Ce que les équipes nous disent' : 'What people told us'}>
        <p className="text-[13px] text-muted-foreground">
          {fr
            ? 'Aucune réponse ouverte pour l’instant. Elles apparaissent ici dès qu’un répondant remplit l’étape « En quelques mots » (facultative).'
            : 'No open answers yet. They show up here as soon as a respondent fills in the "In a few words" step (optional).'}
        </p>
      </SectionCard>
    );
  }

  const field = tabs.find((f) => f.id === active) ?? tabs[0];
  const answers = byField[field.id];
  const shown = expanded ? answers : answers.slice(0, PREVIEW);

  return (
    <SectionCard
      title={fr ? 'Ce que les équipes nous disent' : 'What people told us'}
      description={fr ? 'Réponses ouvertes, par question : la matière première des premiers cas d’usage' : 'Open answers by question: raw material for the first use cases'}
      actions={<span className="mono text-[12px] text-outline">{total} {fr ? 'réponses' : 'answers'}</span>}
    >
      <div role="tablist" className="flex flex-wrap gap-1.5">
        {tabs.filter((f) => f.id !== OTHER_TAB || byField[OTHER_TAB].length > 0).map((f) => (
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
