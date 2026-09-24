/** A loan's cost as a yearly rate: each edition's opening values, with the sources behind them, and the pure maths. Owned by the yearly-rate builder. Tool maths and pins from the revised spec go here and in tests/unit/tools/yearly-rate.test.ts, never in finance.ts; defaults and rules go in CONFIG, never in regions.ts. The names CONFIG and YearlyRateConfig are imported by the page and must stay. */
import { readAmount } from '../fields';
import { fromCents, roundTo, toCents } from '../finance';
import { money, number, plural, ratePercent, type Locale } from '../format';
import type { EditionConfigs, Rule, ToolConfig } from './types';

/* ---------------------------------------------------------------------------------------------
 * Config: the example the page opens on, and the method it follows, per edition.
 * ------------------------------------------------------------------------------------------- */

export const PERIODS = ['week', 'month', 'days'] as const;
export type Period = (typeof PERIODS)[number];
export const FIRSTS = ['later', 'on-the-day'] as const;
export type First = (typeof FIRSTS)[number];

/** The fields as typed. A type alias, not an interface, so it fits the kit's Record<string, string>. */
export type YearlyRateDefaults = {
  amount: string;
  fee: string;
  repayment: string;
  count: string;
  period: string;
  days: string;
  first: string;
};

export interface YearlyRateConfig extends ToolConfig {
  defaults: YearlyRateDefaults;
  rules: Rule[];
}

const RBI_DIRECTIONS = 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12942';

export const CONFIG: EditionConfigs<YearlyRateConfig> = {
  in: {
    scenario: 'A ₹5,000 app loan from the lesson, with ₹5,500 due back seven days later.',
    defaults: { amount: '5000', fee: '0', repayment: '5500', count: '1', period: 'week', days: '7', first: 'later' },
    rulesLead: 'Method as of',
    glossary: ['apr', 'key-facts-statement', 'gst', 'rbi'],
    rules: [
      {
        key: 'monthsPerYear',
        value: 12,
        label: 'The APR on a Key Facts Statement is worked out on the amount that reaches you, by the IRR and reducing-balance method; in the Directions’ own example that is the monthly rate times 12',
        source: { title: 'Reserve Bank of India, Responsible Business Conduct Directions, 2025, updated 1 July 2026', url: RBI_DIRECTIONS },
        asOf: '2026-09-22',
      },
      {
        // Kept out of the RulesLine: the Directions set no day count, so it is the lesson's method,
        // explained in How this is worked out, not a figure the Reserve Bank publishes.
        key: 'daysPerYear',
        value: 365,
        label:
          'For a period counted in days, a year is 365 days, so the periods in a year are 365 ÷ the days (the lesson’s method). The Directions set no day count, so a lender’s APR on a loan counted in days can differ: 500.4% day by day against 521.4% here on the 7-day example',
        source: {
          title: 'Reserve Bank of India (Non-Banking Financial Companies – Responsible Business Conduct) Directions, 2025, RBI/DOR/2025-26/362, 28 November 2025, updated as on 1 July 2026 (no day count stated)',
          url: RBI_DIRECTIONS,
        },
        asOf: '2026-09-22',
        inLine: false,
      },
      {
        // A unit-test pin, quoted in How this is worked out; never part of the sum.
        key: 'kfsIllustrationApr',
        value: 17.07,
        label:
          'The Directions’ Key Facts Statement example: ₹20,000 sanctioned at 15% fixed, ₹400 of fees, ₹19,600 reaching the borrower, 24 monthly instalments (₹970 printed, ₹969.73 unrounded), repayments starting 30 days after sanction, ₹3,274 of interest, APR 17.07%',
        source: {
          title: 'Reserve Bank of India (Non-Banking Financial Companies – Responsible Business Conduct) Directions, 2025, RBI/DOR/2025-26/362, Key Facts Statement illustrative example',
          url: RBI_DIRECTIONS,
        },
        asOf: '2026-09-22',
        inLine: false,
      },
    ],
  },
};

