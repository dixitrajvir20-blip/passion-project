/**
 * Tax on side income and fees: each edition's opening values, with the sources behind them, and the
 * pure maths. Owned by the side-income-tax builder. Tool maths and pins from the revised spec go
 * here and in tests/unit/tools/side-income-tax.test.ts, never in finance.ts; defaults and rules go
 * in CONFIG, never in regions.ts. The names CONFIG and SideIncomeTaxConfig are imported by the page
 * and must stay.
 *
 * Two editions, two questions, one shape (what is on record or owed, minus what is already paid):
 *  - United States: self-employment tax on the profit from your own work, set by law, plus an
 *    income-tax share the reader types (0 by default), minus what is already paid toward it.
 *  - India: tax deducted in your name, as the statement shows it, plus other tax already paid,
 *    minus the tax due on that year's whole income, which the reader types from the return or the
 *    department's calculator. This tool never works tax out: no slab, regime or rebate is held.
 *
 * Every sum runs on integer cents or whole dollars, and every product with a rate is one integer
 * numerator divided once, rounded half away from zero, so a .5 tie is exact.
 */
import { divRoundHalfUp, fromCents, percent1, toBasisPoints, toCents } from '../finance';
import type { EditionConfigs, Rule, ToolConfig } from './types';

/* ----------------------------------------------------------------------------------------------
 * Fields
 * -------------------------------------------------------------------------------------------- */

/** The India fields, as the page first shows them and as a link carries them. */
export interface IndiaFields {
  tdsOnStatement: string;
  otherCredits: string;
  taxDue: string;
  missing: string;
  /** Optional check, inside a fold: blank means not given. */
  invoiced: string;
  /** Optional check, inside a fold: blank means not given. */
  arrived: string;
}

/** The US fields, as the page first shows them and as a link carries them. */
export interface UsFields {
  moneyIn: string;
  costs: string;
  incomeTaxPercent: string;
  alreadyPaid: string;
}

/** A source the island links to in its notes and in "How this is worked out". */
export interface Link {
  title: string;
  url: string;
}

export interface SideIncomeTaxConfig extends ToolConfig {
  defaults: IndiaFields | UsFields;
  rules: Rule[];
  /** Official pages the island links to, each title carrying the page's own date or the access date. */
  links: Record<string, Link>;
}

/* ----------------------------------------------------------------------------------------------
 * Shared arithmetic
 * -------------------------------------------------------------------------------------------- */

/** n ÷ d for integers, half away from zero, for a numerator of either sign. */
function divRound(n: number, d: number): number {
  const q = divRoundHalfUp(Math.abs(n), d);
  return n < 0 && q !== 0 ? -q : q;
}

/** One rule's value by key; a config without it is a build error, not a silent default. */
export function ruleValue(rules: readonly Rule[], key: string): number {
  const rule = rules.find((r) => r.key === key);
  if (!rule || !Number.isFinite(rule.value)) throw new Error(`side-income-tax: the config has no rule "${key}"`);
  return rule.value;
}

/* ----------------------------------------------------------------------------------------------
 * United States
 * -------------------------------------------------------------------------------------------- */

export interface UsRules {
  /** % of net profit counted as net earnings from self-employment (Schedule SE line 4a): 92.35. */
  seNetEarningsShare: number;
  /** Net earnings, whole dollars, from which the tax applies (Schedule SE line 4c): 400. */
  seThreshold: number;
  /** %: 12.4. */
  seSocialSecurityRate: number;
  /** %: 2.9. */
  seMedicareRate: number;
  /** $: 184,500 in 2026. */
  ssWageBase: number;
  /** $: 200,000; above it the Additional Medicare Tax, not modelled, can apply. */
  additionalMedicareThreshold: number;
  /** $: 1,000. */
  estimatedTaxLine: number;
}

export const US_RULE_KEYS: readonly (keyof UsRules)[] = [
  'seNetEarningsShare',
  'seThreshold',
  'seSocialSecurityRate',
  'seMedicareRate',
  'ssWageBase',
  'additionalMedicareThreshold',
  'estimatedTaxLine',
];

export function usRulesFrom(rules: readonly Rule[]): UsRules {
  return Object.fromEntries(US_RULE_KEYS.map((key) => [key, ruleValue(rules, key)])) as unknown as UsRules;
}

/** Profit in cents × a share in basis points ÷ this = dollars: 100 cents × 10,000 basis points. */
const NET_EARNINGS_DIVISOR = 1_000_000;

export interface SetAsideInput {
  moneyIn: number;
  costs: number;
  incomeTaxPercent: number;
  alreadyPaid: number;
}

