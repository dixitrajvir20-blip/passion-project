/**
 * Every pin in the buffer-target revised spec (docs/research/interactive-tools-revised.json),
 * recomputed here: the three lessons' own numbers, each state, the caps at every pay frequency,
 * the float traps that integer cents avoid, the $400 survey milestone, and the field checks.
 */
import { describe, it, expect } from 'vitest';
import { CONFIG, BUFFER_LIMITS, FREQUENCIES, bufferInputProblems, bufferPlan, timeAway } from '../../../src/lib/tools/buffer-target';
import { PAYDAYS_PER_YEAR, isPayFrequency, roundMoney, toCents } from '../../../src/lib/finance';
import { readAmount } from '../../../src/lib/fields';

const plan = (...args: Parameters<typeof bufferPlan>) => {
  const result = bufferPlan(...args);
  expect(result, `bufferPlan(${args.join(', ')})`).not.toBeNull();
  return result!;
};

describe('buffer-target', () => {
  it('has a config for each edition it is listed in', () => expect(Object.keys(CONFIG).sort()).toEqual(['eu', 'in', 'us']));

  describe('config', () => {
    it('opens each edition on its lesson’s numbers', () => {
      expect(CONFIG.in!.defaults).toEqual({ essentials: '5500', months: '1', saved: '0', perPayday: '2000', paidEvery: 'monthly' });
      expect(CONFIG.eu!.defaults).toEqual({ essentials: '730', months: '3', saved: '0', perPayday: '185', paidEvery: 'monthly' });
      expect(CONFIG.us!.defaults).toEqual({ essentials: '1055', months: '1', saved: '0', perPayday: '50', paidEvery: 'fortnightly' });
      for (const config of Object.values(CONFIG)) expect(isPayFrequency(config!.defaults.paidEvery)).toBe(true);
      expect(CONFIG.in!.paydayWord).toBe('payday');
      expect(CONFIG.eu!.paydayWord).toBe('payday');
      expect(CONFIG.us!.paydayWord).toBe('paycheck');
    });

    it('keeps the $400 milestone in the US edition only, as a dollar rule with a source and a date', () => {
      expect(CONFIG.in!.milestone).toBeUndefined();
      expect(CONFIG.eu!.milestone).toBeUndefined();
      expect(CONFIG.in!.rules).toBeUndefined();
      expect(CONFIG.eu!.rules).toBeUndefined();
      const milestone = CONFIG.us!.milestone!;
      expect(milestone).toMatchObject({ key: 'milestone', value: 400, currency: 'USD', asOf: '2026-09-22' });
      expect(milestone.source.url).toBe('https://www.federalreserve.gov/newsevents/pressreleases/other20260513a.htm');
      expect(milestone.label).toContain('not a rule');
      expect(CONFIG.us!.rules).toEqual([milestone]);
      expect(CONFIG.us!.rulesLead).toBe('Figure checked');
    });

    it('cites a source for Europe’s three months, and calls it a measure, not a rule', () => {
      expect(CONFIG.eu!.monthsHint).toContain('A measure, not a rule.');
      expect(CONFIG.eu!.howNote!.source.url).toBe('https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:52025DC0681');
      expect(CONFIG.in!.howNote).toBeUndefined();
    });

    it('names no firm, bank or app, and never tells the reader what they should hold', () => {
      const text = JSON.stringify(CONFIG);
      expect(text).not.toMatch(/\bshould\b|to spare|NerdWallet|Chase|Practical Money Skills/i);
    });

    it('offers the four pay frequencies, in the allow-list’s own values', () => {
      expect(FREQUENCIES.map((f) => f.value)).toEqual(['weekly', 'fortnightly', 'twice-monthly', 'monthly']);
      expect(FREQUENCIES.map((f) => f.label)).toEqual([
        'Every week, 52 a year',
        'Every two weeks, 26 a year',
        'Twice a month, 24 a year',
        'Every month, 12 a year',
      ]);
      expect(BUFFER_LIMITS).toEqual({ maxAmount: 1e9, minMonths: 1, maxMonths: 24, maxMonthsAway: 120 });
    });
  });

  describe('the lessons’ own numbers', () => {
    it('India: ₹5,500 at ₹2,000 a month fills on payday 3, holding ₹6,000', () => {
      expect(plan(5500, 1, 0, 2000, 12)).toEqual({
        state: 'dated',
        target: 5500,
        toGo: 5500,
        surplus: 0,
        paydays: 3,
        quotient: 2.75,
        exactDivision: false,
        away: { unit: 'month', count: 3 },
        heldAtEnd: 6000,
        overTarget: 500,
        milestonePayday: null,
        milestoneAway: null,
      });
    });

    it('Europe: €730 × 3 at €185 a payday reaches €2,190 on payday 12, holding €2,220', () => {
      expect(plan(730, 3, 0, 185, 12)).toMatchObject({
        state: 'dated',
        target: 2190,
        paydays: 12,
        quotient: 11.84,
        away: { unit: 'month', count: 12 },
        heldAtEnd: 2220,
        overTarget: 30,
      });
    });

    it('United States: $1,055 at $50 a paycheck, every two weeks, is paycheck 22; the $400 is paycheck 8', () => {
      expect(plan(1055, 1, 0, 50, 26, 400)).toMatchObject({
        state: 'dated',
        target: 1055,
        paydays: 22,
        quotient: 21.1,
        away: { unit: 'month', count: 10 },
        heldAtEnd: 1100,
        overTarget: 45,
        milestonePayday: 8,
        milestoneAway: { unit: 'month', count: 4 },
      });
    });

    it('the Europe lesson’s €182.50 divides exactly', () => {
      expect(plan(730, 3, 0, 182.5, 12)).toMatchObject({ paydays: 12, quotient: 12, exactDivision: true, heldAtEnd: 2190, overTarget: 0 });
    });

    it('Europe quiz 1: a €2,040 goal at €122', () => {
      expect(plan(680, 3, 0, 122, 12)).toMatchObject({ target: 2040, paydays: 17, quotient: 16.72, heldAtEnd: 2074, overTarget: 34 });
    });

    it('Europe quiz 2: €122 reaches €2,190 in month 18', () => {
      expect(plan(730, 3, 0, 122, 12)).toMatchObject({ paydays: 18, quotient: 17.95, heldAtEnd: 2196, overTarget: 6 });
    });

    it('the Europe explorable’s €100 and €250', () => {
      expect(plan(730, 3, 0, 100, 12)).toMatchObject({ paydays: 22, heldAtEnd: 2200 });
      expect(plan(730, 3, 0, 250, 12)).toMatchObject({ paydays: 9, heldAtEnd: 2250 });
    });

    it('India quiz 1: ₹7,200 at ₹2,500', () => {
      expect(plan(7200, 1, 0, 2500, 12)).toMatchObject({ paydays: 3, quotient: 2.88, heldAtEnd: 7500, overTarget: 300 });
    });
  });

  describe('states', () => {
    it('a milestone equal to the target is not below it', () => {
      expect(plan(400, 1, 0, 50, 26, 400)).toMatchObject({ paydays: 8, away: { unit: 'month', count: 4 }, milestonePayday: null });
    });

    it('covered: already set aside at or above the target', () => {
      expect(plan(5500, 1, 6000, 2000, 12)).toMatchObject({
        state: 'covered',
        toGo: 0,
        surplus: 500,
        paydays: 0,
        quotient: null,
        away: null,
        heldAtEnd: null,
        overTarget: null,
      });
      expect(plan(5500, 1, 5500, 2000, 12)).toMatchObject({ state: 'covered', toGo: 0, surplus: 0 });
    });

    it('no amount: nothing moved each payday gives no date', () => {
      expect(plan(5500, 1, 0, 0, 12)).toMatchObject({ state: 'no-amount', target: 5500, toGo: 5500, paydays: null, away: null, heldAtEnd: null });
    });

    it('fractions of a month, and the 24-month top', () => {
      expect(plan(730, 1.5, 0, 185, 12)).toMatchObject({ target: 1095, paydays: 6, quotient: 5.92, heldAtEnd: 1110, overTarget: 15 });
      expect(plan(730, 24, 0, 185, 12)).toMatchObject({ target: 17520, paydays: 95, away: { unit: 'month', count: 95 }, heldAtEnd: 17575 });
    });
  });

  describe('inputs a field would reject never reach a result', () => {
    it('must-pay costs of 0 or less (never "already covers")', () => {
      expect(bufferPlan(0, 1, 0, 100, 12)).toBeNull();
      expect(bufferPlan(-5, 1, 0, 100, 12)).toBeNull();
      expect(bufferPlan(0.001, 1, 0, 100, 12)).toBeNull(); // under half a cent: nothing to set aside
    });

    it('months outside 1 to 24', () => {
      expect(bufferPlan(730, 0.5, 0, 185, 12)).toBeNull();
      expect(bufferPlan(730, 0, 0, 185, 12)).toBeNull();
      expect(bufferPlan(730, 25, 0, 185, 12)).toBeNull();
    });

    it('an error wins over the covered state', () => {
      expect(bufferPlan(5500, 1, 6000, -5, 12)).toBeNull();
    });

    it('too big, not finite, or a payday count off the list', () => {
      expect(bufferPlan(1e9 + 1, 1, 0, 100, 12)).toBeNull();
      expect(bufferPlan(NaN, 1, 0, 100, 12)).toBeNull();
      expect(bufferPlan(100, 1, 0, Infinity, 12)).toBeNull();
      expect(bufferPlan(100, 1, 0, 10, 13)).toBeNull();
      expect(bufferPlan(100, 1, -1, 10, 12)).toBeNull();
      expect(bufferPlan(100, 1, 1e9 + 1, 10, 12)).toBeNull();
      expect(bufferPlan(100, 1, 0, 10, 12, NaN)).toBeNull();
    });
  });

  describe('rounding', () => {
    it('counts paydays in whole cents, where float division would add one', () => {
      expect(150.15 / 50.05).toBeGreaterThan(3); // 3.0000000000000004
      expect(plan(150.15, 1, 0, 50.05, 12)).toMatchObject({ paydays: 3 });
      expect(Math.ceil((144.3 * 3) / 33.3)).toBe(14);
      expect(plan(144.3, 3, 0, 33.3, 12)).toMatchObject({ target: 432.9, paydays: 13 });
    });

    it('uses the shared cent helpers', () => {
      expect(toCents(1.005)).toBe(101);
      expect(toCents(182.5)).toBe(18250);
      expect(roundMoney(2.675)).toBe(2.68);
    });

    it('treats an amount under half a cent each payday as no amount', () => {
      expect(plan(100, 1, 0, 0.004, 12)).toMatchObject({ state: 'no-amount' });
    });
  });

  describe('the ten-year cap, at every pay frequency', () => {
    const cases: [number, number, number][] = [
      [52, 5200, 520],
      [26, 2600, 260],
      [24, 2400, 240],
      [12, 1200, 120],
    ];
    for (const [perYear, target, paydays] of cases) {
      it(`${perYear} paydays a year: ${paydays} is dated, one more is too long`, () => {
        expect(plan(target, 1, 0, 10, perYear)).toMatchObject({ state: 'dated', paydays, away: { unit: 'month', count: 120 } });
        expect(plan(target + 10, 1, 0, 10, perYear)).toMatchObject({ state: 'too-long', paydays: null, away: null, heldAtEnd: null });
      });
    }

    it('works at the largest inputs without overflow', () => {
      expect(plan(1e9, 24, 0, 0.01, 12)).toMatchObject({ state: 'too-long', target: 24000000000 });
    });
  });

  describe('weeks and months away', () => {
    it('in the plan', () => {
      expect(plan(5500, 1, 0, 2750, 52).away).toEqual({ unit: 'week', count: 2 });
      expect(plan(100, 1, 0, 100, 24)).toMatchObject({ paydays: 1, away: { unit: 'week', count: 2 } });
      expect(plan(400, 1, 0, 100, 52).away).toEqual({ unit: 'week', count: 4 });
      expect(plan(500, 1, 0, 100, 52).away).toEqual({ unit: 'month', count: 1 });
    });

    it('timeAway', () => {
      expect(timeAway(22, 26)).toEqual({ unit: 'month', count: 10 });
      expect(timeAway(8, 26)).toEqual({ unit: 'month', count: 4 });
      expect(timeAway(1, 24)).toEqual({ unit: 'week', count: 2 });
      expect(timeAway(4, 52)).toEqual({ unit: 'week', count: 4 });
      expect(timeAway(5, 52)).toEqual({ unit: 'month', count: 1 });
      expect(timeAway(1, 52)).toEqual({ unit: 'week', count: 1 });
    });
  });

  describe('the $400 milestone', () => {
    it('is not shown when the target is under $400', () => {
      expect(plan(300, 1, 0, 50, 26, 400)).toMatchObject({ paydays: 6, away: { unit: 'month', count: 3 }, milestonePayday: null });
    });

    it('is not shown once $400 is already set aside', () => {
      expect(plan(1055, 1, 400, 50, 26, 400)).toMatchObject({
        paydays: 14,
        quotient: 13.1,
        away: { unit: 'month', count: 6 },
        heldAtEnd: 1100,
        milestonePayday: null,
      });
    });

    it('is not shown with nothing moved each paycheck', () => {
      expect(plan(1055, 1, 0, 0, 26, 400)).toMatchObject({ state: 'no-amount', milestonePayday: null });
    });

    it('counts from what is already set aside', () => {
      expect(plan(1055, 1, 100, 50, 26, 400)).toMatchObject({
        milestonePayday: 6,
        milestoneAway: { unit: 'month', count: 3 },
        paydays: 20,
        away: { unit: 'month', count: 9 },
        heldAtEnd: 1100,
        overTarget: 45,
      });
    });

    it('can be dated when the target is too far, but not past ten years itself', () => {
      expect(plan(1000, 24, 0, 50, 26, 400)).toMatchObject({ state: 'too-long', milestonePayday: 8, milestoneAway: { unit: 'month', count: 4 } });
      expect(plan(1e6, 24, 0, 1, 26, 400)).toMatchObject({ state: 'too-long', milestonePayday: null, milestoneAway: null });
    });
  });

  describe('field checks', () => {
    it('isPayFrequency is an own-key allow-list', () => {
      expect(isPayFrequency('fortnightly')).toBe(true);
      expect(isPayFrequency('abc')).toBe(false);
      expect(isPayFrequency('every two weeks')).toBe(false);
      expect(isPayFrequency('toString')).toBe(false);
      expect(PAYDAYS_PER_YEAR).toEqual({ weekly: 52, fortnightly: 26, 'twice-monthly': 24, monthly: 12 });
    });

    it('readAmount reads what a number field can hold', () => {
      expect(readAmount('1e5')).toEqual({ value: 100000, tooBig: false });
      expect(readAmount('1,00,000')).toEqual({ value: 100000, tooBig: false });
      expect(readAmount('₹500')).toEqual({ value: 500, tooBig: false });
      expect(readAmount('')).toEqual({ value: null, tooBig: false });
      expect(readAmount('9'.repeat(400))).toEqual({ value: null, tooBig: true });
      expect(readAmount('-0')).toEqual({ value: 0, tooBig: false });
      expect(Object.is(readAmount('-0').value, 0)).toBe(true);
      expect(readAmount('abc')).toEqual({ value: null, tooBig: false });
    });

    it('bufferInputProblems names the one thing wrong with each field', () => {
      expect(bufferInputProblems({ essentials: '', months: '1', saved: '0', perPayday: '2000' })).toEqual({ essentials: 'required' });
      expect(bufferInputProblems({ essentials: '5500', months: '0.5', saved: '0', perPayday: '2000' })).toEqual({ months: 'months-range' });
      expect(bufferInputProblems({ essentials: '5500', months: '1', saved: '6000', perPayday: '-5' })).toEqual({ perPayday: 'negative' });
      expect(bufferInputProblems({ essentials: '1000000001', months: '1', saved: '0', perPayday: '2000' })).toEqual({ essentials: 'too-big' });
      expect(bufferInputProblems({ essentials: '5500', months: '1.5', saved: '', perPayday: '' })).toEqual({});
    });

    it('and the rest of each field’s rules', () => {
      const ok = { essentials: '5500', months: '1', saved: '0', perPayday: '2000' };
      expect(bufferInputProblems(ok)).toEqual({});
      expect(bufferInputProblems({ ...ok, essentials: '0' })).toEqual({ essentials: 'required' });
      expect(bufferInputProblems({ ...ok, essentials: '-5' })).toEqual({ essentials: 'required' });
      expect(bufferInputProblems({ ...ok, essentials: 'abc' })).toEqual({ essentials: 'required' });
      expect(bufferInputProblems({ ...ok, essentials: '9'.repeat(400) })).toEqual({ essentials: 'too-big' });
      expect(bufferInputProblems({ ...ok, essentials: '1000000000' })).toEqual({});
      for (const months of ['', '0', '-1', '24.5', '25', 'abc']) {
        expect(bufferInputProblems({ ...ok, months }), `months ${months}`).toEqual({ months: 'months-range' });
      }
      for (const months of ['1', '1.5', '24']) expect(bufferInputProblems({ ...ok, months }), `months ${months}`).toEqual({});
      expect(bufferInputProblems({ ...ok, saved: '-1' })).toEqual({ saved: 'negative' });
      expect(bufferInputProblems({ ...ok, saved: '1000000001' })).toEqual({ saved: 'too-big' });
      expect(bufferInputProblems({ ...ok, perPayday: '9'.repeat(400) })).toEqual({ perPayday: 'too-big' });
      expect(bufferInputProblems({ ...ok, perPayday: '0' })).toEqual({});
    });

    it('agrees with bufferPlan: no problem means a plan, a problem means none', () => {
      const cases = [
        { essentials: '5500', months: '1', saved: '0', perPayday: '2000' },
        { essentials: '0', months: '1', saved: '0', perPayday: '2000' },
        { essentials: '5500', months: '0.5', saved: '0', perPayday: '2000' },
        { essentials: '5500', months: '1', saved: '6000', perPayday: '-5' },
        { essentials: '1e5', months: '24', saved: '', perPayday: '' },
      ];
      for (const raw of cases) {
        const value = (text: string) => readAmount(text).value ?? 0;
        const result = bufferPlan(value(raw.essentials), value(raw.months), value(raw.saved), value(raw.perPayday), 12);
        expect(result === null, JSON.stringify(raw)).toBe(Object.keys(bufferInputProblems(raw)).length > 0);
      }
    });
  });
});