/* ---------------------------------------------------------------------------------------------
 * The maths. Money is held in whole paise; the rate per period is solved on what reaches you.
 * ------------------------------------------------------------------------------------------- */

export const MAX_AMOUNT = 1e12;
export const MAX_COUNT = 600;
export const MAX_DAYS = 3650;
/** The search for a period's rate stops here; the page shows anything this large as "over 10,000%". */
export const RATE_CAP = 1e6;
/** Above this many repayments, the table groups them in twelves. */
export const SCHEDULE_ROWS_MAX = 60;
export const SCHEDULE_GROUP = 12;

export interface RateBasis {
  monthsPerYear: number;
  daysPerYear: number;
}

export const DEFAULT_BASIS: RateBasis = { monthsPerYear: 12, daysPerYear: 365 };

/** The method from an edition's rules, falling back to 12 months and 365 days for a missing key. */
export function basisFrom(rules: readonly Rule[] | undefined): RateBasis {
  const value = (key: string, fallback: number) => {
    const rule = rules?.find((r) => r.key === key);
    return rule && Number.isFinite(rule.value) && rule.value > 0 ? rule.value : fallback;
  };
  return { monthsPerYear: value('monthsPerYear', DEFAULT_BASIS.monthsPerYear), daysPerYear: value('daysPerYear', DEFAULT_BASIS.daysPerYear) };
}

export const isPeriod = (v: unknown): v is Period => typeof v === 'string' && (PERIODS as readonly string[]).includes(v);
export const isFirst = (v: unknown): v is First => typeof v === 'string' && (FIRSTS as readonly string[]).includes(v);

export interface YearlyRateInput {
  amount: number | null;
  /** Blank is 0. */
  fee: number | null;
  repayment: number | null;
  count: number | null;
  period: Period;
  /** Read only when period is 'days'. */
  days?: number | null;
  first: First;
}

export type FieldKey = 'amount' | 'fee' | 'repayment' | 'count' | 'days';
/** required: blank, 0, below the minimum or unreadable. negative: a fee below 0. too-large: above the field's ceiling. */
export type ErrorCode = 'required' | 'negative' | 'too-large';
export type Note = 'count-floored' | 'days-floored';

/** What every worked result shares: the shape of the loan, and the money in and out. */
interface Shape {
  period: Period;
  /** Days in each period: 7 for a week, the typed whole number for 'days', 0 for a month. */
  days: number;
  /** Repayments typed, as a whole number. */
  count: number;
  /** Repayments after the day the money arrives. */
  later: number;
  onTheDay: boolean;
  periodsPerYear: number;
  notes: Note[];
}

interface Money {
  amount: number;
  fee: number;
  /** The first repayment, when it is paid on the day; otherwise 0. */
  firstOnTheDay: number;
  /** Fees plus a first repayment on the day: everything taken before the money is yours. */
  dayPaid: number;
  /** What reaches you. Zero or below for 'nothing-reaches-you'. */
  received: number;
  repayment: number;
  /** Every repayment after the day, added up. */
  repaid: number;
}

export interface InvalidResult {
  kind: 'invalid';
  errors: Partial<Record<FieldKey, ErrorCode>>;
  notes: Note[];
}
export interface NothingLentResult extends Shape {
  kind: 'nothing-lent';
}
export interface NothingReachesResult extends Shape, Money {
  kind: 'nothing-reaches-you';
}
export interface RepaidLessResult extends Shape, Money {
  kind: 'repaid-less';
}
export interface ZeroResult extends Shape, Money {
  kind: 'zero';
  cost: 0;
  /** What reached you minus what is repaid, within a paisa per instalment: +0.01 or −0.02. */
  rounding: number;
  perPeriod: 0;
  perPeriodDp: number;
  perPeriodShown: 0;
  yearlyShown: 0;
}
export interface RateResult extends Shape, Money {
  kind: 'rate';
  cost: number;
  /** The rate per period as a fraction: 0.1 is 10%. */
  perPeriod: number;
  perPeriodDp: number;
  /** The rate per period in percent, rounded for display. */
  perPeriodShown: number;
  /** perPeriodShown × periodsPerYear to one decimal: the headline, so the ledger multiplies out. */
  yearlyShown: number;
  /** perPeriod × 100 × periodsPerYear, unrounded. */
  nominal: number;
  /** The same charge paid period after period for a year, in percent. May be Infinity. */
  compounded: number;
  capped: boolean;
}

