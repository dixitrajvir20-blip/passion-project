/** Take-home pay, line by line: each edition's opening values, with the sources behind them, and the pure maths. Owned by the take-home-pay builder. Tool maths and pins from the revised spec go here and in tests/unit/tools/take-home-pay.test.ts, never in finance.ts; defaults and rules go in CONFIG, never in regions.ts. The names CONFIG and TakeHomePayConfig are imported by the page and must stay. */
import {
  PAYDAYS,
  deductions,
  fromCents,
  parsePayFrequency,
  percent1,
  shareOf,
  toBasisPoints,
  toCents,
  type PayFrequency,
} from '../finance';
import { numberInputValue } from '../fields';
import { money, number, percentValue, ratePercent, type Locale } from '../format';
import type { EditionConfigs, Rule, ToolConfig } from './types';

/* ---------------------------------------------------------------------------------------------
 * Config: one per edition. Plain JSON data; the page passes the edition's own to the island.
 * India and the US carry edition rules, so their island never shows a currency picker.
 * ------------------------------------------------------------------------------------------- */

export const START_FROM = ['ctc', 'gross'] as const;
export type StartFrom = (typeof START_FROM)[number];
export const PF_ON = ['all', 'capped', 'printed', 'none'] as const;
export type PfOn = (typeof PF_ON)[number];
export const PAID_EVERY = Object.keys(PAYDAYS) as PayFrequency[];

/** Rows per link key: India and US "other lines" up to 5; Europe's own-named lines 1 to 8. */
export const MAX_OTHERS = 5;
export const MAX_LINES = 8;
/** The largest amount a money field takes; keeps cents × 52 × 1000 inside safe integers. */
export const MONEY_MAX = 1_000_000_000;
export const HOURS_MAX = 744;
export const RATE_MAX = 10_000;

export interface EpfConfig extends ToolConfig {
  mode: 'epf';
  rules: Rule[];
  startLabels: { ctc: string; gross: string };
  defaults: {
    startFrom: StartFrom;
    start: string;
    otherEmployerCosts: string;
    pfOn: PfOn;
    pfWages: string;
    epfPrinted: string;
    employerEpfPrinted: string;
    professionalTax: string;
    tds: string;
    /** 'label~amount|…', as in a link. */
    others: string;
  };
}

export interface TypedConfig extends ToolConfig {
  mode: 'typed';
  startLabel: string;
  defaults: { start: string; lines: string; employerOnTop: string };
}

export interface FicaConfig extends ToolConfig {
  mode: 'fica';
  rules: Rule[];
  startLabel: string;
  defaults: {
    start: string;
    hours: string;
    hourlyRate: string;
    overtimeHours: string;
    socialSecurity: string;
    medicare: string;
    federal: string;
    state: string;
    paidEvery: PayFrequency;
    others: string;
  };
}

export type TakeHomePayConfig = EpfConfig | TypedConfig | FicaConfig;

const NEWSONAIR_SCHEME = {
  title: "Central govt notifies Employees' Provident Fund Scheme 2026 (Akashvani News, 2 July 2026)",
  url: 'https://newsonair.gov.in/central-govt-notifies-employees-provident-fund-scheme-2026/',
};
const NEWSONAIR_CEILING = {
  title: 'Cabinet raises EPFO mandatory coverage wage ceiling from ₹15,000 to ₹25,000 (Akashvani News, 17 September 2026)',
  url: 'https://newsonair.gov.in/cabinet-raises-epfo-mandatory-coverage-wage-ceiling-from-%E2%82%B915000-to-%E2%82%B925000/',
};
const IRS_751 = {
  title: 'Topic no. 751, Social Security and Medicare withholding rates (IRS, updated 20 January 2026)',
  url: 'https://www.irs.gov/taxtopics/tc751',
};
const DOL_OVERTIME = {
  title: 'Overtime pay (US Department of Labor, Wage and Hour Division; accessed 22 September 2026)',
  url: 'https://www.dol.gov/agencies/whd/overtime',
};
const CHECKED = '2026-09-22';

