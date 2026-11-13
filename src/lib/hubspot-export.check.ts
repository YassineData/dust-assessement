/**
 * Checks for the HubSpot export (no test framework in this repo): `npm run check:hubspot`.
 * scripts/check-hubspot-export.mjs bundles this file with esbuild and runs it with node.
 */
import type { CampaignParticipant } from '@/lib/participant-row';
import { CONTEXT_FIELDS, V2_AS_LEGACY_QUESTIONS, classAsProfile } from '@/lib/assessment-v2';
import { buildResponsesTable } from '@/lib/export-csv';
import { LIKERT_KEYS } from '@/lib/results-stats';
import {
  HUBSPOT_EXPORT_SCHEMA_VERSION,
  buildHubspotExport,
  buildHubspotMessage,
  dustNewConversationUrl,
  hubspotFileName,
  normalizeHubspotDomain,
  type HubspotExportCampaign,
} from '@/lib/hubspot-export';

let failures = 0;
let passes = 0;
const check = (name: string, ok: boolean, detail?: unknown) => {
  if (ok) passes++;
  else {
    failures++;
    console.error(`✗ ${name}`, detail ?? '');
  }
};

// Deterministic pseudo-random so runs are reproducible.
let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
const option = (id: string) => CONTEXT_FIELDS.find((f) => f.id === id)!.options.map((o) => o.id);

const person = (i: number, status: CampaignParticipant['status'] = 'completed'): CampaignParticipant => {
  const fits = { trainer: Math.round(rand() * 100), builder: Math.round(rand() * 100), champion: Math.round(rand() * 100), sponsor: Math.round(rand() * 100) };
  const answered = status === 'completed';
  return {
    id: `p${i}`,
    firstName: `Prénom${i}`,
    lastName: `Nom${i}`,
    email: `personne${i}@client-test.com`,
    team: i % 7 === 0 ? null : pick(['Ventes', 'Support', 'Finance']),
    score: Math.round(rand() * 100),
    profile: classAsProfile(pick(['trainer', 'champion', 'builder', 'sponsor', 'beginner', 'convince', 'everyday'])),
    thematicScores: { usage: Math.round(rand() * 100), depth: Math.round(rand() * 100), will: Math.round(rand() * 100), pain: Math.round(rand() * 100) },
    completedAt: new Date(Date.UTC(2026, 9, 10 + (i % 20), 9)),
    startedAt: null,
    status,
    // Some people skip a few statements.
    responses: answered ? Object.fromEntries(V2_AS_LEGACY_QUESTIONS.filter(() => rand() > 0.05).map((q) => [String(q.id), pick(LIKERT_KEYS)])) : null,
    campaignName: 'Déploiement',
    campaignCode: 'ABC',
    companyName: 'Client Test',
    fits: answered ? fits : null,
    roles: [],
    classId: null,
    roleMismatch: false,
    context: answered ? { tools: [pick(option('tools')), pick(option('tools'))], bandwidth: pick(option('bandwidth')), rolloutRole: [pick(option('rolloutRole'))], expectedValue: [pick(option('expectedValue'))] } : {},
    open: answered && i % 3 === 0 ? { timeSink: `Les reportings du lundi, personne ${i}.`, blocker: i % 2 ? 'Le temps.' : '' } : {},
    custom: {},
  };
};

const campaign: HubspotExportCampaign = {
  id: 'cf23b765-0000-0000-0000-000000000000',
  name: 'Déploiement Dust',
  companyName: 'Client Test — Équipe Été',
  audience: 'general',
  createdAt: '2026-10-06T06:58:30Z',
  hubspotDomain: 'https://www.Client-Test.com/',
  partnerName: null,
};
const now = new Date('2026-11-13T10:00:00Z');
const make = (n: number, pending = 0) => [...Array.from({ length: n }, (_, i) => person(i + 1)), ...Array.from({ length: pending }, (_, i) => person(n + i + 1, i % 2 ? 'in_progress' : 'not_started'))];

const participants = make(51, 10);
const exp = buildHubspotExport({ participants, campaign, platformUrl: 'https://dust-assessment.com/dashboard', lang: 'fr', now });
const json = JSON.stringify(exp);

// Format
check('schema_version is 1', exp.schema_version === 1 && HUBSPOT_EXPORT_SCHEMA_VERSION === 1);
check('generated_at is ISO', exp.generated_at === '2026-11-13T10:00:00.000Z');
check('domain normalised in meta', exp.meta.client_domain === 'client-test.com', exp.meta.client_domain);
check('type Déploiement', exp.meta.campaign_type === 'Déploiement');
check('type Diagnostic pré-sales', buildHubspotExport({ participants, campaign: { ...campaign, audience: 'presales' }, platformUrl: '', now }).meta.campaign_type === 'Diagnostic pré-sales');
check('start_date = creation date', exp.meta.start_date === '2026-10-06');
check('end_date = last completed answer', exp.meta.end_date === '2026-10-29', exp.meta.end_date);

// Respondents
check('respondents_count = completed only', exp.meta.respondents_count === 51, exp.meta.respondents_count);
check('respondents_count = responses rows', exp.responses.rows.length === exp.meta.respondents_count);
check('every row has every column', exp.responses.rows.every((r) => r.length === exp.responses.columns.length));
check('responses = CSV columns without email', JSON.stringify(exp.responses.columns) === JSON.stringify(buildResponsesTable(participants, 'fr').headers.filter((h) => h !== 'Email')));

// No email by default
check('no email column', !exp.responses.columns.includes('Email'));
check('no email address anywhere in the file', !/@client-test\.com/.test(json));
const withEmails = buildHubspotExport({ participants, campaign, platformUrl: '', now, includeEmails: true });
check('emails only when asked', withEmails.responses.columns.includes('Email') && JSON.stringify(withEmails).includes('personne1@client-test.com'));

