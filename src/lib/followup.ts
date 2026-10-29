import { CONTEXT_FIELDS, ChoiceField, OPEN_FIELDS, OpenField, V2_QUESTIONS, V2Question } from '@/lib/assessment-v2';

/**
 * Follow-up surveys, picked by the campaign's wave (src/lib/waves.ts):
 *  - pulse: a 3-minute check during the rollout, same statements as the baseline on a few dimensions,
 *    so the « Suivi » tab compares like for like (unmeasured dimensions are left out, not counted as 0);
 *  - review: the full survey plus two questions on what actually changed.
 */

type L = { en: string; fr: string };

const q = (id: string): V2Question => V2_QUESTIONS.find((x) => x.id === id)!;

export const PULSE_SECTIONS: { id: string; label: L; questions: V2Question[] }[] = [
  { id: 'usage', label: { en: 'Your use of AI', fr: 'Votre usage de l’IA' }, questions: [q('u1'), q('u3'), q('u4'), q('d1')] },
  { id: 'rules', label: { en: 'Data and rules', fr: 'Données et règles' }, questions: [q('g1'), q('g3')] },
  { id: 'together', label: { en: 'Working together', fr: 'Travailler ensemble' }, questions: [q('m1'), q('m4'), q('r1'), q('v1')] },
];

export const PULSE_QUESTIONS: V2Question[] = PULSE_SECTIONS.flatMap((s) => s.questions);

const field = (id: ChoiceField['id']) => CONTEXT_FIELDS.find((f) => f.id === id)!;

/** Team and level only: the rest was asked at the baseline. */
export const PULSE_CONTEXT_FIELDS: ChoiceField[] = [field('team'), field('level')];

export const PULSE_OPEN_FIELDS: OpenField[] = [
  { id: 'workflowLive', label: { en: 'Which workflow or agent do you actually use since the session?', fr: 'Quel workflow ou quel agent utilisez-vous vraiment depuis la session ?' } },
  { id: 'needNext', label: { en: 'What would help you go further?', fr: 'De quoi auriez-vous besoin pour aller plus loin ?' } },
  { id: 'blocker', label: { en: 'What still stops you from using it?', fr: 'Qu’est-ce qui vous freine encore ?' } },
];

export const REVIEW_OPEN_FIELDS: OpenField[] = [
  { id: 'impact', label: { en: 'What has concretely changed in your work since the start of the rollout?', fr: 'Qu’est-ce qui a concrètement changé dans votre travail depuis le début du déploiement ?' } },
  { id: 'workflowLive', label: { en: 'Which workflows or agents do you use every week now?', fr: 'Quels workflows ou agents utilisez-vous chaque semaine aujourd’hui ?' } },
  { id: 'needNext', label: { en: 'What should come next for your team?', fr: 'Quelle devrait être la prochaine étape pour votre équipe ?' } },
  ...OPEN_FIELDS.filter((f) => f.id === 'blocker'),
];

/** Open fields that only exist in follow-up surveys, for the console and the exports. */
export const FOLLOWUP_ONLY_OPEN_FIELDS: OpenField[] = [
  REVIEW_OPEN_FIELDS[0],
  PULSE_OPEN_FIELDS[0],
  PULSE_OPEN_FIELDS[1],
];

/** Open questions of a follow-up cohort, as shown in the console. */
export const FOLLOWUP_LABELS: OpenField[] = [...FOLLOWUP_ONLY_OPEN_FIELDS, ...OPEN_FIELDS.filter((f) => f.id === 'blocker')];

/** Survey header for follow-up waves (replaces the audience's baseline wording). */
export const FOLLOWUP_INTRO: Record<'pulse' | 'review', { title: L; about: L; whatFor: L; whyItMatters: L; output: L; minutes: L }> = {
  pulse: {
    title: { en: 'Where are you with Dust?', fr: 'Où en êtes-vous avec Dust ?' },
    about: { en: 'A few weeks into the rollout at {company}, we want to know what works and what gets in the way.', fr: 'Quelques semaines après le lancement chez {company}, nous voulons savoir ce qui marche et ce qui bloque.' },
    whatFor: { en: 'See what you really use since the session, and what is missing.', fr: 'Voir ce que vous utilisez vraiment depuis la session, et ce qui manque.' },
    whyItMatters: { en: 'Your answers decide what we fix and what we build next, while the rollout is still running.', fr: 'Vos réponses décident de ce qu’on corrige et de ce qu’on construit ensuite, pendant le déploiement.' },
    output: { en: 'Adjustments to the rollout: next sessions, agents to improve, people to support.', fr: 'Des ajustements du déploiement : prochaines sessions, agents à améliorer, personnes à accompagner.' },
    minutes: { en: 'About 3 minutes', fr: 'Environ 3 minutes' },
  },
  review: {
    title: { en: 'Dust at {company}: where we got to', fr: 'Dust chez {company} : le bilan' },
    about: { en: 'The rollout is coming to an end. The same questions as at the start show how far your team has come.', fr: 'Le déploiement arrive à son terme. Les mêmes questions qu’au départ montrent le chemin parcouru par votre équipe.' },
    whatFor: { en: 'Measure what changed since the start, team by team.', fr: 'Mesurer ce qui a changé depuis le départ, équipe par équipe.' },
    whyItMatters: { en: 'Your answers feed the business review and decide the next steps after the rollout.', fr: 'Vos réponses nourrissent la business review et décident de la suite après le déploiement.' },
    output: { en: 'A before / after for your company and the priorities for the next phase.', fr: 'Un avant / après pour votre entreprise et les priorités de la phase suivante.' },
    minutes: { en: 'Less than 6 minutes', fr: 'Moins de 6 minutes' },
  },
};
