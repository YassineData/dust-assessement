import { useEffect, useState } from 'react';
import { fetchAllRows } from '@/lib/fetch-all';
import { supabase } from '@/integrations/supabase/client';
import { DIMENSION_IDS, isV2ItemScores, isV2Responses, measuredDimensions, rescore, type RoleId } from '@/lib/assessment-v2';
import { resolveWaves, toWorkflows, type Wave, type Workflow } from '@/lib/waves';

export interface TimelinePoint {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  audience: string | null;
  wave: Wave;
  /** True when the wave comes from the campaign itself, false when inferred from the order. */
  waveSet: boolean;
  respondents: number;
  readiness: number | null;
  /** Average per dimension, only for dimensions this campaign's questionnaire measured. */
  dimensions: Partial<Record<string, number>>;
  roles: Record<RoleId, number>;
  /** Workflows agreed at the kickoff, as recorded on this campaign (null when never set). */
  workflows: Workflow[] | null;
}

type CampaignRow = {
  id: string;
  code: string;
  company_name: string;
  campaign_name?: string | null;
  created_at: string;
  audience?: string | null;
  wave?: string | null;
  workflows?: unknown;
};
type ResultRow = { campaign_id: string; item_scores: unknown; responses: unknown };
/** Row of get_client_timeline (supabase/007): scores and statements only. */
type ClientRow = CampaignRow & { results: { item_scores: unknown; answers?: unknown; dims?: unknown }[] };

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

const buildPoints = (rows: CampaignRow[], parts: ResultRow[]): TimelinePoint[] => {
  const waves = resolveWaves(rows);
  return rows.map((c, i) => {
    const scored = parts
      .filter((p) => p.campaign_id === c.id && isV2ItemScores(p.item_scores))
      .map((p) => {
        const responses = isV2Responses(p.responses) ? p.responses : null;
        const scores = rescore(p.item_scores as never, responses);
        const measured = new Set<string>(responses ? measuredDimensions(responses.answers, responses.dims) : DIMENSION_IDS);
        return { scores, measured };
      });
    const dimensions: Partial<Record<string, number>> = {};
    DIMENSION_IDS.forEach((d) => {
      const v = avg(scored.filter((s) => s.measured.has(d)).map((s) => s.scores.dimensions[d]));
      if (v !== null) dimensions[d] = v;
    });
    const roles = { trainer: 0, champion: 0, builder: 0, sponsor: 0 } as Record<RoleId, number>;
    scored.forEach((s) => (s.scores.roles || []).forEach((r) => (roles[r] += 1)));
    return {
      id: c.id,
      code: c.code,
      name: c.campaign_name || c.company_name,
      createdAt: c.created_at,
      audience: c.audience ?? null,
      wave: waves[i],
      waveSet: !!c.wave,
      respondents: scored.length,
      readiness: avg(scored.map((s) => s.scores.readiness)),
      dimensions,
      roles,
      workflows: toWorkflows(c.workflows),
    };
  });
};

/**
 * Every campaign of one client (matched by company name), oldest first, with its results: the client's follow-up.
 * Admins read the tables; a client (private results link) goes through get_client_timeline, which only returns scores.
 */
export const useClientTimeline = (companyName: string | null, refreshKey = 0, asClient = false) => {
  const [points, setPoints] = useState<TimelinePoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  /** False until supabase/007 has been run: waves are then inferred and cannot be saved. */
  const [waveColumn, setWaveColumn] = useState(true);

  useEffect(() => {
    if (!companyName) {
      setPoints([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        if (asClient) {
          const { data, error } = await supabase.rpc('get_client_timeline' as never);
          const rows = error || !Array.isArray(data) ? [] : (data as unknown as ClientRow[]);
          const parts = rows.flatMap((c) =>
            (c.results || []).map((r) => ({
              campaign_id: c.id,
              item_scores: r.item_scores,
              responses: r.answers ? { version: 2, answers: r.answers, dims: r.dims ?? undefined, context: {}, open: {} } : null,
            }))
          );
          if (!cancelled) {
            setPoints(buildPoints([...rows].sort((a, b) => a.created_at.localeCompare(b.created_at)), parts));
            setWaveColumn(!error);
          }
          return;
        }

        const base = 'id, code, company_name, campaign_name, created_at, audience';
        let res = await supabase.from('campaigns').select(`${base}, wave, workflows`).ilike('company_name', companyName.trim());
        let hasWave = true;
        if (res.error) {
          // Columns not created yet (supabase/007): fall back to the order of the campaigns.
          hasWave = false;
          res = await supabase.from('campaigns').select(base).ilike('company_name', companyName.trim());
        }
        const rows = ((res.data as unknown as CampaignRow[]) || []).sort((a, b) => a.created_at.localeCompare(b.created_at));
        if (!rows.length) {
          if (!cancelled) {
            setPoints([]);
            setWaveColumn(hasWave);
          }
          return;
        }

        const { data: parts } = await fetchAllRows((from, to) =>
          supabase
            .from('participants')
            .select('campaign_id, item_scores, responses, status')
            .in('campaign_id', rows.map((r) => r.id))
            .eq('status', 'completed')
            .order('id')
            .range(from, to)
        );

        if (!cancelled) {
          setPoints(buildPoints(rows, (parts as ResultRow[]) || []));
          setWaveColumn(hasWave);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyName, refreshKey, asClient]);

  /** Local update after saving a campaign's workflows, without reloading every result. */
  const patchWorkflows = (campaignId: string, workflows: Workflow[]) =>
    setPoints((prev) => prev.map((p) => (p.id === campaignId ? { ...p, workflows } : p)));

  return { points, isLoading, waveColumn, patchWorkflows };
};
