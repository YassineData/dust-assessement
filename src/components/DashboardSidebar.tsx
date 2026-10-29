import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutGrid,
  Users,
  MessageSquareQuote,
  BarChart3,
  ListChecks,
  GitCompare,
  TrendingUp,
  ListTodo,
  Send,
  ClipboardList,
  SlidersHorizontal,
  KeyRound,
  Activity,
  LogIn,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  Building2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DustMark } from '@/components/DustMark';

export type TabId =
  | 'overview'
  | 'participants'
  | 'openAnswers'
  | 'itemScores'
  | 'detailed'
  | 'compare'
  | 'progress'
  | 'actions'
  | 'share'
  | 'campaignSettings'
  | 'access'
  | 'dataHealth'
  | 'signIns';

interface NavItem {
  id: TabId | 'takeAssessment';
  fr: string;
  en: string;
  icon: LucideIcon;
}

interface NavGroup {
  fr: string;
  en: string;
  items: NavItem[];
}

// Ordered along the real journey: read results → analyse → run the campaign → administer.
const NAV_GROUPS: NavGroup[] = [
  {
    fr: 'Résultats',
    en: 'Results',
    items: [
      { id: 'overview', fr: "Vue d'ensemble", en: 'Overview', icon: LayoutGrid },
      { id: 'participants', fr: 'Participants', en: 'Participants', icon: Users },
      { id: 'openAnswers', fr: 'Réponses ouvertes', en: 'Open answers', icon: MessageSquareQuote },
      { id: 'itemScores', fr: 'Résultats détaillés', en: 'Detailed results', icon: BarChart3 },
      { id: 'detailed', fr: 'Question par question', en: 'Question by question', icon: ListChecks },
    ],
  },
  {
    fr: 'Analyse',
    en: 'Analysis',
    items: [
      { id: 'progress', fr: 'Suivi', en: 'Progress', icon: TrendingUp },
      { id: 'compare', fr: 'Comparer', en: 'Compare', icon: GitCompare },
      { id: 'actions', fr: 'Actions recommandées', en: 'Recommended actions', icon: ListTodo },
    ],
  },
  {
    fr: 'Campagne',
    en: 'Campaign',
    items: [
      { id: 'share', fr: 'Partager & inviter', en: 'Share & invite', icon: Send },
      { id: 'takeAssessment', fr: 'Passer le questionnaire', en: 'Take the assessment', icon: ClipboardList },
      { id: 'campaignSettings', fr: 'Paramètres de campagne', en: 'Campaign settings', icon: SlidersHorizontal },
    ],
  },
  {
    fr: 'Admin',
    en: 'Admin',
    items: [
      { id: 'access', fr: 'Accès & codes', en: 'Access & codes', icon: KeyRound },
      { id: 'dataHealth', fr: 'Santé des données', en: 'Data health', icon: Activity },
      { id: 'signIns', fr: 'Connexions', en: 'Sign-ins', icon: LogIn },
    ],
  },
];

/** What a client manager sees: results, analysis and sharing, never settings or admin. */
export const CLIENT_HIDDEN_TABS: TabId[] = ['campaignSettings', 'access', 'dataHealth', 'signIns'];
const CLIENT_NAV_GROUPS: NavGroup[] = NAV_GROUPS.filter((g) => g.en !== 'Admin').map((g) => ({
  ...g,
  items: g.items.filter((i) => !CLIENT_HIDDEN_TABS.includes(i.id as TabId)),
}));

export const TAB_LABELS: Record<TabId, { fr: string; en: string; group: { fr: string; en: string } }> =
  NAV_GROUPS.reduce((acc, group) => {
    group.items.forEach((item) => {
      if (item.id !== 'takeAssessment') {
        acc[item.id] = { fr: item.fr, en: item.en, group: { fr: group.fr, en: group.en } };
      }
    });
    return acc;
  }, {} as Record<TabId, { fr: string; en: string; group: { fr: string; en: string } }>);

interface DashboardSidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  /** Public respondent link for this campaign; used by "Take the assessment". */
  assessmentUrl?: string | null;
  /** Campaign switcher (admins) — rendered in the workspace block. */
  campaignSwitcher?: ReactNode;
  companyName: string;
  campaignName?: string | null;
  /** Shown as the footer status line, e.g. "10/14". */
  responses: { completed: number; total: number };
  onNewCampaign?: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  /** Client manager view: their campaign only, without the Dust team's settings and admin tools. */
  clientView?: boolean;
  /** A menu item to point at (e.g. Share & invite right after a campaign is created), with a short badge. */
  highlight?: { tab: TabId; badge: string };
}

