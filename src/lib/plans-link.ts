/**
 * Pay-later plans travel in a link as "amount~k~n~d|…": one payment's amount, the payment number
 * (k of n), the plan's total number of payments (n), and how many of its payments fall before the
 * next pay (d). Used by the pay-later-payday calculator for its 'plans' link key, after the #.
 *
 * A link is untrusted input (docs/SECURITY.md, risks 10 and 11), so the decoder is strict: a size
 * cap first, then a regular expression per part, and Number() only on text a regex has passed, so
 * '0x1F', '1e9', 'Infinity', '-5' and '' never reach it. A row that fails is dropped; no survivors
 * gives null. There is no free text in a row (plans are numbered, never named), so nothing a
 * reader typed about a shop or a lender can end up in a link. budget-link.ts is looser and is not
 * the pattern here.
 */

/** The most plans the tool holds, shared by the island and the codec. */
export const MAX_PLAN_ROWS = 8;

/** Eight rows at the widest ('99999999.99~48~48~1') come to 159 characters. */
export const PLANS_TEXT_MAX = 200;

export const MAX_PLAN_AMOUNT = 10_000_000;
export const MAX_PLAN_PAYMENTS = 48;
export const MAX_PLAN_DUE = 4;

/** One plan as the fields hold it: text, exactly as typed or as the link carried it. */
export interface PlanRowText {
  amount: string;
  k: string;
  n: string;
  d: string;
}

const AMOUNT = /^\d{1,8}(\.\d{1,2})?$/;
const COUNT = /^\d{1,2}$/;
const DUE = /^[1-4]$/;

/** The row, if the decoder would accept it; null otherwise. */
function acceptRow(amount: string, k: string, n: string, d: string): PlanRowText | null {
  if (!AMOUNT.test(amount) || !COUNT.test(k) || !COUNT.test(n) || !DUE.test(d)) return null;
  const a = Number(amount);
  const kk = Number(k);
  const nn = Number(n);
  const dd = Number(d);
  if (a > MAX_PLAN_AMOUNT) return null;
  if (kk < 1 || kk > nn || nn > MAX_PLAN_PAYMENTS) return null;
  if (kk + dd - 1 > nn) return null;
  return { amount, k, n, d };
}

/**
 * The rows as link text: only rows the decoder would accept, a blank amount written as 0, at
 * most MAX_PLAN_ROWS of them.
 */
export function encodePlans(rows: readonly PlanRowText[]): string {
  const out: string[] = [];
  for (const row of rows) {
    if (out.length === MAX_PLAN_ROWS) break;
    const amount = String(row.amount ?? '').trim() === '' ? '0' : String(row.amount).trim();
    const accepted = acceptRow(amount, String(row.k ?? '').trim(), String(row.n ?? '').trim(), String(row.d ?? '').trim());
    if (accepted) out.push([accepted.amount, accepted.k, accepted.n, accepted.d].join('~'));
  }
  return out.join('|');
}

/** Link text back to rows: null for anything that is not a non-empty string of 200 characters or fewer, or when no row survives. */
export function decodePlans(text: unknown): PlanRowText[] | null {
  if (typeof text !== 'string' || text === '' || text.length > PLANS_TEXT_MAX) return null;
  const rows: PlanRowText[] = [];
  for (const part of text.split('|')) {
    if (rows.length === MAX_PLAN_ROWS) break;
    const fields = part.split('~');
    if (fields.length !== 4) continue;
    const row = acceptRow(fields[0], fields[1], fields[2], fields[3]);
    if (row) rows.push(row);
  }
  return rows.length > 0 ? rows : null;
}
