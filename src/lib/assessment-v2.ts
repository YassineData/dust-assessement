// Dust AI-readiness assessment — v2 model.
// Source of truth: "Questions d'évaluation de la poussière v2.xlsx" (sheets Questions, Context & open,
// Answer scale, Dimensions, How scoring works, Result classes, Readiness bands).
// Everything the respondent sees and every score shown in the console derives from this file.

import type { Profile, Question } from './assessment-data';

export type Lang = 'fr' | 'en';
type L = { fr: string; en: string };
const pick = (l: L, lang: Lang) => (lang === 'en' ? l.en : l.fr);

/* ------------------------------------------------------------------ */
/* Dimensions                                                           */
/* ------------------------------------------------------------------ */

export type DimensionId = 'usage' | 'depth' | 'will' | 'teach' | 'reach' | 'gov' | 'team' | 'pain' | 'value';
export type ValueAxis = 'productivity' | 'people' | 'organization' | 'governed' | 'opportunity';

export interface Dimension {
  id: DimensionId;
  name: L;
  short: L;
  axis: ValueAxis;
  inReadiness: boolean;
  measures: L;
  lowAction: L;
}

export const DIMENSIONS: Dimension[] = [
  {
    id: 'usage',
    name: { en: 'AI fluency today', fr: "Pratique de l'IA aujourd'hui" },
    short: { en: 'AI usage', fr: 'Usage IA' },
    axis: 'productivity',
    inReadiness: true,
    measures: { en: 'How much AI is already in their week, and how well it goes.', fr: "La place de l'IA dans leur semaine aujourd'hui, et si ça se passe bien." },
    lowAction: { en: 'Open with a hands-on personal productivity session before any builder content.', fr: 'Commencer par une session pratique de productivité personnelle, avant tout contenu de création.' },
  },
  {
    id: 'depth',
    name: { en: 'Builder depth', fr: 'Capacité à construire' },
    short: { en: 'Builder', fr: 'Création' },
    axis: 'productivity',
    inReadiness: true,
    measures: { en: 'Ability to configure, connect and debug an agent.', fr: 'Capacité à configurer, connecter et déboguer un agent.' },
    lowAction: { en: 'Run the builder track before asking anyone to enable their team.', fr: "Dérouler le parcours builder avant de demander à quiconque d'accompagner son équipe." },
  },
  {
    id: 'will',
    name: { en: 'Motivation', fr: 'Motivation' },
    short: { en: 'Motivation', fr: 'Motivation' },
    axis: 'people',
    inReadiness: true,
    measures: { en: 'Appetite to invest personal time in getting good at this.', fr: 'Envie d’investir du temps personnel pour progresser sur le sujet.' },
    lowAction: { en: 'Recruit a small group narrowly and give them a visible internal win.', fr: 'Recruter un petit groupe ciblé et lui offrir une réussite interne visible.' },
  },
  {
    id: 'teach',
    name: { en: 'Teaching posture', fr: 'Posture de formateur' },
    short: { en: 'Teaching', fr: 'Transmission' },
    axis: 'people',
    inReadiness: true,
    measures: { en: 'Willingness, comfort and bandwidth to enable others.', fr: 'Envie, aisance et disponibilité pour faire monter les autres en compétence.' },
    lowAction: { en: 'Get manager-backed time commitments before promising train-the-trainer.', fr: 'Obtenir des engagements de temps validés par les managers avant de promettre un « train-the-trainer ».' },
  },
  {
    id: 'reach',
    name: { en: 'Blast radius', fr: "Rayonnement" },
    short: { en: 'Reach', fr: 'Rayonnement' },
    axis: 'organization',
    inReadiness: true,
    measures: { en: 'Whether what this person builds gets reused by others.', fr: 'Si ce que cette personne construit est réutilisé par d’autres.' },
    lowAction: { en: 'Pick cross-team owners rather than single-team enthusiasts.', fr: 'Choisir des référents transverses plutôt que des enthousiastes cantonnés à une équipe.' },
  },
  {
    id: 'gov',
    name: { en: 'Governance & trust', fr: 'Gouvernance & confiance' },
    short: { en: 'Governance', fr: 'Gouvernance' },
    axis: 'governed',
    inReadiness: true,
    measures: { en: 'Clarity on rules, data handling and who decides.', fr: 'Clarté sur les règles, le traitement des données et qui décide.' },
    lowAction: { en: 'Put an admin and data-policy session in the kickoff, before scale-up.', fr: 'Prévoir une session admin et politique de données dans le kickoff, avant le passage à l’échelle.' },
  },
  {
    id: 'team',
    name: { en: 'Multiplayer habits', fr: 'Habitudes collectives' },
    short: { en: 'Multiplayer', fr: 'Collectif' },
    axis: 'organization',
    inReadiness: true,
    measures: { en: 'Do they share methods, or does everyone run their own way.', fr: 'Partagent-ils leurs méthodes, ou chacun fait-il à sa façon.' },
    lowAction: { en: 'Anchor the rollout in one shared Pod per team, not individual licenses.', fr: 'Ancrer le déploiement dans un espace partagé par équipe, pas dans des licences individuelles.' },
  },
  {
    id: 'pain',
    name: { en: 'Automation opportunity', fr: "Potentiel d'automatisation" },
    short: { en: 'Automation', fr: 'Automatisation' },
    axis: 'opportunity',
    inReadiness: false,
    measures: { en: 'Volume of repetitive, delegable work. High is good news.', fr: 'Volume de travail répétitif et délégable. Un score élevé est une bonne nouvelle.' },
    lowAction: { en: 'High scores are fuel: open the deployment on the top time sinks.', fr: 'Un score élevé est un carburant : ouvrir le déploiement sur les plus grosses pertes de temps.' },
  },
  {
    id: 'value',
    name: { en: 'Value clarity', fr: 'Clarté de la valeur' },
    short: { en: 'Value', fr: 'Valeur' },
    axis: 'opportunity',
    inReadiness: false,
    measures: { en: 'Whether the person can name a concrete outcome, not just a vague wish for time saved.', fr: 'Si la personne sait nommer un résultat concret, pas seulement un vague souhait de gagner du temps.' },
    lowAction: { en: 'Low scores mean the kickoff must start from business outcomes, not from the product. Do not open with features.', fr: 'Un score bas impose de démarrer le kickoff par les résultats métier, pas par le produit. Ne pas ouvrir sur les fonctionnalités.' },
  },
];

