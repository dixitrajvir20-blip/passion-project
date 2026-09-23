/** Buffer target and the payday it is reached: each edition's opening values, with the sources behind them, and the pure maths. Owned by the buffer-target builder. Tool maths and pins from the revised spec go here and in tests/unit/tools/buffer-target.test.ts, never in finance.ts; defaults and rules go in CONFIG, never in regions.ts. The names CONFIG and BufferTargetConfig are imported by the page and must stay. */
import { PAYDAYS_PER_YEAR, toCents, type PayFrequency } from '../finance';
import { readAmount } from '../fields';
import type { Source } from '../regions';
import type { EditionConfigs, Rule, ToolConfig } from './types';

/* ---------------------------------------------------------------------------------------------
 * Config: plain JSON, passed by the page to the island for one edition.
 * ------------------------------------------------------------------------------------------- */

/** The fields a link or the page can set, as the reader typed them. */
export interface BufferFields {
  essentials: string;
  months: string;
  saved: string;
  perPayday: string;
  paidEvery: PayFrequency;
}

/** The US survey's $400, printed in dollars whatever the reader's locale. */
export type MilestoneRule = Rule & { currency: 'USD' };

export interface BufferTargetConfig extends ToolConfig {
  defaults: BufferFields;
  /** India and Europe say payday; the United States says paycheck. */
  paydayWord: 'payday' | 'paycheck';
  /** Why the months field opens where it does, in this edition's lesson. */
  monthsHint: string;
  /** Present only in the US edition: also listed in rules, so the page prints its source and date. */
  milestone?: MilestoneRule;
  /** A last paragraph for "How this is worked out", with the source it rests on. */
  howNote?: { text: string; source: Source };
}

const MILESTONE: MilestoneRule = {
  key: 'milestone',
  value: 400,
  currency: 'USD',
  label:
    '$400, the hypothetical emergency expense in the Federal Reserve’s 2025 household survey (fielded October 2025, published 13 May 2026): its example, not a rule',
  source: {
    title: 'Federal Reserve Board issues Economic Well-Being of U.S. Households in 2025 report (press release, 13 May 2026)',
    url: 'https://www.federalreserve.gov/newsevents/pressreleases/other20260513a.htm',
  },
  asOf: '2026-09-22',
  // The next survey (expected May 2027) replaces the 63% and may change the example expense.
  reviewBy: '2027-05-31',
};

export const CONFIG: EditionConfigs<BufferTargetConfig> = {
  in: {
    scenario: 'Five costs from a month of part-time pay, ₹5,500, with ₹2,000 moved aside each payday.',
    glossary: ['emergency-fund'],
    defaults: { essentials: '5500', months: '1', saved: '0', perPayday: '2000', paidEvery: 'monthly' },
    paydayWord: 'payday',
    monthsHint: 'The lesson starts at one month of costs.',
  },
  eu: {
    scenario: 'Four essentials, €730 a month, held for three months, with €185 moved aside each payday.',
    glossary: ['emergency-fund'],
    defaults: { essentials: '730', months: '3', saved: '0', perPayday: '185', paidEvery: 'monthly' },
    paydayWord: 'payday',
    monthsHint:
      'The lesson uses three: the length the EU’s 2023 survey asked about, reported in the Commission’s 2025 strategy. A measure, not a rule.',
    howNote: {
      text: 'Three months is the length the EU’s 2023 survey asked about. Almost half of people aged 18 to 65 could not cover three months of living costs without borrowing. It is a measure, not a rule.',
      source: {
        title:
          'European Commission, Communication on a Financial Literacy Strategy for the EU, COM(2025) 681 (30 September 2025), reporting Flash Eurobarometer 525 (2023)',
        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:52025DC0681',
      },
    },
  },
  us: {
    scenario: 'Four must-pay costs, $1,055 a month, with $50 moved aside from each paycheck, paid every two weeks.',
    glossary: ['emergency-fund'],
    rules: [MILESTONE],
    rulesLead: 'Figure checked',
    defaults: { essentials: '1055', months: '1', saved: '0', perPayday: '50', paidEvery: 'fortnightly' },
    paydayWord: 'paycheck',
    monthsHint: 'The US lesson starts with $400, then one month of must-pay costs.',
    milestone: MILESTONE,
    howNote: {
      text: '$400 is the hypothetical emergency expense in the Federal Reserve’s household survey, fielded in October 2025 and published on 13 May 2026. 63% of adults said they would cover it with cash or its equivalent, which the survey counts as cash, savings, or a credit card paid off at the next statement. It is the survey’s example, not a rule.',
      source: {
        title: 'Economic Well-Being of U.S. Households in 2025: Savings and Investments (Federal Reserve Board, May 2026)',
        url: 'https://www.federalreserve.gov/publications/2026-economic-well-being-of-us-households-in-2025-savings-investments.htm',
      },
    },
  },
};

/* ---------------------------------------------------------------------------------------------
 * Maths: pure, in whole cents, no interest and no rate anywhere.
 * ------------------------------------------------------------------------------------------- */

export const BUFFER_LIMITS = { maxAmount: 1e9, minMonths: 1, maxMonths: 24, maxMonthsAway: 120 } as const;

/** The select's options, in the order a reader thinks of them. */
export const FREQUENCIES: readonly { value: PayFrequency; label: string }[] = [
  { value: 'weekly', label: 'Every week, 52 a year' },
  { value: 'fortnightly', label: 'Every two weeks, 26 a year' },
  { value: 'twice-monthly', label: 'Twice a month, 24 a year' },
  { value: 'monthly', label: 'Every month, 12 a year' },
];

export interface TimeAway {
  unit: 'week' | 'month';
  count: number;
}

