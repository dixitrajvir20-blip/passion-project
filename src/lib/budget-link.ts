/**
 * Budget lines travel in a link as "name~amount~kind|...". Shared by the budget planner (which
 * reads and writes such links) and the lesson explorer (which hands its split to the planner).
 * A link is untrusted input, so decoding validates everything and caps the size.
 */
export type BudgetKind = 'needs' | 'wants' | 'savings';

export interface BudgetRowText {
  name: string;
  amount: string;
  category: BudgetKind;
}

export const MAX_ROWS = 20;
const KINDS: BudgetKind[] = ['needs', 'wants', 'savings'];

export function encodeRows(rows: BudgetRowText[]): string {
  return rows.map((r) => [r.name.replace(/[~|]/g, ' '), r.amount, r.category].join('~')).join('|');
}

export function decodeRows(text: string): BudgetRowText[] | null {
  const rows = text
    .split('|')
    .slice(0, MAX_ROWS)
    .map((part) => part.split('~'))
    .filter((p) => p.length === 3 && (KINDS as string[]).includes(p[2]))
    .map(([name, amount, category]) => {
      const n = Number(amount.slice(0, 16).replace(/[^0-9.\-]/g, ''));
      return { name: name.slice(0, 40), amount: String(Number.isFinite(n) ? n : 0), category: category as BudgetKind };
    });
  return rows.length > 0 ? rows : null;
}
