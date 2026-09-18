import { describe, it, expect } from 'vitest';
import { growthChoices, growthSteps, loanChoices, loanSteps, marginChoices, marginSteps, splitChoices, splitSteps } from '../../src/lib/lesson-math';
import { compoundGrowth, emi } from '../../src/lib/finance';

const chai = { fixed: 2000, variable: 8, price: 15 };

describe('marginSteps', () => {
  it('works the chai stall through to 286 cups and says why it rounded', () => {
    const [keep, cover] = marginSteps(chai, 'cups');
    expect(keep.result).toEqual({ money: 7 });
    expect(cover.result).toEqual({ count: 286 });
    expect(cover.note).toContain('285.7');
    expect(cover.label).toBe('Cups needed to cover the month');
  });

  it('says nothing about rounding when the division is exact', () => {
    const [, cover] = marginSteps({ fixed: 2100, variable: 8, price: 15 }, 'cups');
    expect(cover.result).toEqual({ count: 300 });
    expect(cover.note).toBeUndefined();
  });

  it('stops after the margin when every sale loses money', () => {
    expect(marginSteps({ fixed: 2000, variable: 15, price: 12 }, 'cups')).toHaveLength(1);
  });
});

describe('marginChoices', () => {
  it('has exactly one right answer, and it matches the calculator', () => {
    const choices = marginChoices({ fixed: 1500, variable: 7, price: 12 });
    expect(choices.filter((c) => c.correct)).toHaveLength(1);
    expect(choices.find((c) => c.correct)!.value).toEqual({ count: 300 });
  });

  it('offers the slips people actually make, each with its own explanation', () => {
    const choices = marginChoices(chai);
    const values = choices.map((c) => ('count' in c.value ? c.value.count : 0));
    expect(values).toContain(286); // right
    expect(values).toContain(134); // ÷ price
    expect(values).toContain(250); // ÷ cost
    expect(values).toContain(285); // rounded down
    expect(new Set(choices.map((c) => c.why)).size).toBe(choices.length);
  });

  it('lists options in ascending order so position gives nothing away', () => {
    const values = marginChoices(chai).map((c) => ('count' in c.value ? c.value.count : 0));
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  it('never shows the same number twice, and keeps the right one when slips collide', () => {
    // fixed/price and fixed/margin round to the same number here
    const choices = marginChoices({ fixed: 10, variable: 1, price: 11 });
    const values = choices.map((c) => ('count' in c.value ? c.value.count : 0));
    expect(new Set(values).size).toBe(values.length);
    expect(choices.filter((c) => c.correct)).toHaveLength(1);
  });

  it('refuses practice numbers that cannot break even', () => {
    expect(() => marginChoices({ fixed: 100, variable: 9, price: 9 })).toThrow();
  });
});

const pocket = {
  income: 3000,
  shares: [
    { label: 'Needs', percent: 50 },
    { label: 'Wants', percent: 30 },
    { label: 'Savings', percent: 20 },
  ],
};

describe('split', () => {
  it('turns shares into amounts', () => {
    expect(splitSteps(pocket).map((s) => s.result)).toEqual([{ money: 1500 }, { money: 900 }, { money: 600 }]);
  });

  it('asks for one share and hides it among real percentage slips, not amounts already on screen', () => {
    const choices = splitChoices(pocket, 'Savings');
    expect(choices.filter((c) => c.correct)).toHaveLength(1);
    expect(choices.find((c) => c.correct)!.value).toEqual({ money: 600 });
    const values = choices.map((c) => ('money' in c.value ? c.value.money : 0));
    // 3000 × 20% = 600 (right); ÷ 20 = 150; decimal slip = 60; 20% of what is left after needs = 300
    expect(values).toEqual([60, 150, 300, 600]);
    expect(choices.find((c) => 'money' in c.value && c.value.money === 150)!.why).toContain('divides by 20');
    // None of the wrong answers is just another line's amount (1,500 or 900), which the reader can already see.
    expect(values).not.toContain(1500);
    expect(values).not.toContain(900);
  });

  it('fails loudly on a share that does not exist', () => {
    expect(() => splitChoices(pocket, 'Rent')).toThrow();
  });
});

const scooter = { principal: 50000, rate: 12, months: 24 };

describe('loan', () => {
  it('works the payment, the total and the cost, consistently with the calculator', () => {
    const [monthly, total, cost] = loanSteps(scooter).map((s) => ('money' in s.result ? s.result.money : 0));
    expect(monthly).toBe(2353.67); // emi() rounded to the paisa
    expect(monthly).toBeCloseTo(emi(50000, 12, 24).emi, 2);
    expect(total).toBe(Math.round(2353.67 * 24 * 100) / 100);
    expect(cost).toBeCloseTo(total - 50000, 2);
  });

  it('offers real interest slips and exactly one right answer', () => {
    const choices = loanChoices(scooter);
    expect(choices.filter((c) => c.correct)).toHaveLength(1);
    const values = choices.map((c) => ('money' in c.value ? c.value.money : 0));
    expect(values).toContain(6000); // one year of interest on the full amount
    expect(values).toContain(12000); // flat rate on the full amount for two years
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(new Set(values).size).toBe(values.length);
  });

  it('works a zero-rate loan, but refuses it as a practice question with no answer to find', () => {
    const [, , cost] = loanSteps({ principal: 1200, rate: 0, months: 12 });
    expect('money' in cost.result && cost.result.money).toBe(0);
    expect(() => loanChoices({ principal: 1200, rate: 0, months: 12 })).toThrow();
    expect(() => growthChoices({ monthly: 100, rate: 0, years: 5 })).toThrow();
  });
});

const habit = { monthly: 500, rate: 6, years: 10 };

describe('growth', () => {
  it('separates what was put in from the growth, matching the calculator', () => {
    const [put, grows, growth] = growthSteps(habit).map((s) => ('money' in s.result ? s.result.money : 0));
    expect(put).toBe(60000);
    expect(grows).toBe(Math.round(compoundGrowth(0, 500, 6, 10).finalValue));
    expect(growth).toBe(grows - put);
  });

  it('hides the growth among the total, the deposits and flat interest', () => {
    const choices = growthChoices(habit);
    expect(choices.filter((c) => c.correct)).toHaveLength(1);
    const values = choices.map((c) => ('money' in c.value ? c.value.money : 0));
    expect(values).toContain(60000); // what was put in
    expect(values).toContain(36000); // 6% of 60,000 for 10 years, the flat-interest slip
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });
});
