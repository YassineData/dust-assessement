import { Fragment, useState, type ReactNode } from 'react';
import { Menu, LogOut, RefreshCw, Copy, Check, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TopBarProps {
  company: string;
  campaignName?: string | null;
  /** Number of campaigns available to this user (shown as a pill for admins). */
  campaignsCount?: number;
  campaignCode?: string | null;
  userEmail?: string;
  roleLabel?: string;
  isDemo?: boolean;
  onOpenNav: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

/** Sober utility bar: context on the left, utilities on the right. Never competes with the page title. */
export const TopBar = ({
  company,
  campaignName,
  campaignsCount,
  campaignCode,
  userEmail,
  roleLabel,
  isDemo,
  onOpenNav,
  onOpenSettings,
  onLogout,
  onRefresh,
  isRefreshing,
}: TopBarProps) => {
  const { t, language } = useLanguage();
  const fr = language === 'fr';
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    if (!campaignCode) return;
    try {
      await navigator.clipboard.writeText(campaignCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success(fr ? 'Code copié' : 'Code copied');
    } catch {
      toast.error(fr ? 'Erreur de copie' : 'Copy failed');
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-card shadow-[0_1px_0_hsl(var(--line))]">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 lg:hidden"
          onClick={onOpenNav}
          aria-label={fr ? 'Ouvrir le menu' : 'Open menu'}
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
            <span className="truncate font-semibold text-foreground">{company}</span>
            {campaignName && (
              <>
                <span className="text-outline/60">/</span>
                <span className="hidden truncate sm:inline">{campaignName}</span>
              </>
            )}
          </p>
          {isDemo && (
            <span className="pill pill-amber shrink-0" title={fr ? 'Données fictives, rien n’est enregistré' : 'Fictional data, nothing is saved'}>
              {fr ? 'Démo · données fictives' : 'Demo · fictional data'}
            </span>
          )}
          {!!campaignsCount && campaignsCount > 1 && (
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-lav-100 px-2 py-0.5 text-[11px] font-semibold text-foreground/70 md:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              {campaignsCount} {fr ? 'campagnes' : 'campaigns'}
            </span>
          )}
          {campaignCode && (
            <button
              type="button"
              onClick={copyCode}
              className="mono hidden h-6 shrink-0 items-center gap-1.5 rounded-sm bg-paper px-2 text-[11px] font-medium text-foreground ring-1 ring-border transition-colors duration-150 hover:ring-[hsl(var(--ink)/0.2)] md:inline-flex"
              title={fr ? 'Copier le code campagne' : 'Copy campaign code'}
            >
              {campaignCode}
              {copied ? <Check className="h-3 w-3 text-ok" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <LanguageSwitcher />
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 px-2"
              onClick={onRefresh}
              disabled={isRefreshing}
              title={fr ? 'Actualiser les données' : 'Refresh data'}
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              <span className="hidden xl:inline">{fr ? 'Actualiser' : 'Refresh'}</span>
            </Button>
          )}
          {onOpenSettings && (
            <Button variant="ghost" size="sm" className="gap-1.5 px-2" onClick={onOpenSettings}>
              <Settings className="h-4 w-4" />
              <span className="hidden xl:inline">{fr ? 'Paramètres' : 'Settings'}</span>
            </Button>
          )}
          {userEmail && (
            <>
              <span className="mx-2 hidden h-5 w-px bg-border md:block" aria-hidden />
              <div className="hidden items-center gap-2 md:flex">
                <div className="text-right leading-tight">
                  <p className="max-w-[180px] truncate text-[12px] font-semibold text-foreground">{userEmail}</p>
                  {roleLabel && <p className="text-[11px] text-muted-foreground">{roleLabel}</p>}
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-strong text-[12px] font-semibold uppercase text-white">
                  {userEmail.charAt(0)}
                </span>
              </div>
            </>
          )}
          {onLogout && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onLogout}
              title={t('common.logout')}
              aria-label={t('common.logout')}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

interface PageHeaderProps {
  crumbs?: string[];
  title: string;
  status?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export const PageHeader = ({ crumbs, title, status, description, actions }: PageHeaderProps) => (
  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
    <div className="min-w-0 space-y-1">
      {crumbs && crumbs.length > 0 && (
        <p className="flex flex-wrap items-center gap-1 text-[12px] text-muted-foreground">
          {crumbs.map((c, i) => (
            <Fragment key={`${c}-${i}`}>
              {i > 0 && <span className="text-outline/50">/</span>}
              <span className={i === crumbs.length - 1 ? 'font-semibold text-foreground' : undefined}>{c}</span>
            </Fragment>
          ))}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="page-title">{title}</h1>
        {status}
      </div>
      {description && <p className="text-[13px] text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
