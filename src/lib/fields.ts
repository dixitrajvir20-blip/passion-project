/**
 * Pure readers for what a reader types into a calculator field, re-exported from
 * src/islands/tool-kit.tsx. Every new calculator validates with readAmount, which tells blank from
 * 0 and a too-large entry from an unreadable one; the older toNumber() stays for the five
 * calculators built before it.
 */

export interface ReadAmount {
  /** The number typed, or null when the field is blank or unreadable. */
  value: number | null;
  /** True when the entry is a number too large to hold (for example 400 digits). */
  tooBig: boolean;
}

const PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/** Reads "1e5", "1,00,000", "₹500" and " 12.5 "; blank gives null, never 0. */
export function readAmount(raw: string): ReadAmount {
  let text = String(raw ?? '').trim();
  if (text === '') return { value: null, tooBig: false };
  if (!PATTERN.test(text)) {
    text = text.replace(/[^0-9.\-]/g, '');
    if (!PATTERN.test(text)) return { value: null, tooBig: false };
  }
  const n = Number(text);
  if (!Number.isFinite(n)) return { value: null, tooBig: true };
  return { value: n === 0 ? 0 : n, tooBig: false };
}

export function isBlank(raw: unknown): boolean {
  return String(raw ?? '').trim() === '';
}

/** What an <input type="number"> can hold (the HTML floating-point syntax); it blanks anything else. */
const NUMBER_INPUT = /^-?(\d+|\d*\.\d+)(e[+-]?\d+)?$/i;

/**
 * A value from a shared link as a number field can show it, so the field shows the figure the sum
 * uses: '35,000' becomes '35000', '₹5,000' '5000', '+5' '5', and text with no number in it ''.
 * A value the field can already show is kept exactly as it came.
 */
export function numberInputValue(raw: string): string {
  const text = String(raw ?? '').trim();
  if (text === '' || NUMBER_INPUT.test(text)) return text;
  const { value } = readAmount(text);
  return value === null ? '' : String(value);
}