export const CONFIG: EditionConfigs<TakeHomePayConfig> = {
  in: {
    mode: 'epf',
    scenario: 'The first payslip from the India lesson: a ₹4,20,000 CTC, ₹35,000 a month.',
    startLabels: { ctc: 'Monthly CTC', gross: 'Gross salary this month' },
    defaults: {
      startFrom: 'ctc',
      start: '35000',
      otherEmployerCosts: '0',
      pfOn: 'all',
      pfWages: '17500',
      epfPrinted: '',
      employerEpfPrinted: '',
      professionalTax: '200',
      tds: '0',
      others: '',
    },
    rules: [
      {
        key: 'epfRate',
        value: 12,
        label: 'EPF: 12% of PF wages from you, and 12% from your employer (EPF Scheme 2026, in force from 29 June 2026)',
        source: NEWSONAIR_SCHEME,
        asOf: CHECKED,
        reviewBy: '2027-03-22',
      },
      {
        key: 'epfReducedRate',
        value: 10,
        label: 'A few establishments notified by the central government keep a 10% EPF rate; choose "As printed on my payslip" for them',
        source: NEWSONAIR_SCHEME,
        asOf: CHECKED,
        reviewBy: '2027-03-22',
        inLine: false,
      },
      {
        key: 'epfWageCeiling',
        value: 25000,
        label: 'Wage ceiling for compulsory EPF: ₹25,000 a month from 17 September 2026 (it was ₹15,000)',
        source: NEWSONAIR_CEILING,
        asOf: CHECKED,
        reviewBy: '2027-03-22',
      },
      {
        key: 'epfShareAtCeiling',
        value: 3000,
        label: 'Where contributions are held to the ceiling, 12% of ₹25,000 is ₹3,000 a side (it was ₹1,800), worked from the ceiling Akashvani reports',
        source: {
          title: 'Cabinet raises EPFO mandatory coverage wage ceiling from ₹15,000 to ₹25,000 (Akashvani News, 17 September 2026)',
          url: 'https://newsonair.gov.in/cabinet-raises-epfo-mandatory-coverage-wage-ceiling-from-%E2%82%B915000-to-%E2%82%B925000/',
        },
        asOf: CHECKED,
        reviewBy: '2027-03-22',
      },
      {
        key: 'wagesHalfRule',
        value: 50,
        label: 'Basic pay, dearness allowance and retaining allowance must be at least half of total pay; allowances beyond half count as wages for PF (Code on Social Security 2020, section 2(88))',
        source: {
          title: 'The Code on Social Security, 2020, section 2(88), the definition of wages (India Code)',
          url: 'https://www.indiacode.nic.in/handle/123456789/16178',
        },
        asOf: CHECKED,
        reviewBy: '2027-03-22',
        inLine: false,
      },
      {
        key: 'epfCoverageStaff',
        value: 20,
        label: 'EPF applies to establishments with 20 or more employees',
        source: {
          title: 'EPF under the Code on Social Security (Labour Law Reporter, accessed 22 September 2026)',
          url: 'https://labourlawreporter.com/epf.asp',
        },
        asOf: CHECKED,
        reviewBy: '2027-03-22',
        inLine: false,
      },
      {
        key: 'professionalTaxYearCap',
        value: 2500,
        label: 'Professional tax on one person may not pass ₹2,500 a year (Article 276(2) of the Constitution)',
        source: {
          title: 'Article 276, Constitution of India (Centre for Law and Policy Research)',
          url: 'https://www.constitutionofindia.net/articles/article-276-taxes-on-professions-trades-callings-and-employments/',
        },
        asOf: CHECKED,
      },
    ],
    glossary: ['ctc', 'gross-pay', 'basic-pay', 'epf', 'eps', 'wage-ceiling', 'professional-tax', 'tds', 'esi', 'gratuity', 'in-hand-pay'],
  },
  eu: {
    mode: 'typed',
    scenario: 'The Europe lesson’s first apprentice payslip: €1,500 gross a month.',
    startLabel: 'Gross pay this month',
    defaults: {
      start: '1500',
      lines: 'Pension contribution~135|Health cover~135|Unemployment cover~30|Income tax~50',
      employerOnTop: '300',
    },
    glossary: ['payslip', 'gross-pay', 'net-pay', 'social-contributions', 'employer-contributions'],
  },
  us: {
    mode: 'fica',
    scenario: 'The US lesson’s first pay stub: 80 hours at $20.',
    startLabel: 'Gross pay on this paycheck',
    defaults: {
      start: '1600',
      hours: '80',
      hourlyRate: '20',
      overtimeHours: '0',
      socialSecurity: '99.20',
      medicare: '23.20',
      federal: '110',
      state: '50',
      paidEvery: 'fortnightly',
      others: '',
    },
    rules: [
      {
        key: 'socialSecurityRate',
        value: 6.2,
        label: 'Social Security: 6.2% of wages from you, and the same again from your employer (used only to check your stub)',
        source: IRS_751,
        asOf: CHECKED,
        reviewBy: '2027-01-15',
      },
      {
        key: 'medicareRate',
        value: 1.45,
        label: 'Medicare: 1.45% of wages from you, and the same again from your employer (used only to check your stub)',
        source: IRS_751,
        asOf: CHECKED,
        reviewBy: '2027-01-15',
      },
      {
        key: 'socialSecurityWageBase',
        value: 184500,
        label: 'Social Security stops once a year’s wages pass $184,500 (the 2026 figure; it changes each January)',
        source: IRS_751,
        asOf: CHECKED,
        reviewBy: '2027-01-15',
      },
      {
        key: 'additionalMedicareRate',
        value: 0.9,
        label: 'An extra 0.9% of Medicare is withheld on wages above $200,000 in a year',
        source: IRS_751,
        asOf: CHECKED,
        reviewBy: '2027-01-15',
      },
      {
        key: 'additionalMedicareThreshold',
        value: 200000,
        label: 'Wages in a year above which the extra 0.9% of Medicare is withheld: $200,000',
        source: IRS_751,
        asOf: CHECKED,
        reviewBy: '2027-01-15',
        inLine: false,
      },
      {
        key: 'overtimeMultiplier',
        value: 1.5,
        label: 'Overtime: at least 1.5 times the regular rate, for hours over 40 in a workweek',
        source: DOL_OVERTIME,
        asOf: CHECKED,
      },
      {
        key: 'overtimeWeeklyHours',
        value: 40,
        label: 'Overtime applies to hours over 40 in a workweek',
        source: DOL_OVERTIME,
        asOf: CHECKED,
        inLine: false,
      },
    ],
    glossary: ['pay-stub', 'gross-pay', 'fica', 'w-4', 'withholding', 'net-pay', 'hourly-wage'],
  },
};

