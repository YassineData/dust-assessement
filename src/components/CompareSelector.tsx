import { useState, useMemo } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';

export type CompareType = 'participants' | 'sectors' | 'campaigns';

export interface CompareOption {
  id: string;
  label: string;
  type: CompareType;
}

export const SECTORS_FR = [
  'Mutuelle',
  'Banque',
  'Assurance / assurtech',
  'Finance / fintech',
  'Audit / comptabilité',
  'Conseil aux entreprises',
  'Arts / culture',
  'Tourisme / loisirs',
  'Services RH / recrutement',
  'Éducation / formation',
  'Santé / pharmaceutique',
  'Industrie / manufacturing',
  'Commerce / retail',
  'Technologie / SaaS',
  'Immobilier',
  'Média / communication',
];

export const SECTORS_EN = [
  'Mutual Insurance',
  'Banking',
  'Insurance / Insurtech',
  'Finance / Fintech',
  'Audit / Accounting',
  'Business Consulting',
  'Arts / Culture',
  'Tourism / Leisure',
  'HR Services / Recruitment',
  'Education / Training',
  'Healthcare / Pharmaceutical',
  'Industry / Manufacturing',
  'Commerce / Retail',
  'Technology / SaaS',
  'Real Estate',
  'Media / Communication',
];

// Colors for the comparison selections (up to 4)
export const COMPARISON_COLORS = {
  // Non-semantic series colors: green/red stay reserved for deltas and status.
  first: 'hsl(var(--ink))',
  second: 'hsl(var(--chart-7))',
  third: 'hsl(var(--chart-9))',
  fourth: 'hsl(var(--chart-8))',
  average: 'hsl(var(--brand))', // Cohort
};

export const COMPARISON_COLOR_BY_INDEX = [
  COMPARISON_COLORS.first,
  COMPARISON_COLORS.second,
  COMPARISON_COLORS.third,
  COMPARISON_COLORS.fourth,
];

export const MAX_COMPARISONS = 4;

interface CompareSelectorProps {
  participants: { id: string; firstName: string; lastName: string }[];
  clientCampaigns?: { id: string; label: string }[];
  selectedOptions: CompareOption[];
  onSelect: (options: CompareOption[]) => void;
  showAverage?: boolean;
  onToggleAverage?: (show: boolean) => void;
  averagePillLabel?: string;
}

