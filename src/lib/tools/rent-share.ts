/** Rent and bills as a share of net pay: each edition's opening values, with the sources behind them, and the pure maths. Owned by the rent-share builder. Tool maths and pins from the revised spec go here and in tests/unit/tools/rent-share.test.ts, never in finance.ts; defaults and rules go in CONFIG, never in regions.ts. The names CONFIG and RentShareConfig are imported by the page and must stay. */
import { fromCents, round1, toCents } from '../finance';
import type { EditionConfigs, Rule, ToolConfig } from './types';

/** The seven fields, as the page first shows them and as a link carries them. */
export interface RentShareDefaults {
  netPay: string;
  rent: string;
  bills: string;
  deposit: string;
  firstMonthUpfront: 'yes' | 'no';
  moveCosts: string;
  saved: string;
}

export interface RentShareConfig extends ToolConfig {
  defaults: RentShareDefaults;
  rules: Rule[];
}

/** The rule the monthly sum is set against. Its value must be a whole number (see housingShare). */
export const LINE_KEY = 'overburdenLine';

/** The only values the first-month select may take, from a link or from the page. */
export const UPFRONT_OPTIONS = ['yes', 'no'] as const;

/** Anything but 'no' (a link's 'evil', a blank) reads as yes: the lesson's contract asks for it. */
export const readUpfront = (value: string): 'yes' | 'no' => (value === 'no' ? 'no' : 'yes');

/** The edition's line, in percent units, or null when the config carries none. */
export function linePercentOf(config: Pick<RentShareConfig, 'rules'>): number | null {
  const rule = config.rules.find((r) => r.key === LINE_KEY);
  return rule && Number.isFinite(rule.value) ? rule.value : null;
}

/**
 * The edition's line for the page, which never falls back to a figure of its own: a config with no
 * sourced line, or one that is not a whole number (see housingShare), fails the build when the
 * island is rendered, so no unsourced 40 can reach a reader.
 */
export function requiredLinePercent(config: Pick<RentShareConfig, 'rules'>): number {
  const line = linePercentOf(config);
  if (line === null || !Number.isInteger(line) || line <= 0) {
    throw new Error(`rent-share: the edition's config needs a whole-number '${LINE_KEY}' rule with its source`);
  }
  return line;
}

/** One rule's value by key, for the copy in "How this is worked out". */
export function ruleOf(config: Pick<RentShareConfig, 'rules'>, key: string): Rule | undefined {
  return config.rules.find((r) => r.key === key);
}

/**
 * The largest amount a field may hold. At 1e11, whole cents × 100 stays a safe integer, so the
 * at/over/under test in housingShare is exact; the island shows a field error above it.
 */
export const MAX_AMOUNT = 100_000_000_000;

/**
 * Whole cents of an amount typed; a negative, NaN or Infinity counts as 0, and so does an amount
 * so large that its cents × 100 is not a safe integer (1e307 × 100 overflows to Infinity).
 */
export const cents = (v: number): number => {
  const c = toCents(v);
  return c > 0 && Number.isSafeInteger(c * 100) ? c : 0;
};

export type LinePosition = 'over' | 'at' | 'under';

export interface HousingShare {
  /** Rent plus bills. */
  housing: number;
  /** Net pay less rent and bills, signed; null when net pay is 0 or less. */
  left: number | null;
  /** Housing ÷ net pay, unrounded, for percent(); null when net pay is 0 or less. */
  ratio: number | null;
  /** ratio × 100 to one decimal, for tests and the "just over / under" check. */
  share: number | null;
  /** linePercent of net pay, to the cent. */
  line: number | null;
  /** Housing less the line, to the cent, signed: positive over the line. */
  gap: number | null;
  /** Decided on exact cents, never on the rounded share or line. */
  position: LinePosition | null;
  /** The figures the monthly ledger prints, after clamping. */
  netPay: number;
  rent: number;
  bills: number;
  /** Net pay less rent; null when net pay is 0 or less. */
  afterRent: number | null;
}

/**
 * Rent and bills against net pay and against a line set as a whole percentage of it (Eurostat's
 * 40%). Worked in whole cents; negatives count as 0. The position compares housing × 100 with net
 * pay × linePercent, exact in integers while linePercent is whole, so 450.01 on 1,125 is over the
 * line even though both round to 40.0%.
 */
