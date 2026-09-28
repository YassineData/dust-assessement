import { useState, useMemo } from 'react';
import { ChevronDown, AlertTriangle, TrendingUp, CheckCircle, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDimension } from '@/lib/assessment-v2';
import { cn } from '@/lib/utils';

interface DimensionItem {
  id: string;
  name: string;
  score: number;
  benchmark?: number;
}

interface ThematicCardsProps {
  data: DimensionItem[];
}

type Tone = 'red' | 'amber' | 'green';

// Spec v2 colour code: 0–49 blocker · 50–69 fragile · 70–100 strength
const CATEGORIES: { id: 'blocker' | 'fragile' | 'strength'; icon: LucideIcon; tone: Tone; label: { fr: string; en: string }; description: { fr: string; en: string } }[] = [
  {
    id: 'blocker',
    icon: AlertTriangle,
    tone: 'red',
    label: { fr: 'Bloquant', en: 'Blocker' },
    description: { fr: "À traiter avant l'étape suivante du déploiement", en: 'Must be addressed before the next stage of the rollout' },
  },
  {
    id: 'fragile',
    icon: TrendingUp,
    tone: 'amber',
    label: { fr: 'Fragile', en: 'Fragile' },
    description: { fr: 'Exploitable mais fragile, à mentionner au kickoff', en: 'Workable but fragile, worth one line in the kickoff' },
  },
  {
    id: 'strength',
    icon: CheckCircle,
    tone: 'green',
    label: { fr: 'Point fort', en: 'Strength' },
    description: { fr: 'Rien à corriger ici', en: 'Nothing to fix here' },
  },
];

const categoryFor = (score: number) => (score < 50 ? 'blocker' : score < 70 ? 'fragile' : 'strength');

const TONE_TEXT: Record<Tone, string> = { red: 'text-risk-ink', amber: 'text-warn-ink', green: 'text-ok-ink' };
const TONE_BAR: Record<Tone, string> = { red: 'bg-risk', amber: 'bg-warn', green: 'bg-ok' };

export const ThematicCards = ({ data }: ThematicCardsProps) => {
  const { language } = useLanguage();
  const fr = language !== 'en';
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['blocker']));

  const grouped = useMemo(() => {
    const g: Record<string, DimensionItem[]> = { blocker: [], fragile: [], strength: [] };
    data.forEach((d) => g[categoryFor(d.score)].push(d));
    g.blocker.sort((a, b) => a.score - b.score);
    g.fragile.sort((a, b) => a.score - b.score);
    g.strength.sort((a, b) => b.score - a.score);
    return g;
  }, [data]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="card-elevated p-5">
      <div className="mb-3">
        <h3 className="card-title">{fr ? 'Analyse par priorité' : 'Priority Analysis'}</h3>
        <p className="text-[12px] text-muted-foreground">
          {fr
            ? 'Dimensions de l’indice regroupées par niveau, avec l’action à mener si le score est bas'
            : 'Index dimensions grouped by level, with what to do when the score is low'}
        </p>
      </div>
      <div className="space-y-4">
        {CATEGORIES.map((cat) => {
          const items = grouped[cat.id];
          if (!items.length) return null;
          const Icon = cat.icon;
          const isExpanded = expanded.has(cat.id);
          return (
            <div key={cat.id} className="space-y-2">
              <button
                type="button"
                onClick={() => toggle(cat.id)}
                aria-expanded={isExpanded}
                className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition-colors duration-150 hover:bg-paper"
              >
                <Icon className={cn('h-4 w-4', TONE_TEXT[cat.tone])} />
                <span className="text-[13px] font-semibold text-foreground">{fr ? cat.label.fr : cat.label.en}</span>
                <span className="text-[12px] text-muted-foreground">
                  {fr ? cat.description.fr : cat.description.en} · {items.length}
                </span>
                <span className="ml-auto flex items-center gap-1 text-[12px] text-muted-foreground">
                  {fr ? (isExpanded ? 'Réduire' : 'Détails') : isExpanded ? 'Collapse' : 'Details'}
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-150', isExpanded && 'rotate-180')} />
                </span>
              </button>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => {
                  const def = getDimension(item.id);
                  const delta = item.benchmark !== undefined ? item.score - item.benchmark : undefined;
                  return (
                    <div key={item.id} className="rounded-md border border-border bg-card">
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{item.name}</p>
                        <div className="flex items-baseline gap-2 tabular-nums">
                          {delta !== undefined && (
                            <span className={cn('text-[11px] font-medium', delta > 0 ? 'text-ok-ink' : delta < 0 ? 'text-risk-ink' : 'text-muted-foreground')}>
                              {delta > 0 ? '+' : delta === 0 ? '±' : ''}{delta}
                            </span>
                          )}
                          <span className={cn('text-[15px] font-semibold', TONE_TEXT[cat.tone])}>{item.score}</span>
                          <span className="text-[11px] text-muted-foreground">/100</span>
                        </div>
                      </div>
                      <div className="mx-3 mb-2.5 h-1 overflow-hidden rounded-full bg-muted">
                        <div className={cn('h-full rounded-full', TONE_BAR[cat.tone])} style={{ width: `${Math.min(100, item.score)}%` }} />
                      </div>
                      {isExpanded && def && (
                        <div className="space-y-2 border-t border-border px-3 py-3">
                          <p className="text-[13px] leading-relaxed text-muted-foreground">{fr ? def.measures.fr : def.measures.en}</p>
                          <div className="border-l-2 border-brand pl-2.5">
                            <p className="eyebrow mb-0.5 text-brand-ink">{fr ? 'Si le score est bas' : 'If the score is low'}</p>
                            <p className="text-[13px] text-foreground">{fr ? def.lowAction.fr : def.lowAction.en}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
