import { describe, it, expect } from 'vitest';
import {
  breakEven,
  profitAtUnits,
  emi,
  amortization,
  compoundGrowth,
  sideHustleProfit,
  budgetSplit,
  deductions,
  toCents,
  fromCents,
  roundMoney,
  roundTo,
  round1,
  round2,
  toBasisPoints,
  divRoundHalfUp,
  shareOf,
  percent1,
  PAYDAYS_PER_YEAR,
  PAYDAYS,
  isPayFrequency,
  parsePayFrequency,
} from '../../src/lib/finance';
import { money, number, parseAmount, localeByCode, DEFAULT_LOCALE } from '../../src/lib/format';

describe('breakEven', () => {
  it('computes margin and units for a small business', () => {
    const result = breakEven(2000, 8, 15);
    expect(result.contributionMargin).toBe(7);
    expect(result.units).toBe(286); // ceil(2000 / 7)
    expect(result.revenue).toBe(286 * 15);
    expect(result.viable).toBe(true);
  });

  it('rounds partial units up, because you cannot sell half a cup', () => {
    expect(breakEven(100, 0, 3).units).toBe(34); // 33.33 -> 34
  });

  it('reports no break-even when price equals variable cost', () => {
    const result = breakEven(2000, 15, 15);
    expect(result.viable).toBe(false);
    expect(result.units).toBeNull();
    expect(result.revenue).toBeNull();
  });

  it('reports no break-even when price is below variable cost', () => {
    const result = breakEven(2000, 20, 15);
    expect(result.viable).toBe(false);
    expect(result.contributionMargin).toBe(-5);
    expect(result.units).toBeNull();
  });

  it('does not divide by zero when price is zero', () => {
    expect(breakEven(500, 0, 0).marginRatio).toBe(0);
  });
});

describe('profitAtUnits', () => {
  it('is zero at the break-even quantity', () => {
    const { units } = breakEven(700, 8, 15);
    expect(profitAtUnits(700, 8, 15, units!)).toBeGreaterThanOrEqual(0);
    expect(profitAtUnits(700, 8, 15, units! - 1)).toBeLessThan(0);
  });
});

describe('emi', () => {
  it('matches the standard amortization formula', () => {
    const result = emi(100000, 12, 12);
    expect(result.emi).toBeCloseTo(8884.88, 1);
    expect(result.totalInterest).toBeGreaterThan(0);
  });

  it('splits principal evenly at a zero rate', () => {
    const result = emi(120000, 0, 12);
    expect(result.emi).toBe(10000);
    expect(result.totalInterest).toBe(0);
    expect(result.totalPaid).toBe(120000);
  });

  it('returns zeros for a zero-month term instead of NaN', () => {
    expect(emi(50000, 10, 0)).toEqual({ emi: 0, totalPaid: 0, totalInterest: 0 });
  });
});

describe('compoundGrowth', () => {
  it('separates contributions from growth', () => {
    const result = compoundGrowth(0, 1000, 8, 10);
    expect(result.totalContributed).toBe(120000);
    expect(result.finalValue).toBeGreaterThan(result.totalContributed);
    expect(result.growth).toBeCloseTo(result.finalValue - result.totalContributed, 6);
  });

  it('still grows the starting amount with no monthly contribution', () => {
    const result = compoundGrowth(10000, 0, 10, 1, 1);
    expect(result.finalValue).toBeCloseTo(11000, 6);
  });

  it('produces no growth at a zero rate', () => {
    const result = compoundGrowth(5000, 100, 0, 2);
    expect(result.growth).toBeCloseTo(0, 6);
    expect(result.finalValue).toBeCloseTo(5000 + 2400, 6);
  });

  it('returns one row per year', () => {
    expect(compoundGrowth(0, 50, 5, 7).years).toHaveLength(7);
  });

  it('returns no rows for a zero-year horizon', () => {
    const result = compoundGrowth(1000, 0, 5, 0);
    expect(result.years).toHaveLength(0);
    expect(result.finalValue).toBe(1000);
  });
});

describe('sideHustleProfit', () => {
  it('subtracts platform fees from revenue', () => {
    const result = sideHustleProfit(50, 200, 80, 10, 20);
    expect(result.revenue).toBe(10000);
    expect(result.costs).toBe(4000);
    expect(result.fees).toBe(1000);
    expect(result.profit).toBe(5000);
    expect(result.profitPerHour).toBe(250);
  });

  it('returns null profit per hour when no hours are given', () => {
    expect(sideHustleProfit(10, 100, 50, 0, 0).profitPerHour).toBeNull();
  });
});

