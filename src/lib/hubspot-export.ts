import type { CampaignParticipant } from '@/lib/participant-row';
import { DIMENSION_IDS, OPEN_FIELDS as SURVEY_OPEN_FIELDS, V2_AS_LEGACY_QUESTIONS, V2_QUESTION_BY_NUMERIC_ID, classLabel, dimensionLabel, type Lang } from '@/lib/assessment-v2';
import { PRESALES_ONLY_OPEN_FIELDS } from '@/lib/presales';
import { FOLLOWUP_ONLY_OPEN_FIELDS } from '@/lib/followup';
import { buildResponsesTable } from '@/lib/export-csv';
import { PUBLIC_DOMAINS } from '@/lib/email-domains';
import {
  LIKERT_LABELS,
  averageReadiness,
  completedOnly,
  contextDistribution,
  dimensionAverage,
  likertQuestionStats,
  measuredDimensionIds,
  pctOf,
  profileCounts,
  questionLabel,
} from '@/lib/results-stats';

/**
 * « Exporter vers HubSpot »: one JSON file read by the Dust agent @hubspot-assessment, which writes it as notes on the
 * client's HubSpot Company (docs/dust-agent-hubspot-assessment.md). Every figure is computed here, the agent computes none.
 * Pure (no DOM, no Supabase): a server route will later send the same export to the Dust API.
 * Change the shape → bump HUBSPOT_EXPORT_SCHEMA_VERSION and update the doc.
 */

export const HUBSPOT_EXPORT_SCHEMA_VERSION = 1;

/** Below this many completed answers the export is not offered: figures would be thin and people easy to recognise. */
export const MIN_RESPONDENTS_FOR_HUBSPOT = 5;

/** The notes are replicated to Snowflake: no email addresses unless decided otherwise. */
export const INCLUDE_EMAILS_IN_HUBSPOT_EXPORT = false;

export type HubspotCampaignType = 'Diagnostic pré-sales' | 'Déploiement';

export interface HubspotExportCampaign {
  id: string;
  name: string | null;
  companyName: string;
  /** campaigns.audience: 'presales' is the pre-sales diagnostic, everything else a deployment. */
  audience: string | null;
  /** campaigns.created_at (ISO). */
  createdAt: string;
  /** campaigns.hubspot_domain (normalised or not, it is normalised again here). */
  hubspotDomain: string | null;
  partnerName: string | null;
}

export interface HubspotExportInput {
  participants: CampaignParticipant[];
  campaign: HubspotExportCampaign;
  /** Link that opens this campaign's results (/dashboard?campaign=<id>). */
  campaignUrl: string;
  lang?: Lang;
  /** Defaults to now; fixed in tests. */
  now?: Date;
  includeEmails?: boolean;
}

type Count = { count: number; pct: number };