export const DIMENSION_IDS = DIMENSIONS.map((d) => d.id);
export const READINESS_DIMENSION_IDS = DIMENSIONS.filter((d) => d.inReadiness).map((d) => d.id);
export const OPPORTUNITY_DIMENSION_IDS = DIMENSIONS.filter((d) => !d.inReadiness).map((d) => d.id);
export const getDimension = (id: string) => DIMENSIONS.find((d) => d.id === id);
export const dimensionLabel = (id: string, lang: Lang) => {
  const d = getDimension(id);
  return d ? pick(d.name, lang) : id;
};
export const dimensionShort = (id: string, lang: Lang) => {
  const d = getDimension(id);
  return d ? pick(d.short, lang) : id;
};

export const VALUE_AXES: Record<ValueAxis, L> = {
  productivity: { en: 'AI productivity', fr: 'Productivité IA' },
  people: { en: 'People', fr: 'Personnes' },
  organization: { en: 'Organization', fr: 'Organisation' },
  governed: { en: 'Governed AI', fr: 'IA gouvernée' },
  opportunity: { en: 'Opportunity signal', fr: "Signal d'opportunité" },
};

/* ------------------------------------------------------------------ */
/* Questions (35 statements, 1–5 scale)                                 */
/* ------------------------------------------------------------------ */

export interface V2Question {
  id: string;
  dimension: DimensionId;
  text: L;
  reverse?: boolean;
}

