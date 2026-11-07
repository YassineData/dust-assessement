import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Key, AlertCircle, Eye, EyeOff, Loader2, MousePointerClick, Link2, Mail, CheckCircle2, Handshake } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { enterDemo } from '@/demo/demo-data';
import { isDustEmail, setAccessKey, setAdminKey } from '@/lib/access';
import { fetchCampaignList, fetchPartnerMe, type PartnerIdentity } from '@/lib/partners';

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
  /** A deployment partner signed in: its own campaigns only (the database filters them). */
  onPartnerAccessGranted?: (campaigns: AdminCampaign[], partner: PartnerIdentity) => void;
}

const CAMPAIGN_COLUMNS = 'id, code, company_name, campaign_name, creator_email, creator_first_name, creator_last_name, created_at';

/**
 * Email login (@dust.tt magic link) is built but off until the email service is set up
 * (Resend SMTP + auth hook, see supabase/002-dust-email-login.sql). Turn on with VITE_EMAIL_LOGIN=true.
 */
/** Who signed in last on this browser (shown in the console header, pre-filled next time). */
export const ADMIN_EMAIL_KEY = 'dust_admin_email';

const EMAIL_LOGIN_ENABLED = import.meta.env.VITE_EMAIL_LOGIN === 'true';

/**
 * Console access. Every way in is checked by the database (row level security):
 *  - Dust team: login link sent by email, @dust.tt addresses only → every campaign;
 *  - Dust team fallback: the admin key (stored hashed server-side) → every campaign;
 *  - deployment partner: login link sent by email, to a domain Dust registered (supabase/008) → its own clients;
 *  - client: the private results link Dust sends (/dashboard?key=…) → that campaign only.
 */
