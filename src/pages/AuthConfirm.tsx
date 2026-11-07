import { useState } from 'react';
import { AlertCircle, Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DustWordmark } from '@/components/DustMark';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Where the sign-in email points: /auth/confirm?token_hash=…&type=email (Supabase email template).
 * The one-time token is only used when the person clicks the button, so mail scanners that open
 * links to check them (Outlook Safe Links, Mimecast…) can no longer use it up first.
 * The link goes straight to this site, so it does not depend on Supabase's redirect settings either.
 */
const AuthConfirm = () => {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const params = new URLSearchParams(window.location.search);
  const tokenHash = params.get('token_hash');
  const type = (params.get('type') || 'email') as 'email' | 'magiclink' | 'signup';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(tokenHash ? '' : fr ? 'Ce lien est incomplet.' : 'This link is incomplete.');

  const confirm = async () => {
    if (!tokenHash) return;
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (err) {
      setLoading(false);
      setError(
        fr
          ? 'Ce lien a expiré ou a déjà servi. Demandez-en un nouveau : il est valable une heure.'
          : 'This link has expired or was already used. Request a new one: it is valid for one hour.'
      );
      return;
    }
    // Session stored: the console opens the Dust or partner space from it.
    window.location.replace('/dashboard');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-[780px] items-center px-4">
          <DustWordmark subtitle="Dust Assessment" />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-4 py-16">
        <h1 className="page-title">{fr ? 'Connexion' : 'Sign in'}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          {fr ? 'Cliquez pour ouvrir votre espace.' : 'Click to open your space.'}
        </p>
        {error && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-md border-l-2 border-risk bg-risk-soft px-3 py-2 text-[13px] text-risk-ink">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2">
          {tokenHash && !error && (
            <Button onClick={confirm} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {fr ? 'Se connecter' : 'Sign in'}
            </Button>
          )}
          {error && (
            <Button asChild variant="outline" className="w-full">
              <a href="/login?partenaire">{fr ? 'Demander un nouveau lien' : 'Request a new link'}</a>
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default AuthConfirm;