// Grouped by dimension, in dimension order (as presented to the respondent).
export const V2_QUESTIONS: V2Question[] = [
  // AI fluency today
  { id: 'u1', dimension: 'usage', text: { en: 'I use an AI tool (ChatGPT, Claude, Copilot, Dust…) at least a few times a week.', fr: "J'utilise un outil d'IA (ChatGPT, Claude, Copilot, Dust…) au moins quelques fois par semaine." } },
  { id: 'u3', dimension: 'usage', text: { en: 'I know how to give an AI enough context (documents, examples, constraints) to do a task properly.', fr: 'Je sais donner à une IA assez de contexte (documents, exemples, contraintes) pour qu’elle fasse une tâche correctement.' } },
  { id: 'u4', dimension: 'usage', text: { en: 'I have already replaced part of a recurring task in my job with an AI tool.', fr: "J'ai déjà remplacé une partie d'une tâche récurrente de mon travail par un outil d'IA." } },
  { id: 'u5', dimension: 'usage', text: { en: 'When an output is wrong, I can work out why and adjust rather than give up.', fr: "Quand un résultat est faux, je sais comprendre pourquoi et ajuster plutôt qu'abandonner." } },
  // Builder depth
  { id: 'd1', dimension: 'depth', text: { en: 'I have already built or configured an AI agent with custom instructions.', fr: "J'ai déjà créé ou configuré un agent IA avec des instructions personnalisées." } },
  { id: 'd2', dimension: 'depth', text: { en: 'I understand how connecting company data or a tool changes what an agent can do.', fr: 'Je comprends comment le fait de connecter des données de l’entreprise ou un outil change ce qu’un assistant peut faire.' } },
  { id: 'd3', dimension: 'depth', text: { en: 'I am comfortable iterating on instructions until something behaves reliably.', fr: "Je suis à l'aise pour retravailler des instructions jusqu'à obtenir un comportement fiable." } },
  { id: 'd5', dimension: 'depth', text: { en: 'I am comfortable trying new features on my own, without waiting for a training session.', fr: "Je suis à l'aise pour essayer de nouvelles fonctionnalités seul, sans attendre une formation." } },
  { id: 'd6', dimension: 'depth', text: { en: 'I could debug an agent that gives a wrong answer, rather than giving up on it.', fr: 'Je saurais déboguer un agent qui donne une mauvaise réponse, plutôt que de le laisser tomber.' } },
  // Motivation
  { id: 'w3', dimension: 'will', text: { en: 'I actively look for new ways to apply AI to my work.', fr: "Je cherche activement de nouvelles façons d'appliquer l'IA à mon travail." } },
  { id: 'w5', dimension: 'will', text: { en: 'I am willing to try an AI-supported approach to a real task in my work.', fr: "Je suis prêt(e) à essayer une approche appuyée par l'IA sur une vraie tâche de mon travail." } },
  // Teaching posture
  { id: 't1', dimension: 'teach', text: { en: 'I would like to help colleagues learn through coaching, demonstrations or written guidance.', fr: 'J’aimerais aider mes collègues à apprendre, par du coaching, des démonstrations ou des guides écrits.' } },
  { id: 't2', dimension: 'teach', text: { en: 'I have already run a training, demo or onboarding session for colleagues.', fr: "J'ai déjà animé une formation, une démo ou une session d'onboarding pour des collègues." } },
  { id: 't4', dimension: 'teach', text: { en: 'My manager would support me spending part of my time training others.', fr: 'Mon manager me soutiendrait si je consacrais une partie de mon temps à former les autres.' } },
  { id: 't5', dimension: 'teach', text: { en: 'I am comfortable answering questions live, in front of a group.', fr: "Je suis à l'aise pour répondre à des questions en direct, devant un groupe." } },
  // Blast radius
  { id: 'r1', dimension: 'reach', text: { en: 'Colleagues already come to me for advice on tools or ways of working.', fr: 'Mes collègues viennent déjà me demander conseil sur des outils ou des façons de travailler.' } },
  { id: 'r2', dimension: 'reach', text: { en: 'Things I build or document tend to get reused by other people.', fr: 'Ce que je construis ou documente a tendance à être réutilisé par d’autres.' } },
  { id: 'r5', dimension: 'reach', text: { en: "I would be comfortable representing my team's needs in the AI rollout.", fr: "Je serais à l'aise pour représenter les besoins de mon équipe dans le déploiement de l'IA." } },
  { id: 'r6', dimension: 'reach', text: { en: 'Other teams would notice if I stopped sharing what I build or document.', fr: "D'autres équipes remarqueraient si j'arrêtais de partager ce que je construis ou documente." } },
  // Governance & trust
  { id: 'g1', dimension: 'gov', text: { en: 'I know what company data I am and am not allowed to put into an AI tool.', fr: "Je sais quelles données de l'entreprise j'ai le droit ou non de mettre dans un outil d'IA." } },
  { id: 'g2', dimension: 'gov', text: { en: 'I know who decides which AI tools we are allowed to use.', fr: "Je sais qui décide des outils d'IA que nous avons le droit d'utiliser." } },
  { id: 'g3', dimension: 'gov', text: { en: 'I would know where to raise a concern about an AI output or a data issue.', fr: "Je saurais où signaler un problème lié à un résultat d'IA ou à des données." } },
  { id: 'g4', dimension: 'gov', text: { en: 'I understand what happens to the data I put into an AI tool.', fr: "Je comprends ce que deviennent les données que je mets dans un outil d'IA." } },
  // Multiplayer habits
  { id: 'm1', dimension: 'team', text: { en: 'My team shares working methods and templates instead of each person doing their own thing.', fr: 'Mon équipe partage ses méthodes et ses modèles au lieu que chacun fasse à sa façon.' } },
  { id: 'm2', dimension: 'team', text: { en: 'I would share something I built with the rest of the company, not just keep it for myself.', fr: "Je partagerais ce que j'ai construit avec le reste de l'entreprise, au lieu de le garder pour moi." } },
  { id: 'm3', dimension: 'team', text: { en: 'My team has a shared place where knowledge actually lives and stays up to date.', fr: 'Mon équipe a un espace partagé où la connaissance vit vraiment et reste à jour.' } },
  { id: 'm4', dimension: 'team', text: { en: 'We tend to adopt a new tool together rather than in scattered pockets.', fr: 'Nous adoptons généralement un nouvel outil ensemble plutôt que chacun dans son coin.' } },
  { id: 'm5', dimension: 'team', text: { en: 'I would tell the people running the rollout when something is not working.', fr: "Je signalerais aux responsables du déploiement quand quelque chose ne fonctionne pas." } },
  // Automation opportunity (not in readiness)
  { id: 'p1', dimension: 'pain', text: { en: 'A significant part of my week goes into repetitive, low-judgment work.', fr: 'Une part importante de ma semaine passe dans des tâches répétitives, à faible valeur de jugement.' } },
  { id: 'p2', dimension: 'pain', text: { en: 'I regularly spend time looking for information that exists somewhere in the company.', fr: "Je passe régulièrement du temps à chercher des informations qui existent quelque part dans l'entreprise." } },
  { id: 'p3', dimension: 'pain', text: { en: 'I often rewrite or reformat the same kind of document or message.', fr: 'Je réécris ou remets souvent en forme le même type de document ou de message.' } },
  { id: 'p4', dimension: 'pain', text: { en: 'My work gets delayed waiting for someone else to produce a routine output.', fr: "Mon travail est retardé parce que j'attends qu'une autre personne produise un livrable de routine." } },
  { id: 'p5', dimension: 'pain', text: { en: 'I could name at least one task in my week I would hand over to an AI agent tomorrow.', fr: "Je pourrais citer au moins une tâche de ma semaine que je confierais dès demain à un agent IA." } },
  // Value clarity (not in readiness)
  { id: 'v1', dimension: 'value', text: { en: 'I can name a concrete outcome my team would get from AI, not just time saved.', fr: "Je peux citer un résultat concret que mon équipe obtiendrait grâce à l'IA, au-delà du temps gagné." } },
  { id: 'v2', dimension: 'value', text: { en: "I know which of my team's processes would benefit most from an AI agent.", fr: "Je sais quels processus de mon équipe profiteraient le plus d'un assistant." } },
];

export const questionText = (q: V2Question, lang: Lang) => pick(q.text, lang);

/**
 * Adapter for legacy views and exports that expect the old `Question` shape with numeric ids.
 * Numeric id = 100 + position (101…144); responses exposed by useCampaignParticipants use the same keys.
 */
export const V2_NUMERIC_ID = (q: V2Question) => 101 + V2_QUESTIONS.indexOf(q);
export const V2_QUESTION_BY_NUMERIC_ID: Record<number, V2Question> = Object.fromEntries(
  V2_QUESTIONS.map((q) => [V2_NUMERIC_ID(q), q])
);
export const V2_AS_LEGACY_QUESTIONS: Question[] = V2_QUESTIONS.map((q) => ({
  id: V2_NUMERIC_ID(q),
  itemMacro: 'INDIVIDU',
  thematic: q.dimension,
  text: q.text.fr,
  scores: { disagree: 0, somewhatDisagree: 0, neutral: 0, somewhatAgree: 0, agree: 0 },
})) as unknown as Question[];

