import type { DimensionId } from '@/lib/assessment-v2';

type L = { en: string; fr: string };

/**
 * Where a campaign sits in a client's follow-up. Stored in campaigns.wave (supabase/007);
 * when empty, the first campaign of a client is read as the baseline and later ones as re-measures.
 */
export type Wave = 'baseline' | 'pulse' | 'review' | 'remeasure';

export const WAVES: { id: Wave; label: L; hint: L }[] = [
  { id: 'baseline', label: { fr: 'Point de départ', en: 'Baseline' }, hint: { fr: 'Avant le kickoff (T0).', en: 'Before the kickoff (T0).' } },
  { id: 'remeasure', label: { fr: 'Re-mesure', en: 'Re-measure' }, hint: { fr: 'Même questionnaire, quelques mois après, pour voir l’évolution.', en: 'Same survey a few months later, to see the change.' } },
  { id: 'pulse', label: { fr: 'Point d’étape', en: 'Pulse' }, hint: { fr: 'Questionnaire court (3 min) pendant le déploiement : ce qui est utilisé, ce qui bloque.', en: 'Short survey (3 min) during the rollout: what is used, what blocks.' } },
  { id: 'review', label: { fr: 'Bilan', en: 'Review' }, hint: { fr: 'Fin de déploiement : questionnaire complet et questions sur l’impact, avant la business review.', en: 'End of rollout: full survey plus impact questions, before the business review.' } },
];

export const waveLabel = (w: Wave, fr: boolean) => {
  const x = WAVES.find((v) => v.id === w);
  return x ? (fr ? x.label.fr : x.label.en) : w;
};

export const isWave = (v: unknown): v is Wave => typeof v === 'string' && WAVES.some((w) => w.id === v);

/** Explicit wave when set, otherwise baseline for the first campaign (by date) and re-measure after. */
export const resolveWaves = <T extends { created_at: string; wave?: string | null }>(sorted: T[]): Wave[] =>
  sorted.map((c, i) => (isWave(c.wave) ? c.wave : i === 0 ? 'baseline' : 'remeasure'));

/** The team's three value pillars, read from the survey dimensions (same words as the usage metrics). */
export const PILLARS: { id: 'governance' | 'productivity' | 'multiplayer'; label: L; dims: DimensionId[] }[] = [
  { id: 'governance', label: { fr: 'Gouvernance', en: 'Governance' }, dims: ['gov'] },
  { id: 'productivity', label: { fr: 'AI Productivity', en: 'AI Productivity' }, dims: ['usage', 'depth'] },
  { id: 'multiplayer', label: { fr: 'Multiplayer', en: 'Multiplayer' }, dims: ['team', 'reach', 'teach'] },
];

/** A workflow agreed with the client at the kickoff, and where it stands at a given wave (campaigns.workflows). */
export type WorkflowStatus = 'planned' | 'building' | 'live' | 'dropped';
export interface Workflow {
  id: string;
  title: string;
  team?: string;
  status: WorkflowStatus;
}

export const WORKFLOW_STATUSES: { id: WorkflowStatus; label: L }[] = [
  { id: 'planned', label: { fr: 'Prévu', en: 'Planned' } },
  { id: 'building', label: { fr: 'En cours', en: 'In progress' } },
  { id: 'live', label: { fr: 'En place', en: 'Live' } },
  { id: 'dropped', label: { fr: 'Abandonné', en: 'Dropped' } },
];

const isStatus = (v: unknown): v is WorkflowStatus => WORKFLOW_STATUSES.some((s) => s.id === v);

/** Reads campaigns.workflows defensively: anything malformed is skipped. */
export const toWorkflows = (v: unknown): Workflow[] | null => {
  if (!Array.isArray(v)) return null;
  return v
    .filter((w): w is Record<string, unknown> => !!w && typeof w === 'object' && typeof (w as { title?: unknown }).title === 'string')
    .map((w) => ({
      id: typeof w.id === 'string' ? w.id : Math.random().toString(36).slice(2, 10),
      title: String(w.title).slice(0, 200),
      team: typeof w.team === 'string' && w.team.trim() ? w.team.slice(0, 80) : undefined,
      status: isStatus(w.status) ? w.status : 'planned',
    }));
};
