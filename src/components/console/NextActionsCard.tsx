import { AlertTriangle, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { SectionCard } from '@/components/console/SectionCard';
import { cn } from '@/lib/utils';
import { PILLARS } from '@/lib/waves';
import { breadthOf, healthOf, recurrenceOf, thresholdOf, toneOf } from '@/lib/usage-import';
import type { TimelinePoint } from '@/hooks/useClientTimeline';

type L = { fr: string; en: string };
type Priority = 'high' | 'medium' | 'info';
interface Action {
  id: string;
  priority: Priority;
  /** Outcome (predicts renewal) or lever (what we can run a session on). */
  kind: 'outcome' | 'lever';
  title: L;
  why: L;
  todo: L;
}

const pct = (x: number) => `${Math.round(x * 100)} %`;

// Below this survey score a pillar gets its workshop; the share of multiplayer conversations is indicative only (no target yet).
const PILLAR_LOW = 50;
const MULTIPLAYER_LOW = 0.2;

const PILLAR_ACTION: Record<(typeof PILLARS)[number]['id'], { title: L; todo: L }> = {
  governance: {
    title: { fr: 'Session données et règles', en: 'Data and rules session' },
    todo: {
      fr: 'Ce qu’on peut mettre dans Dust, qui décide, où remonter un doute. 30 minutes avec l’IT ou la sécurité du client, puis une page de référence partagée.',
      en: 'What can go into Dust, who decides, where to raise a concern. 30 minutes with the client’s IT or security, then a shared reference page.',
    },
  },
  productivity: {
    title: { fr: 'Atelier « construire son agent »', en: '“Build your agent” workshop' },
    todo: {
      fr: 'Partir d’une tâche réelle de chaque participant et repartir avec un agent qui marche. Les builders repérés dans le questionnaire coaniment.',
      en: 'Start from a real task of each participant and leave with a working agent. Builders found in the survey co-host.',
    },
  },
  multiplayer: {
    title: { fr: 'Session partage et pods', en: 'Sharing and pods session' },
    todo: {
      fr: 'Montrer comment partager un agent ou un skill et travailler à plusieurs dans une conversation. Chaque équipe repart avec un agent commun.',
      en: 'Show how to share an agent or a skill and work together in one conversation. Each team leaves with a shared agent.',
    },
  },
};

const pillarScore = (p: TimelinePoint, dims: string[]) => {
  const vals = dims.map((d) => p.dimensions[d]).filter((v): v is number => typeof v === 'number');
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
};

/** Reads the latest survey, usage export and workflows of a client and turns what lags into the next sessions to run. */
export const buildActions = (points: TimelinePoint[]): Action[] => {
  const actions: Action[] = [];
  const usagePoint = [...points].reverse().find((p) => p.usage);
  const surveyPoint = [...points].reverse().find((p) => p.respondents > 0);
  const workflows = [...points].reverse().find((p) => p.workflows)?.workflows ?? null;

  if (usagePoint?.usage) {
    const u = usagePoint.usage;
    const target = thresholdOf(u);
    const health = healthOf(u);
    const b = breadthOf(u);
    const r = recurrenceOf(u);
    const bt = toneOf(b, target);
    const rt = toneOf(r, target);

    if (health === 'ramping') {
      actions.push({
        id: 'ramping',
        priority: 'info',
        kind: 'outcome',
        title: { fr: 'Trop tôt pour juger la santé', en: 'Too early to judge health' },
        why: { fr: 'Moins de 28 jours de données d’usage.', en: 'Under 28 days of usage data.' },
        todo: {
          fr: 'Continuer les sessions de démarrage et ré-importer l’usage après 4 semaines.',
          en: 'Keep running the starter sessions and import usage again after 4 weeks.',
        },
      });
    }
    if (b !== null && bt !== 'ok') {
      actions.push({
        id: 'breadth',
        priority: bt === 'risk' ? 'high' : 'medium',
        kind: 'outcome',
        title: { fr: 'Aller chercher ceux qui n’ont pas commencé', en: 'Reach the people who have not started' },
        why: {
          fr: `Breadth ${pct(b)} pour une cible de ${pct(target)} : ${u.scope! - (u.activeUsers ?? 0)} personnes concernées n’ont jamais utilisé Dust.`,
          en: `Breadth ${pct(b)} against a ${pct(target)} target: ${u.scope! - (u.activeUsers ?? 0)} people in scope never used Dust.`,
        },
        todo: {
          fr: 'Ils ne viennent pas aux sessions : leur envoyer un lien vers une Frame app ou un agent déjà configuré pour leur métier, relayé par leur manager ou un champion, plutôt qu’une nouvelle formation.',
          en: 'They do not join sessions: send them a link to a Frame app or a ready-made agent for their job, relayed by their manager or a champion, rather than another training.',
        },
      });
    }
    if (r !== null && rt !== 'ok') {
      actions.push({
        id: 'recurrence',
        priority: rt === 'risk' ? 'high' : 'medium',
        kind: 'outcome',
        title: { fr: 'Faire revenir les utilisateurs', en: 'Bring users back' },
        why: {
          fr: `Recurrence ${pct(r)} pour une cible de ${pct(target)} : beaucoup essaient, peu reviennent chaque semaine.`,
          en: `Recurrence ${pct(r)} against a ${pct(target)} target: many try, few come back every week.`,
        },
        todo: {
          fr: 'Brancher les workflows en place sur un rituel d’équipe (point hebdo, reporting), et demander aux champions une astuce par semaine dans le canal du projet.',
          en: 'Plug the live workflows into a team ritual (weekly meeting, reporting) and ask champions for one tip a week in the project channel.',
        },
      });
    }
    if (u.conversations && (u.sharedConversations ?? 0) / u.conversations < MULTIPLAYER_LOW) {
      actions.push({
        id: 'multiplayer-usage',
        priority: 'medium',
        kind: 'lever',
        title: PILLAR_ACTION.multiplayer.title,
        why: {
          fr: `Seulement ${pct((u.sharedConversations ?? 0) / u.conversations)} de multiplayer conversations : Dust s’utilise surtout seul.`,
          en: `Only ${pct((u.sharedConversations ?? 0) / u.conversations)} multiplayer conversations: Dust is mostly used alone.`,
        },
        todo: PILLAR_ACTION.multiplayer.todo,
      });
    }
  }

  if (surveyPoint) {
    PILLARS.map((pl) => ({ pl, score: pillarScore(surveyPoint, pl.dims) }))
      .filter((x): x is { pl: (typeof PILLARS)[number]; score: number } => x.score !== null && x.score < PILLAR_LOW)
      .sort((a, b) => a.score - b.score)
      .forEach(({ pl, score }) => {
        if (actions.some((a) => a.title.fr === PILLAR_ACTION[pl.id].title.fr)) return;
        actions.push({
          id: `pillar-${pl.id}`,
          priority: score < 40 ? 'high' : 'medium',
          kind: 'lever',
          title: PILLAR_ACTION[pl.id].title,
          why: { fr: `${pl.label.fr} à ${score}/100 dans le dernier questionnaire.`, en: `${pl.label.en} at ${score}/100 in the latest survey.` },
          todo: PILLAR_ACTION[pl.id].todo,
        });
      });
  }

  const late = (workflows ?? []).filter((w) => w.status === 'planned' || w.status === 'building');
  if (late.length) {
    actions.push({
      id: 'workflows',
      priority: 'medium',
      kind: 'lever',
      title: { fr: 'Débloquer les workflows pas encore en place', en: 'Unblock the workflows not live yet' },
      why: {
        fr: `${late.length} workflow${late.length > 1 ? 's' : ''} convenu${late.length > 1 ? 's' : ''} au kickoff : ${late.map((w) => w.title).slice(0, 3).join(', ')}${late.length > 3 ? '…' : ''}.`,
        en: `${late.length} workflow${late.length > 1 ? 's' : ''} agreed at the kickoff: ${late.map((w) => w.title).slice(0, 3).join(', ')}${late.length > 3 ? '…' : ''}.`,
      },
      todo: {
        fr: 'Une session de construction par workflow avec l’équipe concernée et son champion, avec une date de mise en place.',
        en: 'One build session per workflow with the team and its champion, with a go-live date.',
      },
    });
  }

  if (usagePoint?.usage && healthOf(usagePoint.usage) === 'healthy' && !actions.some((a) => a.priority === 'high')) {
    actions.push({
      id: 'expand',
      priority: 'info',
      kind: 'outcome',
      title: { fr: 'Préparer l’expansion', en: 'Prepare the expansion' },
      why: { fr: 'Breadth et recurrence au-dessus de la cible.', en: 'Breadth and recurrence above target.' },
      todo: {
        fr: 'Passer le relais au CSM avec le bilan, et identifier les équipes suivantes à partir des réponses du questionnaire.',
        en: 'Hand over to the CSM with the review, and pick the next teams from the survey answers.',
      },
    });
  }

  const rank: Record<Priority, number> = { high: 0, medium: 1, info: 2 };
  return actions.sort((a, b) => rank[a.priority] - rank[b.priority] || (a.kind === 'outcome' ? -1 : 1)).slice(0, 4);
};

const PRIORITY: Record<Priority, { fr: string; en: string; cls: string; icon: typeof AlertTriangle }> = {
  high: { fr: 'Priorité haute', en: 'High priority', cls: 'bg-risk-soft text-risk-ink', icon: AlertTriangle },
  medium: { fr: 'À planifier', en: 'To plan', cls: 'bg-warn-soft text-warn-ink', icon: Clock },
  info: { fr: 'Pour info', en: 'For info', cls: 'bg-ok-soft text-ok-ink', icon: CheckCircle2 },
};

/** What to do next for this client, from what lags: outcomes first (breadth, recurrence), then the levers. */
export const NextActionsCard = ({ points, fr }: { points: TimelinePoint[]; fr: boolean }) => {
  const actions = buildActions(points);
  if (!actions.length) return null;
  return (
    <SectionCard
      title={fr ? 'Prochaines actions' : 'Next actions'}
      description={
        fr
          ? 'Breadth et recurrence disent si le client va renouveler, les piliers disent sur quoi agir. Proposé à partir du dernier questionnaire, de l’usage et des workflows.'
          : 'Breadth and recurrence tell whether the client will renew, the pillars tell what to act on. Suggested from the latest survey, usage and workflows.'
      }
    >
      <ol className="grid gap-3 md:grid-cols-2">
        {actions.map((a) => {
          const P = PRIORITY[a.priority];
          return (
            <li key={a.id} className="flex flex-col rounded-lg bg-paper p-4 ring-1 ring-border">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', P.cls)}>
                  <P.icon className="h-3 w-3" aria-hidden />
                  {fr ? P.fr : P.en}
                </span>
                <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
                  {a.kind === 'outcome' ? (fr ? 'Santé' : 'Health') : fr ? 'Levier' : 'Lever'}
                </span>
              </div>
              <p className="mt-2 text-[14px] font-semibold text-foreground">{fr ? a.title.fr : a.title.en}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">{fr ? a.why.fr : a.why.en}</p>
              <p className="mt-2 flex gap-1.5 text-[13px] leading-relaxed text-foreground">
                <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-ink" aria-hidden />
                {fr ? a.todo.fr : a.todo.en}
              </p>
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
};