/* ------------------------------------------------------------------ */
/* Answer scale                                                          */
/* ------------------------------------------------------------------ */

export type AnswerValue = 'disagree' | 'somewhatDisagree' | 'neutral' | 'somewhatAgree' | 'agree';
export const ANSWER_TO_NUMBER: Record<AnswerValue, number> = {
  disagree: 1,
  somewhatDisagree: 2,
  neutral: 3,
  somewhatAgree: 4,
  agree: 5,
};

/* ------------------------------------------------------------------ */
/* Scoring                                                               */
/* ------------------------------------------------------------------ */

export interface V2Scores {
  version: 2;
  dimensions: Record<DimensionId, number>;
  readiness: number;
  fits: RoleFits;
  /** Every role the person fits. Roles are independent and can overlap (a builder can also be a champion). */
  roles: RoleId[];
  /** Primary class, used for distributions and the rollout plan. */
  classId: ResultClassId;
}

export type RoleId = 'trainer' | 'builder' | 'champion' | 'sponsor';
export type RoleFits = Record<RoleId, number>;

/** Role rules. Builder = hands-on depth; champion = drives adoption. Neither requires the other. */
export const roleMatches = (d: Record<DimensionId, number>, fits: RoleFits): RoleId[] => {
  const roles: RoleId[] = [];
  if (fits.trainer >= 65 && d.teach >= 60 && d.will >= 60) roles.push('trainer');
  if (fits.champion >= 65 && d.reach >= 55) roles.push('champion');
  if (fits.builder >= 65 && d.depth >= 60) roles.push('builder');
  if (fits.sponsor >= 65 && d.gov >= 60) roles.push('sponsor');
  return roles;
};

const round = (n: number) => Math.round(n);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Step 1–2: flip reverse items (6 − answer), average per dimension, rescale to 0–100. */
export const computeDimensions = (answers: Record<string, AnswerValue | undefined>): Record<DimensionId, number> => {
  const out = {} as Record<DimensionId, number>;
  DIMENSIONS.forEach((d) => {
    const vals = V2_QUESTIONS.filter((q) => q.dimension === d.id)
      .map((q) => {
        const a = answers[q.id];
        if (!a) return null;
        const n = ANSWER_TO_NUMBER[a];
        return q.reverse ? 6 - n : n;
      })
      .filter((v): v is number => v !== null);
    out[d.id] = vals.length ? round(((mean(vals) - 1) / 4) * 100) : 0;
  });
  return out;
};

export const computeScores = (answers: Record<string, AnswerValue | undefined>): V2Scores => {
  const d = computeDimensions(answers);
  const readiness = round(mean(READINESS_DIMENSION_IDS.map((id) => d[id])));
  const fits: RoleFits = {
    trainer: round(0.4 * d.teach + 0.3 * d.will + 0.3 * d.depth),
    builder: round(0.5 * d.depth + 0.25 * d.usage + 0.25 * d.will),
    champion: round(0.45 * d.reach + 0.3 * d.team + 0.25 * d.will),
    sponsor: round(0.4 * d.gov + 0.3 * d.reach + 0.3 * d.team),
  };
  return { version: 2, dimensions: d, readiness, fits, roles: roleMatches(d, fits), classId: assignClass(d, fits) };
};

/** Scores from the stored answers when available, so every participant is read with the current model. */
export const rescore = (storedScores: V2Scores, responses: V2Responses | null): V2Scores =>
  responses && Object.keys(responses.answers || {}).length ? computeScores(responses.answers) : { ...storedScores, roles: storedScores.roles ?? [] };

/* ------------------------------------------------------------------ */
/* Result classes (first matching rule wins)                            */
/* ------------------------------------------------------------------ */

export type ResultClassId = 'trainer' | 'champion' | 'builder' | 'sponsor' | 'beginner' | 'convince' | 'everyday';

export const assignClass = (d: Record<DimensionId, number>, fits: RoleFits): ResultClassId => {
  const roles = roleMatches(d, fits);
  if (roles.length) return roles[0];
  if (d.will >= 65 && d.depth < 50) return 'beginner';
  if (d.will < 40 && d.usage < 40) return 'convince';
  return 'everyday';
};

export interface ResultClassInfo {
  id: ResultClassId;
  name: L;
  rule: L;
  meaning: L;
  action: L;
  tone: 'brand' | 'green' | 'lav' | 'pink' | 'amber' | 'red' | 'neutral';
}