// Top 5 champions + builders
const top = exp.summary.top_champions_builders;
const sums = participants.filter((p) => p.status === 'completed').map((p) => p.fits!.champion + p.fits!.builder).sort((a, b) => b - a);
check('top 5 has 5 people', top.length === 5);
check('top 5 sorted by champion + builder', top.every((t, i) => i === 0 || top[i - 1].fit_champion + top[i - 1].fit_builder >= t.fit_champion + t.fit_builder));
check('top 5 are the 5 best', JSON.stringify(top.map((t) => t.fit_champion + t.fit_builder)) === JSON.stringify(sums.slice(0, 5)));
check('top 5 has no email', top.every((t) => !('email' in t)));
check('top 5 with fewer people', buildHubspotExport({ participants: make(3), campaign, platformUrl: '', now }).summary.top_champions_builders.length === 3);

// Likert
const likert = exp.summary.likert;
check('26 statements', likert.length === V2_AS_LEGACY_QUESTIONS.length);
check('5 answers per statement, scale labels', likert.every((q) => Object.keys(q.distribution).join('|') === "Pas du tout d'accord|Plutôt pas d'accord|Neutre|Plutôt d'accord|Tout à fait d'accord"));
const pctSums = likert.map((q) => Object.values(q.distribution).reduce((n, x) => n + x.pct, 0));
check('distribution sums to ~100 %', pctSums.every((s) => s >= 98 && s <= 102), pctSums);
check('counts sum to answered', likert.every((q) => Object.values(q.distribution).reduce((n, x) => n + x.count, 0) === q.answered));
check('disagreement_pct from counts', likert.every((q) => {
  const d = q.distribution["Pas du tout d'accord"].count + q.distribution["Plutôt pas d'accord"].count;
  return q.disagreement_pct === Math.round((d / q.answered) * 100);
}));
const top3 = exp.summary.top_disagreement_questions;
const maxD = Math.max(...likert.map((q) => q.disagreement_pct));
check('3 most disagreed statements', top3.length === 3 && likert.find((q) => q.id === top3[0])!.disagreement_pct === maxD, top3);

// Other figures
check('profiles cover everyone', exp.summary.profiles_distribution.reduce((n, p) => n + p.count, 0) === 51);
check('teams cover everyone', Object.values(exp.summary.scores_avg.by_team).reduce((n, t) => n + (t['Répondants'] as number), 0) === 51);
check('fits by team', Object.keys(exp.summary.fits_avg.by_team).length === Object.keys(exp.summary.scores_avg.by_team).length);
check('AI tools counted', exp.summary.ai_tools.length > 0 && exp.summary.ai_tools.every((t) => t.pct === Math.round((t.count / 51) * 100)));
check('open answers: non-empty only', exp.open_answers.rows.length > 0 && exp.open_answers.rows.every((r) => r[3].length > 0 && r.length === 4));

// Message
const fileName = hubspotFileName(exp);
const message = buildHubspotMessage(exp, fileName);
check('file name', fileName === 'hubspot-export_client-test-equipe-ete_2026-11-13.json', fileName);
check('message starts with the agent', message.startsWith('@hubspot-assessment\nExporte cet assessment dans HubSpot.'));
check('message lines', message.split('\n').length === 9);
check('message has the file name', message.endsWith(`Fichier joint : ${fileName}`));
check('message: no partner = aucun', message.includes('Partenaire : aucun'));
check('message period', message.includes('Période : 2026-10-06 → dernière réponse le 2026-10-29'));
check('message: no raw answers', !message.includes('Les reportings') && !message.includes('Prénom1'));
const big = buildHubspotExport({ participants: make(2000), campaign, platformUrl: '', now });
const bigMessage = buildHubspotMessage(big);
check('message stays short whatever the size', message.length < 400 && bigMessage.length < 400 && Math.abs(bigMessage.length - message.length) < 5, [message.length, bigMessage.length]);
check('en cours when nobody answered', buildHubspotMessage(buildHubspotExport({ participants: make(0, 3), campaign, platformUrl: '', now })).includes('→ en cours'));

// Domain and Dust link
const domains: [string, string | null][] = [
  ['https://www.Tempo-One.com/', 'tempo-one.com'],
  ['HTTP://tempo-one.com/fr/contact?x=1', 'tempo-one.com'],
  ['  www.sub.client.co.uk ', 'sub.client.co.uk'],
  ['tempo one', null],
  ['', null],
  ['localhost', null],
];
domains.forEach(([raw, want]) => check(`normalizeHubspotDomain(${JSON.stringify(raw)})`, normalizeHubspotDomain(raw) === want, normalizeHubspotDomain(raw)));
check('Dust link with workspace and agent', dustNewConversationUrl('0ec9852c2f', 'kmBRw33kFz') === 'https://app.dust.tt/w/0ec9852c2f/conversation/new?agent=kmBRw33kFz');
check('Dust link without agent', dustNewConversationUrl('0ec9852c2f', '') === 'https://app.dust.tt/w/0ec9852c2f/conversation/new');
check('Dust link without workspace', dustNewConversationUrl(undefined) === 'https://app.dust.tt');

console.log(`HubSpot export: ${passes} checks passed, ${failures} failed.`);
console.log(`Sample (51 respondents, synthetic): file ${json.length.toLocaleString('fr-FR')} characters, message ${message.length} characters.`);
console.log(`Sample (2000 respondents, synthetic): file ${JSON.stringify(big).length.toLocaleString('fr-FR')} characters, message ${bigMessage.length} characters.`);
if (failures) process.exit(1);
