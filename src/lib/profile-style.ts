import { CLASS_ORDER, classLabel, getResultClass } from '@/lib/assessment-v2';

// Visual treatment of the seven result classes (spec v2, "Result classes"), in rule order.
export const PROFILE_ORDER = CLASS_ORDER;

const TONE_PILL: Record<string, string> = {
  brand: 'pill pill-brand',
  green: 'pill pill-green',
  pink: 'pill pill-pink',
  lav: 'pill pill-lav',
  amber: 'pill pill-amber',
  red: 'pill pill-red',
  neutral: 'pill pill-neutral',
};

export const PROFILE_BADGE: Record<string, string> = Object.fromEntries(
  CLASS_ORDER.map((id) => [id, TONE_PILL[getResultClass(id).tone]])
);

/** Chart colour per class. */
export const PROFILE_COLORS: Record<string, string> = {
  trainer: 'hsl(var(--brand))',
  champion: 'hsl(var(--green))',
  builder: 'hsl(var(--chart-9))',
  sponsor: 'hsl(var(--chart-7))',
  beginner: 'hsl(var(--amber))',
  convince: 'hsl(var(--red))',
  everyday: 'hsl(var(--chart-benchmark))',
};

/** Localized class name. `t` kept for call-site compatibility. */
export const profileLabel = (
  profile: { id: string; name: string },
  language: string,
  _t?: (key: string) => string
) => classLabel(profile.id, language === 'en' ? 'en' : 'fr');

export const initials = (first?: string | null, last?: string | null) =>
  `${(first || '').trim().charAt(0)}${(last || '').trim().charAt(0)}`.toUpperCase() || '·';
