import { cn } from '@/lib/utils';
import { BarChart2, GitCompare, Users, Settings, Cog, ListChecks, Grid3X3 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export type TabId = 'overview' | 'compare' | 'participants' | 'detailed' | 'itemScores' | 'actions' | 'settings';

interface DashboardTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabConfig = [
  { id: 'overview' as const, labelKey: 'overview', icon: BarChart2 },
  { id: 'compare' as const, labelKey: 'compare', icon: GitCompare },
  { id: 'participants' as const, labelKey: 'participants', icon: Users },
  { id: 'itemScores' as const, labelKey: 'itemScores', icon: Grid3X3 },
  { id: 'detailed' as const, labelKey: 'detailed', icon: ListChecks },
  { id: 'actions' as const, labelKey: 'actions', icon: Settings },
  { id: 'settings' as const, labelKey: 'settings', icon: Cog },
];

export const DashboardTabs = ({ activeTab, onTabChange }: DashboardTabsProps) => {
  const { t } = useLanguage();

  return (
    <div className="border-b border-border">
      <nav className="flex gap-1">
        {tabConfig.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                isActive 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              )}
            >
              <Icon className="w-4 h-4" />
              {t(`dashboard.tabs.${tab.labelKey}`)}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
