import { describe, it, expect } from 'vitest';
import { isBlank, readAmount } from '../../src/lib/fields';

describe('readAmount', () => {
  it('reads what people type, and an exponent as a number would', () => {
    expect(readAmount('1e5')).toEqual({ value: 100000, tooBig: false });
    expect(readAmount('1,00,000')).toEqual({ value: 100000, tooBig: false });
    expect(readAmount('₹500')).toEqual({ value: 500, tooBig: false });
    expect(readAmount('-5')).toEqual({ value: -5, tooBig: false });
    expect(readAmount(' 12.5 ')).toEqual({ value: 12.5, tooBig: false });
  });

  it('tells blank from 0 and from unreadable', () => {
    expect(readAmount('')).toEqual({ value: null, tooBig: false });
    expect(readAmount('   ')).toEqual({ value: null, tooBig: false });
    expect(readAmount('abc')).toEqual({ value: null, tooBig: false });
    expect(readAmount('1.2.3')).toEqual({ value: null, tooBig: false });
  });

  it('says so when a number is too large to hold', () => {
    expect(readAmount('9'.repeat(400))).toEqual({ value: null, tooBig: true });
  });

  it('never returns -0', () => {
    const r = readAmount('-0');
    expect(r).toEqual({ value: 0, tooBig: false });
    expect(Object.is(r.value, 0)).toBe(true);
  });
});

describe('isBlank', () => {
  it('is true only for nothing or spaces', () => {
    expect(isBlank('  ')).toBe(true);
    expect(isBlank('0')).toBe(false);
    expect(isBlank(undefined)).toBe(true);
  });
});
