import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { THEMATIC_DEFINITIONS, ThematicType } from '@/lib/assessment-data';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getScoreColorClass } from '@/lib/score-colors';
import { useLanguage } from '@/contexts/LanguageContext';

interface ThematicListProps {
  data: { thematic: ThematicType; displayName?: string; score: number; maxScore?: number }[];
}

export const ThematicList = ({ data }: ThematicListProps) => {
  const { t, language } = useLanguage();
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (thematic: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(thematic)) {
        next.delete(thematic);
      } else {
        next.add(thematic);
      }
      return next;
    });
  };

  return (
    <div className="card-elevated overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground">
          {language === 'fr' ? 'Détail des thématiques' : 'Theme Details'}
        </h3>
      </div>
      <div className="divide-y divide-border">
        <div className="flex items-center px-6 py-3 text-sm text-muted-foreground bg-muted/30">
          <span className="flex-1">{language === 'fr' ? 'Thématique ↓' : 'Theme ↓'}</span>
          <span className="w-32 text-right">Score ↓</span>
          <span className="w-8"></span>
        </div>
        {data.map(({ thematic, displayName, score, maxScore = 100 }) => {
          const isOpen = openItems.has(thematic);
          const definition = THEMATIC_DEFINITIONS[thematic];
          const colorClass = getScoreColorClass(score);
          // Use displayName if provided, otherwise translate
          const shownName = displayName || (language === 'en' ? t(`thematics.${thematic}`) : thematic);
          
          return (
            <Collapsible key={thematic} open={isOpen} onOpenChange={() => toggleItem(thematic)}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center px-6 py-4 hover:bg-muted/30 transition-colors cursor-pointer group">
                  <span className="flex-1 font-medium text-foreground text-left">{shownName}</span>
                  <span className="w-32 text-right">
                    <span className={`font-semibold ${colorClass}`}>{score}</span>
                    <span className="text-muted-foreground text-sm">/{maxScore}</span>
                  </span>
                  {isOpen ? (
                    <ChevronDown className="w-5 h-5 text-foreground ml-2 transition-transform" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground ml-2 group-hover:text-foreground transition-colors" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-6 py-4 bg-muted/20 border-t border-border/50">
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {language === 'en' ? definition?.descriptionEn : definition?.description}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                        {language === 'fr' ? 'Score élevé' : 'High Score'}
                      </p>
                      <p className="text-sm text-foreground/80">
                        {language === 'en' ? definition?.highScoreEn : definition?.highScore}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">
                        {language === 'fr' ? 'Score faible' : 'Low Score'}
                      </p>
                      <p className="text-sm text-foreground/80">
                        {language === 'en' ? definition?.lowScoreEn : definition?.lowScore}
                      </p>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};
