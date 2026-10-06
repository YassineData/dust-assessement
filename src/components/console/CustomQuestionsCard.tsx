import { useMemo, useState } from 'react';
import { CampaignParticipant } from '@/hooks/useCampaignParticipants';
import { SectionCard } from '@/components/console/SectionCard';
import { cn } from '@/lib/utils';

type Kind = 'scale' | 'choice' | 'text';

interface Question {
  title: string;
  kind: Kind;
  answers: { value: string; who: string; team: string | null }[];
  counts: [string, number][];
  average?: number;
  max?: number;
}

const MAX_CHOICES = 12;

/** Most multi-select exports join choices with ", ": split only when the pieces repeat across people. */
const splitChoices = (values: string[]) => {
  if (!values.some((v) => /,\s|;/.test(v))) return null;
  const pieces = values.flatMap((v) => v.split(/,\s+|;\s*/));
  const distinct = new Set(pieces);
  return distinct.size <= MAX_CHOICES && distinct.size < pieces.length ? pieces : null;
};

/** The imported form's own questions, read as charts (scales and choices) or as lists (free text). */
export const CustomQuestionsCard = ({ participants, fr }: { participants: CampaignParticipant[]; fr: boolean }) => {
  const questions = useMemo(() => {
    const byTitle = new Map<string, Question['answers']>();
    participants.forEach((p) =>
      Object.entries(p.custom ?? {}).forEach(([title, value]) => {
        if (!value?.trim()) return;
        const list = byTitle.get(title) ?? [];
        list.push({ value: value.trim(), who: `${p.firstName} ${p.lastName}`.trim(), team: p.team });
        byTitle.set(title, list);
      })
    );
    return [...byTitle.entries()].map(([title, answers]): Question => {
      const values = answers.map((a) => a.value);
      const nums = values.map((v) => parseFloat(v));
      if (nums.every((n) => Number.isFinite(n))) {
        const counts = new Map<string, number>();
        nums.forEach((n) => counts.set(String(n), (counts.get(String(n)) ?? 0) + 1));
        return {
          title,
          kind: 'scale',
          answers,
          counts: [...counts.entries()].sort((a, b) => Number(a[0]) - Number(b[0])),
          average: Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10,
          max: Math.max(...nums),
        };
      }
      const pieces = splitChoices(values) ?? (new Set(values).size <= MAX_CHOICES ? values : null);
      if (pieces) {
        const counts = new Map<string, number>();
        pieces.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
        return { title, kind: 'choice', answers, counts: [...counts.entries()].sort((a, b) => b[1] - a[1]) };
      }
      return { title, kind: 'text', answers, counts: [] };
    });
  }, [participants]);

  if (!questions.length) return null;

  return (
    <SectionCard
      title={fr ? 'Questions du formulaire importé' : 'Questions from the imported form'}
      description={
        fr
          ? `${questions.length} question(s) propre(s) au formulaire, telles que posées.`
          : `${questions.length} of the form’s own question(s), as asked.`
      }
    >
      <div className="grid gap-3 lg:grid-cols-2">
        {questions.map((q) => (
          <QuestionBlock key={q.title} q={q} fr={fr} />
        ))}
      </div>
    </SectionCard>
  );
};

const QuestionBlock = ({ q, fr }: { q: Question; fr: boolean }) => {
  const [all, setAll] = useState(false);
  const top = Math.max(1, ...q.counts.map((c) => c[1]));
  return (
    <div className={cn('rounded-md p-4 ring-1 ring-border', q.kind === 'text' && 'lg:col-span-2')}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-semibold leading-snug text-foreground">{q.title}</p>
        <span className="shrink-0 text-[12px] text-muted-foreground">
          {q.answers.length} {fr ? 'réponse(s)' : 'answer(s)'}
        </span>
      </div>

      {q.kind === 'scale' && (
        <p className="mt-1 text-[12px] text-muted-foreground">
          {fr ? 'Moyenne' : 'Average'} <span className="font-semibold text-foreground">{q.average}</span> / {q.max && q.max > 5 ? q.max : 5}
        </p>
      )}

      {q.kind !== 'text' ? (
        <ul className="mt-3 space-y-1.5">
          {q.counts.map(([label, n]) => (
            <li key={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-[12px]">
              <div className="relative h-6 overflow-hidden rounded-sm bg-lav-50">
                <div className="absolute inset-y-0 left-0 bg-brand-soft" style={{ width: `${(n / top) * 100}%` }} />
                <span className="relative block truncate px-2 leading-6 text-foreground">{label}</span>
              </div>
              <span className="tabular-nums text-muted-foreground">{n}</span>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-border">
            {(all ? q.answers : q.answers.slice(0, 5)).map((a, i) => (
              <li key={i} className="py-2 text-[13px]">
                <p className="leading-relaxed text-foreground">{a.value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {a.who}
                  {a.team ? ` · ${a.team}` : ''}
                </p>
              </li>
            ))}
          </ul>
          {q.answers.length > 5 && (
            <button type="button" onClick={() => setAll(!all)} className="mt-1 text-[12px] font-medium text-brand-strong hover:underline">
              {all ? (fr ? 'Réduire' : 'Show less') : fr ? `Voir les ${q.answers.length}` : `Show all ${q.answers.length}`}
            </button>
          )}
        </>
      )}
    </div>
  );
};
