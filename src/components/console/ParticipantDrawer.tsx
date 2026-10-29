import { Fragment, useState } from 'react';
import { X, BadgeCheck, Target, FileText, AlertTriangle, Trash2 } from 'lucide-react';
import { DeleteParticipantDialog } from '@/components/DeleteParticipantDialog';
import { CONTEXT_FIELDS, OPEN_FIELDS as SURVEY_OPEN_FIELDS, V2_QUESTIONS, contextLabels, READINESS_DIMENSION_IDS } from '@/lib/assessment-v2';
import { PRESALES_FOLLOW_UPS, PRESALES_ONLY_OPEN_FIELDS, PRESALES_OPEN_FIELDS } from '@/lib/presales';
import { FOLLOWUP_LABELS, FOLLOWUP_ONLY_OPEN_FIELDS } from '@/lib/followup';

// Labels as the person saw them: the pre-sales diagnostic words some open questions differently.
const PRESALES_LABELS = [...PRESALES_OPEN_FIELDS, ...PRESALES_FOLLOW_UPS];
const OPEN_FIELDS = [...SURVEY_OPEN_FIELDS.filter((f) => !PRESALES_LABELS.some((x) => x.id === f.id)), ...PRESALES_LABELS, ...FOLLOWUP_ONLY_OPEN_FIELDS];
const openFieldsFor = (open: Record<string, string | undefined>) =>
  PRESALES_ONLY_OPEN_FIELDS.some((f) => open[f.id]) ? PRESALES_LABELS : FOLLOWUP_ONLY_OPEN_FIELDS.some((f) => open[f.id]) ? FOLLOWUP_LABELS : SURVEY_OPEN_FIELDS;
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { CampaignParticipant } from '@/hooks/useCampaignParticipants';
import { getLocalizedProfile } from '@/lib/profile-translations';
import { PROFILE_BADGE, initials, profileLabel } from '@/lib/profile-style';
import { getScoreTier } from '@/lib/score-colors';
import { cn } from '@/lib/utils';

interface ParticipantDrawerProps {
  participant: CampaignParticipant;
  thematics: readonly string[];
  translateThematic: (t: string) => string;
  onClose: () => void;
  /** Dust team only: removes this person's answers (e.g. on request). */
  onDelete?: () => Promise<void>;
}

const BAR_BY_TIER = { top: 'bg-ok', emerging: 'bg-warn', critical: 'bg-risk' } as const;

