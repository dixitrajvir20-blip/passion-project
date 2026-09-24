import { describe, it, expect } from 'vitest';
import { formatDuration, localeByCode, money, number, percentValue, plural, ratePercent } from '../../src/lib/format';

describe('money and number', () => {
  it('groups the Indian way and the US way', () => {
    expect(money(100000, localeByCode('en-IN'))).toBe('₹1,00,000');
    expect(money(100000, localeByCode('en-US'))).toBe('$100,000');
  });

  it('writes a loss with the true minus sign, never a hyphen', () => {
    expect(money(-20, localeByCode('en-IE'))).toBe('−€20');
    expect(money(-20, localeByCode('en-IN'))).toBe('−₹20');
    expect(number(-5, localeByCode('en-US'))).toBe('−5');
    expect(money(-20, localeByCode('en-IE'))).not.toContain('-');
  });
});

describe('formatDuration', () => {
  it('writes months and years in words, singular at one', () => {
    const cases: [number, string][] = [
      [1, '1 month'],
      [9, '9 months'],
      [12, '1 year'],
      [13, '1 year 1 month'],
      [20, '1 year 8 months'],
      [24, '2 years'],
      [35, '2 years 11 months'],
      [142, '11 years 10 months'],
    ];
    for (const [months, text] of cases) expect(formatDuration(months)).toBe(text);
  });
});

describe('percentValue', () => {
  it('formats a value already in percent units, by the locale', () => {
    expect(percentValue(82.4, localeByCode('en-US'), 1)).toBe('82.4%');
    expect(percentValue(93, localeByCode('en-IN'), 1)).toBe('93.0%');
    expect(percentValue(-3.4, localeByCode('en-US'), 1)).toBe('\u22123.4%');
    expect(percentValue(7.5, localeByCode('pt-BR'), 1)).toBe('7,5%');
  });
});

describe('ratePercent', () => {
  const inr = localeByCode('en-IN');
  it('trims trailing zeros', () => {
    expect(ratePercent(521.4, inr, 1)).toBe('521.4%');
    expect(ratePercent(2.609, inr, 3)).toBe('2.609%');
    expect(ratePercent(10, inr, 3)).toBe('10%');
    expect(ratePercent(0, inr, 1)).toBe('0%');
    expect(ratePercent(7.5, localeByCode('pt-BR'), 1)).toBe('7,5%');
  });

  it('caps at over 10,000% and floors a positive rate at its smallest step', () => {
    expect(ratePercent(10000.01, inr, 1)).toBe('over 10,000%');
    expect(ratePercent(Infinity, inr, 1)).toBe('over 10,000%');
    expect(ratePercent(0.04, inr, 1)).toBe('under 0.1%');
    expect(ratePercent(0.0004, inr, 3)).toBe('under 0.001%');
  });
});

describe('plural', () => {
  it('picks the word by the plural rules', () => {
    expect(plural(1, 'month', 'months')).toBe('month');
    expect(plural(1.5, 'month', 'months')).toBe('months');
    expect(plural(0, 'month', 'months')).toBe('months');
  });
});