export type YearlyRateResult = InvalidResult | NothingLentResult | NothingReachesResult | RepaidLessResult | ZeroResult | RateResult;

/**
 * A typed figure: null for blank or unreadable. A number too large to hold keeps its sign, so a
 * hugely negative one reads as −Infinity (the amount is then "required", a fee "negative") and
 * only a hugely positive one is "too large".
 */
export function readFigure(raw: string): number | null {
  const { value, tooBig } = readAmount(raw);
  if (!tooBig) return value;
  return /^[^\d]*-/.test(String(raw ?? '').trim()) ? -Infinity : Infinity;
}

/** The rate per period is shown to more places the more periods a year holds. */
export const periodDp = (periodsPerYear: number): number => (periodsPerYear <= 13 ? 3 : periodsPerYear <= 60 ? 4 : 5);

/** What n equal repayments of r, one period apart starting one period after, are worth now at rate i. */
function presentValue(i: number, r: number, n: number): number {
  // −expm1(−n·log1p(i)) is 1 − (1 + i)^−n without losing the digits of a tiny rate.
  return (r * -Math.expm1(-n * Math.log1p(i))) / i;
}

/** The one rate per period at which `later` repayments of `r` pay off exactly `received`. */
function solveRate(received: number, r: number, later: number): { rate: number; capped: boolean } {
  let hi = 1;
  while (presentValue(hi, r, later) > received && hi < RATE_CAP) hi *= 2;
  if (presentValue(hi, r, later) > received) return { rate: RATE_CAP, capped: true };
  let lo = 0;
  for (let step = 0; step < 200; step++) {
    const mid = (lo + hi) / 2;
    if (presentValue(mid, r, later) > received) lo = mid;
    else hi = mid;
  }
  return { rate: (lo + hi) / 2, capped: false };
}