/** lowercase, no protocol, no www., no path or trailing slash. null when it does not look like a domain. */
export const normalizeHubspotDomain = (raw: string | null | undefined): string | null => {
  const d = (raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[/?#].*$/, '')
    .replace(/\.$/, '');
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) ? d : null;
};

/**
 * The client's likely domain, read from the respondents' work addresses: the most frequent company domain
 * (public providers, Dust and partners left out), when it covers at least half of the addresses that have one.
 */
export const suggestHubspotDomain = (emails: (string | null | undefined)[], exclude: string[] = []): string | null => {
  const counts = new Map<string, number>();
  let total = 0;
  emails.forEach((e) => {
    const d = normalizeHubspotDomain((e ?? '').split('@')[1]);
    if (!d || PUBLIC_DOMAINS.has(d) || d === 'dust.tt' || exclude.includes(d)) return;
    total++;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  });
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return best && best[1] * 2 >= total ? best[0] : null;
};

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'client';
const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

const READINESS_KEY = 'Readiness index';
const RESPONDENTS_KEY = 'Respondents';
const FIT_KEYS = ['trainer', 'builder', 'champion', 'sponsor'] as const;
const FIT_LABEL: Record<(typeof FIT_KEYS)[number], string> = { trainer: 'Fit trainer', builder: 'Fit builder', champion: 'Fit champion', sponsor: 'Fit sponsor' };
const OPEN_FIELDS = [...SURVEY_OPEN_FIELDS, ...PRESALES_ONLY_OPEN_FIELDS, ...FOLLOWUP_ONLY_OPEN_FIELDS];

export const buildHubspotExport = ({ participants, campaign, campaignUrl, lang = 'fr', now = new Date(), includeEmails = INCLUDE_EMAILS_IN_HUBSPOT_EXPORT }: HubspotExportInput) => {
  const done = completedOnly(participants);
  const fr = lang === 'fr';
  const unknownTeam = fr ? 'Non renseignée' : 'Not specified';
  const dims = measuredDimensionIds(done, DIMENSION_IDS);

  // Keys of scores, fits and profiles are fixed (English) whatever the language: the agent reads them by name.
  // French wording is in summary.labels_fr. Question labels and answers follow the campaign language.
  const scoresOf = (group: CampaignParticipant[]) => ({
    [READINESS_KEY]: averageReadiness(group),
    ...Object.fromEntries(dims.map((d) => [dimensionLabel(d, 'en'), dimensionAverage(group, d)])),
  });
  const teams = new Map<string, CampaignParticipant[]>();
  done.forEach((p) => {
    const t = p.team || unknownTeam;
    teams.set(t, [...(teams.get(t) ?? []), p]);
  });
  const teamEntries = [...teams.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  // Fits: average of people who have one (0-100, rounded).
  const fitsOf = (group: CampaignParticipant[]) =>
    Object.fromEntries(FIT_KEYS.map((k) => [FIT_LABEL[k], mean(group.filter((p) => p.fits).map((p) => p.fits![k]))]));

  // Statements: distribution with the « Réponses détaillées » labels, and the share who disagree.
  const scale = LIKERT_LABELS[lang];
  const likert = likertQuestionStats(done, V2_AS_LEGACY_QUESTIONS).map(({ question, questionNumber, percentages, totalResponses }) => {
    const disagree = percentages.filter((x) => x.value <= 2).reduce((n, x) => n + x.count, 0);
    return {
      id: `Q${questionNumber}`,
      question_key: V2_QUESTION_BY_NUMERIC_ID[question.id]?.id ?? String(question.id),
      label: questionLabel(question, lang),
      answered: totalResponses,
      distribution: Object.fromEntries(percentages.map((x) => [scale[x.value - 1], { count: x.count, pct: x.percentage } as Count])),
      disagreement_pct: pctOf(disagree, totalResponses),
    };
  });
  const topDisagreement = likert
    .filter((q) => q.answered > 0)
    .map((q, i) => ({ q, i }))
    .sort((a, b) => b.q.disagreement_pct - a.q.disagreement_pct || a.i - b.i)
    .slice(0, 3)
    .map(({ q }) => q.id);

  const dist = (fieldId: Parameters<typeof contextDistribution>[1]) => contextDistribution(done, fieldId, lang);

  // People who could carry the rollout: best champion + builder fits (readiness breaks ties). Never an email.
  const topChampionsBuilders = done
    .filter((p) => p.fits)
    .sort((a, b) => b.fits!.champion + b.fits!.builder - (a.fits!.champion + a.fits!.builder) || b.score - a.score)
    .slice(0, 5)
    .map((p) => ({ first_name: p.firstName, last_name: p.lastName, team: p.team || unknownTeam, fit_champion: p.fits!.champion, fit_builder: p.fits!.builder }));

  // Open answers: one row per non-empty answer.
  const openRows = done.flatMap((p) =>
    OPEN_FIELDS.map((f) => [f.id, fr ? f.label.fr : f.label.en, p.team || unknownTeam, (p.open?.[f.id] ?? '').trim()] as [string, string, string, string]).filter((r) => r[3].length > 0)
  );

  const table = buildResponsesTable(done, lang, { includeEmail: includeEmails, isoDates: true, singleTeamColumn: true });
  const lastAnswer = done.length ? new Date(Math.max(...done.map((p) => p.completedAt.getTime()))) : null;

  return {
    schema_version: HUBSPOT_EXPORT_SCHEMA_VERSION,
    generated_at: now.toISOString(),
    meta: {
      client_name: campaign.companyName,
      client_domain: normalizeHubspotDomain(campaign.hubspotDomain),
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      campaign_type: (campaign.audience === 'presales' ? 'Diagnostic pré-sales' : 'Déploiement') as HubspotCampaignType,
      partner: campaign.partnerName || null,
      start_date: isoDate(new Date(campaign.createdAt)),
      end_date: lastAnswer ? isoDate(lastAnswer) : null,
      /** end_date is the date of the last completed answer (campaigns have no closing date). */
      end_date_kind: 'last_answer' as const,
      respondents_count: done.length,
      language: lang,
      campaign_url: campaignUrl,
      /** Same as campaign_url (kept for schema_version 1 readers). */
      platform_url: campaignUrl,
    },
    summary: {
      scores_scale: fr ? 'Sur 100, arrondi à l’unité.' : 'Out of 100, rounded.',
      labels_fr: {
        [READINESS_KEY]: 'Indice de préparation',
        [RESPONDENTS_KEY]: 'Répondants',
        ...Object.fromEntries(dims.map((d) => [dimensionLabel(d, 'en'), dimensionLabel(d, 'fr')])),
      },
      scores_avg: {
        global: scoresOf(done),
        by_team: Object.fromEntries(teamEntries.map(([t, g]) => [t, { [RESPONDENTS_KEY]: g.length, ...scoresOf(g) }])),
      },
      fits_avg: {
        global: fitsOf(done),
        by_team: Object.fromEntries(teamEntries.map(([t, g]) => [t, { [RESPONDENTS_KEY]: g.length, ...fitsOf(g) }])),
      },
      profiles_distribution: profileCounts(done).map(({ profile, count }) => ({ profile: classLabel(profile.id, 'en'), label_fr: classLabel(profile.id, 'fr'), count, pct: pctOf(count, done.length) })),
      likert,
      top_disagreement_questions: topDisagreement,
      ai_tools: dist('tools').map(({ option, count, pct }) => ({ tool: option, count, pct })),
      time_to_train_distribution: dist('bandwidth'),
      deployment_role_distribution: dist('rolloutRole'),
      expected_outcomes_distribution: dist('expectedValue'),
      top_champions_builders: topChampionsBuilders,
    },
    open_answers: {
      columns: ['question_id', 'question_label', 'team', 'answer'],
      rows: openRows,
    },
    responses: {
      columns: table.headers,
      rows: table.rows,
    },
  };
};

export type HubspotExport = ReturnType<typeof buildHubspotExport>;

export const hubspotFileName = (exp: HubspotExport) => `hubspot-export_${slugify(exp.meta.client_name)}_${exp.generated_at.slice(0, 10)}.json`;

/** The short message pasted into Dust. Same size whatever the campaign size: the data is in the file. */
export const buildHubspotMessage = (exp: HubspotExport, fileName: string = hubspotFileName(exp)) =>
  [
    '@hubspot-assessment',
    'Exporte cet assessment dans HubSpot.',
    `Client : ${exp.meta.client_name}`,
    `Domaine : ${exp.meta.client_domain ?? ''}`,
    `Type : ${exp.meta.campaign_type}`,
    `Partenaire : ${exp.meta.partner ?? 'aucun'}`,
    `Période : ${exp.meta.start_date} → ${exp.meta.end_date ? `dernière réponse le ${exp.meta.end_date}` : 'en cours'}`,
    `Répondants : ${exp.meta.respondents_count}`,
    `Fichier joint : ${fileName}`,
  ].join('\n');

/**
 * Where the message is pasted: a new conversation in the Dust workspace, with the @hubspot-assessment agent
 * preselected when its id is set (the @mention stays in the message anyway). Dust's home page without a workspace id.
 */
export const dustNewConversationUrl = (workspaceId: string | undefined | null, agentId?: string | null) =>
  workspaceId
    ? `https://app.dust.tt/w/${encodeURIComponent(workspaceId)}/conversation/new${agentId ? `?agent=${encodeURIComponent(agentId)}` : ''}`
    : 'https://app.dust.tt';
