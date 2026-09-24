/** Pay-later plans against one payday: each edition's opening values, with the sources behind them, and the pure maths. Owned by the pay-later-payday builder. Tool maths and pins from the revised spec go here and in tests/unit/tools/pay-later-payday.test.ts, never in finance.ts; defaults and rules go in CONFIG, never in regions.ts. The names CONFIG and PayLaterPaydayConfig are imported by the page and must stay. */
import type { EditionConfigs, ToolConfig } from './types';
import type { Source } from '../regions';
import { fromCents, toCents } from '../finance';
import { money, number, percent, type Locale } from '../format';
import { MAX_PLAN_DUE, MAX_PLAN_PAYMENTS, MAX_PLAN_ROWS, encodePlans, type PlanRowText } from '../plans-link';

/* ---------------------------------------------------------------------------------------------
 * Config: what the page hands the island for one edition. Plain JSON only.
 * ------------------------------------------------------------------------------------------- */

/** Where the fee in the fee note comes from: the lesson's made-up screen, or a sourced Rule. */
export type LateFeeSource =
  | { kind: 'example'; amount: number; fromLesson: string }
  | { kind: 'rule'; ruleKey: string };

export interface FeeNote {
  /** Set before the note's text: 'Late fee if a payment is missed'. */
  label: string;
  fee: LateFeeSource;
  /** {fee} is the fee in the edition's own currency; {link} is the linked source name, when there is one. */
  text: string;
  link?: { text: string; url: string };
}

export interface PayLaterPaydayConfig extends ToolConfig {
  /** The fields it opens on: the edition lesson's worked payday. */
  defaults: { pay: string; living: string; savings: string; plans: PlanRowText[] };
  /** The edition's word for one payment of a plan, and its plural (instalment, installment). */
  words: { one: string; other: string };
  /** The note under the facts. Its fee is written in the edition's currency, never the picker's. */
  feeNote: FeeNote;
  /** The edition's paragraphs in How this is worked out, each with its source. {fee} as in feeNote. */
  details: { text: string; source: Source }[];
}

const CFPB_2025: Source = {
  title: 'The Buy Now, Pay Later Market, Data Spotlight, Table 7, nominal late fee metrics for four lenders (Consumer Financial Protection Bureau, December 2025)',
  url: 'https://files.consumerfinance.gov/f/documents/cfpb_bnpl-market-report_2025-12.pdf',
};

