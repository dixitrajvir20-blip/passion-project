/**
 * Payslip lines travel in a calculator link as "label~amount|label~amount". Used by the take-home
 * pay tool for Europe's own-named lines ('lines', up to 8) and the India and US "other lines"
 * ('others', up to 5). A link is untrusted input (docs/SECURITY.md, risks 10 and 11), so decoding
 * validates like budget-link.ts: the row count is capped, labels are cut to 40 characters with no
 * ~ or |, amounts are cut to 16 characters and read with readAmount (src/lib/fields.ts), as the
 * fields read them, and an unreadable amount becomes '0'.
 */

import { readAmount } from './fields';

export interface LineText {
  label: string;
  amount: string;
}

export const LABEL_MAX = 40;
const AMOUNT_MAX = 16;

const clean = (label: string) => label.replace(/[~|]/g, ' ').slice(0, LABEL_MAX);

export function encodeLines(rows: readonly LineText[]): string {
  return rows.map((row) => `${clean(row.label)}~${String(row.amount).replace(/[~|]/g, '')}`).join('|');
}

/** At most maxRows rows; a part without exactly one ~ is dropped. An empty text gives no rows. */
export function decodeLines(text: string, maxRows: number): LineText[] {
  if (typeof text !== 'string' || text === '') return [];
  return text
    .split('|')
    .slice(0, Math.max(0, Math.floor(maxRows)))
    .map((part) => part.split('~'))
    .filter((parts) => parts.length === 2)
    .map(([label, amount]) => {
      // The fields' own reader, so '1e5' is 100000 here as it is in a row field, not 15.
      const { value } = readAmount(amount.slice(0, AMOUNT_MAX));
      return { label: clean(label), amount: String(value ?? 0) };
    });
}
