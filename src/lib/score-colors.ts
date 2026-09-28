// Code couleur de tout score 0–100 affiché dans une pastille ou une cellule (spec v2, « Readiness bands ») :
// 70–100 vert (point fort) · 50–69 ambre (fragile) · 0–49 rouge (bloquant).
// Les paliers de readiness de la cohorte (0–44 / 45–59 / 60–74 / 75+) sont gérés dans assessment-v2.ts.

export type ScoreTier = 'top' | 'emerging' | 'critical';

export const getScoreTier = (score: number): ScoreTier => {
  if (score >= 70) return 'top';
  if (score >= 50) return 'emerging';
  return 'critical';
};

export const TIER_LABELS: Record<ScoreTier, { fr: string; en: string; range: string }> = {
  top: { fr: 'Point fort', en: 'Strength', range: '70–100' },
  emerging: { fr: 'Fragile', en: 'Fragile', range: '50–69' },
  critical: { fr: 'Bloquant', en: 'Blocker', range: '0–49' },
};

const TIER_VAR: Record<ScoreTier, string> = {
  top: '--green',
  emerging: '--amber',
  critical: '--red',
};

export const getScoreColor = (score: number): string => `hsl(var(${TIER_VAR[getScoreTier(score)]}))`;

/** Text color readable on white (AA) for a score. */
export const getScoreColorClass = (score: number): string => {
  const tier = getScoreTier(score);
  if (tier === 'top') return 'text-ok-ink';
  if (tier === 'emerging') return 'text-warn-ink';
  return 'text-risk-ink';
};

/** Tinted cell/pill class (light background + contrasted text) for a score. */
export const getScorePillClass = (score: number): string => `pill tier-${getScoreTier(score)}`;

export const getScoreLabel = (score: number): string => {
  if (score < 25) return 'Critique';
  if (score <= 49) return 'À améliorer';
  if (score <= 74) return 'Satisfaisant';
  return 'Excellent';
};
