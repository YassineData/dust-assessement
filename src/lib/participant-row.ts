import { Profile } from '@/lib/assessment-data';
import {
  classAsProfile,
  isV2ItemScores,
  isV2Responses,
  measuredDimensions,
  rescore,
  type RoleFits,
  type RoleId,
  trainerRoleMismatch,
  V2_QUESTIONS,
  V2_NUMERIC_ID,
  type ContextAnswers,
  type OpenAnswers,
  type ResultClassId,
} from '@/lib/assessment-v2';

/**
 * A participants row (Supabase) read with the current v2 model. Pure: used by the console hook and,
 * later, by a server route (HubSpot export via the Dust API) that reads the same rows.
 */
export interface CampaignParticipant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  team: string | null;
  score: number;
  profile: Profile;
  thematicScores: Record<string, number>;
  completedAt: Date;
  startedAt: Date | null;
  status: 'not_started' | 'in_progress' | 'completed';
  responses: Record<string, string> | null;
  campaignName: string | null;
  campaignCode: string | null;
  companyName: string | null;
  /** v2: readiness fits and declared context. */
  fits: RoleFits | null;
  /** Independent, possibly overlapping roles (trainer, builder, champion, sponsor). */
  roles: RoleId[];
  classId: ResultClassId | null;
  /** Scored trainer who did not declare a training role: needs human confirmation. */
  roleMismatch: boolean;
  context: ContextAnswers;
  open: OpenAnswers;
  /** Questions from an imported form that are not part of the survey, keyed by the question as asked. */
  custom: Record<string, string>;
}

/** Campaign fields copied onto each participant. */
export interface ParticipantCampaignInfo {
  code: string | null;
  campaign_name: string | null;
  company_name: string | null;
}

/** A completed answer to the previous (v1) questionnaire: kept in the DB, left out of v2 analytics. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isLegacyCompleted = (p: any) => p.status === 'completed' && !isV2ItemScores(p.item_scores);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toCampaignParticipant = (p: any, campaignInfo?: ParticipantCampaignInfo): CampaignParticipant => {
  const stored = isV2Responses(p.responses) ? p.responses : null;
  // Re-scored from the answers so every participant is read with the current model.
  const scores = isV2ItemScores(p.item_scores) ? rescore(p.item_scores, stored) : null;
  const classId = scores?.classId ?? null;
  const profile: Profile = classAsProfile(classId ?? 'everyday');

  // Answers exposed with the numeric keys used by question views and exports (101…144)
  const responses: Record<string, string> | null = stored
    ? Object.fromEntries(
        V2_QUESTIONS.filter((q) => stored.answers[q.id]).map((q) => [String(V2_NUMERIC_ID(q)), stored.answers[q.id]])
      )
    : null;

  const context = stored?.context ?? {};

  return {
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    email: p.email,
    team: p.team,
    score: scores?.readiness ?? 0,
    profile,
    // Only the dimensions this person's questionnaire measured (the pre-sales diagnostic skips some).
    thematicScores: scores
      ? Object.fromEntries(
          (stored ? measuredDimensions(stored.answers, stored.dims) : (Object.keys(scores.dimensions) as (keyof typeof scores.dimensions)[])).map((id) => [id, scores.dimensions[id]])
        )
      : {},
    completedAt: new Date(p.completed_at || p.created_at),
    startedAt: p.started_at ? new Date(p.started_at) : null,
    status: p.status as 'not_started' | 'in_progress' | 'completed',
    responses,
    campaignName: campaignInfo?.campaign_name ?? null,
    campaignCode: campaignInfo?.code ?? null,
    companyName: campaignInfo?.company_name ?? null,
    fits: scores?.fits ?? null,
    roles: scores?.roles ?? [],
    classId,
    roleMismatch: classId ? trainerRoleMismatch(classId, context) : false,
    context,
    open: stored?.open ?? {},
    custom: stored?.custom ?? {},
  };
};
