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
 * running figures are what a "show me" ledger prints one line at a time.
 */
export function deductions(start: number, lines: DeductionLine[]): DeductionResult {
  const running: number[] = [];
  let current = start;
  for (const line of lines) {
    current = Math.round((current - line.amount) * 100) / 100;
    running.push(current);
  }
  return { start, running, deducted: Math.round((start - current) * 100) / 100, net: current };
}
