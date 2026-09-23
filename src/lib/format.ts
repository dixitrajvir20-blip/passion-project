import { roundTo } from './finance';

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

/** Intl writes a negative with a hyphen-minus; the site sets every minus as the true sign (−). */
const trueMinus = (text: string) => text.replace(/^-/, '\u2212');

export function money(value: number, locale: Locale, fractionDigits = 0): string {
  return trueMinus(
    new Intl.NumberFormat(locale.code, {
      style: 'currency',
      currency: locale.currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value),
  );
}

export function number(value: number, locale: Locale, fractionDigits = 0): string {
  return trueMinus(
    new Intl.NumberFormat(locale.code, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value),
  );
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

/** A length of time in months, in words: "1 month", "1 year 8 months", never "1 years". */
export function formatDuration(months: number): string {
  const y = Math.floor(months / 12);
  const r = months % 12;
  const monthsText = `${r} ${r === 1 ? 'month' : 'months'}`;
  const yearsText = `${y} ${y === 1 ? 'year' : 'years'}`;
  if (y === 0) return monthsText;
  if (r === 0) return yearsText;
  return `${yearsText} ${monthsText}`;
}

/**
 * A value already in percent units (53.3 means 53.3%), formatted by the locale: pt-BR writes
 * 7,5%. Pass a value already rounded (percent1, round1); never append '%' by hand.
 */
export function percentValue(value: number, locale: Locale, fractionDigits = 1): string {
  return trueMinus(
    new Intl.NumberFormat(locale.code, {
      style: 'percent',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value / 100),
  );
}

/**
 * A rate in percent units with trailing zeros trimmed, capped at "over 10,000%" and floored at
 * "under 0.1%" (or the step of maxDp) for a positive rate that would otherwise print as 0%.
 */
export function ratePercent(value: number, locale: Locale, maxDp: number): string {
  if (!Number.isFinite(value) || value > 10000) return `over ${number(10000, locale)}%`;
  if (value > 0 && roundTo(value, maxDp) === 0) return `under ${number(10 ** -maxDp, locale, maxDp)}%`;
  return trueMinus(
    new Intl.NumberFormat(locale.code, {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDp,
    }).format(value / 100),
  );
}

/** The singular or plural word for a count, by the locale's own plural rules. */
export function plural(count: number, one: string, other: string, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.PluralRules(locale.code).select(count) === 'one' ? one : other;
}
