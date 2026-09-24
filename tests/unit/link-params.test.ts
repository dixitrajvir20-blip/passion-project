import { describe, it, expect } from 'vitest';
import { CODEC_KEYS, linkFor, parseLinkParams } from '../../src/lib/link-params';

describe('parseLinkParams', () => {
  it('reads the fragment', () => {
    expect(parseLinkParams('#fixed=5000&price=20', '', ['fixed', 'price'])).toEqual({ fixed: '5000', price: '20' });
  });

  it('takes the fragment first and the query second, key by key', () => {
    expect(parseLinkParams('#price=20', '?price=30&fixed=5', ['fixed', 'price'])).toEqual({ fixed: '5', price: '20' });
  });

  it('ignores a bare fragment such as the skip link', () => {
    expect(parseLinkParams('#main', '', ['income'])).toEqual({});
  });

  it('keeps a 24-character value and drops a 25-character one', () => {
    expect(parseLinkParams(`#a=${'1'.repeat(24)}`, '', ['a'])).toEqual({ a: '1'.repeat(24) });
    expect(parseLinkParams(`#a=${'1'.repeat(25)}`, '', ['a'])).toEqual({});
  });

  it('gives every codec key a larger cap of its own', () => {
    for (const key of CODEC_KEYS) {
      expect(parseLinkParams(`#${key}=${'a'.repeat(1999)}`, '', [key])).toEqual({ [key]: 'a'.repeat(1999) });
      expect(parseLinkParams(`#${key}=${'a'.repeat(2001)}`, '', [key])).toEqual({});
    }
  });

  it('accepts a select value only when it is one of the options', () => {
    const allowed = { paidEvery: ['weekly', 'fortnightly', 'twice-monthly', 'monthly'] };
    expect(parseLinkParams('#paidEvery=daily', '', ['paidEvery'], { allowed })).toEqual({});
    expect(parseLinkParams('#paidEvery=weekly', '', ['paidEvery'], { allowed })).toEqual({ paidEvery: 'weekly' });
  });

  it('never falls back to the query when the fragment value was dropped', () => {
    expect(parseLinkParams(`#price=${'2'.repeat(30)}`, '?price=20', ['price'])).toEqual({});
  });

  it('decodes an encoded value', () => {
    expect(parseLinkParams('#income=30%2C600', '', ['income'])).toEqual({ income: '30,600' });
  });

  it('reads no key that is not on the list', () => {
    const out = parseLinkParams('#__proto__[x]=1&constructor=1', '', ['income']);
    expect(out).toEqual({});
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });
});

describe('linkFor', () => {
  it('puts the figures after the # and clears the query', () => {
    expect(linkFor('https://h/passion-project/in/tools/budget/?income=1#old', { income: '30600' })).toBe(
      'https://h/passion-project/in/tools/budget/#income=30600',
    );
  });

  it('writes no # when there is nothing to carry', () => {
    expect(linkFor('https://h/passion-project/in/tools/budget/', {})).not.toContain('#');
  });
});