export const CONFIG: EditionConfigs<PayLaterPaydayConfig> = {
  eu: {
    scenario: 'The Europe lesson’s 1 October pay of €1,200, with €804 of living costs and three plans each on payment 2 of 4.',
    glossary: ['buy-now-pay-later', 'net-pay', 'loan-stacking', 'late-fee'],
    defaults: {
      pay: '1200',
      living: '804',
      savings: '0',
      plans: [
        { amount: '30', k: '2', n: '4', d: '1' },
        { amount: '36', k: '2', n: '4', d: '1' },
        { amount: '24', k: '2', n: '4', d: '1' },
      ],
    },
    words: { one: 'instalment', other: 'instalments' },
    feeNote: {
      label: 'Late fee if a payment is missed',
      fee: { kind: 'example', amount: 15, fromLesson: 'eu/credit-and-fraud/bnpl-is-credit' },
      text: 'the lesson’s screen uses {fee}, a made-up example. Each plan’s terms set the real fee, and each EU country’s law sets any limit on it. A payment that fails can also bring a charge from your bank.',
    },
    details: [
      {
        text: 'The revised Consumer Credit Directive, Directive (EU) 2023/2225, covers most pay-later plans, and EU countries apply it from 20 November 2026 (Article 48).',
        source: { title: 'Directive (EU) 2023/2225, Articles 2 and 48 (EUR-Lex)', url: 'https://eur-lex.europa.eu/eli/dir/2023/2225/oj' },
      },
      {
        text: 'Each EU country’s own law sets any limit on charges for a missed payment. The directive lets a country hold them to what the missed payment costs the lender, and a country that allows extra charges on top of that must cap them (Article 35).',
        source: { title: 'Directive (EU) 2023/2225 (EUR-Lex)', url: 'https://eur-lex.europa.eu/eli/dir/2023/2225/oj' },
      },
    ],
  },
  us: {
    scenario: 'The US lesson’s Friday paycheck of $1,317, with $817 of living costs, $132 to savings and three $15 installments each on payment 2 of 4.',
    glossary: ['buy-now-pay-later', 'loan-stacking', 'late-fee', 'autopay', 'overdraft-fee'],
    rulesLead: 'Figure checked',
    rules: [
      {
        key: 'lateFeeShare2023',
        value: 4.1,
        label:
          'Share of loans charged a late fee in 2023 at the four of six large pay-in-four lenders that charged one: 4.1%. The fee in the note is an example close to that year’s average, not any one plan’s fee',
        source: CFPB_2025,
        asOf: '2026-09-22',
      },
    ],
    defaults: {
      pay: '1317',
      living: '817',
      savings: '132',
      plans: [
        { amount: '15', k: '2', n: '4', d: '1' },
        { amount: '15', k: '2', n: '4', d: '1' },
        { amount: '15', k: '2', n: '4', d: '1' },
      ],
    },
    words: { one: 'installment', other: 'installments' },
    feeNote: {
      label: 'Late fee if a payment is missed',
      fee: { kind: 'example', amount: 10 },
      text: 'a late fee of {fee} is an example, close to the 2023 average the CFPB reports at four large pay-in-four lenders, where 4.1% of loans were charged one ({link}). Each plan’s terms set the real fee, and some states limit it. Your bank can add an overdraft or non-sufficient funds fee when an automatic payment finds too little in the account.',
      link: { text: 'Consumer Financial Protection Bureau, December 2025', url: CFPB_2025.url },
    },
    details: [
      {
        text: 'The fee note’s {fee} is an example close to the 2023 average the CFPB reports at the four of six large lenders that charged one, not any plan’s fee.',
        source: CFPB_2025,
      },
      {
        text: 'Some states limit these fees, so the amount can depend on where you live.',
        source: {
          title: 'Buy Now, Pay Later: Market trends and consumer impacts, page 23 (Consumer Financial Protection Bureau, September 2022)',
          url: 'https://files.consumerfinance.gov/f/documents/cfpb_buy-now-pay-later-market-trends-consumer-impacts_report_2022-09.pdf',
        },
      },
      {
        text: 'New York proposed rules in 2026 that would limit these fees. They were not in force when this was checked on 22 September 2026.',
        source: {
          title: 'New York State Department of Financial Services press release (23 February 2026)',
          url: 'https://www.dfs.ny.gov/reports_and_publications/press_releases/pr20260223',
        },
      },
    ],
  },
};

/* ---------------------------------------------------------------------------------------------
 * Reading the fields.
 * ------------------------------------------------------------------------------------------- */

export const MAX_MONEY = 10_000_000;
export { MAX_PLAN_ROWS };

const NUMBER_TEXT = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/**
 * A field's text as a number: blank gives null, a plain decimal number gives its value, anything
 * else gives NaN so it can be reported. Never toNumber(), which keeps a '-' and turns '1e3' into
 * 13; and not Number() alone, which reads '0x1F' as 31 and 'Infinity' as a number.
 */
export function readField(text: string): number | null {
  const t = String(text ?? '').trim();
  if (t === '') return null;
  return NUMBER_TEXT.test(t) ? Number(t) : Number.NaN;
}

/** What a number input can hold and show (the HTML valid floating-point number): no '+', no trailing '.', no spaces. */
const SHOWN_NUMBER = /^-?(\d+(\.\d+)?|\.\d+)(e[+-]?\d+)?$/i;

/**
 * Whether a field's text, from a link, would show in its number input as the figure the tool
 * works with. A blank does; 'abc', '0x10', 'Infinity', '1e999', '+5' and '5.' do not: the input
 * would look empty while the tool kept the hidden text, so the island puts the field back.
 */
export function showsInField(text: string): boolean {
  if (text === '') return true;
  return SHOWN_NUMBER.test(text) && Number.isFinite(Number(text));
}

/* ---------------------------------------------------------------------------------------------
 * The maths: pay − living costs − savings − every plan payment due before the next pay.
 * ------------------------------------------------------------------------------------------- */