export interface SetAside {
  /** Money in less costs, to the cent; below 0 for a loss. */
  net: number;
  loss: boolean;
  /** Net, or 0 for a loss. */
  profit: number;
  /** 92.35% of profit, rounded to the dollar (Schedule SE line 4a). */
  netEarnings: number;
  /** Net earnings reach the $400 line. */
  seApplies: boolean;
  /** Whole dollars. */
  seTax: number;
  /** Whole dollars, at the reader's example rate on profit. */
  incomeTax: number;
  /** seTax + incomeTax, whole dollars. */
  tax: number;
  /** tax − already paid, to the cent; below 0 when more has been paid than this sum. */
  balance: number;
  /** Self-employment tax as a % of profit, one decimal; null when profit or the tax is 0. */
  seShareOfProfit: number | null;
  /** Net earnings above the Additional Medicare line: the island shows an error, not a result. */
  beyondScope: boolean;
  /** The tax on these figures reaches the IRS's $1,000 line. */
  expectDuringYear: boolean;
}

/**
 * Self-employment tax, plus an example income-tax share, less what is already paid toward it.
 *
 * Net earnings are rounded to the dollar and that rounded figure is both tested against the $400
 * line and taxed, so the tax starts at $432.60 of profit. The 12.4% stops at the wage base; the
 * 2.9% has none. One rounding of the combined figure matches the lesson's "15.3% of $4,618 = $707";
 * Schedule SE rounds line by line, which can differ by a dollar. Negative inputs are passed through
 * as numbers: the island is what refuses them.
 */
export function selfEmploymentSetAside(input: SetAsideInput, rules: UsRules): SetAside {
  const netC = toCents(input.moneyIn) - toCents(input.costs);
  const profitC = Math.max(0, netC);
  const netEarnings = divRoundHalfUp(profitC * toBasisPoints(rules.seNetEarningsShare), NET_EARNINGS_DIVISOR);
  const seApplies = netEarnings >= rules.seThreshold;
  const ss = Math.round(rules.seSocialSecurityRate * 10);
  const medicare = Math.round(rules.seMedicareRate * 10);
  const seTax = seApplies ? divRoundHalfUp(Math.min(netEarnings, rules.ssWageBase) * ss + netEarnings * medicare, 1000) : 0;
  const incomeTax = divRound(profitC * toBasisPoints(input.incomeTaxPercent), NET_EARNINGS_DIVISOR);
  const tax = seTax + incomeTax;
  const balanceC = tax * 100 - toCents(input.alreadyPaid);
  return {
    net: fromCents(netC),
    loss: netC < 0,
    profit: fromCents(profitC),
    netEarnings,
    seApplies,
    seTax,
    incomeTax,
    tax,
    balance: fromCents(balanceC),
    seShareOfProfit: profitC > 0 && seTax > 0 ? percent1(seTax * 100, profitC) : null,
    beyondScope: netEarnings > rules.additionalMedicareThreshold,
    expectDuringYear: tax >= rules.estimatedTaxLine,
  };
}

/**
 * The smallest profit, in dollars, whose rounded net earnings reach `earnings`: a rounded figure
 * reaches N once the unrounded one is N − 0.5. For $400 that is $432.60; for $200,001 (just above
 * the Additional Medicare line) it is $216,567.95.
 */
export function profitForNetEarnings(earnings: number, rules: Pick<UsRules, 'seNetEarningsShare'>): number {
  return Math.ceil(((earnings - 0.5) * NET_EARNINGS_DIVISOR) / toBasisPoints(rules.seNetEarningsShare)) / 100;
}

/** Where self-employment tax starts, in profit: $432.60 under the 2026 rules. */
export const seStartProfit = (rules: UsRules): number => profitForNetEarnings(rules.seThreshold, rules);

/** Where this tool stops, in profit: the first profit whose net earnings pass the Additional Medicare line. */
export const beyondScopeProfit = (rules: UsRules): number => profitForNetEarnings(rules.additionalMedicareThreshold + 1, rules);

/** The combined self-employment rate, 12.4 + 2.9 = 15.3, without a floating-point tail. */
export const seCombinedRate = (rules: Pick<UsRules, 'seSocialSecurityRate' | 'seMedicareRate'>): number =>
  (Math.round(rules.seSocialSecurityRate * 10) + Math.round(rules.seMedicareRate * 10)) / 10;

/* ----------------------------------------------------------------------------------------------
 * India
 * -------------------------------------------------------------------------------------------- */

export interface IndiaRules {
  /** ₹: advance tax is due during the year once a year's tax, after all TDS, is 10,000 or more. */
  advanceTaxLine: number;
}