describe('budgetSplit', () => {
  it('totals each category and the leftover', () => {
    const result = budgetSplit(10000, [
      { name: 'Rent share', amount: 4000, category: 'needs' },
      { name: 'Phone data', amount: 500, category: 'needs' },
      { name: 'Eating out', amount: 2000, category: 'wants' },
      { name: 'Emergency fund', amount: 1500, category: 'savings' },
    ]);
    expect(result.totals).toEqual({ needs: 4500, wants: 2000, savings: 1500 });
    expect(result.shares.needs).toBe(45);
    expect(result.spent).toBe(8000);
    expect(result.leftover).toBe(2000);
  });

  it('reports a negative leftover when spending exceeds income', () => {
    const result = budgetSplit(1000, [{ name: 'Shoes', amount: 1500, category: 'wants' }]);
    expect(result.leftover).toBe(-500);
  });

  it('avoids dividing by zero income', () => {
    const result = budgetSplit(0, [{ name: 'Snack', amount: 20, category: 'wants' }]);
    expect(result.shares.wants).toBe(0);
  });

  it('handles an empty budget', () => {
    expect(budgetSplit(5000, []).leftover).toBe(5000);
  });
});

describe('format', () => {
  it('groups Indian numbers as lakhs', () => {
    expect(number(100000, localeByCode('en-IN'))).toBe('1,00,000');
  });

  it('groups US numbers in thousands', () => {
    expect(number(100000, localeByCode('en-US'))).toBe('100,000');
  });

  it('formats currency with the locale symbol', () => {
    expect(money(1500, localeByCode('en-IN'))).toContain('₹');
    expect(money(1500, localeByCode('en-US'))).toContain('$');
  });

  it('falls back to the default locale for an unknown code', () => {
    expect(localeByCode('xx-XX')).toBe(DEFAULT_LOCALE);
  });

  it('parses what people actually type', () => {
    expect(parseAmount('1,00,000')).toBe(100000);
    expect(parseAmount('₹1,000.50')).toBe(1000.5);
    expect(parseAmount('1 000')).toBe(1000);
  });

  it('returns null for unparseable input instead of NaN', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('.')).toBeNull();
  });
});

describe('amortization', () => {
  it('ends at exactly zero and adds up to what emi() says', () => {
    const rows = amortization(100000, 12, 24);
    expect(rows).toHaveLength(2);
    expect(rows.at(-1)!.balance).toBe(0);
    const paid = rows.reduce((sum, r) => sum + r.paid, 0);
    expect(paid).toBeCloseTo(emi(100000, 12, 24).totalPaid, 0);
    const interest = rows.reduce((sum, r) => sum + r.interest, 0);
    expect(interest).toBeCloseTo(emi(100000, 12, 24).totalInterest, 0);
  });

  it('charges the most interest in the first year, when the most is owed', () => {
    const rows = amortization(10000, 6.5, 120);
    expect(rows).toHaveLength(10);
    expect(rows[0].interest).toBeGreaterThan(rows[9].interest);
    expect(rows[0].balance).toBeLessThan(10000);
  });

  it('has a final part-year row when the term is not a whole number of years', () => {
    const rows = amortization(5000, 8, 18);
    expect(rows.map((r) => r.year)).toEqual([1, 2]);
    expect(rows.at(-1)!.balance).toBe(0);
  });

  it('charges no interest at a zero rate', () => {
    const rows = amortization(12000, 0, 12);
    expect(rows[0].interest).toBe(0);
    expect(rows[0].paid).toBeCloseTo(12000, 6);
  });

  it('returns nothing for a loan with no term or no amount', () => {
    expect(amortization(1000, 5, 0)).toEqual([]);
    expect(amortization(0, 5, 12)).toEqual([]);
  });
});

describe('deductions', () => {
  it('walks a payslip from CTC to in-hand one line at a time', () => {
    const r = deductions(35000, [
      { label: "Employer's EPF share", amount: 2100 },
      { label: 'Your EPF share', amount: 2100 },
      { label: 'Professional tax', amount: 200 },
    ]);
    expect(r.running).toEqual([32900, 30800, 30600]);
    expect(r.deducted).toBe(4400);
    expect(r.net).toBe(30600);
  });

  it('keeps cents honest', () => {
    const r = deductions(1600, [{ label: 'Social Security', amount: 99.2 }, { label: 'Medicare', amount: 23.2 }]);
    expect(r.running).toEqual([1500.8, 1477.6]);
    expect(r.net).toBe(1477.6);
  });
});