export function yearlyRate(input: YearlyRateInput, basis: RateBasis = DEFAULT_BASIS): YearlyRateResult {
  const period: Period = isPeriod(input.period) ? input.period : 'week';
  const first: First = isFirst(input.first) ? input.first : 'later';
  const errors: Partial<Record<FieldKey, ErrorCode>> = {};
  const notes: Note[] = [];

  // 1. Every field first; any error means no rate at all.
  const checkAmount = (key: 'amount' | 'repayment', v: number | null) => {
    if (v === null || Number.isNaN(v) || v <= 0) errors[key] = 'required';
    else if (v > MAX_AMOUNT) errors[key] = 'too-large';
  };
  checkAmount('amount', input.amount);
  checkAmount('repayment', input.repayment);

  const fee = input.fee === null ? 0 : input.fee;
  if (Number.isNaN(fee) || fee < 0) errors.fee = 'negative';
  else if (fee > MAX_AMOUNT) errors.fee = 'too-large';

  const count = input.count;
  const n = count === null || Number.isNaN(count) ? 0 : Math.floor(count);
  if (n < 1) errors.count = 'required';
  else if (n > MAX_COUNT) errors.count = 'too-large';
  else if (n !== count) notes.push('count-floored');

  let d = period === 'week' ? 7 : 0;
  if (period === 'days') {
    const days = input.days ?? null;
    d = days === null || Number.isNaN(days) ? 0 : Math.floor(days);
    if (d < 1) errors.days = 'required';
    else if (d > MAX_DAYS) errors.days = 'too-large';
    else if (d !== days) notes.push('days-floored');
  }

  if (Object.keys(errors).length > 0) return { kind: 'invalid', errors, notes };

  const onTheDay = first === 'on-the-day';
  const later = onTheDay ? n - 1 : n;
  // 4. Month is exactly the edition's months; every day count is the year's days ÷ the days.
  const periodsPerYear = period === 'month' ? basis.monthsPerYear : basis.daysPerYear / d;
  const shape: Shape = { period, days: d, count: n, later, onTheDay, periodsPerYear, notes };

  // 2. One repayment, made on the day: nothing is borrowed.
  if (later < 1) return { kind: 'nothing-lent', ...shape };

  // 3. Whole paise from here on.
  const amountC = toCents(input.amount!);
  const feeC = toCents(fee);
  const repC = toCents(input.repayment!);
  const dayC = onTheDay ? repC : 0;
  const receivedC = amountC - feeC - dayC;
  const repaidC = repC * later;
  const cash: Money = {
    amount: fromCents(amountC),
    fee: fromCents(feeC),
    firstOnTheDay: fromCents(dayC),
    dayPaid: fromCents(feeC + dayC),
    received: fromCents(receivedC),
    repayment: fromCents(repC),
    repaid: fromCents(repaidC),
  };
  if (receivedC <= 0) return { kind: 'nothing-reaches-you', ...shape, ...cash };

  // 5. A paisa per instalment either way is rounding, not a cost.
  const gapC = repaidC - receivedC;
  const tolerance = n;
  if (gapC < -tolerance) return { kind: 'repaid-less', ...shape, ...cash };
  const perPeriodDp = periodDp(periodsPerYear);
  if (Math.abs(gapC) <= tolerance) {
    return { kind: 'zero', ...shape, ...cash, cost: 0, rounding: gapC === 0 ? 0 : fromCents(-gapC), perPeriod: 0, perPeriodDp, perPeriodShown: 0, yearlyShown: 0 };
  }

  // 6. The rate per period on what reached you.
  const { rate: i, capped } = later === 1 ? { rate: gapC / receivedC, capped: false } : solveRate(receivedC / 100, repC / 100, later);

  // 7. Shown rates: the headline is the rate shown times the periods, so the ledger multiplies out.
  const perPeriodShown = roundTo(i * 100, perPeriodDp);
  const yearlyShown = roundTo(perPeriodShown * periodsPerYear, 1);
  return {
    kind: 'rate',
    ...shape,
    ...cash,
    cost: fromCents(gapC),
    perPeriod: i,
    perPeriodDp,
    perPeriodShown,
    yearlyShown,
    nominal: i * 100 * periodsPerYear,
    compounded: (Math.pow(1 + i, periodsPerYear) - 1) * 100,
    capped,
  };
}

/* ---------------------------------------------------------------------------------------------
 * Repayment by repayment, for instalments.
 * ------------------------------------------------------------------------------------------- */

/** One repayment (from === to) or a group of them. Money in rupees, from whole paise. */
export interface ScheduleRow {
  from: number;
  to: number;
  paid: number;
  charge: number;
  paidOff: number;
  /** Still owed after this row. */
  owed: number;
}

/**
 * Each repayment pays the period's charge on what is still owed at the rate found, and the rest
 * comes off. Worked in whole paise; the last row pays off exactly what is left, so the table ends
 * at 0 and takes up the rounding. Rows are numbered as the reader counted them: from 2 when the
 * first repayment was on the day. Empty for anything but a rate over more than one repayment, and
 * empty when the rounding does not hold (see the check after the loop).
 */
export function rateSchedule(result: YearlyRateResult, repayment?: number): ScheduleRow[] {
  if (result.kind !== 'rate' || result.later <= 1 || result.capped) return [];
  const repC = toCents(repayment ?? result.repayment);
  const start = result.onTheDay ? 2 : 1;
  let owedC = toCents(result.received);
  const rows: ScheduleRow[] = [];
  for (let k = 0; k < result.later; k++) {
    const chargeC = Math.round(owedC * result.perPeriod);
    const last = k === result.later - 1;
    const offC = last ? owedC : repC - chargeC;
    const paidC = last ? owedC + chargeC : repC;
    owedC -= offC;
    rows.push({ from: start + k, to: start + k, paid: fromCents(paidC), charge: fromCents(chargeC), paidOff: fromCents(offC), owed: fromCents(owedC) });
  }
  // A row rounded to the paisa carries its error forward, multiplied by (1 + i) each period; at a
  // high rate over many periods the last row drifts from the instalment, so the table is left out
  // rather than printed wrong. A row before the last that pays off nothing is the same drift.
  if (Math.abs(toCents(rows[rows.length - 1].paid) - repC) >= 100) return [];
  if (rows.some((row, k) => k < rows.length - 1 && row.paidOff <= 0)) return [];
  return rows;
}