export function housingShare(netPay: number, rent: number, bills: number, linePercent: number): HousingShare {
  const n = cents(netPay);
  const r = cents(rent);
  const b = cents(bills);
  const h = r + b;
  const housing = fromCents(h);
  const shown = { netPay: fromCents(n), rent: fromCents(r), bills: fromCents(b) };
  if (n === 0) {
    return { housing, left: null, ratio: null, share: null, line: null, gap: null, position: null, ...shown, afterRent: null };
  }
  const ratio = h / n;
  const share = round1((h * 100) / n);
  const lineC = Math.round((n * linePercent) / 100);
  const cmp = h * 100 - n * linePercent;
  const position: LinePosition = cmp > 0 ? 'over' : cmp === 0 ? 'at' : 'under';
  return {
    housing,
    left: fromCents(n - h),
    ratio,
    share,
    line: fromCents(lineC),
    gap: fromCents(h - lineC),
    position,
    ...shown,
    afterRent: fromCents(n - r),
  };
}

export type DayOnePosition = 'more' | 'exact' | 'covered';

export interface DayOneCost {
  deposit: number;
  /** The first month's rent when it is asked in advance, else 0. */
  firstMonth: number;
  moveCosts: number;
  total: number;
  saved: number;
  /** Total less saved: positive when day one needs more than is saved. */
  gap: number;
  position: DayOnePosition;
}

/** What is due before the first payday, against what is saved. Whole cents; negatives count as 0. */
export function dayOneCost(rent: number, deposit: number, firstMonthUpfront: boolean, moveCosts: number, saved: number): DayOneCost {
  const r = cents(rent);
  const d = cents(deposit);
  const m = cents(moveCosts);
  const s = cents(saved);
  const f = firstMonthUpfront ? r : 0;
  const t = d + f + m;
  const g = t - s;
  return {
    deposit: fromCents(d),
    firstMonth: fromCents(f),
    moveCosts: fromCents(m),
    total: fromCents(t),
    saved: fromCents(s),
    gap: fromCents(g),
    position: g > 0 ? 'more' : g === 0 ? 'exact' : 'covered',
  };
}

const CHECKED = '2026-09-22';
const EUROSTAT_BY_AGE = {
  title: 'Eurostat, housing cost overburden rate by age (ilc_lvho07a), updated 17 September 2026',
  url: 'https://ec.europa.eu/eurostat/databrowser/view/ilc_lvho07a/default/table?lang=en',
};
const SERVICE_PUBLIC = {
  title: 'Service-Public.fr, Dépôt de garantie (F31269), verified by its publisher 9 June 2026',
  url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F31269',
};

export const CONFIG: EditionConfigs<RentShareConfig> = {
  eu: {
    scenario: "The lesson's room: €520 a month plus about €80 of bills, on €1,125 net pay.",
    defaults: { netPay: '1125', rent: '520', bills: '80', deposit: '1040', firstMonthUpfront: 'yes', moveCosts: '140', saved: '1200' },
    // The 40% is a statistic about households, not a rule, so the line under the tool opens on a
    // neutral 'Checked'.
    rulesLead: 'Checked',
    rules: [
      {
        key: LINE_KEY,
        value: 40,
        label:
          "The 40% line: Eurostat's housing cost overburden rate counts households whose total housing costs, net of housing allowances, come to more than 40% of their disposable income. It is a statistic about households, not a limit",
        source: {
          title: 'Eurostat, Glossary: Housing cost overburden rate',
          url: 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Glossary:Housing_cost_overburden_rate',
        },
        asOf: CHECKED,
      },
      {
        key: 'overburdenYoung2024',
        value: 9.7,
        label: 'Share of people aged 15 to 29 in the EU living in an overburdened household, 2024, the latest year Eurostat publishes',
        source: EUROSTAT_BY_AGE,
        asOf: CHECKED,
        inLine: false,
      },
      {
        key: 'overburdenAll2024',
        value: 8.2,
        label: 'Share of all people in the EU living in an overburdened household, 2024',
        source: EUROSTAT_BY_AGE,
        asOf: CHECKED,
        inLine: false,
      },
      {
        key: 'depositCapFrUnfurnished',
        value: 1,
        label: 'France: deposit cap for an unfurnished main home, in months of rent without charges',
        source: SERVICE_PUBLIC,
        asOf: CHECKED,
        inLine: false,
      },
      {
        key: 'depositCapFrFurnished',
        value: 2,
        label: 'France: deposit cap for a furnished main home, in months of rent without charges',
        source: SERVICE_PUBLIC,
        asOf: CHECKED,
        inLine: false,
      },
      {
        key: 'depositCapDe',
        value: 3,
        label: 'Germany: deposit cap, in months of rent without operating costs, payable in three monthly parts',
        source: {
          title: 'Bürgerliches Gesetzbuch § 551 (Begrenzung und Anlage von Mietsicherheiten)',
          url: 'https://www.gesetze-im-internet.de/bgb/__551.html',
        },
        asOf: CHECKED,
        inLine: false,
      },
    ],
    glossary: ['net-pay', 'housing-cost-overburden', 'rental-deposit'],
  },
};
