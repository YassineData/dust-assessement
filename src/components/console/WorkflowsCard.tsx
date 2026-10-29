import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SectionCard } from '@/components/console/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { WORKFLOW_STATUSES, waveLabel, type Workflow, type WorkflowStatus } from '@/lib/waves';
import type { TimelinePoint } from '@/hooks/useClientTimeline';

const STATUS_CLASS: Record<WorkflowStatus, string> = {
  planned: 'bg-muted text-muted-foreground',
  building: 'bg-warn-soft text-warn-ink',
  live: 'bg-ok-soft text-ok-ink',
  dropped: 'bg-risk-soft text-risk-ink line-through',
};

const statusLabel = (s: WorkflowStatus, fr: boolean) => {
  const x = WORKFLOW_STATUSES.find((w) => w.id === s)!;
  return fr ? x.label.fr : x.label.en;
};

/** « 3/5 en place »: dropped workflows do not count. */
export const workflowProgress = (list: Workflow[] | null) => {
  if (!list) return null;
  const kept = list.filter((w) => w.status !== 'dropped');
  return kept.length ? { live: kept.filter((w) => w.status === 'live').length, total: kept.length } : null;
};

interface Props {
  points: TimelinePoint[];
  fr: boolean;
  /** Admins edit the list; it is saved on the client's latest campaign, so each wave keeps its own snapshot. */
  onSave?: (campaignId: string, workflows: Workflow[]) => Promise<boolean>;
}

/** The workflows agreed with the client at the kickoff, and where each one stands today. */
export const WorkflowsCard = ({ points, fr, onSave }: Props) => {
  const latest = points[points.length - 1];
  // The newest campaign that has a list: a new re-measure starts from the previous wave's list.
  const source = [...points].reverse().find((p) => p.workflows);
  const [list, setList] = useState<Workflow[]>(source?.workflows ?? []);
  const [title, setTitle] = useState('');
  const [team, setTeam] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setList(source?.workflows ?? []);
  }, [source?.id, source?.workflows]);

  if (!latest || (!onSave && !source)) return null;

  const save = async (next: Workflow[]) => {
    if (!onSave) return;
    const before = list;
    setList(next);
    setSaving(true);
    const ok = await onSave(latest.id, next);
    setSaving(false);
    if (!ok) setList(before);
  };

  const add = () => {
    const t = title.trim();
    if (!t) return;
    save([...list, { id: Math.random().toString(36).slice(2, 10), title: t.slice(0, 200), team: team.trim() || undefined, status: 'planned' }]);
    setTitle('');
    setTeam('');
  };

  const history = points.filter((p) => workflowProgress(p.workflows));
  const now = workflowProgress(list);

  return (
    <SectionCard
      title={fr ? 'Workflows convenus au kickoff' : 'Workflows agreed at the kickoff'}
      description={
        onSave
          ? fr
            ? 'Les use-case outcomes : ce que le client s’est engagé à mettre en place, et où chaque workflow en est. Mis à jour à chaque passage.'
            : 'What the client committed to put in place, and where each workflow stands. Updated at each wave.'
          : fr
            ? 'Ce que vous avez décidé de mettre en place avec l’équipe Dust, et où chaque workflow en est.'
            : 'What you decided to put in place with the Dust team, and where each workflow stands.'
      }
      actions={
        now && (
          <span className="pill pill-blue">
            {now.live}/{now.total} {fr ? 'en place' : 'live'}
          </span>
        )
      }
    >
      {list.length === 0 && (
        <p className="text-[13px] text-muted-foreground">
          {fr
            ? 'Aucun workflow noté pour l’instant. Ajoutez ceux décidés au kickoff (ex. « Préparer les QBR », « Répondre aux appels d’offres »).'
            : 'No workflow yet. Add the ones decided at the kickoff (e.g. "QBR prep", "Answering RFPs").'}
        </p>
      )}

      {list.length > 0 && (
        <ul className="divide-y divide-border rounded-md ring-1 ring-border">
          {list.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <div className="min-w-[200px] flex-1">
                <p className={cn('text-[13px] font-medium text-foreground', w.status === 'dropped' && 'text-muted-foreground line-through')}>{w.title}</p>
                {w.team && <p className="text-[12px] text-muted-foreground">{w.team}</p>}
              </div>
              {onSave ? (
                <div className="flex flex-wrap items-center gap-1">
                  {WORKFLOW_STATUSES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={saving}
                      aria-pressed={w.status === s.id}
                      onClick={() => w.status !== s.id && save(list.map((x) => (x.id === w.id ? { ...x, status: s.id } : x)))}
                      className={cn(
                        'min-h-8 rounded-full px-2.5 text-[12px] font-medium transition-colors',
                        w.status === s.id ? STATUS_CLASS[s.id] : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {fr ? s.label.fr : s.label.en}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => save(list.filter((x) => x.id !== w.id))}
                    className="ml-1 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={fr ? 'Supprimer' : 'Remove'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-medium', STATUS_CLASS[w.status])}>{statusLabel(w.status, fr)}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {onSave && (
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={fr ? 'Nouveau workflow' : 'New workflow'} maxLength={200} className="sm:flex-1" />
          <Input value={team} onChange={(e) => setTeam(e.target.value)} placeholder={fr ? 'Équipe (facultatif)' : 'Team (optional)'} maxLength={80} className="sm:w-48" />
          <Button type="submit" variant="outline" disabled={!title.trim() || saving}>
            <Plus className="h-4 w-4" />
            {fr ? 'Ajouter' : 'Add'}
          </Button>
        </form>
      )}

      {history.length > 1 && (
        <p className="mt-3 text-[12px] text-muted-foreground">
          {history
            .map((p) => {
              const x = workflowProgress(p.workflows)!;
              return `${waveLabel(p.wave, fr)}${fr ? ' : ' : ': '}${x.live}/${x.total}`;
            })
            .join(' → ')}
        </p>
      )}
    </SectionCard>
  );
};