/** Rows in groups of `size`: paid, charge and paid off summed, still owed at the group's end. */
export function groupSchedule(rows: readonly ScheduleRow[], size = SCHEDULE_GROUP): ScheduleRow[] {
  const groups: ScheduleRow[] = [];
  for (let at = 0; at < rows.length; at += size) {
    const part = rows.slice(at, at + size);
    const sum = (pick: (row: ScheduleRow) => number) => fromCents(part.reduce((total, row) => total + toCents(pick(row)), 0));
    groups.push({
      from: part[0].from,
      to: part[part.length - 1].to,
      paid: sum((r) => r.paid),
      charge: sum((r) => r.charge),
      paidOff: sum((r) => r.paidOff),
      owed: part[part.length - 1].owed,
    });
  }
  return groups;
}

/** The table as the page shows it: one row per repayment up to 60, twelves above that. */
export function scheduleForTable(result: YearlyRateResult): ScheduleRow[] {
  const rows = rateSchedule(result);
  return rows.length > SCHEDULE_ROWS_MAX ? groupSchedule(rows) : rows;
}

export const rowLabel = (row: ScheduleRow): string => (row.from === row.to ? String(row.from) : `${row.from}–${row.to}`);

/* ---------------------------------------------------------------------------------------------
 * Words. Pure, so every branch is pinned in the unit tests.
 * ------------------------------------------------------------------------------------------- */

/** Money with decimals only when there are any: ₹5,000 beside ₹0.01. */
export const amountText = (value: number, locale: Locale): string => money(value, locale, Number.isInteger(value) ? 0 : 2);

export interface PeriodWords {
  /** 'after 7 days' */
  after: string;
  /** 'for the 7 days' */
  forSpan: string;
  /** 'one each week' */
  cadence: string;
  /** 'a week', said of a rate */
  perUnit: string;
  /** 'each week', in the ledger's rate line */
  each: string;
}

export function periodWords(period: Period, days: number, locale: Locale): PeriodWords {
  if (period === 'week') return { after: 'after 7 days', forSpan: 'for the 7 days', cadence: 'one each week', perUnit: 'a week', each: 'each week' };
  if (period === 'month') return { after: 'after a month', forSpan: 'for the month', cadence: 'one each month', perUnit: 'a month', each: 'each month' };
  if (days === 1) return { after: 'after 1 day', forSpan: 'for the day', cadence: 'one each day', perUnit: 'a day', each: 'each day' };
  const d = number(days, locale);
  return { after: `after ${d} days`, forSpan: `for the ${d} days`, cadence: `one every ${d} days`, perUnit: `for each ${d} days`, each: `each ${d} days` };
}

/** "under 0.1%" (or the step of dp), for a positive rate that would otherwise print as 0%. */
const underText = (dp: number, locale: Locale) => ratePercent(10 ** -(dp + 1), locale, dp);
const overText = (locale: Locale) => ratePercent(Infinity, locale, 1);

/** The rate for one period as the ledger and the sentence show it. */
export function periodRateText(result: YearlyRateResult, locale: Locale): string {
  if (result.kind === 'zero') return ratePercent(0, locale, result.perPeriodDp);
  if (result.kind !== 'rate') return '—';
  if (result.capped) return overText(locale);
  if (result.perPeriodShown === 0 && result.perPeriod > 0) return underText(result.perPeriodDp, locale);
  return ratePercent(result.perPeriodShown, locale, result.perPeriodDp);
}