export const DashboardSidebar = ({
  activeTab,
  onTabChange,
  assessmentUrl,
  campaignSwitcher,
  companyName,
  campaignName,
  responses,
  onNewCampaign,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onMobileClose,
  clientView = false,
  highlight,
}: DashboardSidebarProps) => {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const l = (o: { fr: string; en: string }) => (fr ? o.fr : o.en);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onMobileClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, onMobileClose]);

  const hideWhenCollapsed = collapsed ? 'lg:hidden' : '';

  const itemClass = (isActive: boolean) =>
    cn(
      'group flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
      collapsed && 'lg:justify-center lg:px-0',
      isActive
        ? 'bg-sidebar-primary font-semibold text-sidebar-primary-foreground'
        : 'font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'
    );

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-ink/40 transition-opacity duration-150 lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onMobileClose}
        aria-hidden
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-[width,transform] duration-150',
          'w-64 lg:translate-x-0',
          collapsed ? 'lg:w-14' : 'lg:w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label={fr ? 'Navigation principale' : 'Main navigation'}
      >
        {/* Brand */}
        <div className={cn('flex h-14 shrink-0 items-center gap-2 px-3', collapsed && 'lg:justify-center lg:px-0')}>
          <DustMark className="h-7 w-7 shrink-0" />
          <div className={cn('min-w-0 leading-none', hideWhenCollapsed)}>
            <p className="text-base font-semibold tracking-tight text-white">Dust</p>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/80">{clientView ? (fr ? 'Vos résultats' : 'Your results') : 'Assessment'}</p>
          </div>
          <button
            type="button"
            onClick={onMobileClose}
            className="ml-auto rounded-md p-1 text-sidebar-foreground hover:bg-sidebar-accent hover:text-white lg:hidden"
            aria-label={fr ? 'Fermer le menu' : 'Close menu'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Workspace / campaign block */}
        <div className={cn('px-3 pb-2', hideWhenCollapsed)}>
          {campaignSwitcher ?? (
            <div className="flex items-center gap-2 rounded-md bg-white/[0.06] px-2.5 py-2">
              <Building2 className="h-4 w-4 shrink-0 text-brand-soft/80" />
              <div className="min-w-0">
                <p className="text-[11px] leading-none text-sidebar-foreground/80">{fr ? 'Espace' : 'Workspace'}</p>
                <p className="mt-0.5 truncate text-[12px] font-semibold text-white">{campaignName || companyName}</p>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          {(clientView ? CLIENT_NAV_GROUPS : NAV_GROUPS).map((group) => (
            <div key={group.en} className="mt-3 first:mt-1">
              <p
                className={cn(
                  'mb-1 px-2.5 text-[11px] font-medium uppercase tracking-[0.06em] text-sidebar-foreground/70',
                  collapsed && 'lg:sr-only'
                )}
              >
                {l(group)}
              </p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const label = l(item);

                  if (item.id === 'takeAssessment') {
                    return (
                      <li key={item.id}>
                        <a
                          href={assessmentUrl ?? '/assessment'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={itemClass(false)}
                          title={collapsed ? label : undefined}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className={cn('truncate', hideWhenCollapsed)}>{label}</span>
                          <ExternalLink className={cn('ml-auto h-3 w-3 opacity-50', hideWhenCollapsed)} />
                        </a>
                      </li>
                    );
                  }

                  const isActive = activeTab === item.id;
                  const flagged = highlight?.tab === item.id && !isActive;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onTabChange(item.id as TabId);
                          onMobileClose();
                        }}
                        className={itemClass(isActive)}
                        aria-current={isActive ? 'page' : undefined}
                        title={collapsed ? label : undefined}
                      >
                        <span className="relative shrink-0">
                          <Icon className="h-4 w-4" />
                          {flagged && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-brand ring-2 ring-sidebar" aria-hidden />}
                        </span>
                        <span className={cn('truncate', hideWhenCollapsed)}>{label}</span>
                        {flagged && (
                          <span className={cn('attn-pulse ml-auto shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white', hideWhenCollapsed)}>
                            {highlight!.badge}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-2 px-3 pb-3 pt-2">
          {onNewCampaign && (
            <button
              type="button"
              onClick={() => {
                onNewCampaign();
                onMobileClose();
              }}
              className={cn(
                'flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-brand-strong text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-brand-hover',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
              )}
              title={collapsed ? (fr ? 'Nouvelle campagne' : 'New campaign') : undefined}
            >
              <PlusCircle className="h-4 w-4 shrink-0" />
              <span className={hideWhenCollapsed}>{fr ? 'Nouvelle campagne' : 'New campaign'}</span>
            </button>
          )}

          <div className={cn('flex items-center justify-between px-1 text-[11px] text-sidebar-foreground/80', hideWhenCollapsed)}>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-ok" />
              {fr ? 'Réponses' : 'Responses'}
            </span>
            <span className="mono text-[11px]">{responses.completed}/{responses.total}</span>
          </div>

          <div className="border-t border-sidebar-border pt-2">
            <button
              type="button"
              onClick={onToggleCollapsed}
              className={cn(itemClass(false), 'hidden lg:flex')}
              aria-label={collapsed ? (fr ? 'Déplier la barre latérale' : 'Expand sidebar') : (fr ? 'Replier la barre latérale' : 'Collapse sidebar')}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4 shrink-0" /> : <PanelLeftClose className="h-4 w-4 shrink-0" />}
              <span className={cn('truncate', hideWhenCollapsed)}>{fr ? 'Replier' : 'Collapse'}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
