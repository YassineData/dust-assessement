import { useState, useEffect } from 'react';
import { fetchAllRows } from '@/lib/fetch-all';
import { supabase } from '@/integrations/supabase/client';
import { type AssessmentType } from '@/lib/assessment-data';
import { isLegacyCompleted, toCampaignParticipant, type CampaignParticipant } from '@/lib/participant-row';
import { isGlobalCampaignId, GLOBAL_CAMPAIGN_PREFIX } from '@/lib/global-campaign';

export type { CampaignParticipant } from '@/lib/participant-row';

export const useCampaignParticipants = (campaignId: string | null, refreshKey: number = 0) => {
  const [participants, setParticipants] = useState<CampaignParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Completed answers to the previous (v1) questionnaire: kept in the DB, left out of v2 analytics.
  const [legacyCount, setLegacyCount] = useState(0);

  useEffect(() => {
    if (!campaignId) {
      setParticipants([]);
      setIsLoading(false);
      return;
    }

    const fetchParticipants = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Determine if we're in "global" (multi-campaign) mode for a client
        const isGlobal = isGlobalCampaignId(campaignId);
        const companySlug = isGlobal ? campaignId.slice(GLOBAL_CAMPAIGN_PREFIX.length) : null;

        // Resolve target campaign ids and a representative assessment_type
        let targetCampaignIds: string[] = [];
        let campaignType: AssessmentType = 'sales';

        if (isGlobal && companySlug) {
          const { data: rows } = await supabase
            .from('campaigns')
            .select('id, assessment_type, company_name, created_at')
            .order('created_at', { ascending: false });
          const matches = (rows || []).filter(
            (r: any) => (r.company_name || '').trim().toLowerCase() === companySlug
          );
          targetCampaignIds = matches.map((r: any) => r.id);
          campaignType = ((matches[0] as any)?.assessment_type as AssessmentType) || 'sales';
        } else {
          const { data: campaignRow } = await supabase
            .from('campaigns')
            .select('assessment_type')
            .eq('id', campaignId)
            .maybeSingle();
          campaignType = (campaignRow?.assessment_type as AssessmentType) || 'sales';
          targetCampaignIds = [campaignId];
        }

        if (targetCampaignIds.length === 0) {
          setParticipants([]);
          return;
        }

        const [{ data, error: queryError }, { data: adminMembers }, { data: campaignRows }] = await Promise.all([
          fetchAllRows((from, to) =>
            supabase
              .from('participants')
              .select('*')
              .in('campaign_id', targetCampaignIds)
              .order('completed_at', { ascending: false })
              .order('id')
              .range(from, to)
          ),
          supabase
            .from('campaign_members')
            .select('email, role')
            .in('campaign_id', targetCampaignIds)
            .eq('role', 'admin'),
          supabase
            .from('campaigns')
            .select('id, code, campaign_name, company_name')
            .in('id', targetCampaignIds),
        ]);

        if (queryError) {
          console.error('Error fetching participants:', queryError);
          setError('Erreur lors du chargement des participants');
          return;
        }

        const adminEmails = new Set(
          (adminMembers || []).map((m: any) => (m.email || '').toLowerCase())
        );
        const filteredData = (data || []).filter(
          (p: any) => !adminEmails.has((p.email || '').toLowerCase())
        );

        const campaignsById = new Map<string, { code: string | null; campaign_name: string | null; company_name: string | null }>();
        (campaignRows || []).forEach((c: any) => {
          campaignsById.set(c.id, { code: c.code, campaign_name: c.campaign_name, company_name: c.company_name });
        });



        // v2 only: a completed participant whose scores are not v2 answered the previous questionnaire.
        setLegacyCount(filteredData.filter(isLegacyCompleted).length);

        const transformedParticipants: CampaignParticipant[] = filteredData
          .filter((p: any) => !isLegacyCompleted(p))
          .map((p: any) => toCampaignParticipant(p, p.campaign_id ? campaignsById.get(p.campaign_id) : undefined));

        setParticipants(transformedParticipants);
      } catch (err) {
        console.error('Error:', err);
        setError('An error occurred / Une erreur est survenue');
      } finally {
        setIsLoading(false);
      }
    };

    fetchParticipants();

    // Subscribe to real-time updates
    const isGlobalSub = isGlobalCampaignId(campaignId);
    const channel = supabase
      .channel(`campaign-participants-${campaignId}`)
      .on(
        'postgres_changes',
        isGlobalSub
          ? { event: '*', schema: 'public', table: 'participants' }
          : { event: '*', schema: 'public', table: 'participants', filter: `campaign_id=eq.${campaignId}` },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, refreshKey]);

  return { participants, isLoading, error, legacyCount };
};