/** The headline: the yearly rate, "over 10,000%" above the cap, "under 0.1%" for a cost that rounds away. */
export function yearlyText(result: YearlyRateResult, locale: Locale): string {
  if (result.kind === 'zero') return ratePercent(0, locale, 1);
  if (result.kind !== 'rate') return '—';
  if (result.capped) return overText(locale);
  if (result.yearlyShown === 0 && result.cost > 0) return underText(1, locale);
  return ratePercent(result.yearlyShown, locale, 1);
}

/** The same charge paid period after period, for How this is worked out. Never the headline. */
export const compoundedText = (result: RateResult, locale: Locale): string =>
  result.capped ? overText(locale) : ratePercent(result.compounded, locale, 1);

export function errorText(field: FieldKey, code: ErrorCode, locale: Locale): string {
  if (code === 'too-large') {
    if (field === 'count') return `This tool works up to ${number(MAX_COUNT, locale)} repayments.`;
    if (field === 'days') return `Enter ${number(MAX_DAYS, locale)} days (ten years) or fewer.`;
    return `Enter an amount of ${money(MAX_AMOUNT, locale)} or less.`;
  }
  if (field === 'fee') return 'Fees cannot be below 0. Type 0 if there are none.';
  if (field === 'amount') return 'Enter the amount borrowed, more than 0.';
  if (field === 'repayment') return 'Enter the repayment, more than 0.';
  if (field === 'count') return 'Enter how many repayments, at least 1.';
  return 'Enter the days in each period, at least 1.';
}

export const NOTHING_LENT_ERROR = 'With one repayment made on the day, nothing is borrowed. Choose one period after, or count more repayments.';

/** The line under a field whose number was rounded down. Not an error. */
export function noteText(note: Note, whole: number, locale: Locale): string {
  if (note === 'count-floored') return `Counted as ${number(whole, locale)}: repayments come whole.`;
  return `Counted as ${number(whole, locale)} ${plural(whole, 'day', 'days', locale)}.`;
}

const NOT_COUNTED = 'Anything not typed here, such as tax added to each instalment or a late fee, is not counted.';

/** The one-sentence result. First match wins; no branch judges the loan or compares offers. */
export function resultSentence(result: YearlyRateResult, locale: Locale): string {
  const m = (v: number) => amountText(v, locale);
  switch (result.kind) {
    case 'invalid':
      return 'Fix the figure marked above to see the yearly rate.';
    case 'nothing-lent':
      return 'With one repayment made on the day, nothing is borrowed, so there is no rate to work out.';
    case 'nothing-reaches-you':
      return result.onTheDay
        ? `The fees and the first repayment take all of the ${m(result.amount)}, so nothing reaches you and there is no rate to work out.`
        : `The fees and charges take all of the ${m(result.amount)}, so nothing reaches you and there is no rate to work out.`;
    case 'repaid-less':
      return `The repayments add up to ${m(result.repaid)}, less than the ${m(result.received)} that reached you, so there is no cost to work out. Check each figure against the offer.`;
    case 'zero':
      return result.rounding === 0
        ? `From these figures you pay back exactly what reached you: ${yearlyText(result, locale)} a year. ${NOT_COUNTED}`
        : `From these figures you pay back what reached you, give or take ${m(Math.abs(result.rounding))} of rounding in the instalments: ${yearlyText(result, locale)} a year. ${NOT_COUNTED}`;
    case 'rate': {
      const w = periodWords(result.period, result.days, locale);
      const rate = periodRateText(result, locale);
      const yearly = yearlyText(result, locale);
      const tail =
        result.later === 1
          ? `costs ${m(result.cost)}: ${rate} ${w.forSpan}, which is ${yearly} a year.`
          : `costs ${m(result.cost)}: ${rate} ${w.perUnit} on what is still owed, which is ${yearly} a year.`;
      const repaying =
        result.later === 1
          ? `repaying ${m(result.repayment)} ${w.after}`
          : `repaying ${number(result.later, locale)} × ${m(result.repayment)}, ${w.cadence},`;
      return result.onTheDay
        ? `With ${m(result.dayPaid)} paid on the day, ${m(result.received)} is borrowed, and ${repaying} ${tail}`
        : `Getting ${m(result.received)} and ${repaying} ${tail}`;
    }
  }
}

