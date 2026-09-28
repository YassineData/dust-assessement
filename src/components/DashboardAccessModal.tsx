import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, Key, AlertCircle, Eye, EyeOff, Loader2, PlayCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { validateProfessionalEmail } from '@/lib/email-validation';
import { useLanguage } from '@/contexts/LanguageContext';
import { enterDemo } from '@/demo/demo-data';

export interface AdminCampaign {
  id: string;
  code: string;
  company_name: string;
  campaign_name?: string | null;
  creator_email: string;
  created_at: string;
}

interface DashboardAccessModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onAccessGranted: (campaignId: string, campaignData: { companyName: string; creatorEmail: string }) => void;
  onAdminAccessGranted?: (campaigns: AdminCampaign[], isSuperAdmin?: boolean) => void;
}

export const DashboardAccessModal = ({ isOpen, onClose, onAccessGranted, onAdminAccessGranted }: DashboardAccessModalProps) => {
  const { t, language } = useLanguage();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // DEV-ONLY preview login (full super-admin access). `import.meta.env.DEV` is false in
    // production builds, so this branch and its credentials are stripped from the bundle.
    if (
      import.meta.env.DEV &&
      email.toLowerCase().trim() === 'yhargane@gmail.com' &&
      code.trim() === 'admin2026' &&
      onAdminAccessGranted
    ) {
      setIsLoading(true);
      const { data, error: devErr } = await supabase
        .from('campaigns')
        .select('id, code, company_name, campaign_name, creator_email, created_at')
        .order('created_at', { ascending: false });
      setIsLoading(false);
      if (devErr) {
        setError(language === 'fr' ? 'Une erreur est survenue. Veuillez réessayer.' : 'An error occurred. Please try again.');
        return;
      }
      onAdminAccessGranted((data as AdminCampaign[]) ?? [], true);
      return;
    }

    // Validate email
    const emailValidation = validateProfessionalEmail(email);
    if (!emailValidation.valid) {
      setError(language === 'fr' ? (emailValidation.message || 'Email invalide') : 'Invalid email');
      return;
    }

    if (!code.trim()) {
      setError(language === 'fr' ? "Veuillez renseigner le nom de l'entreprise" : 'Please enter the company name');
      return;
    }

    setIsLoading(true);

    try {
      const companyName = code.trim();
      const userEmail = email.toLowerCase().trim();

      // Dust team access: @dust.tt email + team password (VITE_DUST_ADMIN_PASSWORD) typed in the
      // company-name field => access to every campaign. Disabled when the variable is not set.
      // NOTE: a VITE_ variable ships in the front-end bundle; move this check server-side before production.
      const teamPassword = (import.meta.env.VITE_DUST_ADMIN_PASSWORD as string | undefined) || '';
      const isMasterBypass =
        !!teamPassword &&
        userEmail.endsWith('@dust.tt') &&
        companyName === teamPassword;

      const baseQuery = () => supabase
        .from('campaigns')
        .select('id, code, company_name, campaign_name, creator_email, created_at')
        .order('created_at', { ascending: false });

      let campaigns: AdminCampaign[] | null = null;
      let queryError: any = null;

      if (isMasterBypass) {
        const res = await baseQuery();
        campaigns = res.data as AdminCampaign[] | null;
        queryError = res.error;
      } else {
        // 1) Try as creator (existing behavior)
        const creatorRes = await baseQuery()
          .ilike('company_name', companyName)
          .eq('creator_email', userEmail);
        queryError = creatorRes.error;
        campaigns = (creatorRes.data as AdminCampaign[] | null) ?? null;

        // 2) If nothing found as creator, look up via campaign_members (manager / admin)
        if (!queryError && (!campaigns || campaigns.length === 0)) {
          const { data: memberships, error: memberErr } = await supabase
            .from('campaign_members')
            .select('campaign_id, role')
            .ilike('email', userEmail);

          if (memberErr) {
            queryError = memberErr;
          } else if (memberships && memberships.length > 0) {
            const campaignIds = memberships.map((m: any) => m.campaign_id);
            const { data: memberCampaigns, error: cErr } = await baseQuery()
              .in('id', campaignIds)
              .ilike('company_name', companyName);

            if (cErr) {
              queryError = cErr;
            } else if (memberCampaigns && memberCampaigns.length > 0) {
              const roleByCampaign = new Map<string, string>(
                memberships.map((m: any) => [m.campaign_id, m.role])
              );
              // SECURITY: Both admin and manager roles are scoped strictly to the
              // campaigns they are explicitly tagged on. Admin grants edit rights
              // on those campaigns only — NOT access to other clients/campaigns.
              campaigns = (memberCampaigns as AdminCampaign[]).filter((c) => {
                const r = roleByCampaign.get(c.id);
                return r === 'admin' || r === 'manager' || r === 'consultant';
              });
            }
          }
        }
      }

      if (queryError) {
        console.error('Error checking campaign:', queryError);
        setError(language === 'fr' ? 'Une erreur est survenue. Veuillez réessayer.' : 'An error occurred. Please try again.');
        return;
      }

      if (!campaigns || campaigns.length === 0) {
        setError(t('accessModal.invalidCredentials'));
        return;
      }

      // Master bypass always behaves as super-admin (full multi-campaign access)
      if (isMasterBypass && onAdminAccessGranted) {
        onAdminAccessGranted(campaigns as AdminCampaign[], true);
        return;
      }

      // Multiple campaigns for same company/creator: let user pick.
      // NOT super-admin — strictly scoped to the campaigns returned above.
      if (campaigns.length > 1 && onAdminAccessGranted) {
        onAdminAccessGranted(campaigns as AdminCampaign[], false);
        return;
      }

      const campaign = campaigns[0];
      onAccessGranted(campaign.id, {
        companyName: campaign.company_name,
        creatorEmail: campaign.creator_email
      });
    } catch (err) {
      console.error('Error:', err);
      setError(language === 'fr' ? 'Une erreur est survenue. Veuillez réessayer.' : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => !onClose && e.preventDefault()}>
        <DialogHeader>
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-md bg-brand-soft">
            <Lock className="h-4 w-4 text-brand-ink" />
          </div>
          <DialogTitle className="text-[17px] font-semibold">{t('accessModal.title')}</DialogTitle>
          <DialogDescription>
            {language === 'fr' 
              ? "Merci de renseigner votre email ainsi que le nom de votre entreprise pour accéder à votre espace d'équipe."
              : "Please enter your email and company name to access your team space."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              {t('accessModal.emailLabel')}
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder={t('accessModal.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code" className="flex items-center gap-2">
              <Key className="w-4 h-4 text-muted-foreground" />
              {t('accessModal.codeLabel')}
            </Label>
            <div className="relative">
              <Input
                id="code"
                name="password"
                type={showCode ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={t('accessModal.codePlaceholder')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full pr-10"
                maxLength={120}
              />
              <button
                type="button"
                onClick={() => setShowCode((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                tabIndex={-1}
                aria-label={showCode ? (language === 'fr' ? 'Masquer' : 'Hide') : (language === 'fr' ? 'Afficher' : 'Show')}
              >
                {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-md border-l-2 border-risk bg-risk-soft px-3 py-2 text-[13px] text-risk-ink">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading 
              ? (language === 'fr' ? 'Vérification...' : 'Verifying...') 
              : t('accessModal.accessButton')}
          </Button>
        </form>

        <div className="mt-2 flex items-center gap-3 border-t border-border pt-4">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-foreground">{language === 'fr' ? 'Découvrir sans compte' : 'Explore without an account'}</p>
            <p className="text-[12px] text-muted-foreground">{language === 'fr' ? '4 déploiements fictifs, de 234 à 1 192 salariés.' : '4 fictional rollouts, from 234 to 1,192 employees.'}</p>
          </div>
          <Button type="button" variant="outline" onClick={enterDemo}>
            <PlayCircle className="h-4 w-4" />
            {language === 'fr' ? 'Voir la démo' : 'View the demo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