/** The keys of each mode's number fields, whose link values numberFieldValue rewrites. */
export const NUMBER_KEYS = {
  epf: ['start', 'otherEmployerCosts', 'pfWages', 'epfPrinted', 'employerEpfPrinted', 'professionalTax', 'tds'],
  typed: ['start', 'employerOnTop'],
  fica: ['start', 'hours', 'hourlyRate', 'overtimeHours', 'socialSecurity', 'medicare', 'federal', 'state'],
} as const;

/**
 * A link value as a number field can show it, so the field shows the figure the sum uses: '35,000'
 * becomes '35000', '+5' becomes '5', '0x10' becomes '10', and text with no number in it ''. The kit's
 * useFields now does the same for every field on screen at load; this also covers the fields of a
 * mode that is not on screen yet.
 */
export const numberFieldValue = numberInputValue;

/** A rule's value by key. A config without it is a build bug, which the unit tests catch. */
export function ruleValue(rules: readonly Rule[], key: string): number {
  const rule = rules.find((r) => r.key === key);
  if (!rule) throw new Error(`take-home-pay: no rule "${key}" in this edition's config`);
  return rule.value;
}

/* ---------------------------------------------------------------------------------------------
 * The maths. Pure, no DOM, money in whole cents (paise).
 * ------------------------------------------------------------------------------------------- */

/** A typed amount that counts: finite and above 0, else 0 (negatives are flagged by the island). */
export const line = (v: number | null | undefined): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

export const parseStartFrom = (v: unknown): StartFrom => (v === 'gross' ? 'gross' : 'ctc');
export const parsePfOn = (v: unknown): PfOn => (typeof v === 'string' && (PF_ON as readonly string[]).includes(v) ? (v as PfOn) : 'all');

export type LineKind =
  | 'employer-epf'
  | 'other-ctc'
  | 'your-epf'
  | 'professional-tax'
  | 'tds'
  | 'other'
  | 'row'
  | 'social-security'
  | 'medicare'
  | 'federal'
  | 'state';

export interface LedgerLine {
  label: string;
  amount: number;
  /** Names the running figure after this line ("Gross salary"). */
  subtotalLabel?: string;
  kind: LineKind;
}

export type Status = 'no-start' | 'over' | 'ok';

export interface NamedAmount {
  label: string;
  amount: number;
}

interface Chain {
  start: number;
  lines: LedgerLine[];
  running: number[];
  net: number;
  deducted: number;
  /** Lines above 0; a ₹0 TDS line stays in the ledger but is not counted. */
  lineCount: number;
  status: Status;
  netShare: number | null;
}

function chain(start: number, lines: LedgerLine[]): Chain {
  const from = line(start);
  const startC = toCents(from);
  const sum = deductions(from, lines);
  const netC = toCents(sum.net);
  const status: Status = startC <= 0 ? 'no-start' : netC <= 0 ? 'over' : 'ok';
  return {
    start: from,
    lines,
    running: sum.running,
    net: sum.net,
    deducted: sum.deducted,
    lineCount: lines.filter((l) => toCents(l.amount) > 0).length,
    status,
    netShare: status === 'ok' ? percent1(netC, startC) : null,
  };
}

const named = (rows: readonly NamedAmount[], max: number, blank: (n: number) => string, kind: LineKind): LedgerLine[] =>
  rows.slice(0, max).map((row, i) => ({ label: row.label.trim() || blank(i + 1), amount: line(row.amount), kind }));

/* India: from CTC or gross, with the two EPF shares worked out, capped, printed or absent. */

export interface EpfInput {
  mode: 'epf';
  startFrom: StartFrom;
  start: number;
  otherEmployerCosts: number;
  pfOn: PfOn;
  pfWages: number;
  epfPrinted: number | null;
  employerEpfPrinted: number | null;
  professionalTax: number;
  tds: number;
  others: NamedAmount[];
  rules: { epfRate: number; epfWageCeiling: number; professionalTaxYearCap: number };
}

export interface EpfResult extends Chain {
  mode: 'epf';
  startFrom: StartFrom;
  pfOn: PfOn;
  /** The gross salary: the running figure after the CTC-only lines, or the start. */
  gross: number;
  yours: number;
  employer: number;
  employerAssumed: boolean;
  /** 'capped' with PF wages above the ceiling: the shares are worked on the ceiling. */
  capApplied: boolean;
  /** Both shares from CTC, your share from gross; null when 0. */
  fundTotal: number | null;
  notes: {
    halfRule: boolean;
    aboveCeiling: boolean;
    wagesBlank: boolean;
    printedBlank: boolean;
    pfWagesAbovePay: boolean;
    ptAboveMonthly: boolean;
  };
}

/** rate% of the wages in whole rupees, half up: EPFO rounds to the rupee (₹17,504 gives ₹2,100). */
export const epfShare = (wages: number, ratePercent: number): number =>
  Math.round((toCents(line(wages)) * toBasisPoints(ratePercent)) / 1_000_000);