export const CompareSelector = ({
  participants,
  clientCampaigns = [],
  selectedOptions,
  onSelect,
  showAverage = true,
  onToggleAverage,
  averagePillLabel,
}: CompareSelectorProps) => {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CompareType>('participants');
  const [searchQuery, setSearchQuery] = useState('');

  const sectors = language === 'fr' ? SECTORS_FR : SECTORS_EN;

  const filteredOptions = useMemo(() => {
    const query = searchQuery.toLowerCase();

    if (activeCategory === 'participants') {
      return participants
        .filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(query))
        .map(p => ({
          id: p.id,
          label: `${p.firstName} ${p.lastName}`,
          type: 'participants' as CompareType,
        }));
    } else if (activeCategory === 'campaigns') {
      return clientCampaigns
        .filter(c => c.label.toLowerCase().includes(query))
        .map(c => ({
          id: c.id,
          label: c.label,
          type: 'campaigns' as CompareType,
        }));
    } else {
      return sectors
        .filter(s => s.toLowerCase().includes(query))
        .map(s => ({
          id: s,
          label: s,
          type: 'sectors' as CompareType,
        }));
    }
  }, [activeCategory, searchQuery, participants, sectors, clientCampaigns]);

  const handleSelect = (option: CompareOption) => {
    const isSelected = selectedOptions.some(
      o => o.id === option.id && o.type === option.type
    );
    
    if (isSelected) {
      // Remove from selection
      onSelect(selectedOptions.filter(o => !(o.id === option.id && o.type === option.type)));
    } else {
      // Add to selection (max 4)
      if (selectedOptions.length < MAX_COMPARISONS) {
        onSelect([...selectedOptions, option]);
      } else {
        // Replace the oldest selection (shift left, append new)
        onSelect([...selectedOptions.slice(1), option]);
      }
    }
  };

  const removeOption = (optionToRemove: CompareOption) => {
    onSelect(selectedOptions.filter(o => !(o.id === optionToRemove.id && o.type === optionToRemove.type)));
  };

  const categories = [
    { id: 'participants' as CompareType, label: t('compare.participants') },
    { id: 'campaigns' as CompareType, label: t('compare.campaigns') },
    { id: 'sectors' as CompareType, label: t('compare.sectors') },
  ];

  const getSelectionIndex = (option: CompareOption): number => {
    return selectedOptions.findIndex(o => o.id === option.id && o.type === option.type);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3.5 text-[13px] font-medium shadow-sm transition-colors duration-150 hover:bg-paper",
              isOpen && "border-primary"
            )}
          >
            {t('compare.compareResults')}
            <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] max-w-[calc(100vw-2rem)] p-0 bg-card border-border" align="start">
          <div className="flex">
            {/* Categories sidebar */}
            <div className="w-[140px] border-r border-border py-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSearchQuery('');
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-[13px] transition-colors duration-150",
                    activeCategory === cat.id
                      ? "bg-brand-soft text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {cat.label}
                  {activeCategory === cat.id && (
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  )}
                </button>
              ))}
            </div>
            
            {/* Options list */}
            <div className="flex-1 py-2">
              <div className="px-3 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t('compare.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-background"
                  />
                </div>
              </div>
              <div className="px-3 pb-2">
                <p className="text-xs text-muted-foreground">
                  {language === 'fr' 
                    ? `${selectedOptions.length}/${MAX_COMPARISONS} sélectionné(s)` 
                    : `${selectedOptions.length}/${MAX_COMPARISONS} selected`}
                </p>
              </div>
              <div className="max-h-[280px] overflow-y-auto">
                {filteredOptions.map((option) => {
                  const selectionIndex = getSelectionIndex(option);
                  const isSelected = selectionIndex !== -1;
                  const colorStyle = isSelected
                    ? { backgroundColor: COMPARISON_COLOR_BY_INDEX[selectionIndex] }
                    : {};

                  return (
                    <button
                      key={`${option.type}-${option.id}`}
                      onClick={() => handleSelect(option)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-[13px] text-left transition-colors duration-150",
                        isSelected
                          ? "bg-muted/50 text-foreground"
                          : "text-foreground hover:bg-muted/50"
                      )}
                    >
                      <div 
                        className={cn(
                          "shrink-0 w-4 h-4 rounded border flex items-center justify-center",
                          isSelected ? "border-transparent" : "border-border"
                        )}
                        style={colorStyle}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="flex-1 break-words">{option.label}</span>
                    </button>
                  );
                })}
                {filteredOptions.length === 0 && (
                  <p className="px-4 py-3 text-sm text-muted-foreground text-center">
                    {t('compare.noResults')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Average campaign pill (toggleable) */}
      {onToggleAverage && (
        showAverage ? (
          <div
            className="flex h-7 items-center gap-2 rounded-sm border border-border bg-card px-2.5 text-[12px] font-medium text-foreground"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: COMPARISON_COLORS.average }}
            />
            {averagePillLabel || (language === 'fr' ? 'Moyenne de la campagne' : 'Campaign average')}
            <button
              onClick={() => onToggleAverage(false)}
              className="ml-1 hover:opacity-70 rounded-full p-0.5"
            >
              <span className="sr-only">{t('compare.remove')}</span>
              ×
            </button>
          </div>
        ) : (
          <button
            onClick={() => onToggleAverage(true)}
            className="flex h-7 items-center gap-2 rounded-sm border border-dashed border-border px-2.5 text-[12px] font-medium text-muted-foreground transition-colors duration-150 hover:border-primary hover:text-foreground"
          >
            + {averagePillLabel || (language === 'fr' ? 'Moyenne de la campagne' : 'Campaign average')}
          </button>
        )
      )}

      {/* Selected item badges */}
      {selectedOptions.map((option, index) => {
        const color = COMPARISON_COLOR_BY_INDEX[index] ?? COMPARISON_COLORS.first;
        return (
          <div 
            key={`${option.type}-${option.id}`}
            className="flex h-7 items-center gap-2 rounded-sm border border-border bg-card px-2.5 text-[12px] font-medium text-foreground"
          >
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: color }}
            />
            {option.label}
            <button 
              onClick={() => removeOption(option)}
              className="ml-1 hover:opacity-70 rounded-full p-0.5"
            >
              <span className="sr-only">{t('compare.remove')}</span>
              ×
            </button>
          </div>
        );
      })}

      {selectedOptions.length > 0 && (
        <button
          onClick={() => onSelect([])}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors px-2 py-1"
        >
          {t('compare.reset')}
        </button>
      )}

    </div>
  );
};
