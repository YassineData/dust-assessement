import { useState, useEffect } from 'react';
import { fetchAllRows } from '@/lib/fetch-all';
import { supabase } from '@/integrations/supabase/client';
import { DIMENSION_IDS, isV2ItemScores } from '@/lib/assessment-v2';

export interface ClientCampaign {
  id: string;
  code: string;
  company_name: string;
  campaign_name?: string | null;
  thematicScores: Record<string, number>;
  averageScore: number;
  participantCount: number;
}

/**
 * Fetches all OTHER campaigns (excluding currentCampaignId) belonging to the same client
 * (matched by company_name, case-insensitive) and computes their thematic averages.
 */
export const useClientCampaigns = (
  companyName: string | null,
  currentCampaignId: string | null
) => {
  const [campaigns, setCampaigns] = useState<ClientCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!companyName) {
      setCampaigns([]);
      return;
    }

    const fetch = async () => {
      setIsLoading(true);
      try {
        const { data: campaignRows } = await supabase
          .from('campaigns')
          .select('id, code, company_name, campaign_name')
          .ilike('company_name', companyName.trim());

        const others = (campaignRows || []).filter((c) => c.id !== currentCampaignId);
        if (others.length === 0) {
          setCampaigns([]);
          return;
        }

        const ids = others.map((c) => c.id);
        const { data: parts } = await fetchAllRows((from, to) =>
          supabase
            .from('participants')
            .select('campaign_id, global_score, item_scores, status')
            .in('campaign_id', ids)
            .eq('status', 'completed')
            .order('id')
            .range(from, to)
        );

        const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((x, y) => x + y, 0) / xs.length) : 0);
        const result: ClientCampaign[] = others.map((c) => {
          // v2 only: answers to the previous questionnaire are not comparable
          const cScores = (parts || [])
            .filter((p) => p.campaign_id === c.id)
            .map((p) => p.item_scores as unknown)
            .filter(isV2ItemScores);
          const thematicScores: Record<string, number> = {};
          DIMENSION_IDS.forEach((id) => {
            thematicScores[id] = avg(cScores.map((s) => s.dimensions[id]));
          });
          return {
            id: c.id,
            code: c.code,
            company_name: c.company_name,
            campaign_name: (c as any).campaign_name ?? null,
            thematicScores,
            averageScore: avg(cScores.map((s) => s.readiness)),
            participantCount: cScores.length,
          };
        });

        setCampaigns(result.filter((c) => c.participantCount > 0));
      } finally {
        setIsLoading(false);
      }
    };

    fetch();
  }, [companyName, currentCampaignId]);

  return { campaigns, isLoading };
};