function takeHomeEpf(input: EpfInput): EpfResult {
  const startFrom = parseStartFrom(input.startFrom);
  const pfOn = parsePfOn(input.pfOn);
  const { epfRate, epfWageCeiling, professionalTaxYearCap } = input.rules;
  const wages = line(input.pfWages);
  const worked = pfOn === 'all' || pfOn === 'capped';

  let yours = 0;
  let employer = 0;
  let employerAssumed = false;
  if (pfOn === 'all') {
    yours = employer = epfShare(wages, epfRate);
  } else if (pfOn === 'capped') {
    yours = employer = epfShare(Math.min(wages, epfWageCeiling), epfRate);
  } else if (pfOn === 'printed') {
    yours = line(input.epfPrinted);
    employerAssumed = input.employerEpfPrinted === null;
    employer = employerAssumed ? yours : line(input.employerEpfPrinted);
  }

  const lines: LedgerLine[] = [];
  if (startFrom === 'ctc') {
    if (employer > 0) lines.push({ label: "Employer's EPF share", amount: employer, kind: 'employer-epf' });
    const other = line(input.otherEmployerCosts);
    if (other > 0) lines.push({ label: 'Other parts of the CTC', amount: other, kind: 'other-ctc' });
    if (lines.length > 0) lines[lines.length - 1].subtotalLabel = 'Gross salary';
  }
  const ctcLines = lines.length;
  if (pfOn !== 'none') lines.push({ label: 'Your EPF share', amount: yours, kind: 'your-epf' });
  lines.push({ label: 'Professional tax', amount: line(input.professionalTax), kind: 'professional-tax' });
  lines.push({ label: 'TDS', amount: line(input.tds), kind: 'tds' });
  lines.push(...named(input.others, MAX_OTHERS, (n) => `Other line ${n}`, 'other'));

  const result = chain(input.start, lines);
  const gross = ctcLines > 0 ? result.running[ctcLines - 1] : result.start;
  const fund = startFrom === 'ctc' ? yours + employer : yours;

  return {
    ...result,
    mode: 'epf',
    startFrom,
    pfOn,
    gross,
    yours,
    employer,
    employerAssumed,
    capApplied: pfOn === 'capped' && wages > epfWageCeiling,
    fundTotal: fund > 0 ? fund : null,
    notes: {
      halfRule: worked && wages > 0 && 2 * toCents(wages) < toCents(gross),
      aboveCeiling: pfOn === 'all' && wages > epfWageCeiling,
      wagesBlank: worked && wages <= 0,
      printedBlank: pfOn === 'printed' && line(input.epfPrinted) === 0,
      pfWagesAbovePay: worked && gross > 0 && wages > gross,
      ptAboveMonthly: line(input.professionalTax) > Math.floor(professionalTaxYearCap / 12),
    },
  };
}

/* Europe: the reader's own named lines, each shown as a share of gross; employer costs beside it. */

export interface TypedInput {
  mode: 'typed';
  start: number;
  rows: NamedAmount[];
  employerOnTop: number | null;
}

export interface TypedResult extends Chain {
  mode: 'typed';
  /** Each line as a percentage of gross, one decimal; null when gross is not above 0. */
  impliedPercents: (number | null)[];
  /** The typed employer contributions when above 0, else null (the facts are hidden). */
  employerOnTop: number | null;
  employerCost: number | null;
}

function takeHomeTyped(input: TypedInput): TypedResult {
  const lines = named(input.rows, MAX_LINES, (n) => `Line ${n}`, 'row');
  const result = chain(input.start, lines);
  const startC = toCents(result.start);
  const onTop = line(input.employerOnTop);
  return {
    ...result,
    mode: 'typed',
    impliedPercents: lines.map((l) => percent1(toCents(l.amount), startC)),
    employerOnTop: onTop > 0 ? onTop : null,
    employerCost: onTop > 0 && startC > 0 ? fromCents(startC + toCents(onTop)) : null,
  };
}

/* The US: the stub's lines as printed, with the hours and the two FICA lines checked. */

export interface FicaInput {
  mode: 'fica';
  start: number;
  hours: number;
  hourlyRate: number;
  overtimeHours: number;
  socialSecurity: number;
  medicare: number;
  federal: number;
  state: number;
  others: NamedAmount[];
  paidEvery: string;
  rules: {
    socialSecurityRate: number;
    medicareRate: number;
    socialSecurityWageBase: number;
    additionalMedicareThreshold: number;
    overtimeMultiplier: number;
  };
}

export interface Check {
  expected: number;
  /** What the stub shows minus what was expected. */
  diff: number;
  /** Within one cent: payroll rounds sub-cent amounts its own way ($575.625 printed as $575.62). */
  match: boolean;
}

export interface PerMonth {
  year: number;
  /** Paychecks in most months. */
  usualCount: number;
  usualMonth: number;
  /** Months in a year that hold one paycheck more than usual. */
  monthsWithExtra: number;
}

export interface FicaResult extends Chain {
  mode: 'fica';
  checks: { socialSecurity: Check; medicare: Check; hours: Check | null };
  /** The employer's matching FICA: the typed lines, as the stub used them; null when both are 0. */
  employerMatch: number | null;
  paidEvery: PayFrequency;
  /** Paychecks a year. */
  n: number;
  wageBaseNote: boolean;
  additionalMedicareNote: boolean;
  projection: PerMonth | null;
}

