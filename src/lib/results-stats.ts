import type { CampaignParticipant } from '@/lib/participant-row';
import { getQuestionText, type AssessmentType, type Question } from '@/lib/assessment-data';
import { CLASS_PROFILES, V2_AS_LEGACY_QUESTIONS, contextLabels, type ChoiceField, type Lang } from '@/lib/assessment-v2';
import { QUESTION_TRANSLATIONS_EN } from '@/lib/question-translations';

/**
 * Figures shown on the results page, in one place: the page, the exports and the HubSpot export read
 * the same numbers with the same rounding. Pure (no React, no Supabase).
 */

/** Analytics only count people who finished the survey (pending ones would dilute averages with zeros). */
export const completedOnly = (participants: CampaignParticipant[]) => participants.filter((p) => p.status === 'completed');

/** Share of a total, rounded to the unit; 0 when the total is 0. */
export const pctOf = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

/** Average readiness index of the cohort. */
export const averageReadiness = (completed: CampaignParticipant[]) =>
  completed.length ? Math.round(completed.reduce((sum, p) => sum + p.score, 0) / completed.length) : 0;

/** Average of one dimension over the cohort (people without that dimension count as 0, as on the page). */
export const dimensionAverage = (completed: CampaignParticipant[], dimension: string) =>
  completed.length ? Math.round(completed.reduce((sum, p) => sum + (p.thematicScores[dimension] || 0), 0) / completed.length) : 0;

/** Dimensions this cohort's questionnaire measured (the pre-sales diagnostic skips some). */
export const measuredDimensionIds = (completed: CampaignParticipant[], all: readonly string[]) => {
  if (!completed.length) return [...all];
  const measured = all.filter((id) => completed.some((p) => id in p.thematicScores));
  return measured.length ? measured : [...all];
};

/** How many people fall in each of the 7 profiles, in display order. */
export const profileCounts = (completed: CampaignParticipant[]) =>
  CLASS_PROFILES.map((profile) => ({ profile, count: completed.filter((p) => p.profile.id === profile.id).length }));

/** Readiness per team (`team` of each person), best first. */
export const teamReadiness = (completed: CampaignParticipant[], unknownTeam: string) => {
  const byTeam = new Map<string, number[]>();
  completed.forEach((p) => {
    const key = p.team || unknownTeam;
    byTeam.set(key, [...(byTeam.get(key) || []), p.score]);
  });
  return [...byTeam.entries()]
    .map(([team, xs]) => ({ team, count: xs.length, score: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) }))
    .sort((a, b) => b.score - a.score);
};

/** Agreement scale, 1 = strongly disagree … 5 = strongly agree. */
export const LIKERT_KEYS = ['disagree', 'somewhatDisagree', 'neutral', 'somewhatAgree', 'agree'] as const;

/** Labels of the scale as shown in the « Réponses détaillées » tab (LanguageContext › detailedScores.responses). */
export const LIKERT_LABELS: Record<Lang, string[]> = {
  fr: ["Pas du tout d'accord", "Plutôt pas d'accord", 'Neutre', "Plutôt d'accord", "Tout à fait d'accord"],
  en: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'],
};

/** Stored answer → 1…5 (string keys, or legacy numeric 0-4 / 1-5); 0 when unreadable. */
export const responseToValue = (response: string | number): number => {
  const mapping: Record<string, number> = { disagree: 1, somewhatDisagree: 2, neutral: 3, somewhatAgree: 4, agree: 5 };
  if (typeof response === 'string' && mapping[response]) return mapping[response];
  const n = typeof response === 'number' ? response : parseInt(response as string, 10);
  if (!isNaN(n)) {
    if (n >= 0 && n <= 4) return n + 1;
    if (n >= 1 && n <= 5) return n;
  }
  return 0;
};

/** A statement as worded on the results page. */
export const questionLabel = (question: Question, lang: Lang, assessmentType: AssessmentType = 'generic') =>
  getQuestionText(question.id, lang === 'en' ? QUESTION_TRANSLATIONS_EN[question.id] || question.text : question.text, assessmentType, lang);

/** Answer distribution of each statement: counts and rounded % of those who answered it. */
export const likertQuestionStats = (completed: CampaignParticipant[], questions: Question[] = V2_AS_LEGACY_QUESTIONS) => {
  if (!completed.length) return [];
  return questions.map((question, qIndex) => {
    const responseCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    // Responses are keyed by the question's real id, not by its position.
    const responseKey = question.id.toString();
    completed.forEach((participant) => {
      const responseValue = participant.responses?.[responseKey];
      if (responseValue) {
        const numericValue = responseToValue(responseValue);
        if (numericValue >= 1 && numericValue <= 5) responseCounts[numericValue]++;
      }
    });
    const totalResponses = Object.values(responseCounts).reduce((a, b) => a + b, 0);
    const percentages = Object.entries(responseCounts).map(([value, count]) => ({
      value: parseInt(value),
      count,
      percentage: pctOf(count, totalResponses),
    }));
    return { question, questionNumber: qIndex + 1, percentages, totalResponses };
  });
};

/** Answers to one « About you » question: count per option (multiple answers counted once each), most frequent first. */
export const contextDistribution = (completed: CampaignParticipant[], fieldId: ChoiceField['id'], lang: Lang) => {
  const counts = new Map<string, number>();
  completed.forEach((p) => contextLabels(p.context, fieldId, lang).forEach((l) => counts.set(l, (counts.get(l) ?? 0) + 1)));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([option, count]) => ({ option, count, pct: pctOf(count, completed.length) }));
};
