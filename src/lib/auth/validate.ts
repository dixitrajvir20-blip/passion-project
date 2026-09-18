/**
 * Pure validation for the sign-in flow. No network, no DOM.
 * Age handling follows the FTC's "neutral age screen" guidance: ask for a year of birth,
 * never hint at a minimum, and compute the region's threshold server-side later.
 */

export type ConsentRegion = 'in' | 'eu' | 'uk' | 'us' | 'other';

/** Age from which a person can agree to an account themselves, by region. */
export const SELF_CONSENT_AGE: Record<ConsentRegion, number> = {
  in: 18, // DPDP Act 2023 s.9: everyone under 18 is a child
  eu: 16, // GDPR Art. 8 default; member states may set 13–16
  uk: 13, // UK GDPR
  us: 13, // COPPA covers under-13s
  other: 16,
};

/** Below this age we do not open an account at all, anywhere. */
export const MIN_ACCOUNT_AGE = 13;

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (v.length < 6 || v.length > 254) return false;
  // Deliberately simple: the mail server is the real validator.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

export function normaliseCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

export function isCompleteCode(value: string): boolean {
  return /^\d{6}$/.test(value);
}

export function ageFromBirthYear(year: number, now: Date = new Date()): number | null {
  if (!Number.isInteger(year)) return null;
  const thisYear = now.getFullYear();
  if (year > thisYear || year < thisYear - 120) return null;
  // Year-only means we cannot know the birthday; treat the person as not yet had it.
  return thisYear - year - 1;
}

export type AgeDecision = 'self' | 'parent' | 'none';

export function ageDecision(age: number | null, region: ConsentRegion): AgeDecision {
  if (age === null) return 'none';
  if (age < MIN_ACCOUNT_AGE) return 'none';
  return age >= SELF_CONSENT_AGE[region] ? 'self' : 'parent';
}

/** Cooldown between code emails, in seconds. */
export const RESEND_COOLDOWN_S = 60;
/** Codes expire after ten minutes (OWASP ASVS 6.5.5 caps out-of-band at 10 min). */
export const CODE_TTL_S = 600;
export const MAX_CODE_ATTEMPTS = 5;