const check = (expectedC: number, actualC: number): Check => {
  const diffC = actualC - expectedC;
  return { expected: fromCents(expectedC), diff: fromCents(diffC), match: Math.abs(diffC) <= 1 };
};

export function perMonth(perPay: number, n: number): PerMonth {
  const c = toCents(perPay);
  const usualCount = Math.floor(n / 12);
  return { year: fromCents(c * n), usualCount, usualMonth: fromCents(c * usualCount), monthsWithExtra: n - 12 * usualCount };
}

function takeHomeFica(input: FicaInput): FicaResult {
  const { socialSecurityRate, medicareRate, socialSecurityWageBase, additionalMedicareThreshold, overtimeMultiplier } = input.rules;
  const ss = line(input.socialSecurity);
  const med = line(input.medicare);
  const lines: LedgerLine[] = [
    { label: 'Social Security', amount: ss, kind: 'social-security' },
    { label: 'Medicare', amount: med, kind: 'medicare' },
    { label: 'Federal income tax', amount: line(input.federal), kind: 'federal' },
    { label: 'State income tax', amount: line(input.state), kind: 'state' },
    ...named(input.others, MAX_OTHERS, (n) => `Other line ${n}`, 'other'),
  ];
  const result = chain(input.start, lines);
  const startC = toCents(result.start);
  const hours = line(input.hours);
  const rate = line(input.hourlyRate);
  const overtime = line(input.overtimeHours);
  const paidEvery = parsePayFrequency(input.paidEvery, 'fortnightly');
  const n = PAYDAYS[paidEvery];
  const matchC = toCents(ss) + toCents(med);

  return {
    ...result,
    mode: 'fica',
    checks: {
      socialSecurity: check(shareOf(startC, socialSecurityRate), toCents(ss)),
      medicare: check(shareOf(startC, medicareRate), toCents(med)),
      hours: hours > 0 && rate > 0 ? check(toCents(hours * rate + overtime * rate * overtimeMultiplier), startC) : null,
    },
    employerMatch: matchC > 0 ? fromCents(matchC) : null,
    paidEvery,
    n,
    wageBaseNote: startC * n > socialSecurityWageBase * 100,
    additionalMedicareNote: startC * n > additionalMedicareThreshold * 100,
    projection: result.status === 'ok' ? perMonth(result.net, n) : null,
  };
}

export type TakeHomeInput = EpfInput | TypedInput | FicaInput;
export type TakeHomeResult = EpfResult | TypedResult | FicaResult;

export function takeHome(input: EpfInput): EpfResult;
export function takeHome(input: TypedInput): TypedResult;
export function takeHome(input: FicaInput): FicaResult;
export function takeHome(input: TakeHomeInput): TakeHomeResult;
export function takeHome(input: TakeHomeInput): TakeHomeResult {
  if (input.mode === 'epf') return takeHomeEpf(input);
  if (input.mode === 'typed') return takeHomeTyped(input);
  return takeHomeFica(input);
}

/* ---------------------------------------------------------------------------------------------
 * The words. Pure too, so every sentence is pinned by a unit test; the island only formats what
 * takeHome returns and never recomputes a value.
 * ------------------------------------------------------------------------------------------- */

const hasCents = (v: number | null | undefined) => typeof v === 'number' && toCents(v) % 100 !== 0;

