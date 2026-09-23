/**
 * Card balance at the minimum payment: each edition's opening values, with the sources behind
 * them, and the pure maths. Owned by the card-minimum builder. Tool maths and pins from the
 * revised spec go here and in tests/unit/tools/card-minimum.test.ts, never in finance.ts; defaults
 * and rules go in CONFIG, never in regions.ts. The names CONFIG and CardMinimumConfig are imported
 * by the page and must stay.
 *
 * The island imports only the maths and the types from this module, so the CONFIG literal (the
 * copy, the rules and their sources) reaches the page as the island's prop, not as JavaScript.
 */
import type { Source } from '../regions';
import type { EditionConfigs, ToolConfig } from './types';
import { divRoundHalfUp, fromCents, toBasisPoints, toCents, type ScheduleYear } from '../finance';
import { formatDuration, money, number, type Locale } from '../format';
import { readAmount } from '../fields';

/** The fields, in the order the page shows them. The minimum rule is never one of them. */
export type CardField = 'balance' | 'apr' | 'minPercent' | 'minFloor' | 'compare';
export const CARD_FIELDS: readonly CardField[] = ['balance', 'apr', 'minPercent', 'minFloor', 'compare'];

/** India: a percentage of what is owed. The US: last statement's interest plus a percentage. */
export type MinimumRule = 'percent' | 'interest-plus';
/**
 * India (the lesson's model): the month's interest is the monthly rate on the whole statement.
 * The US (the lesson's model): only what carries after the payment is charged for the month.
 */
export type InterestBase = 'statement' | 'carried';

export interface CardMinimumConfig extends ToolConfig {
  /** The numbers the page opens on, as typed. */
  defaults: Record<CardField, string>;
  /** From the edition, never from a field or a link. */
  rule: MinimumRule;
  interestBase: InterestBase;
  labels: Record<CardField, string>;
  hints: Record<CardField, string>;
  /** The floor's error, with the edition's currency sign. */
  floorError: string;
  /** What the result says when the balance does not fall on the minimum rule. */
  never: { grows: string; flat: string };
  /** Always shown: a statement paid in full carries no interest. */
  paidInFull: { text: string; source: Source };
  /** What the run leaves out, one note each. */
  assumptions: string[];
  /** "How this is worked out": a paragraph, the sums, then the edition's own notes. {minPercent} is the reader's figure. */
  howItWorks: { intro: string; formulas: string[]; paragraphs: string[] };
}

const CARD_REPORT = 'https://files.consumerfinance.gov/f/documents/cfpb_consumer-credit-card-market-report_2025.pdf';
const RBI_DIRECTIONS = 'https://rbi.org.in/scripts/BS_ViewMasDirections.aspx?id=13155';
const RBI_TITLE = 'RBI (Commercial Banks – Credit Cards and Debit Cards: Issuance and Conduct) Directions, 2025';
const CHECKED = '2026-09-22';

const BOTH_EDITIONS =
  'Nothing new goes on the card. No annual fee, late charge, cash advance or promotional rate is added. The rate never changes, and every payment is on time. If the balance does not fall for two statements in a row, the tool says so instead of giving a count. Past 1,200 months it says more than 100 years. The fixed amount is checked against every month’s minimum, not just the first. The rule, the floor and the rate are examples: your card agreement and statement give your own.';

