import { describe, it, expect } from 'vitest';
import { isBlank, numberInputValue, readAmount } from '../../src/lib/fields';

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

describe('numberInputValue', () => {
  it('keeps what a number field can already show, exactly', () => {
    for (const v of ['', '5000', '-5', '12.5', '.5', '1e5', '1E-3', '1e400']) expect(numberInputValue(v)).toBe(v);
  });

  it('rewrites a readable figure the field would blank, so the field and the sum agree', () => {
    expect(numberInputValue('₹5,000')).toBe('5000');
    expect(numberInputValue('35,000')).toBe('35000');
    expect(numberInputValue('1,00,000')).toBe('100000');
    expect(numberInputValue('+5')).toBe('5');
    expect(numberInputValue('5.')).toBe('5');
    expect(numberInputValue(' 12 ')).toBe('12');
  });

  it('gives blank for text with no number in it', () => {
    expect(numberInputValue('abc')).toBe('');
    expect(numberInputValue('1.2.3')).toBe('');
    expect(numberInputValue('<script>')).toBe('');
  });
});