export const RESULT_CLASSES: ResultClassInfo[] = [
  {
    id: 'trainer',
    name: { en: 'Trainer potential', fr: 'Potentiel formateur' },
    rule: { en: 'Trainer fit ≥ 65, teaching posture ≥ 60 and motivation ≥ 60', fr: 'Fit formateur ≥ 65, posture de formateur ≥ 60 et motivation ≥ 60' },
    meaning: { en: 'Understands the product deeply and has the posture and bandwidth to teach it.', fr: 'Maîtrise le produit en profondeur et a la posture et la disponibilité pour le transmettre.' },
    action: { en: 'Confirm against the declared rollout role and the bandwidth answer, then ask for a formal trainer commitment: full enablement track, champion kit, recurring Q&A slots, manager informed.', fr: 'Vérifier le rôle déclaré et la disponibilité, puis demander un engagement formel de formateur : parcours complet, kit champion, créneaux de Q&R réguliers, manager informé.' },
    tone: 'brand',
  },
  {
    id: 'champion',
    name: { en: 'Champion potential', fr: 'Potentiel champion' },
    rule: { en: 'Champion fit ≥ 65 and blast radius ≥ 55', fr: 'Fit champion ≥ 65 et rayonnement ≥ 55' },
    meaning: { en: 'Drives adoption: colleagues come to them and their team follows. May never build an agent themselves.', fr: "Porte l'adoption : les collègues viennent vers eux et leur équipe suit. Ne construira peut-être jamais d'agent." },
    action: { en: 'Early access, a peer-story kit and a visible role in team rituals. Pair them with a builder for use cases.', fr: 'Accès anticipé, kit de retours d’expérience et rôle visible dans les rituels d’équipe. Les associer à un builder pour les cas d’usage.' },
    tone: 'green',
  },
  {
    id: 'builder',
    name: { en: 'Builder potential', fr: 'Potentiel builder' },
    rule: { en: 'Builder fit ≥ 65 and builder depth ≥ 60', fr: 'Fit builder ≥ 65 et capacité à construire ≥ 60' },
    meaning: { en: 'Can configure agents, connect data and iterate. Not necessarily the one who drives adoption.', fr: "Sait configurer des agents, connecter des données et itérer. Pas forcément celui qui porte l'adoption." },
    action: { en: 'Builder session on day one and first use cases to build. Pair with a champion so what they build gets used.', fr: 'Session builder dès le premier jour et premiers cas d’usage à construire. Les associer à un champion pour que ce qu’ils construisent soit utilisé.' },
    tone: 'lav',
  },
  {
    id: 'sponsor',
    name: { en: 'Program sponsor potential', fr: 'Potentiel sponsor du programme' },
    rule: { en: 'Sponsor fit ≥ 65 and governance clarity ≥ 60', fr: 'Fit sponsor ≥ 65 et gouvernance ≥ 60' },
    meaning: { en: 'Owns governance, KPIs and internal communication rather than hands-on building.', fr: 'Porte la gouvernance, les indicateurs et la communication interne plutôt que la construction.' },
    action: { en: 'Admin setup, value reporting, budget defence and internal comms. Not expected to deliver training sessions.', fr: 'Configuration admin, suivi de la valeur, défense du budget et communication interne. Pas attendu sur l’animation de formations.' },
    tone: 'pink',
  },
  {
    id: 'beginner',
    name: { en: 'Motivated beginner', fr: 'Débutant motivé' },
    rule: { en: 'Motivation ≥ 65 and builder depth < 50', fr: 'Motivation ≥ 65 et capacité à construire < 50' },
    meaning: { en: 'High appetite, low depth today. This is the trainer pipeline.', fr: "Forte envie, peu de profondeur aujourd'hui. C'est le vivier des futurs formateurs." },
    action: { en: 'Priority seat in the builder session, then re-score after four weeks.', fr: 'Place prioritaire dans la session builder, puis nouvelle évaluation après quatre semaines.' },
    tone: 'amber',
  },
  {
    id: 'convince',
    name: { en: 'Needs convincing', fr: 'À convaincre' },
    rule: { en: 'Motivation < 40 and AI usage < 40', fr: 'Motivation < 40 et pratique de l’IA < 40' },
    meaning: { en: 'Low usage and low appetite today. Not a lost cause, just not a starting point.', fr: "Peu d'usage et peu d'envie aujourd'hui. Pas une cause perdue, simplement pas un point de départ." },
    action: { en: 'Reach with a peer value story, not a feature demo.', fr: 'Les toucher avec un retour d’expérience de pair, pas avec une démo de fonctionnalités.' },
    tone: 'red',
  },
  {
    id: 'everyday',
    name: { en: 'Everyday user', fr: 'Utilisateur au quotidien' },
    rule: { en: 'Everything else', fr: 'Tous les autres cas' },
    meaning: { en: 'Will adopt if the path is obvious, unlikely to drive anything.', fr: 'Adoptera si le chemin est évident, peu susceptible de porter le sujet.' },
    action: { en: 'Self-serve: Academy links and in-product onboarding, no live session.', fr: 'Autonomie : liens Academy et onboarding dans le produit, sans session en direct.' },
    tone: 'neutral',
  },
];

export const CLASS_ORDER: ResultClassId[] = RESULT_CLASSES.map((c) => c.id);
export const getResultClass = (id: string) => RESULT_CLASSES.find((c) => c.id === id) ?? RESULT_CLASSES[RESULT_CLASSES.length - 1];
export const classLabel = (id: string, lang: Lang) => pick(getResultClass(id).name, lang);

/** `Profile`-shaped object (legacy consumers: tables, exports). French fields; EN via getLocalizedProfile. */
export const classAsProfile = (id: string): Profile => {
  const c = getResultClass(id);
  return {
    id: c.id,
    name: c.name.fr,
    emoji: '',
    minScore: 0,
    maxScore: 100,
    description: c.meaning.fr,
    advice: c.action.fr,
    tip: c.rule.fr,
    nextLevel: '',
    color: `class-${c.id}`,
  };
};
export const CLASS_PROFILES: Profile[] = CLASS_ORDER.map(classAsProfile);

export const CLASS_PROFILE_EN = Object.fromEntries(
  RESULT_CLASSES.map((c) => [c.id, { name: c.name.en, description: c.meaning.en, advice: c.action.en, tip: c.rule.en, nextLevel: '' }])
);

/* ------------------------------------------------------------------ */
/* Readiness bands (cohort) and cell colours (any 0–100 score)          */
/* ------------------------------------------------------------------ */

