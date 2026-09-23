export interface BreakEven {
  contributionMargin: number;
  marginRatio: number;
  units: number | null;
  revenue: number | null;
  viable: boolean;
}

/**
 * Returns `viable: false` when price <= variable cost: every extra unit loses
 * money, so no finite break-even point exists.
 */
export function breakEven(fixedCosts: number, variableCost: number, price: number): BreakEven {
  const contributionMargin = price - variableCost;
  const viable = contributionMargin > 0;
  return {
    contributionMargin,
    marginRatio: price > 0 ? contributionMargin / price : 0,
    units: viable ? Math.ceil(fixedCosts / contributionMargin) : null,
    revenue: viable ? Math.ceil(fixedCosts / contributionMargin) * price : null,
    viable,
  };
}

export function profitAtUnits(
  fixedCosts: number,
  variableCost: number,
  price: number,
  units: number,
): number {
  return (price - variableCost) * units - fixedCosts;
}

export interface EmiResult {
  emi: number;
  totalPaid: number;
  totalInterest: number;
}

/**
 * EMI = P·r·(1+r)^n / ((1+r)^n − 1), r = monthly rate.
 * At rate 0 that formula divides by zero, so the principal is split evenly.
 */
export function emi(principal: number, annualRatePercent: number, months: number): EmiResult {
  if (months <= 0) return { emi: 0, totalPaid: 0, totalInterest: 0 };

  const r = annualRatePercent / 100 / 12;
  const payment =
    r === 0
      ? principal / months
      : (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);

  const totalPaid = payment * months;
  return { emi: payment, totalPaid, totalInterest: totalPaid - principal };
}

export interface GrowthYear {
  year: number;
  contributed: number;
  balance: number;
}

export interface GrowthResult {
  finalValue: number;
  totalContributed: number;
  growth: number;
  years: GrowthYear[];
}

export function compoundGrowth(
  startingAmount: number,
  monthlyContribution: number,
  annualRatePercent: number,
  years: number,
  compoundsPerYear = 12,
): GrowthResult {
  const periodRate = annualRatePercent / 100 / compoundsPerYear;
  const contributionPerPeriod = (monthlyContribution * 12) / compoundsPerYear;

  let balance = startingAmount;
  let contributed = startingAmount;
  const rows: GrowthYear[] = [];

  for (let year = 1; year <= years; year++) {
    for (let period = 0; period < compoundsPerYear; period++) {
      balance = balance * (1 + periodRate) + contributionPerPeriod;
      contributed += contributionPerPeriod;
    }
    rows.push({ year, contributed, balance });
  }

  return {
    finalValue: balance,
    totalContributed: contributed,
    growth: balance - contributed,
    years: rows,
  };
}

export interface SideHustle {
  revenue: number;
  costs: number;
  fees: number;
  profit: number;
  profitPerHour: number | null;
}

export function sideHustleProfit(
  unitsPerMonth: number,
  price: number,
  costPerUnit: number,
  platformFeePercent: number,
  hoursPerMonth: number,
): SideHustle {
  const revenue = unitsPerMonth * price;
  const costs = unitsPerMonth * costPerUnit;
  const fees = revenue * (platformFeePercent / 100);
  const profit = revenue - costs - fees;
  return {
    revenue,
    costs,
    fees,
    profit,
    profitPerHour: hoursPerMonth > 0 ? profit / hoursPerMonth : null,
  };
}

export type BudgetCategory = 'needs' | 'wants' | 'savings';

export interface BudgetLine {
  name: string;
  amount: number;
  category: BudgetCategory;
}

export interface BudgetResult {
  totals: Record<BudgetCategory, number>;
  shares: Record<BudgetCategory, number>;
  spent: number;
  leftover: number;
}

export function budgetSplit(income: number, lines: BudgetLine[]): BudgetResult {
  const totals: Record<BudgetCategory, number> = { needs: 0, wants: 0, savings: 0 };
  for (const line of lines) totals[line.category] += line.amount;

  const spent = totals.needs + totals.wants + totals.savings;
  const share = (value: number) => (income > 0 ? (value / income) * 100 : 0);

  return {
    totals,
    shares: { needs: share(totals.needs), wants: share(totals.wants), savings: share(totals.savings) },
    spent,
    leftover: income - spent,
  };
}

export interface ScheduleYear {
  year: number;
  paid: number;
  interest: number;
  /** What is still owed at the end of that year. */
  balance: number;
}

/**
 * A loan's repayment schedule, summarised by year. The last payment absorbs rounding, so the
 * balance ends at exactly zero rather than at a few paise either side of it.
 */
export function amortization(principal: number, annualRatePercent: number, months: number): ScheduleYear[] {
  if (months <= 0 || principal <= 0) return [];
  const payment = emi(principal, annualRatePercent, months).emi;
  const r = annualRatePercent / 100 / 12;

  const years: ScheduleYear[] = [];
  let balance = principal;
  let paid = 0;
  let interest = 0;
  for (let month = 1; month <= months; month++) {
    const monthInterest = balance * r;
    const towardsLoan = month === months ? balance : payment - monthInterest;
    balance = Math.max(0, balance - towardsLoan);
    paid += towardsLoan + monthInterest;
    interest += monthInterest;
    if (month % 12 === 0 || month === months) {
      years.push({ year: Math.ceil(month / 12), paid, interest, balance });
      paid = 0;
      interest = 0;
    }
  }
  return years;
}

