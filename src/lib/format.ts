export interface Locale {
  code: string;
  currency: string;
  label: string;
}

export const LOCALES: Locale[] = [
  { code: 'en-IN', currency: 'INR', label: 'India (₹)' },
  { code: 'en-US', currency: 'USD', label: 'United States ($)' },
  { code: 'en-GB', currency: 'GBP', label: 'United Kingdom (£)' },
  { code: 'en-IE', currency: 'EUR', label: 'Europe (€)' },
  { code: 'pt-BR', currency: 'BRL', label: 'Brazil (R$)' },
  { code: 'en-NG', currency: 'NGN', label: 'Nigeria (₦)' },
];

export const DEFAULT_LOCALE = LOCALES[0];

export function money(value: number, locale: Locale, fractionDigits = 0): string {
  return new Intl.NumberFormat(locale.code, {
    style: 'currency',
    currency: locale.currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function number(value: number, locale: Locale, fractionDigits = 0): string {
  return new Intl.NumberFormat(locale.code, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function percent(value: number, locale: Locale, fractionDigits = 1): string {
  return new Intl.NumberFormat(locale.code, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/**
 * Accepts what people actually type: "1,00,000", "1 000", "₹1,000.50".
 * Returns null rather than NaN so callers can show a validation message.
 */
export function parseAmount(input: string): number | null {
  if (typeof input !== 'string') return null;
  const cleaned = input.replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function localeByCode(code: string): Locale {
  return LOCALES.find((l) => l.code === code) ?? DEFAULT_LOCALE;
}