export type ErrorCode = 'nan' | 'below-zero' | 'too-big' | 'k-of-n-missing' | 'k-of-n' | 'due' | 'due-too-many';

export type PaydayStatus = 'invalid' | 'no-pay' | 'short-before-plans' | 'no-plans' | 'short-after-plans' | 'ok';

export interface PlanInput {
  amount: number | null;
  k: number | null;
  n: number | null;
  d: number | null;
}

export interface PaydayInput {
  pay: number | null;
  living: number | null;
  savings: number | null;
  plans: PlanInput[];
}

export interface PaydayLine {
  label: string;
  amount: number;
}

export interface PaydayFigures {
  pay: number;
  living: number;
  savings: number;
  afterLiving: number;
  beforePlans: number;
  /** Every row read (at most 8), in order; a row under one whole cent or blank stays as 'Plan n' at 0. */
  lines: PaydayLine[];
  plansTotal: number;
  left: number;
  /** Payments counted: the sum of d over rows holding at least one whole cent. */
  count: number;
  /** Rows holding at least one whole cent. */
  plansCounted: number;
  /** plansTotal ÷ pay, unrounded; null when pay is 0 or no plan is counted. */
  share: number | null;
  owedIncluding: number;
  owedAfter: number;
  lastPayments: boolean;
}

export type PaydayResult =
  | { status: 'invalid'; errors: Record<string, ErrorCode> }
  | (PaydayFigures & { status: Exclude<PaydayStatus, 'invalid'>; errors: Record<string, never> });

function checkMoney(v: number | null): ErrorCode | null {
  if (v === null) return null;
  if (Number.isNaN(v)) return 'nan';
  if (v < 0) return 'below-zero';
  if (!Number.isFinite(v) || v > MAX_MONEY) return 'too-big';
  return null;
}

const isInt = (v: number | null): v is number => v !== null && Number.isInteger(v);

/**
 * What is left of one pay after living costs, savings and the pay-later payments due before the
 * next pay. Validation first (any error returns no figures), then whole cents throughout, so
 * 100 − 3 × 33.33 is 0.01 exactly. The owed figures assume every payment left on a plan is the
 * same size, as in the usual split into four; interest, a different last payment or moved dates
 * are not modelled.
 */
export function paydayAfterPlans(input: PaydayInput): PaydayResult {
  const errors: Record<string, ErrorCode> = {};
  for (const key of ['pay', 'living', 'savings'] as const) {
    const code = checkMoney(input[key]);
    if (code) errors[key] = code;
  }

  const rows = input.plans.slice(0, MAX_PLAN_ROWS);
  rows.forEach((row, i) => {
    const amountCode = checkMoney(row.amount);
    if (amountCode) errors[`plans.${i}.amount`] = amountCode;
    if (row.amount === null || !(toCents(row.amount) > 0)) return; // under one whole cent: not checked, not counted
    const { k, n, d } = row;
    const nCode: ErrorCode | null = n === null ? 'k-of-n-missing' : !isInt(n) || n < 1 || n > MAX_PLAN_PAYMENTS ? 'k-of-n' : null;
    const kCode: ErrorCode | null =
      k === null ? 'k-of-n-missing' : !isInt(k) || k < 1 || k > MAX_PLAN_PAYMENTS || (isInt(n) && k > n) ? 'k-of-n' : null;
    if (kCode) errors[`plans.${i}.k`] = kCode;
    if (nCode) errors[`plans.${i}.n`] = nCode;
    if (!isInt(d) || d < 1 || d > MAX_PLAN_DUE) errors[`plans.${i}.d`] = 'due';
    else if (!kCode && !nCode && (k as number) + d - 1 > (n as number)) errors[`plans.${i}.d`] = 'due-too-many';
  });

  if (Object.keys(errors).length > 0) return { status: 'invalid', errors };

  const payC = toCents(input.pay ?? 0);
  const livingC = toCents(input.living ?? 0);
  const savingsC = toCents(input.savings ?? 0);
  const afterLivingC = payC - livingC;
  const beforePlansC = afterLivingC - savingsC;

  let plansTotalC = 0;
  let owedIncludingC = 0;
  let owedAfterC = 0;
  let count = 0;
  let plansCounted = 0;
  const lines: PaydayLine[] = rows.map((row, i) => {
    const counted = row.amount !== null && toCents(row.amount) > 0;
    if (!counted) return { label: `Plan ${i + 1}`, amount: 0 };
    const aC = toCents(row.amount as number);
    const k = row.k as number;
    const n = row.n as number;
    const d = row.d as number;
    const takenC = aC * d;
    plansTotalC += takenC;
    owedIncludingC += aC * (n - k + 1);
    owedAfterC += aC * (n - k - d + 1);
    count += d;
    plansCounted += 1;
    return { label: d > 1 ? `Plan ${i + 1}, ${d} payments` : `Plan ${i + 1}`, amount: fromCents(takenC) };
  });

  const leftC = beforePlansC - plansTotalC;
  const status: Exclude<PaydayStatus, 'invalid'> =
    payC === 0 ? 'no-pay' : beforePlansC < 0 ? 'short-before-plans' : count === 0 ? 'no-plans' : leftC < 0 ? 'short-after-plans' : 'ok';

  return {
    status,
    errors: {},
    pay: fromCents(payC),
    living: fromCents(livingC),
    savings: fromCents(savingsC),
    afterLiving: fromCents(afterLivingC),
    beforePlans: fromCents(beforePlansC),
    lines,
    plansTotal: fromCents(plansTotalC),
    left: fromCents(leftC),
    count,
    plansCounted,
    share: payC > 0 && count > 0 ? plansTotalC / payC : null,
    owedIncluding: fromCents(owedIncludingC),
    owedAfter: fromCents(owedAfterC),
    lastPayments: count > 0 && owedAfterC === 0,
  };
}