export interface ReadinessBand {
  id: 'early' | 'uneven' | 'good' | 'strong';
  min: number;
  headline: L;
  advice: L;
}

export const READINESS_BANDS: ReadinessBand[] = [
  { id: 'early', min: 0, headline: { en: 'Early stage', fr: 'Démarrage' }, advice: { en: 'Most people are not using AI seriously yet. Lead with one visible, useful outcome before asking anyone to build anything.', fr: "La plupart des personnes n'utilisent pas encore l'IA sérieusement. Commencer par un résultat utile et visible avant de demander à quiconque de construire." } },
  { id: 'uneven', min: 45, headline: { en: 'Uneven readiness', fr: 'Maturité inégale' }, advice: { en: 'A motivated minority is well ahead of the rest. Deploy through that minority rather than running the same session for everyone.', fr: "Une minorité motivée a une nette avance sur le reste. Déployer via cette minorité plutôt que d'animer la même session pour tout le monde." } },
  { id: 'good', min: 60, headline: { en: 'Good foundations', fr: 'De bonnes bases' }, advice: { en: 'The appetite is there and the basics are mostly in place. A few dimensions need attention before you scale beyond the first group.', fr: "L'envie est là et les bases sont en grande partie en place. Quelques dimensions demandent de l'attention avant d'aller au-delà du premier groupe." } },
  { id: 'strong', min: 75, headline: { en: 'Strong foundations', fr: 'Des bases solides' }, advice: { en: 'This cohort can start building on day one. Spend the kickoff on governance and on picking the right first use cases, not on basics.', fr: 'Cette cohorte peut construire dès le premier jour. Consacrer le kickoff à la gouvernance et au choix des bons premiers cas d’usage, pas aux bases.' } },
];

export const getReadinessBand = (score: number): ReadinessBand =>
  [...READINESS_BANDS].reverse().find((b) => score >= b.min) ?? READINESS_BANDS[0];

/* ------------------------------------------------------------------ */
/* Context & open questions                                              */
/* ------------------------------------------------------------------ */

export interface ChoiceField {
  id: 'team' | 'level' | 'bandwidth' | 'tools' | 'rolloutRole' | 'expectedValue';
  label: L;
  multiple: boolean;
  /** Maximum number of choices when `multiple` (no limit when absent). */
  max?: number;
  /** Show a free-text field when "other" is selected. */
  otherText?: boolean;
  options: { id: string; label: L }[];
}

const o = (id: string, en: string, fr: string) => ({ id, label: { en, fr } });

export const CONTEXT_FIELDS: ChoiceField[] = [
  {
    id: 'team',
    label: { en: 'Team', fr: 'Équipe' },
    multiple: false,
    options: [
      o('sales', 'Sales / Revenue', 'Ventes / Revenus'),
      o('marketing', 'Marketing', 'Marketing'),
      o('support', 'Customer Support', 'Support client'),
      o('success', 'Customer Success', 'Customer Success'),
      o('product', 'Product', 'Produit'),
      o('engineering', 'Engineering', 'Ingénierie'),
      o('data', 'Data', 'Data'),
      o('finance', 'Finance', 'Finance'),
      o('legal', 'Legal', 'Juridique'),
      o('hr', 'HR / People', 'RH / People'),
      o('operations', 'Operations', 'Opérations'),
      o('other', 'Other', 'Autre'),
    ],
  },
  {
    id: 'level',
    label: { en: 'Level', fr: 'Niveau' },
    multiple: false,
    options: [
      o('ic', 'Individual contributor', 'Contributeur individuel'),
      o('lead', 'Team lead', "Chef d'équipe"),
      o('manager', 'Manager', 'Manager'),
      o('director', 'Director or above', 'Directeur ou plus'),
      o('exec', 'Executive', 'Dirigeant'),
    ],
  },
  {
    id: 'bandwidth',
    label: { en: 'Time you could give to enabling others', fr: 'Temps que vous pourriez consacrer à faire monter les autres en compétence' },
    multiple: false,
    options: [
      o('none', 'None', 'Aucun'),
      o('lt1h', 'Under 1 hour a week', "Moins d'1 heure par semaine"),
      o('1to3h', '1 to 3 hours a week', '1 à 3 heures par semaine'),
      o('halfday', 'Half a day a week', 'Une demi-journée par semaine'),
      o('more', 'More than half a day a week', "Plus d'une demi-journée par semaine"),
    ],
  },
  {
    id: 'tools',
    label: { en: 'AI tools you use today', fr: "Outils d'IA que vous utilisez aujourd'hui" },
    multiple: true,
    otherText: true,
    options: [
      o('none', 'None today', "Aucun aujourd'hui"),
      o('chatgpt', 'ChatGPT', 'ChatGPT'),
      o('claude', 'Claude', 'Claude'),
      o('copilot', 'Microsoft Copilot', 'Microsoft Copilot'),
      o('gemini', 'Gemini', 'Gemini'),
      o('dust', 'Dust', 'Dust'),
      o('inhouse', 'An in-house tool', 'Un outil interne'),
      o('personal', 'Personal use only, nothing at work', 'Usage personnel uniquement, rien au travail'),
      o('other', 'Other', 'Autre'),
    ],
  },
  {
    id: 'rolloutRole',
    label: { en: 'Which role could you realistically play in the AI rollout?', fr: "Quel rôle pourriez-vous réalistement jouer dans le déploiement de l'IA ?" },
    multiple: true,
    options: [
      o('use', 'Use AI in my own work', 'Utiliser l’IA dans mon propre travail'),
      o('build', 'Build or configure agents', 'Créer ou configurer des agents'),
      o('adopt', 'Help my team adopt AI', 'Aider mon équipe à adopter l’IA'),
      o('train', 'Train or coach colleagues', 'Former ou accompagner des collègues'),
      o('sponsor', 'Sponsor the topic with management', 'Porter le sujet auprès de la direction'),
      o('govern', 'Own admin, security or governance', 'Prendre en charge l’admin, la sécurité ou la gouvernance'),
      o('unknown', 'I do not know yet', 'Je ne sais pas encore'),
    ],
  },
  {
    id: 'expectedValue',
    label: { en: 'What would be the most useful outcomes Dust could help you reach?', fr: 'Quels seraient les résultats les plus utiles que Dust pourrait vous aider à atteindre ?' },
    multiple: true,
    max: 3,
    otherText: true,
    options: [
      o('time', 'Save time on individual tasks', 'Gagner du temps sur des tâches individuelles'),
      o('workflow', 'Speed up a team workflow', "Accélérer un processus d'équipe"),
      o('quality', 'Improve quality or consistency of output', 'Améliorer la qualité ou la cohérence des livrables'),
      o('knowledge', 'Share and reuse knowledge', 'Partager et réutiliser la connaissance'),
      o('crossteam', 'Help several teams work together', 'Aider plusieurs équipes à travailler ensemble'),
      o('govern', 'Govern how AI is used', "Encadrer l'usage de l'IA"),
      o('other', 'Other', 'Autre'),
    ],
  },
];