/** Side panel with one respondent's profile, dimension scores and recommended action. */
export const ParticipantDrawer = ({ participant: p, thematics, translateThematic, onClose, onDelete }: ParticipantDrawerProps) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { t, language } = useLanguage();
  const fr = language === 'fr';
  const completed = p.status === 'completed';
  const lp = getLocalizedProfile(p.profile, language === 'en' ? 'en' : 'fr');
  const inIndex = (id: string) => (READINESS_DIMENSION_IDS as string[]).includes(id);
  const dims = thematics
    .map((th) => ({ id: th, name: translateThematic(th), score: p.thematicScores[th] ?? 0, inIndex: inIndex(th) }))
    .sort((a, b) => Number(b.inIndex) - Number(a.inIndex) || b.score - a.score);

  // Context and open answers: shown as soon as they are filled in, finished or not.
  const hasContext = CONTEXT_FIELDS.some((f) => {
    const v = p.context[f.id];
    return Array.isArray(v) ? v.length > 0 : !!v;
  });
  const details = (
    <>
        {hasContext && (
        <div>
          <p className="eyebrow mb-2">{fr ? 'Contexte déclaré' : 'Declared context'}</p>
          <dl className="space-y-1.5 rounded-md p-3 text-[12px] ring-1 ring-border">
            {CONTEXT_FIELDS.map((field) => {
              const v = p.context[field.id];
              const list = Array.isArray(v) ? v : v ? [v] : [];
              if (!list.length) return null;
              return (
                <div key={field.id} className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
                  <dt className="text-muted-foreground">{fr ? field.label.fr : field.label.en}</dt>
                  <dd className="text-foreground">{contextLabels(p.context, field.id, fr ? 'fr' : 'en').join(', ')}</dd>
                </div>
              );
            })}
          </dl>
        </div>
        )}

        {OPEN_FIELDS.some((f) => p.open[f.id]) && (
          <div>
            <p className="eyebrow mb-2">{fr ? 'Réponses ouvertes' : 'Open answers'}</p>
            <div className="space-y-2">
              {openFieldsFor(p.open as Record<string, string | undefined>).filter((f) => p.open[f.id]).map((f) => (
                <div key={f.id} className="rounded-md p-3 ring-1 ring-border">
                  <p className="text-[11px] text-muted-foreground">{fr ? f.label.fr : f.label.en}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-foreground">« {p.open[f.id]} »</p>
                </div>
              ))}
            </div>
          </div>
        )}
    </>
  );
  const answered = V2_QUESTIONS.filter((q) => p.responses?.[q.id]);
  // Same wording as the buttons respondents click.
  const SCALE_LABELS: Record<string, { en: string; fr: string }> = {
    disagree: { en: 'Strongly disagree', fr: "Pas du tout d'accord" },
    somewhatDisagree: { en: 'Somewhat disagree', fr: "Plutôt pas d'accord" },
    neutral: { en: 'Neutral', fr: 'Neutre' },
    somewhatAgree: { en: 'Somewhat agree', fr: "Plutôt d'accord" },
    agree: { en: 'Strongly agree', fr: "Tout à fait d'accord" },
  };
  const scale = (v: string) => (SCALE_LABELS[v] ? (fr ? SCALE_LABELS[v].fr : SCALE_LABELS[v].en) : v);

  return (
    <aside className="card-elevated flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden xl:sticky xl:top-[4.5rem]" aria-label={`${p.firstName} ${p.lastName}`}>
      <div className="flex items-start gap-3 border-b border-border p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand-strong text-[15px] font-semibold text-white">
          {initials(p.firstName, p.lastName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-[17px] font-semibold text-foreground">
            {p.firstName} {p.lastName}
            {completed && <BadgeCheck className="h-4 w-4 shrink-0 text-ok" />}
          </p>
          <p className="mono truncate text-[12px] text-muted-foreground">{p.email}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label={fr ? 'Fermer' : 'Close'}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {!completed ? (
          <>
            <p className="rounded-md bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">
              {p.status === 'not_started'
                ? (fr ? 'Inscrit, mais pas encore commencé.' : 'Registered, not started yet.')
                : fr
                  ? `En cours : ${answered.length} affirmation(s) sur ${V2_QUESTIONS.length}. Le profil et les scores arrivent quand la personne termine.`
                  : `In progress: ${answered.length} of ${V2_QUESTIONS.length} statements answered. Profile and scores come when they finish.`}
            </p>
            {details}
            {answered.length > 0 && (
              <div>
                <p className="eyebrow mb-2">{fr ? 'Réponses jusqu’ici' : 'Answers so far'}</p>
                <ul className="space-y-1.5">
                  {answered.map((q) => (
                    <li key={q.id} className="rounded-md p-2.5 text-[12px] ring-1 ring-border">
                      <p className="text-foreground">{fr ? q.text.fr : q.text.en}</p>
                      <p className="mt-0.5 font-medium text-brand-ink">{scale(p.responses![q.id])}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!hasContext && answered.length === 0 && !OPEN_FIELDS.some((f) => p.open[f.id]) && (
              <p className="text-[12px] text-muted-foreground">{fr ? 'Rien de rempli pour l’instant.' : 'Nothing filled in yet.'}</p>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 rounded-md bg-lav-50 p-3 ring-1 ring-lav-200">
              <div className="min-w-0">
                <p className="eyebrow">{fr ? 'Profil identifié' : 'Identified archetype'}</p>
                <p className="mt-0.5 text-[13px]">
                  <span className="font-semibold text-brand-ink">{profileLabel(p.profile, language, t)}</span>
                  <span className="mono text-outline"> · {fr ? 'Indice' : 'Index'} {p.score}/100</span>
                </p>
              </div>
              <span className="text-[28px] font-semibold leading-none tabular-nums text-brand-ink">{p.score}</span>
            </div>

            <div>
              <p className="eyebrow mb-2">{fr ? 'Dimensions' : 'Dimensions'}</p>
              <ul className="space-y-2 rounded-md p-3 ring-1 ring-border">
                {dims.map((d, i) => (
                  <Fragment key={d.id}>
                  {i > 0 && !d.inIndex && dims[i - 1].inIndex && (
                    <li className="pt-1 text-[10px] font-semibold uppercase tracking-wider text-outline">{fr ? "Signaux d'opportunité (hors indice)" : 'Opportunity signals (not in index)'}</li>
                  )}
                  <li className="grid grid-cols-[minmax(0,1fr)_96px_28px] items-center gap-2">
                    <span className="truncate text-[12px] text-foreground" title={d.name}>{d.name}</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-lav-100">
                      <span className={cn('block h-full rounded-full', BAR_BY_TIER[getScoreTier(d.score)])} style={{ width: `${Math.max(0, Math.min(100, d.score))}%` }} />
                    </span>
                    <span className="mono text-right text-[12px] font-semibold text-foreground">{d.score}</span>
                  </li>
                  </Fragment>
                ))}
              </ul>
            </div>

            <div>
              <p className="eyebrow mb-2">{fr ? 'Ce que ça signifie' : 'What it means'}</p>
              <p className="rounded-md p-3 text-[13px] leading-relaxed text-foreground ring-1 ring-border">{lp.description}</p>
            </div>

            <div className="rounded-md bg-lav-50 p-3 ring-1 ring-lav-200">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-ink">
                <Target className="h-3.5 w-3.5" />
                {fr ? 'Action recommandée' : 'Recommended action'}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-foreground">{lp.advice}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{fr ? 'Règle : ' : 'Rule: '}{lp.tip}</p>
            </div>

            {p.roleMismatch && (
              <p className="flex gap-2 rounded-md bg-warn-soft px-3 py-2 text-[12px] leading-relaxed text-warn-ink">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {fr
                  ? "N'a pas déclaré de rôle de formation : à confirmer avec la personne ou son manager avant de la nommer formateur."
                  : 'Did not select a training role: confirm with the person or their manager before naming them a trainer.'}
              </p>
            )}

            {p.fits && (
              <div>
                <p className="eyebrow mb-2">{fr ? 'Adéquation aux rôles' : 'Role fit'}</p>
                <p className="mb-2 text-[12px] text-muted-foreground">
                  {fr ? 'Rôles indépendants, qui peuvent se cumuler. ' : 'Independent roles that can overlap. '}
                  {p.roles.length
                    ? (fr ? 'Correspond à : ' : 'Fits: ') + p.roles.map((r) => ({ trainer: fr ? 'formateur' : 'trainer', builder: 'builder', champion: 'champion', sponsor: 'sponsor' })[r]).join(', ')
                    : (fr ? 'Aucun rôle marqué pour l’instant.' : 'No strong role signal yet.')}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    ['trainer', fr ? 'Formateur' : 'Trainer'],
                    ['builder', 'Builder'],
                    ['champion', 'Champion'],
                    ['sponsor', 'Sponsor'],
                  ] as const).map(([k, label]) => (
                    <div key={k} className={cn('rounded-md px-2.5 py-2 text-center ring-1', p.roles.includes(k) ? 'bg-brand-soft ring-brand' : 'bg-lav-50 ring-lav-200')}>
                      <p className="text-[11px] text-muted-foreground">{label}</p>
                      <p className="text-[17px] font-semibold tabular-nums text-foreground">{p.fits![k]}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {details}
          </>
        )}

        <dl className="space-y-1.5 border-t border-border pt-3 text-[12px]">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{fr ? 'Statut' : 'Status'}</dt>
            <dd>
              {completed ? (
                <span className={PROFILE_BADGE[p.profile.id] ?? 'pill pill-neutral'}>{fr ? 'Terminé' : 'Completed'}</span>
              ) : (
                <span className="pill pill-amber">{p.status === 'in_progress' ? (fr ? 'En cours' : 'In progress') : (fr ? 'Pas commencé' : 'Not started')}</span>
              )}
            </dd>
          </div>
          {completed && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{fr ? 'Date du test' : 'Test date'}</dt>
              <dd className="mono text-foreground">
                {p.completedAt.toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </dd>
            </div>
          )}
          {p.campaignCode && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{fr ? 'Campagne' : 'Campaign'}</dt>
              <dd className="mono truncate text-foreground">{p.campaignName || p.campaignCode}</dd>
            </div>
          )}
        </dl>
      </div>

      {(completed || onDelete) && (
        <div className="space-y-1 border-t border-border p-3">
          {completed && (
            <Button variant="outline" className="w-full" onClick={() => window.open(`/participant-result/${p.id}`, '_blank')}>
              <FileText className="h-4 w-4" />
              {fr ? 'Voir le résultat complet' : 'View full result'}
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" className="w-full text-risk-ink hover:bg-risk-soft hover:text-risk-ink" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />
              {fr ? 'Supprimer ses réponses' : 'Delete their answers'}
            </Button>
          )}
        </div>
      )}
      {onDelete && (
        <DeleteParticipantDialog
          isOpen={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await onDelete();
            setConfirmDelete(false);
          }}
          participantName={`${p.firstName} ${p.lastName}`.trim()}
        />
      )}
    </aside>
  );
};