/* ---------------------------------------------------------------------------------------------
 * Words: the one plain sentence, the fact labels, the error messages, the fee note.
 * ------------------------------------------------------------------------------------------- */

/** Money in the reader's locale, with decimals only when there are any. */
export const figure = (value: number, locale: Locale): string => money(value, locale, Number.isInteger(value) ? 0 : 2);

export interface Words {
  one: string;
  other: string;
}

/** "this instalment" or "these instalments", by the number of payments counted. */
export const theseWords = (count: number, words: Words): string => (count === 1 ? `this ${words.one}` : `these ${words.other}`);

/** "The plan takes" or "The plans take", by the number of plans counted. */
export const takeWords = (plansCounted: number): string => (plansCounted === 1 ? 'The plan takes' : 'The plans take');

/**
 * The result in one plain sentence. Arithmetic only: no branch says overspent, avoid, cut, should
 * or free, and a shortfall before any plan never blames the plans.
 */
export function paydaySentence(r: PaydayResult, locale: Locale, words: Words): string {
  if (r.status === 'invalid') return 'A number above needs a change first: the note under it says what.';
  if (r.status === 'no-pay') return 'Enter the pay arriving this payday to see what is left.';

  const m = (v: number) => figure(v, locale);
  const word = r.count === 1 ? words.one : words.other;
  const take = takeWords(r.plansCounted);
  const them = r.plansCounted === 1 ? 'it' : 'them';
  const savingsPart = r.savings > 0 ? `, ${m(r.savings)} to savings` : '';
  const leftOf = `${r.left === 0 ? 'nothing is left' : `${m(r.left)} is left`} of ${m(r.pay)}`;

  if (r.status === 'short-before-plans') {
    const gap = m(-r.beforePlans);
    const first =
      r.savings > 0
        ? `Living costs and savings come to ${m(fromCents(toCents(r.living) + toCents(r.savings)))}, ${gap} more than this pay of ${m(r.pay)}, before any plan.`
        : `Living costs of ${m(r.living)} are ${gap} more than this pay of ${m(r.pay)}, before any plan.`;
    return r.count > 0 ? `${first} On top of that, ${take.toLowerCase()} ${m(r.plansTotal)}.` : first;
  }
  if (r.status === 'no-plans') return `No pay-later payments are entered. After living costs${savingsPart}, ${leftOf}.`;
  if (r.status === 'short-after-plans') {
    return `This pay is ${m(-r.left)} short after ${r.count} ${word}: living costs${r.savings > 0 ? ' and savings' : ''} leave ${m(r.beforePlans)}, and ${take.toLowerCase()} ${m(r.plansTotal)}.`;
  }
  const these = theseWords(r.count, words);
  const owed = r.owedAfter === 0 ? `nothing is owed on ${them} after ${these}` : `${m(r.owedAfter)} is still owed on ${them} after ${these}`;
  return `After living costs${savingsPart} and ${r.count} ${word}, ${leftOf}. ${take} ${m(r.plansTotal)}, ${percent(r.share ?? 0, locale, 1)} of this pay, and ${owed}.`;
}

