/**
 * Console access keys, sent as request headers and checked by the database (RLS):
 *  - admin key (Dust team): full access, validated server-side against a bcrypt hash;
 *  - access key (client): the secret of one campaign's private results link.
 * Nothing here is a secret of the app itself: keys are typed or received by the user.
 */
const ADMIN_KEY = 'dust_admin_key';
const ACCESS_KEY = 'dust_access_key';

const read = (k: string) => {
  try {
    return localStorage.getItem(k) || '';
  } catch {
    return '';
  }
};
const write = (k: string, v: string | null) => {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {
    /* storage unavailable: access lasts for this page only */
  }
};

export const getAdminKey = () => read(ADMIN_KEY);
export const setAdminKey = (v: string | null) => write(ADMIN_KEY, v);
export const getAccessKey = () => read(ACCESS_KEY);
export const setAccessKey = (v: string | null) => write(ACCESS_KEY, v);
export const clearAccessKeys = () => {
  write(ADMIN_KEY, null);
  write(ACCESS_KEY, null);
};

export const accessHeaders = (): Record<string, string> => {
  const h: Record<string, string> = {};
  const admin = getAdminKey();
  const access = getAccessKey();
  if (admin) h['x-admin-key'] = admin;
  if (access) h['x-access-key'] = access;
  return h;
};

/** Private results link for a client (opens the console on that campaign only). */
export const resultsLink = (accessKey: string) => `${window.location.origin}/results?key=${accessKey}`;

export const isDustEmail = (email?: string | null) => !!email && email.trim().toLowerCase().endsWith('@dust.tt');
