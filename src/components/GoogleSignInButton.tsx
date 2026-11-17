import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Google's own « Sign in with Google » button (Google Identity Services). The Google window then names
 * dust-assessment.com, not the Supabase project address shown by the redirect flow. The ID token is handed
 * to Supabase (signInWithIdToken); the session listener of the access modal then opens the right space.
 * If the Google script can't load (blocked, offline, no client id), `fallback` is shown instead: the old redirect button.
 */
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

type Gsi = {
  accounts: {
    id: {
      initialize: (o: Record<string, unknown>) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    };
  };
};

let scriptPromise: Promise<Gsi | null> | null = null;
const loadGsi = () => {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    const w = window as unknown as { google?: Gsi };
    if (w.google?.accounts?.id) return resolve(w.google);
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve(w.google?.accounts?.id ? w.google : null);
    s.onerror = () => {
      scriptPromise = null;
      resolve(null);
    };
    document.head.appendChild(s);
    window.setTimeout(() => resolve(w.google?.accounts?.id ? w.google : null), 8000);
  });
  return scriptPromise;
};

const randomNonce = () => {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
};
const sha256Hex = async (v: string) => {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return Array.from(new Uint8Array(d), (x) => x.toString(16).padStart(2, '0')).join('');
};

export const googleIdentityAvailable = () => !!CLIENT_ID;

export const GoogleSignInButton = ({
  fr,
  fallback,
  onStart,
  onError,
}: {
  fr: boolean;
  fallback: React.ReactNode;
  onStart?: () => void;
  onError: (message: string) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>(CLIENT_ID ? 'loading' : 'fallback');
  // Keep the latest callbacks without re-rendering Google's button.
  const cb = useRef({ onStart, onError, fr });
  cb.current = { onStart, onError, fr };

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    (async () => {
      const gsi = await loadGsi();
      const el = ref.current;
      if (cancelled) return;
      if (!gsi || !el || !window.crypto?.subtle) {
        setState('fallback');
        return;
      }
      const nonce = randomNonce();
      const hashed = await sha256Hex(nonce);
      if (cancelled) return;
      gsi.accounts.id.initialize({
        client_id: CLIENT_ID,
        nonce: hashed,
        ux_mode: 'popup',
        auto_select: false,
        itp_support: true,
        use_fedcm_for_button: true,
        callback: async ({ credential }: { credential?: string }) => {
          if (!credential) return;
          cb.current.onStart?.();
          const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: credential, nonce });
          if (error) {
            const f = cb.current.fr;
            // The auth hook refuses addresses that are neither @dust.tt nor a partner's.
            cb.current.onError(
              /partner|dust|hook|not allowed|403/i.test(error.message || '')
                ? f ? 'Cette adresse n’est rattachée à aucun partenaire Dust. Contactez votre interlocuteur Dust.' : 'This address is not linked to a Dust partner. Contact your Dust contact.'
                : f ? 'La connexion Google n’a pas abouti. Réessayez.' : 'Google sign-in did not go through. Try again.'
            );
          }
          // Success: the session listener of the access modal opens the space.
        },
      });
      el.innerHTML = '';
      gsi.accounts.id.renderButton(el, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'center',
        width: Math.min(400, Math.max(200, Math.round(el.getBoundingClientRect().width || 320))),
        locale: cb.current.fr ? 'fr' : 'en',
      });
      setState('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'fallback') return <>{fallback}</>;
  return <div ref={ref} className="flex min-h-[44px] w-full justify-center" aria-busy={state === 'loading'} />;
};