/** One ledger line: `op` prints before the figure, `subtotal` a single rule, `main` the double, `note` a line under it. */
export interface LedgerLine {
  label: string;
  value: string;
  op?: '−' | '+' | '×';
  subtotal?: boolean;
  main?: boolean;
  note?: string;
}

/**
 * The results ledger, each row adding up to the next: what reaches you, what is repaid, the cost,
 * the rate for a period, times the periods in a year, the yearly rate. A figure not worked out
 * yet is a dash.
 */
export function ledgerLines(result: YearlyRateResult, locale: Locale, basis: RateBasis = DEFAULT_BASIS): LedgerLine[] {
  const m = (v: number) => amountText(v, locale);
  if (result.kind === 'invalid' || result.kind === 'nothing-lent') {
    return [
      { label: 'Amount borrowed', value: '—' },
      { label: 'Fees and charges at the start', value: '—' },
      { label: 'Reaches you', value: '—', subtotal: true },
      { label: 'Repaid', value: '—' },
      { label: 'Cost of borrowing', value: '—', subtotal: true },
      { label: 'Yearly rate', value: '—', main: true },
    ];
  }

  const w = periodWords(result.period, result.days, locale);
  const lines: LedgerLine[] = [
    { label: 'Amount borrowed', value: m(result.amount) },
    { label: 'Fees and charges at the start', value: m(result.fee), op: '−' },
  ];
  if (result.onTheDay) lines.push({ label: 'First repayment, paid on the day', value: m(result.firstOnTheDay), op: '−' });
  // A figure below 0 never stands alone: the note under it says nothing reaches you.
  const short =
    result.kind === 'nothing-reaches-you' && result.received < 0
      ? result.onTheDay
        ? 'The fees and the first repayment are more than the amount, so nothing reaches you.'
        : 'The fees and charges are more than the amount, so nothing reaches you.'
      : undefined;
  lines.push({ label: 'Reaches you', value: m(result.received), subtotal: true, ...(short ? { note: short } : {}) });

  if (result.kind === 'nothing-reaches-you') {
    lines.push({ label: 'Cost of borrowing', value: '—', subtotal: true }, { label: 'Yearly rate', value: '—', main: true });
    return lines;
  }

  const each = m(result.repayment);
  const repaidLabel =
    result.later === 1
      ? `Repaid ${w.after}`
      : result.onTheDay
        ? `Repaid later, ${number(result.later, locale)} × ${each}`
        : `Repaid, ${number(result.later, locale)} × ${each}, the first one period after`;
  lines.push({ label: repaidLabel, value: m(result.repaid) });

  if (result.kind === 'repaid-less') {
    lines.push({ label: 'Cost of borrowing', value: '—', subtotal: true }, { label: 'Yearly rate', value: '—', main: true });
    return lines;
  }

  if (result.kind === 'zero' && result.rounding !== 0) {
    lines.push({ label: 'Rounding in the instalments', value: m(Math.abs(result.rounding)), op: result.rounding > 0 ? '+' : '−' });
  }
  lines.push({ label: 'Cost of borrowing', value: m(result.kind === 'zero' ? 0 : result.cost), subtotal: true });

  lines.push({
    label: result.later === 1 ? `Rate ${w.forSpan}` : `Rate for ${w.each}, on what is still owed`,
    value: periodRateText(result, locale),
  });

  if (result.period === 'month') {
    lines.push({ label: 'Periods in a year', value: number(basis.monthsPerYear, locale), op: '×' });
  } else {
    const periods = result.periodsPerYear;
    const shown = new Intl.NumberFormat(locale.code, { maximumFractionDigits: 2 }).format(roundTo(periods, 2));
    lines.push({
      label: Number.isInteger(periods) ? `Periods in a year, ${shown}` : `Periods in a year, about ${shown}`,
      value: `${number(basis.daysPerYear, locale)} ÷ ${number(result.days, locale)}`,
      op: '×',
    });
  }
  lines.push({ label: 'Yearly rate', value: yearlyText(result, locale), main: true });
  return lines;
}