export interface DeductionLine {
  label: string;
  amount: number;
  /** Names the running figure after this line ("Gross salary"). A label only: deductions() ignores it. */
  subtotalLabel?: string;
}

export interface DeductionResult {
  start: number;
  /** The figure after each line, in order. */
  running: number[];
  deducted: number;
  net: number;
}

/**
 * A chain of subtractions from one starting figure: a payslip from CTC or gross to in-hand, a
 * platform payout from the price to what arrives, an aid letter from the award to the loan. The
 * running figures are what a "show me" ledger prints one line at a time. Worked in whole cents,
 * so a chain of decimals never drifts by a float's last digit.
 */
export function deductions(start: number, lines: DeductionLine[]): DeductionResult {
  const running: number[] = [];
  let currentC = toCents(start);
  for (const line of lines) {
    currentC -= toCents(line.amount);
    running.push(fromCents(currentC));
  }
  return { start, running, deducted: fromCents(toCents(start) - currentC), net: fromCents(currentC) };
}

/* ---------------------------------------------------------------------------------------------
 * Shared money helpers for every calculator. Nothing tool-specific lives here: each tool's own
 * maths is in src/lib/tools/<slug>.ts.
 * ------------------------------------------------------------------------------------------- */

/**
 * Whole cents (or paise), half away from zero on the decimal as typed: toCents(1.005) is 101,
 * where Math.round(1.005 * 100) gives 100. toPrecision(15) drops the float's noise digit; 12 would
 * turn 999,999,999,999.99 into 1e14. Not finite gives 0, and never -0.
 */
export function toCents(v: number): number {
  if (!Number.isFinite(v)) return 0;
  const c = Math.round(Number((Math.abs(v) * 100).toPrecision(15)));
  if (c === 0) return 0;
  return v < 0 ? -c : c;
}

export const fromCents = (c: number): number => c / 100;

/** A money amount rounded to the cent, half away from zero. */
export const roundMoney = (v: number): number => fromCents(toCents(v));

/**
 * x rounded to dp decimal places, half away from zero, by shifting the decimal point in the
 * number's own text: roundTo(1.005, 2) is 1.01. Non-finite x is returned as it is; never -0.
 */
export function roundTo(x: number, dp: number): number {
  if (!Number.isFinite(x)) return x;
  const a = Math.abs(x);
  const r = String(a).includes('e')
    ? Math.round(a * 10 ** dp) / 10 ** dp
    : Number(Math.round(Number(`${a}e${dp}`)) + `e-${dp}`);
  if (r === 0) return 0;
  return x < 0 ? -r : r;
}

export const round1 = (x: number): number => roundTo(x, 1);
export const round2 = (x: number): number => roundTo(x, 2);

/** A percentage as whole basis points: 27.5% is 2750, 1.45% is 145. */
export const toBasisPoints = (percent: number): number => Math.round(percent * 100);

/** n ÷ d rounded half up, for integers n >= 0 and d > 0. Exact while n stays below 2^53. */
export function divRoundHalfUp(n: number, d: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(d) || n < 0 || d <= 0) {
    throw new RangeError(`divRoundHalfUp needs integers n >= 0 and d > 0, got ${n} and ${d}`);
  }
  const q = Math.floor(n / d);
  const rem = n - q * d;
  return rem * 2 >= d ? q + 1 : q;
}

/** ratePercent of an amount in cents, in cents: shareOf(15000, 1.45) is 218 ($2.175 rounds up). */
export function shareOf(cents: number, ratePercent: number): number {
  return Math.round((cents * toBasisPoints(ratePercent)) / 10000);
}

/** part as a percentage of whole, to one decimal place, from cents; null when whole is not positive. */
export function percent1(partCents: number, wholeCents: number): number | null {
  return wholeCents > 0 ? Math.round((partCents * 1000) / wholeCents) / 10 : null;
}

/** Paydays in a year, by how often pay arrives. One allow-list for every tool and every link. */
export const PAYDAYS_PER_YEAR = { weekly: 52, fortnightly: 26, 'twice-monthly': 24, monthly: 12 } as const;
export type PayFrequency = keyof typeof PAYDAYS_PER_YEAR;
export const PAYDAYS = PAYDAYS_PER_YEAR;

/** An own-key check, so 'toString' or '__proto__' from a link is never a frequency. */
export function isPayFrequency(v: unknown): v is PayFrequency {
  return typeof v === 'string' && Object.hasOwn(PAYDAYS_PER_YEAR, v);
}

export function parsePayFrequency(v: unknown, fallback: PayFrequency): PayFrequency {
  return isPayFrequency(v) ? v : fallback;
}