export function indiaRulesFrom(rules: readonly Rule[]): IndiaRules {
  return { advanceTaxLine: ruleValue(rules, 'advanceTaxLine') };
}

export interface TdsInput {
  tdsOnStatement: number;
  otherCredits: number;
  taxDue: number;
  missing: number;
  /** null when not given. */
  invoiced: number | null;
  /** null when not given. */
  arrived: number | null;
}

export interface TdsBalance {
  /** Tax on record in your name: TDS on the statement + other tax already paid. */
  credits: number;
  /** credits − tax due; below 0 when tax is still to pay. */
  balance: number;
  comesBack: number;
  stillToPay: number;
  /** Deducted but not on the statement yet: returned unchanged, never in the sum. */
  missing: number;
  /** Invoiced − arrived, or null when either is not given. */
  gap: number | null;
  /** The gap equals the TDS on the statement plus what is missing; null when there is no gap. */
  gapMatches: boolean | null;
  /**
   * The tax still to pay after every deduction in your name, on the statement or not, reaches the
   * advance-tax line. A deduction missing from the statement was still made, so it counts here even
   * though it is kept out of the sum.
   */
  advanceTaxDue: boolean;
}

/**
 * What can come back, or is still to pay, on the credits on record. Only credits on the statement
 * count: a deduction not yet on it cannot be refunded until the payer corrects its filing. The
 * invoice gap is only a check, because it can also be GST, fees or a payment not yet made. The
 * advance-tax fact is different: it asks whether the tax still to pay after every deduction in your
 * name, on the statement or not, reaches the line, so a missing deduction counts there.
 */
export function tdsBalance(input: TdsInput, rules: IndiaRules): TdsBalance {
  const creditsC = toCents(input.tdsOnStatement) + toCents(input.otherCredits);
  const balanceC = creditsC - toCents(input.taxDue);
  const stillToPay = fromCents(Math.max(0, -balanceC));
  const given = input.invoiced !== null && input.arrived !== null;
  const gapC = given ? toCents(input.invoiced as number) - toCents(input.arrived as number) : null;
  return {
    credits: fromCents(creditsC),
    balance: fromCents(balanceC),
    comesBack: fromCents(Math.max(0, balanceC)),
    stillToPay,
    missing: input.missing,
    gap: gapC === null ? null : fromCents(gapC),
    gapMatches: gapC === null ? null : gapC === toCents(input.tdsOnStatement) + toCents(input.missing),
    advanceTaxDue: -balanceC - toCents(input.missing) >= toCents(rules.advanceTaxLine),
  };
}

/** yyyymmdd as a UTC timestamp, for a rule that holds a date (the belated-return deadline). */
export function dateFromRule(value: number): number {
  const y = Math.floor(value / 10000);
  const m = Math.floor((value % 10000) / 100);
  const d = value % 100;
  return Date.UTC(y, m - 1, d);
}

/* ----------------------------------------------------------------------------------------------
 * Validation, for the island
 * -------------------------------------------------------------------------------------------- */

export const AMOUNT_MAX = 1e12;
export const ERRORS = {
  negative: 'Enter 0 or more.',
  tooBig: 'That figure is larger than this tool works with.',
  rate: 'A rate cannot be more than 100%.',
  arrived: 'More arrived than was invoiced. Check both figures.',
} as const;

/** A read field: its value (blank counts as 0 unless `optional`) and its error, if any. */
export interface Checked {
  value: number | null;
  error?: string;
}

/**
 * One typed amount, already read (readAmount): blank or unreadable counts as 0, or as not given
 * for an optional field; below 0, above 1e12 (which keeps integer cents safe) or a rate above 100
 * is an error.
 */
export function checkAmount(read: { value: number | null; tooBig: boolean }, options: { optional?: boolean; percent?: boolean } = {}): Checked {
  if (read.tooBig) return { value: null, error: ERRORS.tooBig };
  if (read.value === null) return { value: options.optional ? null : 0 };
  if (read.value < 0) return { value: null, error: ERRORS.negative };
  if (read.value > AMOUNT_MAX) return { value: null, error: ERRORS.tooBig };
  if (options.percent && read.value > 100) return { value: null, error: ERRORS.rate };
  return { value: read.value };
}

/* ----------------------------------------------------------------------------------------------
 * Config
 * -------------------------------------------------------------------------------------------- */

/** The day a person last opened each source below. */
const CHECKED = '2026-09-22';

const SCHEDULE_SE = 'https://www.irs.gov/instructions/i1040sse';
const SE_TAX_PAGE = 'https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes';
const REV_PROC = 'https://www.irs.gov/pub/irs-drop/rp-25-32.pdf';
const TAX_PAYMENTS = 'https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/tax-payments';