/**
 * A count of paydays as weeks (under a month) or whole months. Payday 1 is the next payday, or
 * today if the reader was paid today, so the figure is "about" and can be out by one pay period.
 */
export function timeAway(paydays: number, paydaysPerYear: number): TimeAway {
  const months = (paydays * 12) / paydaysPerYear;
  if (months < 1) return { unit: 'week', count: Math.max(1, Math.round((paydays * 52) / paydaysPerYear)) };
  return { unit: 'month', count: Math.round(months) };
}

export type BufferState = 'covered' | 'no-amount' | 'too-long' | 'dated';

export interface BufferPlan {
  state: BufferState;
  target: number;
  toGo: number;
  surplus: number;
  paydays: number | null;
  /** toGo ÷ the amount each payday, to 2 decimals, before rounding up. */
  quotient: number | null;
  exactDivision: boolean;
  away: TimeAway | null;
  heldAtEnd: number | null;
  overTarget: number | null;
  milestonePayday: number | null;
  milestoneAway: TimeAway | null;
}

const PAYDAY_COUNTS: readonly number[] = Object.values(PAYDAYS_PER_YEAR);

/** ceil(a ÷ b) for whole numbers of cents, exactly. */
const ceilDiv = (a: number, b: number): number => {
  const q = Math.floor(a / b);
  return a - q * b > 0 ? q + 1 : q;
};

/**
 * On which payday a buffer of `months` × `essentials` is fully set aside, moving `perPayday`
 * each time on top of `saved`. Returns null for any input a field would reject, so a field error
 * can never reach a result. `milestone` (the US survey's $400) is dated only when it lies between
 * what is already saved and the target, and within ten years.
 */
export function bufferPlan(
  essentials: number,
  months: number,
  saved: number,
  perPayday: number,
  paydaysPerYear: number,
  milestone?: number,
): BufferPlan | null {
  const args = [essentials, months, saved, perPayday, paydaysPerYear, ...(milestone === undefined ? [] : [milestone])];
  if (!args.every(Number.isFinite)) return null;
  if (!PAYDAY_COUNTS.includes(paydaysPerYear)) return null;
  const { maxAmount, minMonths, maxMonths, maxMonthsAway } = BUFFER_LIMITS;
  if (essentials <= 0 || essentials > maxAmount) return null;
  if (months < minMonths || months > maxMonths) return null;
  if (saved < 0 || saved > maxAmount || perPayday < 0 || perPayday > maxAmount) return null;

  const e = toCents(essentials);
  // Under half a cent a month is nothing to set aside; the field asks for an amount above 0.
  if (e <= 0) return null;
  const s = toCents(saved);
  const p = toCents(perPayday);
  const t = Math.round(e * months);
  const toGoC = Math.max(0, t - s);
  const withinCap = (paydays: number) => (paydays * 12) / paydaysPerYear <= maxMonthsAway;

  let milestonePayday: number | null = null;
  let milestoneAway: TimeAway | null = null;
  if (milestone !== undefined && p > 0) {
    const m = toCents(milestone);
    if (s < m && m < t) {
      const mp = ceilDiv(m - s, p);
      if (withinCap(mp)) {
        milestonePayday = mp;
        milestoneAway = timeAway(mp, paydaysPerYear);
      }
    }
  }

  const base = {
    target: t / 100,
    toGo: toGoC / 100,
    surplus: Math.max(0, s - t) / 100,
    paydays: null,
    quotient: null,
    exactDivision: false,
    away: null,
    heldAtEnd: null,
    overTarget: null,
    milestonePayday,
    milestoneAway,
  };

  if (toGoC === 0) return { ...base, state: 'covered', paydays: 0 };
  if (p === 0) return { ...base, state: 'no-amount' };

  const n = ceilDiv(toGoC, p);
  const quotient = Math.round((toGoC / p) * 100) / 100;
  const exactDivision = toGoC % p === 0;
  if (!withinCap(n)) return { ...base, state: 'too-long', quotient, exactDivision };

  const heldC = s + n * p;
  return {
    ...base,
    state: 'dated',
    paydays: n,
    quotient,
    exactDivision,
    away: timeAway(n, paydaysPerYear),
    heldAtEnd: heldC / 100,
    overTarget: (heldC - t) / 100,
  };
}

export type BufferProblem = 'required' | 'too-big' | 'months-range' | 'negative';
type AmountKey = 'essentials' | 'months' | 'saved' | 'perPayday';

/**
 * What is wrong with each typed field, if anything. Blank "already set aside" and "moved each
 * payday" count as 0 and are not problems; the island turns each code into a sentence.
 */
export function bufferInputProblems(raw: Record<AmountKey, string>): Partial<Record<AmountKey, BufferProblem>> {
  const problems: Partial<Record<AmountKey, BufferProblem>> = {};
  const { maxAmount, minMonths, maxMonths } = BUFFER_LIMITS;

  const essentials = readAmount(raw.essentials);
  if (essentials.tooBig || (essentials.value !== null && essentials.value > maxAmount)) problems.essentials = 'too-big';
  else if (essentials.value === null || essentials.value <= 0 || toCents(essentials.value) <= 0) problems.essentials = 'required';

  const months = readAmount(raw.months);
  if (months.value === null || months.value < minMonths || months.value > maxMonths) problems.months = 'months-range';

  for (const key of ['saved', 'perPayday'] as const) {
    const read = readAmount(raw[key]);
    if (read.tooBig || (read.value !== null && read.value > maxAmount)) problems[key] = 'too-big';
    else if (read.value !== null && read.value < 0) problems[key] = 'negative';
  }
  return problems;
}
