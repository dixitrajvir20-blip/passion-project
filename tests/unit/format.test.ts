import { describe, it, expect } from 'vitest';
import { localeByCode, money, number } from '../../src/lib/format';

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