describe('deductions on whole cents', () => {
  it('gives the same running figures as before for whole amounts', () => {
    const r = deductions(35000, [
      { label: 'a', amount: 2100 },
      { label: 'b', amount: 2100 },
      { label: 'c', amount: 200 },
    ]);
    expect(r.running).toEqual([32900, 30800, 30600]);
    expect(r.deducted).toBe(4400);
  });

  it('keeps a chain of decimals exact', () => {
    const r = deductions(1600, [{ label: 'a', amount: 99.2 }, { label: 'b', amount: 23.2 }]);
    expect(r.running).toEqual([1500.8, 1477.6]);
    expect(r.net).toBe(1477.6);
  });

  it('ignores a subtotal label', () => {
    const plain = deductions(1600, [{ label: 'a', amount: 99.2 }, { label: 'b', amount: 23.2 }]);
    const labelled = deductions(1600, [{ label: 'a', amount: 99.2, subtotalLabel: 'After a' }, { label: 'b', amount: 23.2 }]);
    expect(labelled).toEqual(plain);
  });
});

describe('toCents, fromCents, roundMoney', () => {
  it('rounds half away from zero on the decimal as typed', () => {
    expect(toCents(575.625)).toBe(57563);
    expect(toCents(1.005)).toBe(101);
    expect(toCents(-2.5)).toBe(-250);
    expect(toCents(182.5)).toBe(18250);
    expect(toCents(999999999999.99)).toBe(99999999999999);
  });

  it('turns what is not a number into 0, and never -0', () => {
    expect(toCents(NaN)).toBe(0);
    expect(toCents(Infinity)).toBe(0);
    expect(Object.is(toCents(-0.001), 0)).toBe(true);
  });

  it('comes back from cents and rounds money to the cent', () => {
    expect(fromCents(57563)).toBe(575.63);
    expect(roundMoney(2.675)).toBe(2.68);
  });
});

describe('roundTo, round1, round2', () => {
  it('rounds half away from zero at any number of places', () => {
    expect(roundTo(1.4225123, 3)).toBe(1.423);
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(-2.5, 0)).toBe(-3);
    expect(roundTo(1e-7, 2)).toBe(0);
    expect(roundTo(82.35, 1)).toBe(82.4);
    expect(round1(87.43)).toBe(87.4);
    expect(round2(1.005)).toBe(1.01);
  });

  it('never returns -0, and returns a non-finite value as it is', () => {
    expect(Object.is(roundTo(-0.001, 2), 0)).toBe(true);
    expect(roundTo(Infinity, 2)).toBe(Infinity);
    expect(Number.isNaN(roundTo(NaN, 2))).toBe(true);
  });
});

describe('basis points and integer division', () => {
  it('turns a percentage into whole basis points', () => {
    expect(toBasisPoints(27.5)).toBe(2750);
    expect(toBasisPoints(1.45)).toBe(145);
  });

  it('divides integers rounding half up', () => {
    expect(divRoundHalfUp(990000 * 2750, 120000)).toBe(22688);
    expect(divRoundHalfUp(5, 2)).toBe(3);
    expect(divRoundHalfUp(4, 3)).toBe(1);
  });

  it('refuses a negative, a zero divisor or a fraction', () => {
    expect(() => divRoundHalfUp(-1, 2)).toThrow(RangeError);
    expect(() => divRoundHalfUp(1, 0)).toThrow(RangeError);
    expect(() => divRoundHalfUp(1.5, 2)).toThrow(RangeError);
  });

  it('takes a share of an amount in cents', () => {
    const cases: [number, number, number][] = [
      [150, 6.2, 930],
      [150, 1.45, 218],
      [162.5, 6.2, 1008],
      [1050, 1.45, 1523],
      [1600, 6.2, 9920],
      [1600, 1.45, 2320],
    ];
    for (const [amount, rate, cents] of cases) expect(shareOf(toCents(amount), rate), `${amount} at ${rate}%`).toBe(cents);
  });

  it('gives a part as a percentage to one place, or null for nothing', () => {
    expect(percent1(131760, 160000)).toBe(82.4);
    expect(percent1(3060000, 3500000)).toBe(87.4);
    expect(percent1(5, 0)).toBeNull();
  });
});

describe('pay frequency', () => {
  it('counts paydays in a year', () => {
    expect(PAYDAYS_PER_YEAR).toEqual({ weekly: 52, fortnightly: 26, 'twice-monthly': 24, monthly: 12 });
    expect(PAYDAYS).toBe(PAYDAYS_PER_YEAR);
  });

  it('accepts only its own keys', () => {
    expect(isPayFrequency('fortnightly')).toBe(true);
    expect(isPayFrequency('daily')).toBe(false);
    expect(isPayFrequency('toString')).toBe(false);
    expect(isPayFrequency(undefined)).toBe(false);
    expect(parsePayFrequency('daily', 'fortnightly')).toBe('fortnightly');
    expect(parsePayFrequency('weekly', 'fortnightly')).toBe('weekly');
  });
});