/** Two decimals in US mode, or whenever any figure on screen has cents; otherwise none. */
export function needsCents(result: TakeHomeResult, extra: readonly (number | null | undefined)[] = []): boolean {
  if (result.mode === 'fica') return true;
  const figures: (number | null | undefined)[] = [result.start, result.net, result.deducted, ...result.running, ...result.lines.map((l) => l.amount), ...extra];
  if (result.mode === 'epf') figures.push(result.fundTotal, result.yours, result.gross);
  if (result.mode === 'typed') figures.push(result.employerOnTop, result.employerCost);
  return figures.some(hasCents);
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** One to ten in words, digits above ten. */
export const countWords = (n: number): string => WORDS[n] ?? String(n);

export interface Words {
  locale: Locale;
  /** Two decimals on every money figure. */
  cents: boolean;
}

const cash = (v: number, w: Words) => money(v, w.locale, w.cents ? 2 : 0);

const startNoun = (result: TakeHomeResult) =>
  result.mode === 'epf' ? (result.startFrom === 'ctc' ? 'monthly CTC' : 'gross salary') : 'gross pay';

function ofStart(result: TakeHomeResult, w: Words): string {
  const start = cash(result.start, w);
  if (result.mode === 'epf') return result.startFrom === 'ctc' ? `Of a monthly CTC of ${start}` : `Of a gross salary of ${start}`;
  if (result.mode === 'typed') return `Of gross pay of ${start} this month`;
  return `Of gross pay of ${start} on this paycheck`;
}

/** The document the reader holds: a pay stub in the US, a payslip in India and Europe. */
export const documentWord = (result: TakeHomeResult): string => (result.mode === 'fica' ? 'pay stub' : 'payslip');

/**
 * The share that reaches the account, in words when one decimal would contradict the sum beside
 * it: '100.0%' while money comes off, or '0.0%' while some arrives.
 */
function shareWords(result: TakeHomeResult, w: Words): string {
  const share = result.netShare ?? 0;
  if (share >= 100 && toCents(result.deducted) > 0) return 'almost all of it';
  if (share <= 0 && toCents(result.net) > 0) return 'almost none of it';
  return `${percentValue(share, w.locale, 1)} of it`;
}

/** The one status line under the ledger (p#thp-status), every branch of the spec. */
export function statusSentence(result: TakeHomeResult, w: Words): string {
  const noun = startNoun(result);
  const doc = documentWord(result);
  const start = cash(result.start, w);
  if (result.status === 'no-start') {
    return result.mode === 'fica'
      ? `Type the gross pay from your ${doc} to see what reaches your account.`
      : `Type the top figure on your ${doc}, the ${noun}, to see what reaches your account.`;
  }
  if (result.status === 'over') {
    return result.net < 0
      ? `These lines add up to ${cash(result.deducted, w)}, more than the ${noun} of ${start}. Check each one against your ${doc}; the answer is held back until they fit.`
      : `These lines add up to the whole ${noun} of ${start}, so nothing would reach your account. Check each one against your ${doc}.`;
  }
  if (result.lineCount === 0) return `${ofStart(result, w)}, all of it reaches your account, because every line is 0. Check that against your ${doc}.`;

  const head = `${ofStart(result, w)}, ${cash(result.net, w)} reaches your account: ${shareWords(result, w)}. ${cash(result.deducted, w)} comes off in ${countWords(result.lineCount)} ${result.lineCount === 1 ? 'line' : 'lines'}`;

  if (result.mode === 'epf') {
    if (result.fundTotal === null) return `${head}.`;
    return result.startFrom === 'ctc'
      ? `${head}, and ${cash(result.fundTotal, w)} of that goes into the provident fund and pension scheme for you.`
      : `${head}, and ${cash(result.yours, w)} of that is your own EPF share, kept in a fund in your name. Your employer adds its own share outside this sum.`;
  }
  if (result.mode === 'typed') {
    return result.employerOnTop !== null && result.employerCost !== null
      ? `${head}. Your employer pays ${cash(result.employerOnTop, w)} on top, so the job costs it ${cash(result.employerCost, w)}.`
      : `${head}.`;
  }
  const p = result.projection!;
  const lead = `${head}. If every paycheck matched this one, ${result.n} paychecks make ${cash(p.year, w)} a year`;
  switch (result.paidEvery) {
    case 'weekly':
      return `${lead}; most months hold four, ${cash(p.usualMonth, w)}, and usually four months a year hold a fifth.`;
    case 'twice-monthly':
      return `${lead}, two in every month, ${cash(p.usualMonth, w)}.`;
    case 'monthly':
      return `${lead}, one each month.`;
    default:
      return `${lead}; most months hold two, ${cash(p.usualMonth, w)}, and usually two months a year hold a third.`;
  }
}

/** Paychecks in a usual month, in words, for the fact label and the budget hand-off. */
export function usualPaychecks(paidEvery: PayFrequency): string {
  const count = Math.floor(PAYDAYS[paidEvery] / 12);
  return `${countWords(count)} ${count === 1 ? 'paycheck' : 'paychecks'}`;
}

/**
 * A rate of pay with the decimals it has, two to four: $20.00, $15.35, and $23.025 for 1.5 times
 * $15.35, so the printed figures add up by hand to the sum the check uses.
 */
export function rateText(v: number, locale: Locale): string {
  const cents = Number((v * 100).toPrecision(15));
  const digits = Number.isInteger(cents) ? 2 : Number.isInteger(Number((cents * 10).toPrecision(15))) ? 3 : 4;
  return money(v, locale, digits);
}

/** A count of hours as typed: 80, 37.5, 12.25. */
const hoursText = (h: number, locale: Locale) => number(h, locale, Number.isInteger(h) ? 0 : Number.isInteger(h * 10) ? 1 : 2);

const CENT_APART = 'a cent apart, which is how payroll rounds part of a cent.';

const EXEMPTIONS =
  'A pre-tax health plan lowers the pay this is worked on. Some workers pay none: students working for their own school, under-18s in a business owned only by a parent, and some international students on F-1 or J-1 visas (IRS Publication 15). Payroll can say which applies.';

/**
 * The US checks list, text only. Never the word "error": a difference is a question for payroll,
 * with the lawful reasons for one named first.
 */
export function checkLines(result: FicaResult, input: { hours: number; hourlyRate: number; overtimeHours: number; rules: { socialSecurityRate: number; medicareRate: number; overtimeMultiplier: number } }, w: Words): string[] {
  if (result.status === 'no-start') return [];
  const out: string[] = [];
  const locale = w.locale;
  const hours = result.checks.hours;
  if (hours) {
    const rate = rateText(line(input.hourlyRate), locale);
    const overtime = line(input.overtimeHours);
    const worked =
      overtime > 0
        ? `${hoursText(line(input.hours), locale)} at ${rate}, plus ${hoursText(overtime, locale)} overtime hours at ${rateText(line(input.hourlyRate) * input.rules.overtimeMultiplier, locale)}, is ${money(hours.expected, locale, 2)}`
        : `${hoursText(line(input.hours), locale)} at ${rate} is ${money(hours.expected, locale, 2)}`;
    const gross = money(result.start, locale, 2);
    out.push(
      hours.match
        ? hours.diff === 0
          ? `Hours: ${worked}, the same as the gross line.`
          : `Hours: ${worked}; the gross line is ${gross}, ${CENT_APART}`
        : `Hours: ${worked}; the gross line is ${gross}, ${money(Math.abs(hours.diff), locale, 2)} ${hours.diff > 0 ? 'more' : 'less'}. Overtime, tips, a second rate or a bonus can explain a difference. If none applies, ask payroll, with your shift notes and your offer.`,
    );
  }
  const fica = (name: string, rate: number, c: Check, typed: number) => {
    const head = `${name}: ${ratePercent(rate, locale, 2)} of ${money(result.start, locale, 2)} is ${money(c.expected, locale, 2)}`;
    if (!c.match) return `${head}; the stub shows ${money(typed, locale, 2)}. ${EXEMPTIONS}`;
    return c.diff === 0 ? `${head}, the same as the stub.` : `${head}; the stub shows ${money(typed, locale, 2)}, ${CENT_APART}`;
  };
  out.push(fica('Social Security', input.rules.socialSecurityRate, result.checks.socialSecurity, result.lines[0].amount));
  out.push(fica('Medicare', input.rules.medicareRate, result.checks.medicare, result.lines[1].amount));
  return out;
}

/** India's notes, each only when triggered, in the order the fields sit. */
export function epfNotes(result: EpfResult, rules: { epfWageCeiling: number; epfShareAtCeiling: number; professionalTaxYearCap: number }, locale: Locale): string[] {
  const out: string[] = [];
  const n = result.notes;
  const ceiling = money(rules.epfWageCeiling, locale);
  if (n.wagesBlank) out.push('No EPF worked out: type PF wages above 0.');
  if (n.printedBlank) out.push('Type your EPF line as printed.');
  if (n.pfWagesAbovePay) out.push('PF wages are part of your pay, so they are rarely above the gross salary; check the breakup.');
  if (n.halfRule) {
    out.push(
      'PF wages here are under half of the gross salary. Under the labour codes, allowances above half of pay count as wages too, so your EPF may be higher; if your EPF line differs, choose “As printed on my payslip”.',
    );
  }
  if (n.aboveCeiling) {
    out.push(
      `PF wages are above the ${ceiling} ceiling. Above it the contribution is voluntary, so an employer may cap both shares there, at ${money(rules.epfShareAtCeiling, locale)} each; if your payslip does, choose “12% of PF wages up to the ${ceiling} ceiling”.`,
    );
  }
  if (n.ptAboveMonthly) {
    out.push(
      `Professional tax is capped at ${money(rules.professionalTaxYearCap, locale)} a year, about ${money(Math.floor(rules.professionalTaxYearCap / 12), locale)} a month; some states charge more in one month to reach the cap. Check the line against your payslip.`,
    );
  }
  return out;
}

/** The US note on a year's wages passing the Social Security wage base, and the extra Medicare. */
export function ficaNotes(result: FicaResult, rules: { socialSecurityWageBase: number; additionalMedicareRate: number; additionalMedicareThreshold: number }, locale: Locale): string[] {
  if (!result.wageBaseNote && !result.additionalMedicareNote) return [];
  const base = money(rules.socialSecurityWageBase, locale);
  const extra = `above ${money(rules.additionalMedicareThreshold, locale)} an extra ${ratePercent(rules.additionalMedicareRate, locale, 2)} of Medicare is withheld`;
  if (!result.wageBaseNote) return [`At this pay, a year's wages would pass ${money(rules.additionalMedicareThreshold, locale)}, and ${extra} (IRS Topic 751).`];
  return [
    `At this pay, a year's wages would pass ${base}, where Social Security stops (IRS Topic 751), so later stubs in the year may show none${result.additionalMedicareNote ? `, and ${extra}` : ''}.`,
  ];
}

/* ---------------------------------------------------------------------------------------------
 * Field labels and hints, per mode. Here rather than in the island so a unit test can hold every
 * acronym a reader meets (CTC, EPF, TDS, ESI, DA, FICA, W-4) to its expansion or the page's terms.
 * ------------------------------------------------------------------------------------------- */

export interface FieldCopy {
  label: string;
  hint?: string;
  options?: { value: string; label: string }[];
}

export function fieldCopy(config: TakeHomePayConfig, locale: Locale): Record<string, FieldCopy> {
  const whole = (v: number) => money(v, locale, 0);
  const typed = (raw: string) => whole(Number(raw) || 0);

  if (config.mode === 'epf') {
    const rule = (key: string) => ruleValue(config.rules, key);
    const rate = ratePercent(rule('epfRate'), locale, 2);
    const ceiling = whole(rule('epfWageCeiling'));
    return {
      startFrom: {
        label: 'Where your payslip starts',
        hint: 'Most offers quote CTC; most payslips start at gross salary. Pick the figure you have in front of you.',
        options: [
          { value: 'ctc', label: 'Monthly CTC (from the offer letter)' },
          { value: 'gross', label: 'Gross salary (the payslip’s own total)' },
        ],
      },
      startCtc: {
        label: config.startLabels.ctc,
        hint: 'CTC, cost to company: the yearly figure on the offer letter divided by 12. It counts money paid for you into funds, not only your pay.',
      },
      startGross: { label: config.startLabels.gross, hint: 'The payslip’s own total of pay, before anything comes off.' },
      otherEmployerCosts: {
        label: 'Other parts of the CTC not paid to you each month',
        hint: 'Anything the offer counts in the CTC but does not pay you monthly: the employer’s ESI (Employees’ State Insurance) share, gratuity, insurance, admin charges, the monthly share of a yearly bonus. Copy it from the salary breakup; 0 if none.',
      },
      pfOn: {
        label: 'How EPF is taken on this payslip',
        hint: `EPF, the Employees’ Provident Fund, often printed as PF (provident fund). Pick what your payslip shows. Employers with fewer than ${rule('epfCoverageStaff')} staff need not enrol you, a few notified employers use ${ratePercent(rule('epfReducedRate'), locale, 2)}, and above ${ceiling} of wages the extra is voluntary.`,
        options: [
          { value: 'all', label: `${rate} of all PF wages` },
          { value: 'capped', label: `${rate} of PF wages up to the ${ceiling} ceiling` },
          { value: 'printed', label: 'As printed on my payslip' },
          { value: 'none', label: 'No EPF line on this payslip' },
        ],
      },
      pfWages: {
        label: 'PF wages a month: basic pay plus any dearness allowance (DA)',
        hint: `From your salary breakup: the wages your provident fund (PF) shares are worked out on. Both EPF shares are ${rate} of this. If allowances such as house rent allowance and special allowance are more than half your pay, the excess counts as wages too.`,
      },
      epfPrinted: { label: 'Your EPF line, as printed', hint: 'The EPF line on your payslip (it may say PF, for provident fund), copied as it is.' },
      employerEpfPrinted: {
        label: 'Employer’s EPF share, from your salary breakup',
        hint: 'Leave it blank and the tool assumes it equals yours, and the ledger says so.',
      },
      professionalTax: {
        label: 'Professional tax this month',
        hint: `A state tax on jobs. Some states charge none, and the Constitution caps it at ${whole(rule('professionalTaxYearCap'))} a year. ${typed(config.defaults.professionalTax)} is an example.`,
      },
      tds: {
        label: 'TDS this month, copied from your payslip',
        hint: `TDS, tax deducted at source: income tax taken month by month. Copy it from your payslip; this tool never works it out. On the lesson’s payslip it is ${typed(config.defaults.tds)}.`,
      },
      others: {
        label: 'Other lines on your payslip',
        hint: 'ESI (Employees’ State Insurance) appears at lower pay; a labour welfare fund, or any other line. Copy each as printed.',
      },
    };
  }

  if (config.mode === 'typed') {
    return {
      start: { label: config.startLabel, hint: 'The first money figure on your payslip, before anything comes off.' },
      lines: {
        label: 'The lines on your payslip, each with the name your payslip gives it',
        hint: 'Name each line as your payslip does: long-term care insurance, church tax or a social charge, for example. Countries print different lines. The four here are the lesson’s example.',
      },
      employerOnTop: {
        label: 'Employer contributions, if your payslip prints them',
        hint: 'Paid by the employer on top of gross pay. Shown beside the answer, never taken off your pay. Leave it blank if your payslip does not print it.',
      },
    };
  }

  const rule = (key: string) => ruleValue(config.rules, key);
  return {
    start: { label: config.startLabel, hint: 'The gross pay line on your pay stub, for this paycheck only.' },
    hours: {
      label: 'Regular hours on this paycheck',
      hint: 'The regular hours this paycheck pays for. Check them against your own note of the shifts you worked.',
    },
    hourlyRate: { label: 'Hourly rate', hint: 'The rate in your offer.' },
    overtimeHours: {
      label: 'Overtime hours on this paycheck',
      hint: `Hours over ${rule('overtimeWeeklyHours')} in a week, paid at least ${rule('overtimeMultiplier')} times the rate under federal law. 0 if none.`,
    },
    socialSecurity: {
      label: 'Social Security, as on your stub',
      hint: `Part of FICA, the Social Security and Medicare taxes. Copy it from your stub; the tool checks it against ${ratePercent(rule('socialSecurityRate'), locale, 2)} of gross.`,
    },
    medicare: {
      label: 'Medicare, as on your stub',
      hint: `The other FICA line. Copy it from your stub; the tool checks it against ${ratePercent(rule('medicareRate'), locale, 2)} of gross.`,
    },
    federal: {
      label: 'Federal income tax withheld, copied from your stub',
      hint: `Set by your W-4, the withholding form you filled in when you started. The tool never works it out. ${typed(config.defaults.federal)} is this stub’s figure.`,
    },
    state: {
      label: 'State income tax withheld, copied from your stub',
      hint: 'Depends on your state, and some states have none: type 0 then.',
    },
    others: {
      label: 'Other lines on the stub',
      hint: 'State disability or paid-leave insurance, city or local tax, a health plan, retirement: copy each as printed.',
    },
    paidEvery: {
      label: 'How often you are paid',
      hint: 'Every two weeks is 26 paychecks in most years and 27 in some.',
      options: [
        { value: 'weekly', label: 'Every week' },
        { value: 'fortnightly', label: 'Every two weeks' },
        { value: 'twice-monthly', label: 'Twice a month' },
        { value: 'monthly', label: 'Once a month' },
      ],
    },
  };
}
