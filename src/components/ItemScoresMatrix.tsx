import { useMemo, useState } from 'react';
import { Download, Search, Info, Rows3, Rows4, Sigma, ChevronLeft, ChevronRight, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';
import { THEMATICS } from '@/lib/assessment-data';
import { useAssessmentType } from '@/hooks/useAssessmentType';
import { CampaignParticipant } from '@/hooks/useCampaignParticipants';
import { useLanguage } from '@/contexts/LanguageContext';
import { exportItemScoresCSV } from '@/lib/export-csv';
import { Button } from '@/components/ui/button';
import { getScoreTier, TIER_LABELS, type ScoreTier } from '@/lib/score-colors';
import { Input } from '@/components/ui/input';
import { initials } from '@/lib/profile-style';
import { dimensionLabel, dimensionShort, READINESS_DIMENSION_IDS } from '@/lib/assessment-v2';
import { cn } from '@/lib/utils';

interface ItemScoresMatrixProps {
  participants: CampaignParticipant[];
  companyName?: string;
  onSelectParticipant?: (id: string) => void;
}

// Individual scores use the shared thresholds (≥80 green · 60–79 amber · <60 red).
export const ItemScoresMatrix = ({ participants, companyName, onSelectParticipant }: ItemScoresMatrixProps) => {
  const [query, setQuery] = useState('');
  const [dense, setDense] = useState(false);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(12);
  const { t, language } = useLanguage();
  const { thematics: activeThematics } = useAssessmentType();

  const completedParticipants = useMemo(() => {
    return participants.filter(p => p.status === 'completed');
  }, [participants]);

  // Calculate thematic scores per participant (on 100 scale)
  const participantData = useMemo(() => {
    return completedParticipants.map(participant => {
      const thematicScores: Record<string, number> = {};
      
      activeThematics.forEach(thematic => {
        const score100 = participant.thematicScores?.[thematic] ?? 50;
        thematicScores[thematic] = Math.round(score100);
      });

      // Use the participant's global normalized score (already computed in hook)
      // This is the real assessment score, not a recalculated average
      const globalScore = participant.score;

      return {
        id: participant.id,
        name: `${participant.firstName.charAt(0)}.${participant.lastName.toUpperCase()}`,
        fullName: `${participant.firstName} ${participant.lastName}`,
        initials: initials(participant.firstName, participant.lastName),
        thematicScores,
        globalScore,
      };
    });
  }, [completedParticipants, activeThematics]);

  // Sort participants by global score (higher = better)
  const sortedParticipants = useMemo(() => {
    return [...participantData].sort((a, b) => b.globalScore - a.globalScore);
  }, [participantData]);

  // Calculate averages per thematic
  const thematicAverages = useMemo(() => {
    const averages: Record<string, number> = {};
    
    activeThematics.forEach(thematic => {
      const scores = participantData.map(p => p.thematicScores[thematic]);
      const avg = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 50;
      averages[thematic] = avg;
    });

    return averages;
  }, [participantData, activeThematics]);

  // Calculate global average from participants' scores
  const globalAverage = useMemo(() => {
    if (completedParticipants.length === 0) return 50;
    const total = completedParticipants.reduce((sum, p) => sum + p.score, 0);
    return Math.round(total / completedParticipants.length);
  }, [completedParticipants]);

  // Translate thematic names
  const lang = language === 'en' ? 'en' : 'fr';
  const translateThematic = (thematic: string): string => dimensionLabel(thematic, lang);
  const getShortThematicName = (thematic: string): string => dimensionShort(thematic, lang);
  const isOpportunity = (thematic: string) => !(READINESS_DIMENSION_IDS as string[]).includes(thematic);

  if (completedParticipants.length === 0) {
    return (
      <div className="card-elevated p-8 text-center">
        <p className="text-[13px] text-muted-foreground">
          {t('detailedScores.noParticipants')}
        </p>
      </div>
    );
  }

  const fr = language !== 'en';
  const q = query.trim().toLowerCase();
  const visible = sortedParticipants.filter(p => !q || p.fullName.toLowerCase().includes(q));
  const pageCount = Math.max(1, Math.ceil(visible.length / perPage));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = visible.slice(safePage * perPage, safePage * perPage + perPage);

  // Insight cards (display only): lowest / highest theme average and score spread
  const themeAvgs = activeThematics.filter(th => !isOpportunity(th)).map(th => ({ th, avg: thematicAverages[th] }));
  const lowest = [...themeAvgs].sort((a, b) => a.avg - b.avg)[0];
  const highest = [...themeAvgs].sort((a, b) => b.avg - a.avg)[0];
  const globals = sortedParticipants.map(p => p.globalScore);
  const spread = globals.length ? Math.max(...globals) - Math.min(...globals) : 0;
  const cellH = dense ? 'h-7' : 'h-9';

  const tierLegend: ScoreTier[] = ['top', 'emerging', 'critical'];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-card px-3 py-1.5 text-[12px] text-muted-foreground shadow-sm ring-1 ring-border">
          {fr ? 'Terminés' : 'Completed'} : <span className="font-semibold tabular-nums text-foreground">{completedParticipants.length} / {participants.length}</span>
          <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-ok align-middle" />
        </span>
        <span className="rounded-md bg-card px-3 py-1.5 text-[12px] text-muted-foreground shadow-sm ring-1 ring-border">
          {fr ? 'Moyenne cohorte' : 'Cohort mean'} : <span className="font-semibold tabular-nums text-brand-ink">{globalAverage}</span>
        </span>
      </div>

      <section className="card-elevated space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
              placeholder={fr ? 'Rechercher un répondant…' : 'Search respondent…'}
              className="border-transparent bg-lav-50 pl-9"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="inline-flex rounded-md bg-lav-50 p-0.5 ring-1 ring-border" role="radiogroup" aria-label={fr ? 'Densité' : 'Density'}>
              {[
                { v: true, label: fr ? 'Compact' : 'Compact', icon: Rows4 },
                { v: false, label: fr ? 'Confortable' : 'Comfortable', icon: Rows3 },
              ].map(({ v, label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={dense === v}
                  onClick={() => setDense(v)}
                  className={cn(
                    'flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-[12px] font-medium transition-colors duration-150',
                    dense === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <Button
              onClick={() => exportItemScoresCSV(participants, companyName || 'campaign', language)}
              variant="outline"
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              {language === 'en' ? 'Export CSV' : 'Exporter CSV'}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><Info className="h-3.5 w-3.5" />{fr ? 'Paliers :' : 'Tiers:'}</span>
          {tierLegend.map(tier => (
            <span key={tier} className="flex items-center gap-1.5">
              <span className={cn('h-3 w-3 rounded-[3px]', `tier-${tier}`)} />
              {fr ? TIER_LABELS[tier].fr : TIER_LABELS[tier].en}
              <span className="mono text-outline">({TIER_LABELS[tier].range})</span>
            </span>
          ))}
          <span className="mono ml-auto hidden text-[11px] text-outline md:inline">{fr ? 'Scores normalisés sur 100' : 'Scores normalized to 100'}</span>
        </div>
      </section>

      <section className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] tabular-nums">
            <thead>
              <tr className="bg-lav-50">
                <th className="sticky left-0 z-10 min-w-[200px] bg-lav-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                  {fr ? 'Participant' : 'Participant'}
                </th>
                <th className="min-w-[72px] px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.05em] text-brand-ink">
                  {fr ? 'Indice' : 'Index'}
                </th>
                {activeThematics.map(thematic => (
                  <th
                    key={thematic}
                    className={cn("min-w-[72px] px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground", isOpportunity(thematic) && "bg-paper", thematic === "pain" && "border-l border-border")}
                    title={translateThematic(thematic)}
                  >
                    {getShortThematicName(thematic)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((participant) => (
                <tr
                  key={participant.id}
                  className={cn('group border-t border-border transition-colors duration-150 hover:bg-paper', onSelectParticipant && 'cursor-pointer')}
                  onClick={() => onSelectParticipant?.(participant.id)}
                >
                  <td className={cn('sticky left-0 z-10 bg-card px-4 group-hover:bg-paper', dense ? 'py-1.5' : 'py-2.5')}>
                    <div className="flex items-center gap-2.5">
                      <span className={cn('flex shrink-0 items-center justify-center rounded-full bg-lav-100 text-[11px] font-semibold text-foreground/80', dense ? 'h-6 w-6' : 'h-8 w-8')}>
                        {participant.initials}
                      </span>
                      <span className="max-w-[180px] truncate font-semibold text-foreground">{participant.fullName}</span>
                    </div>
                  </td>
                  <td className="px-2 text-center">
                    <span className={cn('inline-flex w-12 items-center justify-center rounded-[4px] font-semibold', cellH, `tier-${getScoreTier(participant.globalScore)}`)}>
                      {participant.globalScore}
                    </span>
                  </td>
                  {activeThematics.map(thematic => {
                    const score = participant.thematicScores[thematic];
                    return (
                      <td key={thematic} className={cn('px-2 text-center', thematic === 'pain' && 'border-l border-border')}>
                        <span className={cn('inline-flex w-12 items-center justify-center rounded-[4px] font-medium', cellH, `tier-${getScoreTier(score)}`)}>
                          {score}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Team average (cohort) */}
              <tr className="border-t border-border bg-lav-50">
                <td className="sticky left-0 z-10 bg-lav-50 px-4 py-3 font-semibold text-foreground">
                  <span className="flex items-center gap-2">
                    <Sigma className="h-4 w-4 text-brand-ink" />
                    {language === 'en' ? 'Team Average' : 'Moyenne équipe'}
                    <span className="mono text-[11px] font-normal text-outline">(N={completedParticipants.length})</span>
                  </span>
                </td>
                <td className="px-2 py-2 text-center">
                  <span className="block text-[15px] font-semibold text-foreground">{globalAverage}</span>
                  <span className="text-[10px] text-outline">{fr ? 'Cohorte' : 'Cohort'}</span>
                </td>
                {activeThematics.map(thematic => {
                  const avg = thematicAverages[thematic];
                  const tier = getScoreTier(avg);
                  return (
                    <td key={thematic} className={cn('px-2 py-2 text-center', thematic === 'pain' && 'border-l border-border')}>
                      <span className="block text-[15px] font-semibold text-foreground">{avg}</span>
                      <span className={cn('text-[10px]', tier === 'critical' ? 'font-semibold text-risk-ink' : 'text-outline')}>
                        {fr ? TIER_LABELS[tier].fr : TIER_LABELS[tier].en}
                      </span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-[12px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              {fr ? 'Affichage' : 'Showing'}{' '}
              <span className="tabular-nums">{visible.length === 0 ? 0 : safePage * perPage + 1}–{Math.min(visible.length, (safePage + 1) * perPage)}</span>{' '}
              {fr ? 'sur' : 'of'} <span className="tabular-nums">{visible.length}</span>
            </span>
            <label className="flex items-center gap-1.5">
              {fr ? 'Par page' : 'Per page'}
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(0); }}
                className="h-7 rounded-md border border-border bg-card px-1.5 text-[12px] text-foreground"
              >
                {[12, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} aria-label={fr ? 'Page précédente' : 'Previous page'}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: pageCount }, (_, i) => i).slice(0, 7).map(i => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                className={cn('h-7 min-w-7 rounded-md px-2 text-[12px] font-medium tabular-nums', i === safePage ? 'bg-brand-strong text-white' : 'text-foreground hover:bg-lav-50')}
              >
                {i + 1}
              </button>
            ))}
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)} aria-label={fr ? 'Page suivante' : 'Next page'}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          {
            tone: 'text-risk-ink',
            icon: AlertTriangle,
            eyebrow: fr ? 'Angle mort' : 'Blind spot',
            title: `${lowest?.avg ?? 0} · ${lowest ? translateThematic(lowest.th) : ''}`,
            body: fr ? 'Thématique la plus faible de la cohorte.' : 'Weakest theme across the cohort.',
          },
          {
            tone: 'text-ok-ink',
            icon: TrendingUp,
            eyebrow: fr ? 'Point fort' : 'Strength',
            title: `${highest?.avg ?? 0} · ${highest ? translateThematic(highest.th) : ''}`,
            body: fr ? 'Thématique la plus élevée de la cohorte.' : 'Strongest theme across the cohort.',
          },
          {
            tone: 'text-note-ink',
            icon: BarChart3,
            eyebrow: fr ? 'Écart de niveau' : 'Skill spread',
            title: fr ? `${spread} pts d'écart` : `${spread} pts spread`,
            body: fr ? 'Entre le score global le plus haut et le plus bas.' : 'Between the highest and lowest overall score.',
          },
        ].map(card => (
          <div key={card.eyebrow} className="card-elevated p-4">
            <div className="flex items-center justify-between">
              <p className={cn('text-[11px] font-semibold uppercase tracking-[0.06em]', card.tone)}>{card.eyebrow}</p>
              <card.icon className={cn('h-4 w-4', card.tone)} />
            </div>
            <p className="mt-1.5 text-[17px] font-semibold tracking-tight text-foreground">{card.title}</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