export const CONFIG: EditionConfigs<SideIncomeTaxConfig> = {
  in: {
    scenario: 'The internship in the lesson on getting TDS back: ₹15,000 withheld from ₹1,50,000 of fees, on an income that owed no tax.',
    defaults: { tdsOnStatement: '15000', otherCredits: '0', taxDue: '0', missing: '0', invoiced: '150000', arrived: '135000' },
    rules: [
      {
        key: 'advanceTaxLine',
        value: 10000,
        label: 'Advance tax is due during the year once a year’s tax, after tax deducted at source, is ₹10,000 or more; under the presumptive scheme, all of it by 15 March',
        source: { title: 'Income Tax Department, Tax payments (page undated; accessed 22 September 2026)', url: TAX_PAYMENTS },
        asOf: CHECKED,
      },
      {
        key: 'advanceTaxInstalments',
        value: 4,
        label: 'Advance tax is paid in four instalments: at least 15% by 15 June, 45% by 15 September, 75% by 15 December and all of it by 15 March',
        source: {
          title: 'Income Tax Department, What are the due dates for payment of advance tax? (FAQ, undated; accessed 22 September 2026)',
          url: 'https://www.incometaxindia.gov.in/w/what-are-the-due-dates-for-payment-of-advance-tax-',
        },
        asOf: CHECKED,
      },
      {
        key: 'advanceTaxInterestPerMonth',
        value: 1,
        label: 'Interest on advance tax not paid, or paid short or late: from 1% a month (not worked out here)',
        source: { title: 'Income Tax Department, Tax payments and its FAQ (pages undated; accessed 22 September 2026)', url: TAX_PAYMENTS },
        asOf: CHECKED,
      },
      {
        key: 'belatedReturnLastDay',
        value: 20261231,
        label: 'For 2025-26 income, a belated return can be filed until 31 December 2026, or before assessment if that comes first; an updated return filed after that cannot increase a refund',
        source: {
          title: 'Income Tax Department, Income tax returns (page undated; accessed 22 September 2026)',
          url: 'https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/income-tax-returns',
        },
        asOf: CHECKED,
        reviewBy: '2026-12-31',
      },
      {
        key: 'statementForm',
        value: 168,
        label: 'For 2025-26 income (Income-tax Act, 1961), tax deducted in your name shows on the Annual Information Statement and Form 26AS; for income from 1 April 2026 (Income-tax Act, 2025, tax year 2026-27), on the Annual Information Statement in Form No. 168',
        source: {
          title: 'Income Tax Department, TDS compliance (page undated; accessed 22 September 2026)',
          url: 'https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/tds-compliance',
        },
        asOf: CHECKED,
      },
    ],
    links: {
      taxCalculator: {
        title: 'Income and Tax Calculator (accessed 22 September 2026)',
        url: 'https://www.incometax.gov.in/iec/foportal/income-tax-calculator',
      },
      returns: {
        title: 'Income tax returns (accessed 22 September 2026)',
        url: 'https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/income-tax-returns',
      },
      refundStatus: {
        title: 'Refund status (accessed 22 September 2026)',
        url: 'https://www.incometax.gov.in/iec/foportal/help/refund_status_user_manual',
      },
      tdsCompliance: {
        title: 'TDS compliance (accessed 22 September 2026)',
        url: 'https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/tds-compliance',
      },
      taxPayments: { title: 'Tax payments (accessed 22 September 2026)', url: TAX_PAYMENTS },
      rectification: {
        title: 'Rectification request for a tax credit mismatch (accessed 22 September 2026)',
        url: 'https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/rectification-request-tax-credit-mismatch',
      },
      ais: {
        title: 'Annual Information Statement (accessed 22 September 2026)',
        url: 'https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/ais-annual-information-statement',
      },
    },
    glossary: ['tds', 'annual-information-statement', 'form-26as', 'tax-return', 'advance-tax'],
  },
  us: {
    scenario: 'The lesson’s year of tutoring and reselling: $6,000 in, $1,000 of costs, and no other income.',
    defaults: { moneyIn: '6000', costs: '1000', incomeTaxPercent: '0', alreadyPaid: '0' },
    rules: [
      {
        key: 'seNetEarningsShare',
        value: 92.35,
        label: 'Net earnings from self-employment are 92.35% of net profit: 100% less the 7.65% an employer would pay (Schedule SE, line 4a)',
        source: { title: 'IRS, 2025 Instructions for Schedule SE (Form 1040), line 4a (last reviewed 30 April 2026)', url: SCHEDULE_SE },
        asOf: CHECKED,
        reviewBy: '2027-01-31',
      },
      {
        key: 'seThreshold',
        value: 400,
        label: 'Self-employment tax applies once net earnings reach $400 in a year (Schedule SE, line 4c), about $433 of profit',
        source: { title: 'IRS, 2025 Instructions for Schedule SE: Schedule SE is required when line 4c is $400 or more (last reviewed 30 April 2026)', url: SCHEDULE_SE },
        asOf: CHECKED,
        reviewBy: '2027-01-31',
      },
      {
        key: 'seSocialSecurityRate',
        value: 12.4,
        label: 'Social Security part of self-employment tax: 12.4% of net earnings',
        source: { title: 'IRS, Self-employment tax (Social Security and Medicare taxes) (last reviewed 27 June 2026)', url: SE_TAX_PAGE },
        asOf: CHECKED,
      },
      {
        key: 'seMedicareRate',
        value: 2.9,
        label: 'Medicare part of self-employment tax: 2.9% of all net earnings, 15.3% in all',
        source: { title: 'IRS, Self-employment tax (Social Security and Medicare taxes) (last reviewed 27 June 2026)', url: SE_TAX_PAGE },
        asOf: CHECKED,
      },
      {
        key: 'ssWageBase',
        value: 184500,
        label: 'The 12.4% applies to at most $184,500 of wages and net earnings together in 2026',
        source: { title: 'IRS, Topic no. 751, Social Security and Medicare withholding rates (updated 20 January 2026)', url: 'https://www.irs.gov/taxtopics/tc751' },
        asOf: CHECKED,
        reviewBy: '2027-01-01',
      },
      {
        key: 'additionalMedicareThreshold',
        value: 200000,
        label: 'Above $200,000 of net earnings for a single filer, an extra 0.9% Medicare tax can apply; this tool stops there',
        source: { title: 'IRS, Topic no. 554, Self-employment tax (updated 26 May 2026)', url: 'https://www.irs.gov/taxtopics/tc554' },
        asOf: CHECKED,
      },
      {
        key: 'estimatedTaxLine',
        value: 1000,
        label: 'The IRS generally expects tax paid during the year from people who will owe $1,000 or more after withholding and credits',
        source: {
          title: 'IRS, Estimated taxes (last updated 28 June 2026)',
          url: 'https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes',
        },
        asOf: CHECKED,
      },
      {
        key: 'standardDeductionSingle2026',
        value: 16100,
        label: 'Standard deduction for a single filer, 2026: $16,100 (named in the hint; not used in the sum)',
        source: { title: 'IRS, IR-2025-103, tax inflation adjustments for tax year 2026 (9 October 2025)', url: 'https://www.irs.gov/node/151941' },
        asOf: CHECKED,
        reviewBy: '2027-01-01',
      },
      {
        key: 'dependentStandardDeductionFloor2026',
        value: 1350,
        label: 'Standard deduction for someone who can be claimed as a dependent, 2026: the greater of $1,350 or earned income plus $450 (not used in the sum)',
        source: { title: 'IRS, Revenue Procedure 2025-32, section 3.14(2) (9 October 2025)', url: REV_PROC },
        asOf: CHECKED,
        reviewBy: '2027-01-01',
      },
      {
        key: 'dependentEarnedIncomeAddOn2026',
        value: 450,
        label: 'Amount added to a dependent’s earned income for the standard deduction, 2026: $450',
        source: { title: 'IRS, Revenue Procedure 2025-32, section 3.14(2) (9 October 2025)', url: REV_PROC },
        asOf: CHECKED,
        reviewBy: '2027-01-01',
        inLine: false,
      },
    ],
    links: {
      estimatedTaxes: {
        title: 'IRS, Estimated taxes (last updated 28 June 2026)',
        url: 'https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes',
      },
      gigWork: {
        title: 'IRS, Manage taxes for your gig work (last reviewed 28 June 2026)',
        url: 'https://www.irs.gov/businesses/small-businesses-self-employed/manage-taxes-for-your-gig-work',
      },
      topic554: { title: 'IRS, Topic no. 554, Self-employment tax (updated 26 May 2026)', url: 'https://www.irs.gov/taxtopics/tc554' },
      withholdingEstimator: {
        title: 'IRS, Tax Withholding Estimator (last reviewed 27 June 2026)',
        url: 'https://www.irs.gov/individuals/tax-withholding-estimator',
      },
      stateTaxes: { title: 'USA.gov, State income taxes (updated 11 December 2025)', url: 'https://www.usa.gov/state-taxes' },
    },
    glossary: ['net-earnings', 'self-employment-tax', 'estimated-tax'],
  },
};
