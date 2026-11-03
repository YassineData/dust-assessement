import type { CampaignParticipant } from '@/hooks/useCampaignParticipants';
import {
  ANSWER_TO_NUMBER,
  CONTEXT_FIELDS,
  DIMENSION_IDS,
  OPEN_FIELDS,
  V2_NUMERIC_ID,
  V2_QUESTIONS,
  contextLabels,
  dimensionLabel,
  getReadinessBand,
  type ChoiceField,
  type OpenField,
} from '@/lib/assessment-v2';
import { PRESALES_CONTEXT_FIELDS, PRESALES_FOLLOW_UPS, PRESALES_OPEN_FIELDS, PRESALES_QUESTIONS } from '@/lib/presales';
import { isPresalesCohort } from '@/components/console/OpenAnswersCard';
import { PILLARS } from '@/lib/waves';

/**
 * « Dossier diagnostic »: everything a results presentation needs, in one JSON file, read by the
 * dust-diagnostic-deck skill (it groups open answers into use cases and blockers and builds the Dust-branded deck).
 * Anonymous: no names or emails, open answers only carry the team and level of whoever wrote them.
 */

type Lang = 'fr' | 'en';
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const share = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

export const buildDiagnosticPack = (participants: CampaignParticipant[], companyName: string, campaignName: string | null, lang: Lang, audience?: string | null) => {
  const done = participants.filter((p) => p.status === 'completed');
  // Survey type: the campaign's own when known, otherwise read from the answers.
  const presalesKeys = new Set(PRESALES_QUESTIONS.map((q) => String(V2_NUMERIC_ID(V2_QUESTIONS.find((v) => v.id === q.id)!))));
  const presales =
    audience === 'presales' ||
    (audience === undefined && (isPresalesCohort(done) || (done.length > 0 && done.every((p) => Object.keys(p.responses ?? {}).every((k) => presalesKeys.has(k))))));

  const pick = (l: { fr: string; en: string }) => (lang === 'fr' ? l.fr : l.en);
  const label = (fieldId: ChoiceField['id'], p: CampaignParticipant) => contextLabels(p.context, fieldId, lang).join(', ') || null;

  // Who answered: counts per option of each « About you » field (multiple answers counted once each).
  const fields = presales ? PRESALES_CONTEXT_FIELDS : CONTEXT_FIELDS;
  const breakdown = Object.fromEntries(
    fields.map((f) => {
      const counts = new Map<string, number>();
      done.forEach((p) => contextLabels(p.context, f.id, lang).forEach((l) => counts.set(l, (counts.get(l) ?? 0) + 1)));
      return [
        f.id,
        {
          question: pick(f.label),
          multiple: !!f.multiple,
          answers: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([option, count]) => ({ option, count, pct: share(count, done.length) })),
        },
      ];
    })
  );

  // Statements: share who agree / disagree, as respondents saw them.
  const questions = presales ? PRESALES_QUESTIONS : V2_QUESTIONS;
  const statements = questions.map((q) => {
    const base = V2_QUESTIONS.find((v) => v.id === q.id)!;
    const key = String(V2_NUMERIC_ID(base));
    const vals = done.map((p) => p.responses?.[key]).filter(Boolean) as string[];
    const agree = vals.filter((v) => v === 'agree' || v === 'somewhatAgree').length;
    const disagree = vals.filter((v) => v === 'disagree' || v === 'somewhatDisagree').length;
    return {
      id: q.id,
      dimension: q.dimension,
      dimensionLabel: dimensionLabel(q.dimension, lang),
      text: pick(q.text),
      answered: vals.length,
      agreePct: share(agree, vals.length),
      disagreePct: share(disagree, vals.length),
      average: vals.length ? Math.round((vals.reduce((n, v) => n + (ANSWER_TO_NUMBER[v as keyof typeof ANSWER_TO_NUMBER] ?? 3), 0) / vals.length) * 10) / 10 : null,
    };
  });

  // Scores: only dimensions this survey measured.
  const dimensions = DIMENSION_IDS.map((d) => ({ id: d, label: dimensionLabel(d, lang), score: avg(done.map((p) => p.thematicScores[d]).filter((v): v is number => typeof v === 'number')) })).filter(
    (d) => d.score !== null
  );
  const readiness = avg(done.map((p) => p.score));
  const pillars = PILLARS.map((pl) => {
    const vals = pl.dims.map((d) => dimensions.find((x) => x.id === d)?.score).filter((v): v is number => typeof v === 'number');
    return { id: pl.id, label: pick(pl.label), score: avg(vals) };
  });

  // Open answers, worded as respondents saw them, with team and level only.
  const openFields: OpenField[] = presales ? [...PRESALES_OPEN_FIELDS, ...PRESALES_FOLLOW_UPS] : OPEN_FIELDS;
  const open = openFields
    .map((f) => ({
      id: f.id,
      question: pick(f.label),
      answers: done
        .map((p) => ({ text: (p.open?.[f.id] ?? '').trim(), team: label('team', p), level: label('level', p) }))
        .filter((a) => a.text.length > 1),
    }))
    .filter((f) => f.answers.length > 0);
  const otherNotes = done.flatMap((p) =>
    fields
      .filter((f) => p.context?.other?.[f.id]?.trim())
      .map((f) => ({ field: pick(f.label), text: p.context.other![f.id]!.trim(), team: label('team', p) }))
  );

  // People who could carry the rollout: counts only, by role and by team.
  const roleCount = (r: string) => done.filter((p) => p.roles.includes(r as never)).length;
  const roles = ['champion', 'builder', 'trainer', 'sponsor'].map((r) => ({
    id: r,
    count: roleCount(r),
    byTeam: Object.entries(
      done.filter((p) => p.roles.includes(r as never)).reduce<Record<string, number>>((m, p) => {
        const t = label('team', p) ?? (lang === 'fr' ? 'Non précisé' : 'Not given');
        m[t] = (m[t] ?? 0) + 1;
        return m;
      }, {})
    ).map(([team, count]) => ({ team, count })),
  }));

  // Readiness per team, for « where to start ».
  const teams = new Map<string, number[]>();
  done.forEach((p) => {
    const t = label('team', p);
    if (t) teams.set(t, [...(teams.get(t) ?? []), p.score]);
  });

  return {
    schema: 'dust-diagnostic-pack/1',
    generatedAt: new Date().toISOString(),
    language: lang,
    surveyType: presales ? 'presales' : 'deployment',
    company: companyName,
    campaign: campaignName,
    respondents: { completed: done.length, invited: participants.length, completionPct: share(done.length, participants.length) },
    scores: {
      readiness,
      band: readiness !== null ? pick(getReadinessBand(readiness).headline) : null,
      scale: lang === 'fr' ? 'Sur 100. 0 = pas du tout, 100 = tout à fait.' : 'Out of 100. 0 = not at all, 100 = fully.',
      dimensions,
      pillars,
      byTeam: [...teams.entries()].map(([team, xs]) => ({ team, respondents: xs.length, readiness: avg(xs) })).sort((a, b) => b.respondents - a.respondents),
    },
    breakdown,
    statements,
    open,
    otherNotes,
    roles,
  };
};

export const exportDiagnosticPack = (participants: CampaignParticipant[], companyName: string, campaignName: string | null, lang: Lang, audience?: string | null) => {
  const pack = buildDiagnosticPack(participants, companyName, campaignName, lang, audience);
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const slug = companyName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  a.href = url;
  a.download = `diagnostic-${slug || 'client'}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
