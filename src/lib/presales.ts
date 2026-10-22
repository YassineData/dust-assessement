import { CONTEXT_FIELDS, ChoiceField, OpenField, PRESALES_TOPIC_OPTIONS, V2_QUESTIONS, V2Question } from '@/lib/assessment-v2';

/**
 * Pre-sales diagnostic: the survey a Sales team sends before a pilot.
 * Tool-agnostic and pain-oriented, built from Sales feedback (8 Oct 2026):
 * fewer statements, no trainer questions, open questions on pains and on what blocks adoption.
 */

type L = { en: string; fr: string };

export interface PresalesQuestion extends V2Question {
  /** Optional free-text follow-up shown once the statement is answered. */
  followUp?: { id: string; label: L; placeholder?: L };
}

const base = (id: string) => V2_QUESTIONS.find((q) => q.id === id)!;
const keep = (id: string): PresalesQuestion => base(id);
const reword = (id: string, text: L, followUp?: PresalesQuestion['followUp']): PresalesQuestion => ({ ...base(id), text, followUp });

export const PRESALES_SECTIONS: { id: string; label: L; questions: PresalesQuestion[] }[] = [
  {
    id: 'today',
    label: { en: 'AI in your work today', fr: "L'IA dans votre travail aujourd'hui" },
    questions: [keep('u1'), keep('u3'), keep('u4'), keep('d1'), keep('w3'), keep('w5')],
  },
  {
    id: 'rules',
    label: { en: 'Data and rules', fr: 'Données et règles' },
    questions: [keep('g1'), keep('g2'), keep('g3')],
  },
  {
    id: 'together',
    label: { en: 'Working together', fr: 'Travailler ensemble' },
    questions: [
      reword('m1', {
        en: 'My team usually shares good practices for using AI in our work.',
        fr: "Mon équipe a l'habitude de partager les bonnes pratiques d'utilisation de l'IA utiles à notre travail.",
      }),
      keep('r5'),
    ],
  },
  {
    id: 'time',
    label: { en: 'Where your time goes', fr: 'Où passe votre temps' },
    questions: [
      reword(
        'p1',
        {
          en: 'Automating some repetitive tasks would let me focus on higher-value work.',
          fr: 'Automatiser certaines tâches répétitives me permettrait de me concentrer sur des tâches à plus forte valeur ajoutée.',
        },
        {
          id: 'repetitiveTasks',
          label: { en: 'Which ones? (optional)', fr: 'Lesquelles ? (facultatif)' },
          placeholder: { en: 'e.g. weekly reporting, data entry, meeting notes', fr: 'ex. reporting hebdo, saisie de données, comptes rendus' },
        }
      ),
      reword('p2', {
        en: 'I spend too much time asking colleagues for information that could be made available elsewhere.',
        fr: "Je passe trop de temps à solliciter mes collègues pour obtenir une information qui pourrait être mise à disposition ailleurs.",
      }),
      keep('p3'),
      reword(
        'p5',
        {
          en: 'I could name at least one task in my week I would hand over to an AI agent tomorrow.',
          fr: 'Je pourrais citer au moins une tâche de ma semaine que je confierais dès demain à un agent IA.',
        },
        {
          id: 'taskToHandOver',
          label: { en: 'Which one? (optional)', fr: 'Laquelle ? (facultatif)' },
        }
      ),
      reword(
        'v1',
        {
          en: 'Beyond saving time, AI could bring my team another kind of gain.',
          fr: "Au-delà du simple gain de temps, l'IA pourrait apporter un autre gain à mon équipe.",
        },
        {
          id: 'otherGain',
          label: { en: 'Which one? (optional)', fr: 'Lequel ? (facultatif)' },
          placeholder: {
            en: 'e.g. collaboration, quality of work, new opportunities, revenue',
            fr: 'ex. collaboration, qualité des rendus, nouvelles opportunités, génération de revenu',
          },
        }
      ),
    ],
  },
];

export const PRESALES_QUESTIONS: PresalesQuestion[] = PRESALES_SECTIONS.flatMap((s) => s.questions);

const field = (id: ChoiceField['id']) => CONTEXT_FIELDS.find((f) => f.id === id)!;

/** "About you": no bandwidth question; "would like to play" instead of "could realistically play"; pains instead of expected outcomes. */
export const PRESALES_CONTEXT_FIELDS: ChoiceField[] = [
  field('team'),
  field('level'),
  field('tools'),
  {
    ...field('rolloutRole'),
    label: { en: 'What role would you like to play in rolling out AI?', fr: "Quel rôle souhaiteriez-vous jouer dans le déploiement de l'IA ?" },
  },
  {
    ...field('expectedValue'),
    label: { en: 'Which of these topics matter most to you today?', fr: "Quels sujets sont les plus importants à résoudre pour vous aujourd'hui ?" },
    options: PRESALES_TOPIC_OPTIONS,
  },
];

/** Fewer open questions, all about pains and what stands in the way. */
export const PRESALES_OPEN_FIELDS: OpenField[] = [
  { id: 'timeSink', label: { en: 'What is the biggest time sink in your week?', fr: 'Quelle est la plus grosse perte de temps de votre semaine ?' } },
  {
    id: 'useCase',
    label: { en: 'If AI could help you with one thing every day, what would it be?', fr: "Si l'IA pouvait vous aider sur une seule chose au quotidien, ce serait laquelle ?" },
  },
  {
    id: 'toolsGap',
    label: { en: 'If you already use AI tools, what does not work well or could be better?', fr: "Si vous utilisez déjà des outils d'IA, qu'est-ce qui fonctionne mal ou pourrait être amélioré ?" },
  },
  { id: 'blocker', label: { en: 'What holds back AI adoption in your team today?', fr: "Qu'est-ce qui freine aujourd'hui l'adoption de l'IA dans votre équipe ?" } },
  {
    id: 'success',
    label: { en: 'In six months, what would make you say AI was worth it for your team?', fr: "Dans six mois, qu'est-ce qui vous ferait dire que l'IA a vraiment servi à votre équipe ?" },
  },
];

/** Optional free-text answers attached to a statement, with the label shown in the console. */
export const PRESALES_FOLLOW_UPS: OpenField[] = PRESALES_QUESTIONS.filter((q) => q.followUp).map((q) => ({
  id: q.followUp!.id as OpenField['id'],
  label: { en: `${q.text.en} ${q.followUp!.label.en}`, fr: `${q.text.fr} ${q.followUp!.label.fr}` },
}));

/** Open fields that only exist in the pre-sales diagnostic. */
export const PRESALES_ONLY_OPEN_FIELDS: OpenField[] = [...PRESALES_OPEN_FIELDS.filter((f) => f.id === 'toolsGap'), ...PRESALES_FOLLOW_UPS];