export type FieldKind = 'pay' | 'living' | 'savings' | 'amount' | 'k' | 'n' | 'd';

const BELOW_ZERO: Record<'pay' | 'living' | 'savings' | 'amount', string> = {
  pay: 'Pay cannot be below 0.',
  living: 'Living costs cannot be below 0.',
  savings: 'Savings cannot be below 0.',
  amount: 'A payment cannot be below 0.',
};

const K_OF_N_MISSING = 'Enter the payment number and the total as the plan shows them, for example payment 2 of 4.';

/**
 * The text under a field for an error code. `remaining` is the plan's payments left counting this
 * one (n − k + 1), for 'due-too-many'.
 */
export function errorText(field: FieldKind, code: ErrorCode, locale: Locale, remaining = 0): string {
  switch (code) {
    case 'nan':
      return 'Enter a number.';
    case 'below-zero':
      return field === 'pay' || field === 'living' || field === 'savings' || field === 'amount' ? BELOW_ZERO[field] : 'Enter a number from 1.';
    case 'too-big':
      return `Enter an amount up to ${number(MAX_MONEY, locale)}.`;
    case 'k-of-n-missing':
      return K_OF_N_MISSING;
    case 'k-of-n':
      return field === 'n' ? `A plan here can have from 1 to ${MAX_PLAN_PAYMENTS} payments.` : 'Payment number must be a whole number, no higher than the total.';
    case 'due':
      return `Choose from 1 to ${MAX_PLAN_DUE}.`;
    case 'due-too-many':
      return remaining === 1 ? 'This plan has only 1 payment left, counting this one.' : `This plan has only ${remaining} payments left, counting this one.`;
  }
}

/** The fee the note names, in the edition's currency: the lesson's example or the sourced rule's value. */
export function lateFeeAmount(config: PayLaterPaydayConfig): number | null {
  const fee = config.feeNote.fee;
  if (fee.kind === 'example') return fee.amount;
  const rule = (config.rules ?? []).find((r) => r.key === fee.ruleKey);
  return rule ? rule.value : null;
}

export type TextPart = { text: string } | { text: string; href: string };

/**
 * A config text split around {fee} and {link}, ready to render. The fee is written in the
 * edition's own locale (passed in), never the currency picker's: it is a Europe or US figure.
 */
export function textParts(text: string, config: PayLaterPaydayConfig, editionLocale: Locale): TextPart[] {
  const fee = lateFeeAmount(config);
  const feeText = fee === null ? '' : money(fee, editionLocale, Number.isInteger(fee) ? 0 : 2);
  const link = config.feeNote.link;
  const parts: TextPart[] = [];
  for (const piece of text.split(/(\{fee\}|\{link\})/)) {
    if (piece === '') continue;
    if (piece === '{fee}') parts.push({ text: feeText });
    else if (piece === '{link}') parts.push(link ? { text: link.text, href: link.url } : { text: '' });
    else parts.push({ text: piece });
  }
  return parts;
}

/** The fee note as plain text, for tests and for the page's text alternative. */
export const plainText = (parts: TextPart[]): string => parts.map((p) => p.text).join('');

/* ---------------------------------------------------------------------------------------------
 * The shared link: every figure after the #, the plans through their own codec.
 * ------------------------------------------------------------------------------------------- */

export function linkQuery(fields: { pay: string; living: string; savings: string }, rows: readonly PlanRowText[], cur: string): Record<string, string> {
  return { pay: fields.pay, living: fields.living, savings: fields.savings, plans: encodePlans(rows), cur };
}
