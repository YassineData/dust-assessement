import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Key, AlertCircle, Eye, EyeOff, Loader2, MousePointerClick, Link2, Mail, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { enterDemo } from '@/demo/demo-data';
import { isDustEmail, setAccessKey, setAdminKey } from '@/lib/access';

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

const CAMPAIGN_COLUMNS = 'id, code, company_name, campaign_name, creator_email, created_at';

/**
 * Email login (@dust.tt magic link) is built but off until the email service is set up
 * (Resend SMTP + auth hook, see supabase/002-dust-email-login.sql). Turn on with VITE_EMAIL_LOGIN=true.
 */
const EMAIL_LOGIN_ENABLED = import.meta.env.VITE_EMAIL_LOGIN === 'true';

/**
 * Console access. Every way in is checked by the database (row level security):
 *  - Dust team: login link sent by email, @dust.tt addresses only → every campaign;
 *  - Dust team fallback: the admin key (stored hashed server-side) → every campaign;
 *  - client: the private results link Dust sends (/dashboard?key=…) → that campaign only.
 */
export const DashboardAccessModal = ({ isOpen, onClose, onAccessGranted, onAdminAccessGranted }: DashboardAccessModalProps) => {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const [adminKey, setAdminKeyInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [email, setEmail] = useState('');
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);
  const [useKey, setUseKey] = useState(!EMAIL_LOGIN_ENABLED);
  // The Dust team sign-in stays folded: clients only see how to open their results.
  const [dustOpen, setDustOpen] = useState(false);
  const handledLink = useRef(false);
  const handledSession = useRef(false);

  const openAllCampaigns = async () => {
    const { data, error: listErr } = await supabase.from('campaigns').select(CAMPAIGN_COLUMNS).order('created_at', { ascending: false });
    if (listErr) {
      setError(fr ? 'Une erreur est survenue. Réessayez.' : 'An error occurred. Please try again.');
      return false;
    }
    onAdminAccessGranted?.((data as AdminCampaign[]) ?? [], true);
    return true;
  };

  // Dust team signed in with the email link: open everything.
  useEffect(() => {
    if (!isOpen) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('key')) return;
    const tryOpen = async (userEmail?: string | null) => {
      if (handledSession.current || !isDustEmail(userEmail)) return;
      handledSession.current = true;
      setIsLoading(true);
      setAccessKey(null);
      await openAllCampaigns();
      setIsLoading(false);
    };
    supabase.auth.getSession().then(({ data }) => tryOpen(data.session?.user?.email));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      tryOpen(session?.user?.email);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const address = email.trim().toLowerCase();
    // Only @dust.tt addresses: others never get an email (enforced again server-side by an auth hook).
    if (!isDustEmail(address)) {
      setError(fr ? 'Seules les adresses @dust.tt peuvent se connecter ici.' : 'Only @dust.tt addresses can sign in here.');
      return;
    }
    setIsLoading(true);
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, shouldCreateUser: true },
    });
    setIsLoading(false);
    if (otpErr) {
      setError(fr ? 'Impossible d’envoyer le lien pour le moment. Réessayez dans une minute.' : 'Could not send the link right now. Try again in a minute.');
      return;
    }
    setLinkSentTo(address);
  };

  // Private results link: /dashboard?key=… opens that campaign only.
  useEffect(() => {
    if (!isOpen || handledLink.current) return;
    const params = new URLSearchParams(window.location.search);
    const key = params.get('key');
    if (!key) return;
    handledLink.current = true;
    // Remove the secret from the address bar (and from the browser history entry).
    params.delete('key');
    const rest = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`);

    (async () => {
      setIsLoading(true);
      setError('');
      setAdminKey(null);
      setAccessKey(key.trim());
      const { data, error: err } = await supabase.from('campaigns').select(CAMPAIGN_COLUMNS).limit(1);
      setIsLoading(false);
      const campaign = (data as AdminCampaign[] | null)?.[0];
      if (err || !campaign) {
        setAccessKey(null);
        setError(fr ? 'Ce lien de résultats n’est pas valide ou a expiré. Demandez un nouveau lien à votre contact Dust.' : 'This results link is invalid or has expired. Ask your Dust contact for a new link.');
        return;
      }
      onAccessGranted(campaign.id, { companyName: campaign.company_name, creatorEmail: campaign.creator_email });
    })();
  }, [isOpen, fr, onAccessGranted]);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const key = adminKey.trim();
    if (!key) {
      setError(fr ? 'Saisissez la clé admin Dust.' : 'Enter the Dust admin key.');
      return;
    }
    setIsLoading(true);
    try {
      setAccessKey(null);
      setAdminKey(key);
      const { data: ok, error: checkErr } = await supabase.rpc('check_admin' as never);
      if (checkErr || ok !== true) {
        setAdminKey(null);
        setError(checkErr
          ? (fr ? 'Impossible de vérifier la clé. Réessayez.' : 'Could not check the key. Please try again.')
          : (fr ? 'Clé admin incorrecte.' : 'Wrong admin key.'));
        return;
      }
      await openAllCampaigns();
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
          <DialogTitle className="text-[17px] font-semibold">{fr ? 'Accès à la console' : 'Console access'}</DialogTitle>
          <DialogDescription>
            {fr ? 'Réservé à l’équipe Dust et aux clients disposant d’un lien de résultats.' : 'For the Dust team, and for clients with a results link.'}
          </DialogDescription>
        </DialogHeader>

        {/* Client: private link */}
        <div className="mt-2 flex gap-3 rounded-md bg-paper p-3 ring-1 ring-border">
          <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" />
          <div>
            <p className="text-[13px] font-medium text-foreground">{fr ? 'Vous êtes client ?' : 'Are you a client?'}</p>
            <p className="text-[12px] text-muted-foreground">
              {fr
                ? 'Ouvrez le lien privé de résultats envoyé par votre contact Dust : il vous donne accès à votre campagne, sans mot de passe.'
                : 'Open the private results link your Dust contact sent you: it opens your campaign, no password needed.'}
            </p>
          </div>
        </div>

        {/* Errors from a client results link, shown while the Dust sign-in is folded */}
        {!dustOpen && error && (
          <div role="alert" className="mt-2 flex items-center gap-2 rounded-md border-l-2 border-risk bg-risk-soft px-3 py-2 text-[13px] text-risk-ink">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dust team: login link by email (@dust.tt only) */}
        {dustOpen && !useKey && (linkSentTo ? (
          <div role="status" className="mt-2 flex gap-3 rounded-md bg-ok-soft p-3 text-ok-ink">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="text-[13px]">
              <p className="font-medium">{fr ? 'Lien envoyé' : 'Link sent'}</p>
              <p className="mt-0.5">
                {fr ? `Ouvrez l’e-mail envoyé à ${linkSentTo} et cliquez sur le lien pour vous connecter.` : `Open the email sent to ${linkSentTo} and click the link to sign in.`}
              </p>
              <button type="button" className="mt-1 underline underline-offset-2" onClick={() => setLinkSentTo(null)}>
                {fr ? 'Utiliser une autre adresse' : 'Use another address'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} className="mt-2 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="dust-email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {fr ? 'Équipe Dust : votre adresse @dust.tt' : 'Dust team: your @dust.tt address'}
              </Label>
              <Input
                id="dust-email"
                type="email"
                autoComplete="email"
                placeholder="name@dust.tt"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            {error && (
              <div role="alert" className="flex items-center gap-2 rounded-md border-l-2 border-risk bg-risk-soft px-3 py-2 text-[13px] text-risk-ink">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {fr ? 'Recevoir un lien de connexion' : 'Email me a login link'}
            </Button>
          </form>
        ))}

        {/* Admin key (fallback, or the only Dust sign-in while email login is off) */}
        {dustOpen && useKey && (
          <form onSubmit={handleAdminSubmit} className="mt-2 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="admin-key" className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                {fr ? 'Clé admin Dust' : 'Dust admin key'}
              </Label>
              <div className="relative">
                <Input
                  id="admin-key"
                  name="password"
                  type={showKey ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={adminKey}
                  onChange={(e) => setAdminKeyInput(e.target.value)}
                  className="w-full pr-10"
                  maxLength={200}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showKey ? (fr ? 'Masquer' : 'Hide') : (fr ? 'Afficher' : 'Show')}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div role="alert" className="flex items-center gap-2 rounded-md border-l-2 border-risk bg-risk-soft px-3 py-2 text-[13px] text-risk-ink">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? (fr ? 'Vérification…' : 'Checking…') : (fr ? 'Accéder à toutes les campagnes' : 'Open all campaigns')}
            </Button>
          </form>
        )}
        {!dustOpen ? (
          <button
            type="button"
            className="mt-1 self-start text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => { setDustOpen(true); setError(''); }}
          >
            {fr ? 'Équipe Dust : se connecter' : 'Dust team sign-in'}
          </button>
        ) : EMAIL_LOGIN_ENABLED && (
          <button
            type="button"
            className="mt-1 self-start text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => { setUseKey((v) => !v); setError(''); }}
          >
            {useKey ? (fr ? 'Se connecter avec une adresse @dust.tt' : 'Sign in with a @dust.tt address') : (fr ? 'Utiliser la clé admin (secours)' : 'Use the admin key instead')}
          </button>
        )}

        <div className="mt-2 flex items-center gap-3 border-t border-border pt-4">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-foreground">{fr ? 'Découvrir sans compte' : 'Explore without an account'}</p>
            <p className="text-[12px] text-muted-foreground">{fr ? 'Données fictives, de 234 à 1 192 salariés.' : 'Sample data, from 234 to 1,192 employees.'}</p>
          </div>
          <Button type="button" variant="outline" onClick={enterDemo}>
            <MousePointerClick className="h-4 w-4" />
            {fr ? 'Tester la plateforme' : 'Try the platform'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
