import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DIMENSION_IDS, isV2ItemScores } from '@/lib/assessment-v2';
import { isDemoMode } from '@/demo/demo-data';

export interface GlobalBenchmark {
  /** Average score per v2 dimension id. */
  thematicScores: Record<string, number>;
  /** Average readiness index. */
  averageScore: number;
  participantCount: number;
}

/**
 * Global benchmark across ALL completed v2 participants in the database
 * (answers to the previous questionnaire are not comparable and are ignored).
 */
export const useGlobalBenchmark = () => {
  const [benchmark, setBenchmark] = useState<GlobalBenchmark>({
    thematicScores: {},
    averageScore: 0,
    participantCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        // Page through results to bypass the default 1000-row limit
        const pageSize = 1000;
        let from = 0;
        const all: { item_scores: unknown }[] = [];
        if (!isDemoMode()) {
          // Real data: scores only (no names), through global_benchmark(): participants are not publicly readable.
          const { data } = await supabase.rpc('global_benchmark' as never);
          ((data as unknown as unknown[]) ?? []).forEach((item_scores) => all.push({ item_scores }));
        }
        for (let i = 0; isDemoMode() && i < 20; i++) {
          const { data, error } = await supabase
            .from('participants')
            .select('item_scores')
            .eq('status', 'completed')
            .range(from, from + pageSize - 1);
          if (error || !data || data.length === 0) break;
          all.push(...data);
          if (data.length < pageSize) break;
          from += pageSize;
        }

        const v2 = all.map((p) => p.item_scores).filter(isV2ItemScores);
        const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
        const thematicScores: Record<string, number> = {};
        DIMENSION_IDS.forEach((id) => {
          thematicScores[id] = avg(v2.map((s) => s.dimensions[id]).filter((n) => typeof n === 'number'));
        });

        setBenchmark({
          thematicScores,
          averageScore: avg(v2.map((s) => s.readiness)),
          participantCount: v2.length,
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  return { benchmark, isLoading };
};