export const DashboardAccessModal = ({ isOpen, onAccessGranted, onAdminAccessGranted, onPartnerAccessGranted }: DashboardAccessModalProps) => {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const [adminKey, setAdminKeyInput] = useState('');
  const [adminEmail, setAdminEmail] = useState(() => {
    try {
      return localStorage.getItem(ADMIN_EMAIL_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [email, setEmail] = useState('');
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);
  const [useKey, setUseKey] = useState(!EMAIL_LOGIN_ENABLED);
  // On /login the Dust sign-in is open; elsewhere it stays folded so clients only see how to open their results.
  const onLogin = typeof window !== 'undefined' && window.location.pathname === '/login';
  // /login?partenaire (the address given to partners) opens the partner sign-in.
  const partnerParam = typeof window !== 'undefined' && /[?&](partenaire|partner)\b/.test(window.location.search);
  const [partnerOpen, setPartnerOpen] = useState(partnerParam);
  const [dustOpen, setDustOpen] = useState(onLogin && !partnerParam);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerLinkSentTo, setPartnerLinkSentTo] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const handledLink = useRef(false);
  const handledSession = useRef(false);

  // A link that failed comes back as #error=…&error_code=otp_expired: say so plainly instead of a blank page.
  useEffect(() => {
    if (!isOpen) return;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const code = hash.get('error_code') || hash.get('error');
    if (!code) return;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setPartnerOpen(true);
    setDustOpen(false);
    setError(
      code === 'otp_expired'
        ? fr ? 'Ce lien a expiré ou a déjà été ouvert (certaines messageries l’ouvrent pour le vérifier). Demandez un nouveau lien, puis saisissez le code reçu dans l’e-mail.' : 'This link has expired or was already opened (some mail systems open links to scan them). Request a new link, then enter the code from the email.'
        : fr ? 'La connexion n’a pas abouti. Demandez un nouveau lien.' : 'Sign-in did not go through. Request a new link.'
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // The code in the email signs in too: works even when a mail scanner has already used the link.
  const handleCodeSubmit = async (address: string) => {
    setError('');
    const token = otpCode.replace(/\s/g, '');
    if (!/^\d{6,10}$/.test(token)) {
      setError(fr ? 'Saisissez le code à chiffres reçu par e-mail.' : 'Enter the numeric code from the email.');
      return;
    }
    setIsLoading(true);
    const { error: vErr } = await supabase.auth.verifyOtp({ email: address, token, type: 'email' });
    setIsLoading(false);
    if (vErr) setError(fr ? 'Code incorrect ou expiré. Demandez un nouveau lien.' : 'Wrong or expired code. Request a new link.');
    // Success: onAuthStateChange opens the space.
  };

  const codeForm = (address: string) => (
    <form
      className="mt-2 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        handleCodeSubmit(address);
      }}
    >
      <Input
        aria-label={fr ? 'Code reçu par e-mail' : 'Code from the email'}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder={fr ? 'Ou saisissez le code' : 'Or enter the code'}
        value={otpCode}
        onChange={(e) => setOtpCode(e.target.value)}
        className="h-9 bg-card text-foreground"
      />
      <Button type="submit" size="sm" className="h-9" disabled={isLoading}>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {fr ? 'Valider' : 'Verify'}
      </Button>
    </form>
  );

  const openAllCampaigns = async () => {
    const { data, error: listErr } = await fetchCampaignList();
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
      if (handledSession.current || !userEmail) return;
      handledSession.current = true;
      setIsLoading(true);
      setAccessKey(null);
      if (isDustEmail(userEmail)) {
        await openAllCampaigns();
      } else {
        // Anyone else signed in must belong to a partner; the database only returns its campaigns.
        const partner = await fetchPartnerMe();
        if (partner) {
          setAdminKey(null);
          const { data } = await fetchCampaignList();
          onPartnerAccessGranted?.((data as AdminCampaign[]) ?? [], partner);
        } else {
          await supabase.auth.signOut();
          handledSession.current = false;
          setPartnerOpen(true);
          setError(fr ? 'Cette adresse n’est rattachée à aucun partenaire Dust.' : 'This address is not linked to a Dust partner.');
        }
      }
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

  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const address = partnerEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(address)) {
      setError(fr ? 'Saisissez votre adresse e-mail professionnelle.' : 'Enter your work email address.');
      return;
    }
    if (isDustEmail(address)) {
      setError(fr ? 'Adresse Dust : utilisez la connexion équipe Dust.' : 'Dust address: use the Dust team sign-in.');
      return;
    }
    setIsLoading(true);
    // The auth hook (supabase/008) only lets registered partner domains receive the link.
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, shouldCreateUser: true },
    });
    setIsLoading(false);
    if (otpErr) {
      setError(
        /partner|dust/i.test(otpErr.message || '')
          ? fr ? 'Cette adresse n’est rattachée à aucun partenaire Dust. Contactez votre interlocuteur Dust.' : 'This address is not linked to a Dust partner. Contact your Dust contact.'
          : fr ? 'Impossible d’envoyer le lien pour le moment. Réessayez dans une minute.' : 'Could not send the link right now. Try again in a minute.'
      );
      return;
    }
    setPartnerLinkSentTo(address);
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
      // RLS already limits a client to its campaign; the explicit filter also serves demo mode.
      const { data, error: err } = await supabase.from('campaigns').select(CAMPAIGN_COLUMNS).eq('access_key' as never, key.trim() as never).limit(1);
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
    const mail = adminEmail.trim().toLowerCase();
    if (!isDustEmail(mail)) {
      setError(fr ? 'Utilisez votre adresse email Dust.' : 'Use your Dust email address.');
      return;
    }
    if (!key) {
      setError(fr ? 'Saisissez la clé admin Dust.' : 'Enter the Dust admin key.');
      return;
    }
    setIsLoading(true);
    try {
      setAccessKey(null);
      setAdminKey(key);
      // dust_sign_in checks the key and the @dust.tt address server-side and logs the attempt.
      let result: string | null = null;
      const signIn = await supabase.rpc('dust_sign_in' as never, { p_email: mail } as never);
      if (!signIn.error) {
        result = signIn.data as unknown as string;
      } else {
        // Log table not installed yet (supabase/003-sign-in-log.sql): fall back to the key check alone.
        const { data: ok, error: checkErr } = await supabase.rpc('check_admin' as never);
        result = checkErr ? null : ok === true ? 'ok' : 'bad_key';
      }
      if (result !== 'ok') {
        setAdminKey(null);
        setError(
          result === 'not_dust' ? (fr ? 'Réservé aux adresses email Dust.' : 'Only Dust email addresses can sign in.')
          : result === 'too_many' ? (fr ? 'Trop de tentatives. Réessayez dans quelques minutes.' : 'Too many attempts. Try again in a few minutes.')
          : result === 'bad_key' ? (fr ? 'Clé admin incorrecte.' : 'Wrong admin key.')
          : (fr ? 'Impossible de vérifier la clé. Réessayez.' : 'Could not check the key. Please try again.')
        );
        return;
      }
      try {
        localStorage.setItem(ADMIN_EMAIL_KEY, mail);
      } catch {
        /* convenience only */
      }
      await openAllCampaigns();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="flex w-full max-w-[440px] flex-col gap-3 rounded-2xl bg-card p-6 shadow-[0_24px_60px_-28px_rgba(28,34,45,0.35)] ring-1 ring-border sm:p-8">
        <div className="mb-1">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft">
            <Lock className="h-4 w-4 text-brand-ink" />
          </div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-foreground">
            {partnerOpen ? (fr ? 'Espace partenaire' : 'Partner space') : dustOpen ? (fr ? 'Connexion équipe Dust' : 'Dust team sign-in') : (fr ? 'Accès aux résultats' : 'Access your results')}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {partnerOpen
              ? (fr ? 'Pour les partenaires de déploiement Dust : vos clients, leurs campagnes et leurs résultats.' : 'For Dust deployment partners: your clients, their campaigns and their results.')
              : dustOpen
              ? (fr ? 'Pour créer des campagnes et voir tous les résultats.' : 'To create campaigns and see every result.')
              : (fr ? 'Réservé à l’équipe Dust et aux clients disposant d’un lien de résultats.' : 'For the Dust team, and for clients with a results link.')}
          </p>
        </div>

        {/* Deployment partner: login link by email, registered domains only */}
        {partnerOpen && (partnerLinkSentTo ? (
          <div role="status" className="mt-2 flex gap-3 rounded-md bg-ok-soft p-3 text-ok-ink">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="text-[13px]">
              <p className="font-medium">{fr ? 'Lien envoyé' : 'Link sent'}</p>
              <p className="mt-0.5">
                {fr ? `Ouvrez l’e-mail envoyé à ${partnerLinkSentTo} et cliquez sur le lien pour vous connecter.` : `Open the email sent to ${partnerLinkSentTo} and click the link to sign in.`}
              </p>
              {codeForm(partnerLinkSentTo)}
              {error && <p role="alert" className="mt-1 text-risk-ink">{error}</p>}
              <button type="button" className="mt-1 underline underline-offset-2" onClick={() => { setOtpCode(''); setError(''); setPartnerLinkSentTo(null); }}>
                {fr ? 'Utiliser une autre adresse' : 'Use another address'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePartnerSubmit} className="mt-2 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="partner-email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {fr ? 'Votre adresse e-mail professionnelle' : 'Your work email address'}
              </Label>
              <Input
                id="partner-email"
                type="email"
                autoComplete="email"
                placeholder={fr ? 'prenom@cabinet.fr' : 'name@firm.com'}
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
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

        {/* Client: private link (the Dust sign-in page skips it) */}
        {!dustOpen && !partnerOpen && (
        <div className="flex gap-3 rounded-md bg-paper p-3 ring-1 ring-border">
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
        )}

        {/* Errors from a client results link, shown while the Dust sign-in is folded */}
        {!dustOpen && !partnerOpen && error && (
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
              {codeForm(linkSentTo)}
              {error && <p role="alert" className="mt-1 text-risk-ink">{error}</p>}
              <button type="button" className="mt-1 underline underline-offset-2" onClick={() => { setOtpCode(''); setError(''); setLinkSentTo(null); }}>
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
              <Label htmlFor="admin-email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {fr ? 'Votre adresse email Dust' : 'Your Dust email address'}
              </Label>
              <Input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="name@dust.tt"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                autoFocus={!adminEmail}
              />
            </div>
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
                  autoFocus={!!adminEmail}
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
              {isLoading ? (fr ? 'Vérification…' : 'Checking…') : (fr ? 'Se connecter' : 'Sign in')}
            </Button>
          </form>
        )}
        {!dustOpen || partnerOpen ? (
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {!partnerOpen && (
              <button
                type="button"
                className="text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => { setDustOpen(true); setPartnerOpen(false); setError(''); }}
              >
                {fr ? 'Équipe Dust : se connecter' : 'Dust team sign-in'}
              </button>
            )}
            {!partnerOpen && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => { setPartnerOpen(true); setDustOpen(false); setError(''); }}
              >
                <Handshake className="h-3.5 w-3.5" />
                {fr ? 'Partenaire de déploiement' : 'Deployment partner'}
              </button>
            )}
            {partnerOpen && (
              <button
                type="button"
                className="text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => { setPartnerOpen(false); setError(''); }}
              >
                {fr ? '← Retour' : '← Back'}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {EMAIL_LOGIN_ENABLED && (
              <button
                type="button"
                className="text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => { setUseKey((v) => !v); setError(''); }}
              >
                {useKey ? (fr ? 'Se connecter avec une adresse @dust.tt' : 'Sign in with a @dust.tt address') : (fr ? 'Utiliser la clé admin (secours)' : 'Use the admin key instead')}
              </button>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              onClick={() => { setPartnerOpen(true); setDustOpen(false); setError(''); }}
            >
              <Handshake className="h-3.5 w-3.5" />
              {fr ? 'Partenaire de déploiement' : 'Deployment partner'}
            </button>
          </div>
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
    </section>
  );
};
