// List of blocked personal email domains
const BLOCKED_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.fr',
  'yahoo.co.uk',
  'hotmail.com',
  'hotmail.fr',
  'outlook.com',
  'live.com',
  'msn.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'protonmail.com',
  'proton.me',
  'mail.com',
  'gmx.com',
  'gmx.fr',
  'free.fr',
  'orange.fr',
  'wanadoo.fr',
  'laposte.net',
  'sfr.fr',
  'bbox.fr',
  'yandex.com',
  'zoho.com'
];

export const isPersonalEmail = (_email: string): boolean => {
  // Personal email restriction removed — all valid emails are now accepted.
  return false;
};

export const validateProfessionalEmail = (email: string): { valid: boolean; message?: string } => {
  if (!email || !email.includes('@')) {
    return { valid: false, message: 'Adresse email invalide' };
  }
  return { valid: true };
};