export interface OpenField {
  id: 'timeSink' | 'useCase' | 'valueOwner' | 'success' | 'blocker';
  label: L;
}

export const OPEN_FIELDS: OpenField[] = [
  { id: 'timeSink', label: { en: 'What is the single biggest time sink in your week?', fr: 'Quelle est la plus grosse perte de temps de votre semaine ?' } },
  { id: 'useCase', label: { en: 'Which workflow or task would you most want to improve or hand over to an AI agent?', fr: 'Quel processus ou quelle tâche aimeriez-vous le plus améliorer ou confier à un assistant ?' } },
  { id: 'valueOwner', label: { en: 'Which team or process would gain the most from that use case?', fr: 'Quelle équipe ou quel processus y gagnerait le plus ?' } },
  { id: 'success', label: { en: 'How would you know the Dust rollout has been a success for you or your team?', fr: 'À quoi verriez-vous que le déploiement de Dust est une réussite pour vous ou votre équipe ?' } },
  { id: 'blocker', label: { en: 'What would stop you from using it?', fr: "Qu'est-ce qui vous empêcherait de l'utiliser ?" } },
];

export type ContextAnswers = Partial<Record<ChoiceField['id'], string | string[]>> & {
  /** Free text typed next to an "Other" choice, per field. */
  other?: Partial<Record<ChoiceField['id'], string>>;
};

/** Short definitions shown to respondents so everyone reads the statements the same way. */
export const GLOSSARY: { term: L; definition: L }[] = [
  {
    term: { en: 'AI tool', fr: "Outil d'IA" },
    definition: { en: 'Any AI chat or assistant you can ask things to: ChatGPT, Claude, Copilot, Gemini, Dust…', fr: 'Tout chat ou assistant IA à qui l’on peut poser des questions : ChatGPT, Claude, Copilot, Gemini, Dust…' },
  },
  {
    term: { en: 'AI agent', fr: 'Agent IA' },
    definition: { en: 'An AI set up for a specific job: its own instructions, the company data it can read and the tools it can use (e.g. a Dust agent).', fr: 'Une IA configurée pour une mission précise : ses propres instructions, les données de l’entreprise qu’elle peut lire et les outils qu’elle peut utiliser (par ex. un agent Dust).' },
  },
  {
    term: { en: 'Connecting data or a tool', fr: 'Connecter des données ou un outil' },
    definition: { en: 'Giving an agent access to documents or apps (Drive, Notion, Slack, CRM…) so it answers from your company’s context.', fr: 'Donner à un agent l’accès à des documents ou des applications (Drive, Notion, Slack, CRM…) pour qu’il réponde avec le contexte de l’entreprise.' },
  },
];
export type OpenAnswers = Partial<Record<OpenField['id'], string>>;

export const optionLabel = (fieldId: ChoiceField['id'], optionId: string, lang: Lang) => {
  const f = CONTEXT_FIELDS.find((x) => x.id === fieldId);
  const opt = f?.options.find((x) => x.id === optionId);
  return opt ? pick(opt.label, lang) : optionId;
};

/** Labels of a context answer, with the "Other" free text appended when present. */
export const contextLabels = (context: ContextAnswers | undefined, fieldId: ChoiceField['id'], lang: Lang): string[] => {
  const v = context?.[fieldId];
  const list = Array.isArray(v) ? v : v ? [v] : [];
  const note = context?.other?.[fieldId]?.trim();
  return list.map((id) => (id === 'other' && note ? `${optionLabel(fieldId, id, lang)}: ${note}` : optionLabel(fieldId, id, lang)));
};

/** A trainer must have declared a training role; otherwise the class needs human confirmation. */
export const trainerRoleMismatch = (classId: string, context?: ContextAnswers) => {
  if (classId !== 'trainer') return false;
  const roles = context?.rolloutRole;
  const list = Array.isArray(roles) ? roles : roles ? [roles] : [];
  return !list.includes('train');
};

/** Stored shape of `participants.responses` for v2 answers. */
export interface V2Responses {
  version: 2;
  answers: Record<string, AnswerValue>;
  context: ContextAnswers;
  open: OpenAnswers;
}

