import { describe, it, expect } from 'vitest';
import { marginChoices, marginSteps, splitChoices, splitSteps } from '../../src/lib/lesson-math';

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

  it('asks for one share and hides it among the other shares and a ÷ slip', () => {
    const choices = splitChoices(pocket, 'Savings');
    expect(choices.find((c) => c.correct)!.value).toEqual({ money: 600 });
    const values = choices.map((c) => ('money' in c.value ? c.value.money : 0));
    expect(values).toEqual([150, 600, 900, 1500]);
    expect(choices.find((c) => 'money' in c.value && c.value.money === 150)!.why).toContain('divides by 20');
  });

  it('fails loudly on a share that does not exist', () => {
    expect(() => splitChoices(pocket, 'Rent')).toThrow();
  });
});