export const CONFIG: EditionConfigs<CardMinimumConfig> = {
  in: {
    scenario: 'The card statement from the India lesson, with ₹20,000 owed, a 5% minimum due and interest at 3.5% a month.',
    defaults: { balance: '20000', apr: '42', minPercent: '5', minFloor: '200', compare: '1000' },
    rule: 'percent',
    interestBase: 'statement',
    labels: {
      balance: 'What you owe on the card',
      apr: 'Interest rate, % a year',
      minPercent: 'Minimum due, % of what you owe',
      minFloor: 'Smallest minimum',
      compare: 'A fixed amount each month, to set beside it',
    },
    hints: {
      balance: 'The total amount due on the statement. The run assumes nothing new goes on the card.',
      apr: 'Cards often print a monthly rate: 3.5% a month is 42% a year (3.5 × 12). This is the lesson’s example; your card prints its own.',
      minPercent: 'Each card’s terms set the rule; 5% is the lesson’s example. RBI’s card rules say the minimum must be set so the balance does not grow.',
      minFloor: 'The minimum never drops below this until the last payment. An example; your card’s terms print their own.',
      compare: '₹1,000 is the minimum on the lesson’s statement, kept the same every month. Leave it blank to hide this line.',
    },
    floorError: 'Enter the smallest minimum on your statement, at least ₹1.',
    never: {
      grows:
        'On this rule the balance grows every month. RBI’s card rules say the minimum amount due must be set so the balance does not grow, so check the rule printed on your statement.',
      flat: 'On this rule the minimum only covers the interest, so the balance stays where it is. Check the rule printed on your statement.',
    },
    paidInFull: {
      text: 'Paid in full by the due date, with nothing left from the bill before, the purchases on a statement usually carry no interest.',
      source: { title: 'RBI Directions 2025, definition (16) “interest-free credit period”, and para 23(3)', url: RBI_DIRECTIONS },
    },
    assumptions: [
      'Assumes nothing new goes on the card, no fees or late charges, and the same rate throughout.',
      'Interest here is the monthly rate on the whole statement, as in the lesson; most cards work it out day by day on what is still owed, so a real statement will differ.',
      'Card interest also carries GST, which is not included.',
    ],
    howItWorks: {
      intro:
        'Each month the tool works out the minimum from the rule, takes the payment off, adds the month’s interest and carries what is left to the next statement, until nothing is owed. Every amount is rounded to the paisa at each step, half up, and the last payment is whatever is left.',
      formulas: [
        'minimum = the larger of {minPercent}% of what you owe and the smallest minimum',
        'interest for the month = what you owe × (yearly rate ÷ 12)',
        'owed next month = owed + interest − payment',
      ],
      paragraphs: [
        'The interest is on the whole statement, as the lesson’s ₹20,000 statement does (₹700 at 3.5% a month). This is the lesson’s simplification, not how a card charges. Cards charge interest only on what is still owed after payments (RBI Directions 2025, para 23(6)), and most work it out day by day. Card interest also carries GST (CBIC Notification 12/2017-Central Tax (Rate), entry 27(a)), which is left out here. So a real statement will differ.',
        'A statement paid in full by the due date in month one carries no interest. After that a balance is being carried, and the interest-free period is suspended (para 23(3)). RBI’s rules say the minimum amount due must be set so the balance does not grow (para 23(2)).',
        BOTH_EDITIONS,
      ],
    },
    rules: [
      {
        key: 'minimumMustNotGrow',
        value: 0,
        label: 'The minimum amount due must be set so that paying it does not make the balance grow',
        source: { title: `${RBI_TITLE}, para 23(2)`, url: RBI_DIRECTIONS },
        asOf: CHECKED,
      },
      {
        key: 'interestFreeSuspended',
        value: 1,
        label: 'The interest-free period is suspended while any of the previous bill is unpaid, so only a statement paid in full in month one is free of interest',
        source: { title: `${RBI_TITLE}, para 23(3)`, url: RBI_DIRECTIONS },
        asOf: CHECKED,
      },
      {
        key: 'interestOnOutstanding',
        value: 1,
        label: 'Cards charge interest only on what is still owed after payments; this tool charges the whole statement, as the lesson does',
        source: { title: `${RBI_TITLE}, para 23(6)`, url: RBI_DIRECTIONS },
        asOf: CHECKED,
      },
      {
        key: 'gstOnCardInterest',
        value: 0,
        label: 'Card interest is outside GST’s exemption for loan interest, so GST is charged on it; no figure here includes it',
        source: {
          title: 'CBIC, Notification No. 12/2017-Central Tax (Rate), 28 June 2017, entry 27(a)',
          url: 'https://cbic-gst.gov.in/hindi/pdf/central-tax-rate/Notification12-CGST.pdf',
        },
        asOf: CHECKED,
      },
      {
        key: 'aprExample',
        value: 42,
        label: 'Example yearly rate: 3.5% a month × 12, from the lesson’s statement',
        source: {
          title: 'Business Lab lesson, Every loan as a yearly rate: apps and cards',
          url: 'https://dixitrajvir20-blip.github.io/passion-project/in/learn/protect-your-money/cost-of-borrowing',
        },
        asOf: CHECKED,
        inLine: false,
      },
      {
        key: 'minPercentExample',
        value: 5,
        label: 'Example minimum: 5% of what you owe, from the lesson’s statement',
        source: {
          title: 'Business Lab lesson, Every loan as a yearly rate: apps and cards',
          url: 'https://dixitrajvir20-blip.github.io/passion-project/in/learn/protect-your-money/cost-of-borrowing',
        },
        asOf: CHECKED,
        inLine: false,
      },
    ],
    glossary: ['minimum-amount-due', 'rbi', 'gst'],
  },
  us: {
    scenario: 'The first card statement from the US lesson, with $400 owed, a $25 minimum and an example 27.5% APR.',
    defaults: { balance: '400', apr: '27.5', minPercent: '1', minFloor: '25', compare: '50' },
    rule: 'interest-plus',
    interestBase: 'carried',
    labels: {
      balance: 'Statement balance',
      apr: 'Purchase APR, % a year',
      minPercent: 'Minimum: the month’s interest plus this % of the balance',
      minFloor: 'Smallest minimum',
      compare: 'A fixed amount each month, to set beside it',
    },
    hints: {
      balance: 'What the statement says you owe. The run assumes nothing new goes on the card.',
      apr: '27.5% is the CFPB’s average for new general purpose card accounts opened in 2024 (report of December 2025, p.5), used here as an example. Your statement prints your own.',
      minPercent:
        'Most cards set the minimum at 1% of the balance plus the month’s interest and fees (CFPB, The Consumer Credit Card Market, December 2025, p.70). This one is an example; your card agreement states yours.',
      minFloor: 'This card’s floor is $25, from the lesson’s statement. In 2025 card agreements floors ran from $15 to $50, most often $40 (same report, p.70).',
      compare: 'An example amount. Leave it blank to hide this line.',
    },
    floorError: 'Enter the smallest minimum on your statement, at least $1.',
    never: {
      grows: 'On these figures the balance does not fall. Check the minimum-payment rule in your card agreement and the box on your statement.',
      flat: 'On these figures the balance does not fall. Check the minimum-payment rule in your card agreement and the box on your statement.',
    },
    paidInFull: {
      text: 'Paid in full by the due date, with nothing carried from the statement before, the purchases on a statement usually carry no interest.',
      source: { title: 'CFPB, What is a grace period and how does it work? (reviewed 23 September 2024)', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-a-grace-period-how-does-it-work-en-47/' },
    },
    assumptions: [
      'Assumes nothing new goes on the card, no fees or late charges, and the same APR throughout.',
      'Interest here is worked out once a month on what carries after the payment, as in the lesson.',
      'The minimum-payment box on your statement is worked as if there were no grace period and each payment arrived at the end of the cycle, so it usually shows more time and more interest than this.',
    ],
    howItWorks: {
      intro:
        'Each month the tool works out the minimum from the rule, takes the payment off, adds the month’s interest and carries what is left to the next statement, until nothing is owed. Every amount is rounded to the cent at each step, half up, and the last payment is whatever is left.',
      formulas: [
        'minimum = the larger of (last statement’s interest + {minPercent}% of the balance) and the smallest minimum',
        'carried = balance − payment',
        'next statement = carried + carried × (APR ÷ 12)',
      ],
      paragraphs: [
        'Most cards set the minimum at 1% plus interest and fees, and floors in 2025 agreements ran from $15 to $50 (CFPB, The Consumer Credit Card Market, December 2025, p.70). As in the lesson, the first statement has no interest. What is left after each payment is charged the APR ÷ 12 for the month.',
        'Your statement’s minimum-payment box (the federal rule on card statements, Regulation Z §1026.7(b)(12)) is worked as if there were no grace period and each payment arrived on the last day of the cycle (Appendix M1). It also shows whole years once the time passes two years. So it usually shows more time and more interest than this: worked that way, the lesson’s $400 statement takes 21 months and $104.02, against 20 months and $89.79 on this tool.',
        BOTH_EDITIONS,
      ],
    },
    rules: [
      {
        key: 'aprExample',
        value: 27.5,
        label: 'Example APR: the average for new general purpose card accounts opened in 2024, 27.5%',
        source: { title: 'CFPB, The Consumer Credit Card Market, report to Congress, December 2025, p.5', url: CARD_REPORT },
        asOf: CHECKED,
      },
      {
        key: 'minPercentCommon',
        value: 1,
        label: 'Most card issuers set the minimum at 1% of the balance, then add finance charges, fees and past-due amounts; this tool adds the month’s interest only',
        source: { title: 'CFPB, The Consumer Credit Card Market, December 2025, p.70, section 4.1.1', url: CARD_REPORT },
        asOf: CHECKED,
      },
      {
        key: 'minFloorCommon',
        value: 40,
        label: 'Minimum-payment floors in 2025 card agreements ran from $15 to $50; $40 was the most common',
        source: { title: 'CFPB, The Consumer Credit Card Market, December 2025, p.70, section 4.1.1', url: CARD_REPORT },
        asOf: CHECKED,
      },
      {
        key: 'minFloorExample',
        value: 25,
        label: 'The $25 minimum on the lesson’s $400 first statement',
        source: {
          title: 'Business Lab lesson, Starting a credit file without paying interest',
          url: 'https://dixitrajvir20-blip.github.io/passion-project/us/learn/money-basics/credit-file',
        },
        asOf: CHECKED,
        inLine: false,
      },
      {
        key: 'boxNoGracePeriod',
        value: 0,
        label: 'A statement’s minimum-payment estimate assumes no grace period and each payment credited on the last day of the cycle, so it usually shows more time and interest than this tool',
        source: { title: 'Regulation Z, Appendix M1 to Part 1026, Repayment disclosures', url: 'https://www.consumerfinance.gov/rules-policy/regulations/1026/m1/' },
        asOf: CHECKED,
      },
      {
        key: 'boxYearsFrom',
        value: 24,
        label: 'The statement box gives the time in months under 2 years, otherwise rounded to whole years',
        source: { title: 'Regulation Z §1026.7(b)(12), Repayment disclosures', url: 'https://www.consumerfinance.gov/rules-policy/regulations/1026/7/' },
        asOf: CHECKED,
      },
      {
        key: 'gracePeriodLost',
        value: 2,
        label: 'Grace periods are not required, but most cards give one on purchases; missing a full payment loses it for that month and the next',
        source: { title: 'CFPB, What is a grace period and how does it work? (reviewed 23 September 2024)', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-a-grace-period-how-does-it-work-en-47/' },
        asOf: CHECKED,
      },
    ],
    glossary: ['statement-balance', 'minimum-payment', 'apr', 'cfpb'],
  },
};

/* ---------------------------------------------------------------------------------------------
 * The maths. Every amount inside a run is whole cents (paise) and every rate whole basis points;
 * each division rounds half up on integers, so no float product decides a half-cent: 9,900 ×
 * (27.5 ÷ 1200) is 226.87499999999997 in floats, and divRoundHalfUp(990000 × 2750, 120000) is 22688.
 * The input caps (balance and floor up to 1,000,000,000, APR up to 200, minimum up to 100%) keep
 * every product under 2^53.
 * ------------------------------------------------------------------------------------------- */

export interface MinimumRunInput {
  balance: number;
  aprPercent: number;
  rule: MinimumRule;
  minPercent: number;
  minFloor: number;
  interestBase: InterestBase;
  /** A fixed amount paid every month instead of the minimum. */
  fixed?: number;
  /** Default 1,200: a hundred years. */
  maxMonths?: number;
}

export interface MonthOne {
  owed: number;
  interest: number;
  minimumDue: number;
  payment: number;
  carried: number;
  next: number;
}

export interface MinimumRunResult {
  /** Months to clear, or null when the run does not clear (see reason). */
  months: number | null;
  reason?: 'grows' | 'flat' | 'over-100-years';
  totalInterest: number;
  totalPaid: number;
  first: MonthOne;
  /** The first month a fixed amount is below that month's minimum due, or null. */
  belowMinAt: number | null;
  years: ScheduleYear[];
}

export const MAX_MONTHS = 1200;

export function minimumRun(input: MinimumRunInput): MinimumRunResult {
  const maxMonths = input.maxMonths ?? MAX_MONTHS;
  const aprBp = toBasisPoints(input.aprPercent);
  const minBp = toBasisPoints(input.minPercent);
  const floor = toCents(input.minFloor);
  const f = input.fixed === undefined ? undefined : toCents(input.fixed);

  let b = toCents(input.balance);
  let lastI = 0;
  let stalls = 0;
  let belowMinAt: number | null = null;
  let totalI = 0;
  let totalPay = 0;
  let yearPaid = 0;
  let yearI = 0;
  let first: MonthOne | null = null;
  const years: ScheduleYear[] = [];

  const result = (months: number | null, reason?: MinimumRunResult['reason']): MinimumRunResult => ({
    months,
    ...(reason ? { reason } : {}),
    totalInterest: fromCents(totalI),
    totalPaid: fromCents(totalPay),
    first: first!,
    belowMinAt,
    years,
  });

  for (let month = 1; month <= maxMonths; month++) {
    const pct = divRoundHalfUp(b * minBp, 10000);
    const ruleMin = input.rule === 'percent' ? pct : lastI + pct;
    const required = Math.max(ruleMin, floor);

    let i: number;
    let pay: number;
    let minimumDue: number;
    let carried: number;
    let next: number;
    if (input.interestBase === 'statement') {
      if (month === 1 && (f ?? required) >= b) {
        // The whole statement paid by the due date: no interest.
        i = 0;
        pay = b;
        minimumDue = Math.min(required, b);
      } else {
        i = divRoundHalfUp(b * aprBp, 120000);
        const due = b + i;
        minimumDue = Math.min(required, due);
        pay = Math.min(f ?? required, due);
      }
      carried = Math.max(b - pay, 0);
      next = b + i - pay;
    } else {
      minimumDue = Math.min(required, b);
      pay = Math.min(f ?? required, b);
      carried = b - pay;
      i = divRoundHalfUp(carried * aprBp, 120000);
      next = carried + i;
    }

    if (f !== undefined && belowMinAt === null && f < minimumDue) belowMinAt = month;
    if (month === 1) {
      first = {
        owed: fromCents(b),
        interest: fromCents(i),
        minimumDue: fromCents(minimumDue),
        payment: fromCents(pay),
        carried: fromCents(carried),
        next: fromCents(next),
      };
    }
    totalI += i;
    totalPay += pay;
    yearI += i;
    yearPaid += pay;

    if (next <= 0) {
      years.push({ year: Math.ceil(month / 12), paid: fromCents(yearPaid), interest: fromCents(yearI), balance: 0 });
      return result(month);
    }

    // Two statements in a row that do not fall. One rise is allowed: a US month one has no
    // interest in its minimum, so $10,000 rises to $10,126.88 and then falls. Once a run stops
    // falling it never falls again, so two is enough.
    stalls = next >= b ? stalls + 1 : 0;
    if (stalls === 2) return result(null, next > b ? 'grows' : 'flat');

    if (month % 12 === 0) {
      years.push({ year: month / 12, paid: fromCents(yearPaid), interest: fromCents(yearI), balance: fromCents(next) });
      yearPaid = 0;
      yearI = 0;
    }
    lastI = i;
    b = next;
  }
  return result(null, 'over-100-years');
}

/* ---------------------------------------------------------------------------------------------
 * Reading the fields. Blank is told apart from 0: four fields require a figure, and a blank
 * compare field hides its sentence.
 * ------------------------------------------------------------------------------------------- */

export const AMOUNT_CAP = 1_000_000_000;
export const APR_CAP = 200;

export interface CardInputs {
  balance: number;
  aprPercent: number;
  minPercent: number;
  minFloor: number;
}

export interface ReadCardFields {
  /** Null when any of the four required fields has an error. */
  inputs: CardInputs | null;
  /** The fixed amount; undefined when the field is blank or has an error. */
  compare: number | undefined;
  errors: Partial<Record<CardField, string>>;
}

export function readCardFields(raw: Record<CardField, string>, locale: Locale, floorError: string): ReadCardFields {
  const errors: Partial<Record<CardField, string>> = {};
  const capError = `Enter an amount up to ${number(AMOUNT_CAP, locale)}.`;

  const balance = readAmount(raw.balance);
  if (balance.tooBig || (balance.value !== null && balance.value > AMOUNT_CAP)) errors.balance = capError;
  else if (balance.value === null || toCents(balance.value) <= 0) errors.balance = 'Enter what you owe, more than 0.';

  const apr = readAmount(raw.apr);
  if (apr.tooBig || (apr.value !== null && apr.value > APR_CAP)) errors.apr = `Enter a yearly rate up to ${APR_CAP}%.`;
  else if (apr.value === null || apr.value < 0) errors.apr = 'Enter the yearly rate, 0 or more.';

  const minPercent = readAmount(raw.minPercent);
  if (minPercent.tooBig || (minPercent.value !== null && minPercent.value > 100)) errors.minPercent = 'Enter a percentage up to 100.';
  else if (minPercent.value === null || toBasisPoints(minPercent.value) <= 0) errors.minPercent = 'Enter the minimum as a percentage, more than 0.';

  const minFloor = readAmount(raw.minFloor);
  if (minFloor.tooBig || (minFloor.value !== null && minFloor.value > AMOUNT_CAP)) errors.minFloor = capError;
  else if (minFloor.value === null || minFloor.value < 1) errors.minFloor = floorError;

  let compare: number | undefined;
  const fixed = readAmount(raw.compare);
  if (String(raw.compare ?? '').trim() !== '') {
    if (fixed.tooBig || (fixed.value !== null && fixed.value > AMOUNT_CAP)) errors.compare = capError;
    else if (fixed.value === null || fixed.value < 0) errors.compare = 'Enter an amount, 0 or more, or leave it blank.';
    else compare = fixed.value;
  }

  const core = errors.balance || errors.apr || errors.minPercent || errors.minFloor;
  return {
    inputs: core
      ? null
      : { balance: balance.value!, aprPercent: apr.value!, minPercent: minPercent.value!, minFloor: minFloor.value! },
    compare,
    errors,
  };
}

/* ---------------------------------------------------------------------------------------------
 * The result in words. Money in a sentence carries decimals only when there are any.
 * ------------------------------------------------------------------------------------------- */

const exact = (value: number, locale: Locale) => money(value, locale, Number.isInteger(value) ? 0 : 2);

export const INVALID_SENTENCE =
  'Enter what you owe, the rate, the minimum rule and the smallest minimum to see how long the minimum takes.';

/** The sentence about the minimum run, first match wins. */
export function runSentence(
  run: MinimumRunResult,
  inputs: CardInputs,
  never: { grows: string; flat: string },
  locale: Locale,
): string {
  const balance = exact(fromCents(toCents(inputs.balance)), locale);
  if (run.months === 1 && run.totalInterest === 0) {
    return `The minimum here covers the whole ${balance}, so it is paid in one go by the due date, with no interest.`;
  }
  if (run.months !== null) {
    const duration = formatDuration(run.months);
    return toBasisPoints(inputs.aprPercent) > 0
      ? `Paying only the minimum clears ${balance} in ${duration} and adds ${exact(run.totalInterest, locale)} of interest, ${exact(run.totalPaid, locale)} in all.`
      : `Paying only the minimum clears ${balance} in ${duration}. At 0% nothing is added.`;
  }
  if (run.reason === 'grows') return never.grows;
  if (run.reason === 'flat') return never.flat;
  return `Paying only the minimum, ${balance} takes more than 100 years to clear on these figures.`;
}

/** The sentence about a fixed amount each month, set beside the minimum. */
export function compareSentence(run: MinimumRunResult, fixed: number, locale: Locale): string {
  const amount = exact(fromCents(toCents(fixed)), locale);
  if (run.belowMinAt === 1) return `A fixed ${amount} is below this month’s minimum due, so it would not count as on time.`;
  if (run.belowMinAt !== null) {
    return `A fixed ${amount} is below the minimum due from month ${run.belowMinAt}, so from then it would not count as on time.`;
  }
  if (run.reason === 'grows' || run.reason === 'flat') return `At a fixed ${amount} a month the balance does not fall.`;
  if (run.reason === 'over-100-years') return `At a fixed ${amount} a month it takes more than 100 years.`;
  if (run.months === 1 && run.totalInterest === 0) return `At a fixed ${amount} the whole statement is paid by the due date, with no interest.`;
  const duration = formatDuration(run.months!);
  return run.totalInterest > 0
    ? `At a fixed ${amount} a month it clears in ${duration} and adds ${exact(run.totalInterest, locale)}.`
    : `At a fixed ${amount} a month it clears in ${duration}, with nothing added.`;
}