export const isV2Responses = (r: unknown): r is V2Responses =>
  !!r && typeof r === 'object' && (r as { version?: number }).version === 2;

export const isV2ItemScores = (s: unknown): s is V2Scores =>
  !!s && typeof s === 'object' && (s as { version?: number }).version === 2;

/* ------------------------------------------------------------------ */
/* Survey audiences: one link per team, each with its own header        */
/* ------------------------------------------------------------------ */

export type SurveyAudience = 'general' | 'sales' | 'success';

/** `?for=sales` or `?for=cs` on the survey link. */
export const audienceFromParam = (v: string | null): SurveyAudience =>
  v === 'sales' ? 'sales' : v === 'cs' || v === 'success' ? 'success' : 'general';

export const AUDIENCE_PARAM: Record<SurveyAudience, string | null> = { general: null, sales: 'sales', success: 'cs' };

/** Who Dust is, shown at the top of every survey. */
export const DUST_ABOUT: L = {
  en: 'Dust is your new AI platform. We want to learn more about you and what you do in your organization, so we can tailor the rollout to the way your team actually works. Our deployment team runs these rollouts end to end.',
  fr: "Dust est votre nouvelle plateforme d'IA. Nous voulons en savoir plus sur vous et sur ce que vous faites dans votre organisation, pour adapter le déploiement à la façon dont votre équipe travaille vraiment. Notre équipe de déploiement accompagne ces déploiements de bout en bout.",
};

export interface AudienceInfo {
  id: SurveyAudience;
  label: L;
  /** Team pre-selected in "About you" (still editable). */
  team?: string;
  title: L;
  whatFor: L;
  whyItMatters: L;
  output: L;
  /** Placeholder examples for the use-case open question. */
  useCaseExamples: L;
}

export const AUDIENCES: Record<SurveyAudience, AudienceInfo> = {
  general: {
    id: 'general',
    label: { en: 'All teams', fr: 'Toutes les équipes' },
    title: { en: 'Help us shape your AI rollout', fr: 'Aidez-nous à construire votre déploiement IA' },
    whatFor: { en: 'Understand how your team uses AI today, and where it could help most.', fr: "Comprendre comment votre équipe utilise l'IA aujourd'hui, et où elle aiderait le plus." },
    whyItMatters: { en: 'Your answers decide which teams start first, which agents we build first and who we train. There are no right or wrong answers.', fr: "Vos réponses décident des équipes qui démarrent en premier, des premiers agents à construire et des personnes à former. Il n'y a pas de bonne ou de mauvaise réponse." },
    output: { en: 'A rollout plan tailored to your company and, at the end of the survey, your own AI profile.', fr: 'Un plan de déploiement adapté à votre entreprise et, à la fin du questionnaire, votre propre profil IA.' },
    useCaseExamples: { en: 'e.g. a weekly report, answering recurring questions, preparing a meeting', fr: 'ex. un reporting hebdo, répondre aux questions récurrentes, préparer une réunion' },
  },
  sales: {
    id: 'sales',
    label: { en: 'Sales team', fr: 'Équipe Sales' },
    team: 'sales',
    title: { en: 'AI for the Sales team', fr: "L'IA pour l'équipe Sales" },
    whatFor: { en: 'Understand how the Sales team uses AI today: account research, call prep, follow-ups, CRM updates.', fr: "Comprendre comment l'équipe Sales utilise l'IA aujourd'hui : recherche de comptes, préparation d'appels, relances, mises à jour du CRM." },
    whyItMatters: { en: 'Your answers decide which Sales agents we build first and who in the team gets early access and training, so the rollout saves selling time from week one.', fr: "Vos réponses décident des premiers agents Sales à construire et des personnes qui auront un accès anticipé et une formation, pour que le déploiement fasse gagner du temps commercial dès la première semaine." },
    output: { en: 'A Sales rollout plan: the first agents to build, the people to train first, and a baseline to measure progress. Plus your own AI profile at the end.', fr: 'Un plan de déploiement Sales : les premiers agents à construire, les personnes à former en premier et une baseline pour mesurer les progrès. Et votre propre profil IA à la fin.' },
    useCaseExamples: { en: 'e.g. account research before a call, follow-up emails, CRM updates', fr: "ex. recherche de compte avant un appel, e-mails de relance, mises à jour du CRM" },
  },
  success: {
    id: 'success',
    label: { en: 'Customer Success team', fr: 'Équipe Customer Success' },
    team: 'success',
    title: { en: 'AI for the Customer Success team', fr: "L'IA pour l'équipe Customer Success" },
    whatFor: { en: 'Understand how Customer Success uses AI today: account health, QBR prep, renewal risk, recurring questions.', fr: "Comprendre comment le Customer Success utilise l'IA aujourd'hui : santé des comptes, préparation des QBR, risque de renouvellement, questions récurrentes." },
    whyItMatters: { en: 'Your answers decide which CS agents we build first and who in the team gets early access and training, so you spend less time on prep and more with customers.', fr: "Vos réponses décident des premiers agents CS à construire et des personnes qui auront un accès anticipé et une formation, pour passer moins de temps à préparer et plus de temps avec les clients." },
    output: { en: 'A Customer Success rollout plan: the first agents to build, the people to train first, and a baseline to measure progress. Plus your own AI profile at the end.', fr: 'Un plan de déploiement Customer Success : les premiers agents à construire, les personnes à former en premier et une baseline pour mesurer les progrès. Et votre propre profil IA à la fin.' },
    useCaseExamples: { en: 'e.g. QBR prep, account health summaries, answering recurring customer questions', fr: 'ex. préparation des QBR, synthèse de la santé des comptes, réponses aux questions récurrentes des clients' },
  },
};
