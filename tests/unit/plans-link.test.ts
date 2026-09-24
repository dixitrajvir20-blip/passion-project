import { describe, it, expect } from 'vitest';
import { MAX_PLAN_ROWS, PLANS_TEXT_MAX, decodePlans, encodePlans } from '../../src/lib/plans-link';

const EU_ROWS = [
  { amount: '30', k: '2', n: '4', d: '1' },
  { amount: '36', k: '2', n: '4', d: '1' },
  { amount: '24', k: '2', n: '4', d: '1' },
];

describe('encodePlans', () => {
  it('writes amount~k~n~d joined by |', () => {
    expect(encodePlans(EU_ROWS)).toBe('30~2~4~1|36~2~4~1|24~2~4~1');
  });

  it('writes a blank amount as 0', () => {
    expect(encodePlans([{ amount: '', k: '2', n: '4', d: '1' }])).toBe('0~2~4~1');
    expect(encodePlans([{ amount: '  ', k: '2', n: '4', d: '1' }])).toBe('0~2~4~1');
  });

  it('leaves out any row the decoder would refuse', () => {
    expect(encodePlans([{ amount: '-5', k: '2', n: '4', d: '1' }, ...EU_ROWS.slice(0, 1)])).toBe('30~2~4~1');
    expect(encodePlans([{ amount: '30', k: '5', n: '4', d: '1' }])).toBe('');
    expect(encodePlans([{ amount: '30', k: '2', n: '4', d: '4' }])).toBe('');
    expect(encodePlans([{ amount: '1e3', k: '2', n: '4', d: '1' }])).toBe('');
    expect(encodePlans([{ amount: '30', k: '', n: '4', d: '1' }])).toBe('');
  });

  it('writes at most 8 rows', () => {
    expect(MAX_PLAN_ROWS).toBe(8);
    const nine = Array.from({ length: 9 }, () => ({ amount: '30', k: '2', n: '4', d: '1' }));
    expect(encodePlans(nine).split('|')).toHaveLength(8);
  });

  it('puts the rows after the # in the pinned form', () => {
    const plans = encodePlans(EU_ROWS);
    expect(new URLSearchParams({ pay: '1200', living: '804', savings: '0', plans, cur: 'en-IE' }).toString()).toBe(
      'pay=1200&living=804&savings=0&plans=30%7E2%7E4%7E1%7C36%7E2%7E4%7E1%7C24%7E2%7E4%7E1&cur=en-IE',
    );
    expect(decodePlans(new URLSearchParams('plans=30%7E2%7E4%7E1%7C36%7E2%7E4%7E1%7C24%7E2%7E4%7E1').get('plans'))).toEqual(EU_ROWS);
  });

  it('round-trips through decodePlans', () => {
    expect(decodePlans(encodePlans(EU_ROWS))).toEqual(EU_ROWS);
    const odd = [{ amount: '30.5', k: '1', n: '48', d: '4' }, { amount: '0', k: '1', n: '1', d: '1' }];
    expect(decodePlans(encodePlans(odd))).toEqual(odd);
  });
});

describe('decodePlans', () => {
  it('refuses every attack and malformed string', () => {
    for (const text of [
      '0x1F~2~4~1',
      '1e9~2~4~1',
      'Infinity~2~4~1',
      '-5~2~4~1',
      '',
      '30~-2~4~1',
      '30~2.5~4~1',
      'abc~2~4~1',
      '30~2~4~5',
      '30~5~4~1',
      '30~0~4~1',
      '30~2~49~1',
      '30~2~4~4',
      '999999999~2~4~1',
      '10000000.01~2~4~1',
      '30.555~2~4~1',
      '30~2~4',
      '9'.repeat(5000),
    ]) {
      expect(decodePlans(text), JSON.stringify(text.slice(0, 40))).toBeNull();
    }
  });

  it('refuses anything that is not a string', () => {
    for (const value of [null, undefined, 30, {}, ['30~2~4~1']]) expect(decodePlans(value)).toBeNull();
  });

  it('accepts the largest amount, two decimals, and keeps the text as it came', () => {
    expect(decodePlans('10000000~2~4~1')).toEqual([{ amount: '10000000', k: '2', n: '4', d: '1' }]);
    expect(decodePlans('30.5~2~4~1')).toEqual([{ amount: '30.5', k: '2', n: '4', d: '1' }]);
  });

  it('stops at 8 rows and drops the rows that fail', () => {
    expect(decodePlans(Array.from({ length: 9 }, () => '30~2~4~1').join('|'))).toHaveLength(8);
    expect(decodePlans('30~2~4~1|junk|36~2~4~1')).toEqual([
      { amount: '30', k: '2', n: '4', d: '1' },
      { amount: '36', k: '2', n: '4', d: '1' },
    ]);
  });

  it('keeps the cap above the widest 8 rows', () => {
    const widest = Array.from({ length: 8 }, () => '99999999.99~48~48~1').join('|');
    expect(widest).toHaveLength(159);
    expect(widest.length).toBeLessThan(PLANS_TEXT_MAX);
    expect(decodePlans('30~2~4~1|'.repeat(23) + '30~2~4~1')).toBeNull(); // 24 rows: 215 characters
  });

  it('never lets a prototype key through', () => {
    expect(decodePlans('__proto__~2~4~1')).toBeNull();
    expect(({} as Record<string, unknown>).amount).toBeUndefined();
  });
});
