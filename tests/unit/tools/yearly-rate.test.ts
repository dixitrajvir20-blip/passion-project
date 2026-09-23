import { describe, it, expect } from 'vitest';
import { roundTo } from '../../../src/lib/finance';
import { localeByCode, ratePercent } from '../../../src/lib/format';
import {
  CONFIG,
  DEFAULT_BASIS,
  basisFrom,
  groupSchedule,
  ledgerLines,
  periodRateText,
  rateSchedule,
  readFigure,
  resultSentence,
  rowLabel,
  scheduleForTable,
  yearlyRate,
  yearlyText,
  compoundedText,
  errorText,
  noteText,
  type RateResult,
  type YearlyRateInput,
  type YearlyRateResult,
} from '../../../src/lib/tools/yearly-rate';

const IN = localeByCode('en-IN');
const DEFAULT: YearlyRateInput = { amount: 5000, fee: 0, repayment: 5500, count: 1, period: 'week', days: 7, first: 'later' };
const PHONE: YearlyRateInput = { amount: 12000, fee: 600, repayment: 4000, count: 3, period: 'month', first: 'later' };
const KFS: YearlyRateInput = { amount: 20000, fee: 400, repayment: 969.73, count: 24, period: 'month', first: 'later' };

function rate(input: YearlyRateInput): RateResult {
  const result = yearlyRate(input);
  if (result.kind !== 'rate') throw new Error(`expected a rate, got ${result.kind}`);
  return result;
}
const pct4 = (r: RateResult) => roundTo(r.perPeriod * 100, 4);

describe('yearly-rate', () => {
  it('has a config for each edition it is listed in', () => expect(Object.keys(CONFIG).sort()).toEqual(['in']));

  describe('config', () => {
    const config = CONFIG.in!;

    it('opens on the lesson’s seven-day app loan', () => {
      expect(config.defaults).toEqual({ amount: '5000', fee: '0', repayment: '5500', count: '1', period: 'week', days: '7', first: 'later' });
      expect(config.scenario).toBe('A ₹5,000 app loan from the lesson, with ₹5,500 due back seven days later.');
    });

    it('takes its method from the edition’s rules, each sourced to the RBI directions and dated', () => {
      expect(basisFrom(config.rules)).toEqual({ monthsPerYear: 12, daysPerYear: 365 });
      expect(config.rules.map((r) => r.key)).toEqual(['monthsPerYear', 'daysPerYear', 'kfsIllustrationApr']);
      for (const rule of config.rules) {
        expect(rule.source.url).toBe('https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12942');
        expect(rule.asOf).toBe('2026-09-22');
      }
      expect(config.rules.find((r) => r.key === 'kfsIllustrationApr')).toMatchObject({ value: 17.07, inLine: false });
      expect(config.rulesLead).toBe('Method as of');
    });

    it('lists every acronym the page uses as a term: APR, GST and RBI, with the Key Facts Statement', () => {
      expect(config.glossary).toEqual(['apr', 'key-facts-statement', 'gst', 'rbi']);
    });

    it('never calls a figure of its own “effective” outside the quoted statement line', () => {
      const text = JSON.stringify(config).toLowerCase();
      expect(text).not.toContain('effective');
    });

    it('falls back to 12 and 365 when a rule is missing', () => {
      expect(basisFrom(undefined)).toEqual(DEFAULT_BASIS);
      expect(basisFrom([])).toEqual(DEFAULT_BASIS);
    });
  });

  describe('every pin in the revised spec', () => {
    it('the lesson’s app loan, the default: 10% for the 7 days, 521.4% a year', () => {
      const r = rate(DEFAULT);
      expect(r).toMatchObject({ received: 5000, repaid: 5500, cost: 500, perPeriodShown: 10, yearlyShown: 521.4 });
      expect(r.perPeriod * 100).toBeCloseTo(10, 10);
      expect(r.periodsPerYear).toBe(365 / 7);
      expect(roundTo(r.nominal, 2)).toBe(521.43);
      expect(roundTo(r.compounded, 1)).toBe(14299.0);
      expect(compoundedText(r, IN)).toBe('over 10,000%');
      expect(yearlyText(r, IN)).toBe('521.4%');
    });

    it('the “no-cost” phone: 2.609% a month, 31.3% a year, and its schedule', () => {
      const r = rate(PHONE);
      expect(r).toMatchObject({ received: 11400, repaid: 12000, cost: 600, perPeriodShown: 2.609, yearlyShown: 31.3 });
      expect(pct4(r)).toBe(2.6092);
      expect(roundTo(r.nominal, 2)).toBe(31.31);
      expect(roundTo(r.compounded, 1)).toBe(36.2);
      const rows = rateSchedule(r, 4000);
      expect(rows.map((row) => row.charge)).toEqual([297.45, 200.84, 101.71]);
      expect(rows.map((row) => row.owed)).toEqual([7697.45, 3898.29, 0]);
      expect(rows[2].paid).toBe(4000);
    });

    it('the phone with the first part paid on the day: 5.359% a month, 64.3% a year', () => {
      const r = rate({ ...PHONE, first: 'on-the-day' });
      expect(r).toMatchObject({ received: 7400, dayPaid: 4600, later: 2, repaid: 8000, cost: 600, perPeriodShown: 5.359, yearlyShown: 64.3 });
      expect(pct4(r)).toBe(5.3588);
      expect(roundTo(r.compounded, 1)).toBe(87.1);
      const same = rate({ amount: 12000, fee: 4600, repayment: 4000, count: 2, period: 'month', first: 'later' });
      expect(same.perPeriod).toBe(r.perPeriod);
      expect(same.yearlyShown).toBe(r.yearlyShown);
      const rows = rateSchedule(r, 4000);
      expect(rows.map((row) => row.charge)).toEqual([396.55, 203.45]);
      expect(rows.map((row) => row.owed)).toEqual([3796.55, 0]);
      // Numbered as the reader counted them: the one on the day was repayment 1.
      expect(rows.map(rowLabel)).toEqual(['2', '3']);
    });

    it('the RBI Key Facts Statement illustration, unrounded instalment: 17.07% as printed, 17.1% here', () => {
      const r = rate(KFS);
      expect(r).toMatchObject({ received: 19600, repaid: 23273.52, cost: 3673.52, perPeriodShown: 1.423, yearlyShown: 17.1 });
      expect(pct4(r)).toBe(1.4225);
      expect(roundTo(r.nominal, 2)).toBe(CONFIG.in!.rules.find((x) => x.key === 'kfsIllustrationApr')!.value);
      expect(roundTo(r.compounded, 1)).toBe(18.5);
      expect(roundTo(r.compounded, 2)).toBe(18.47);
      const rows = rateSchedule(r, 969.73);
      expect(rows[0]).toMatchObject({ charge: 278.81, paidOff: 690.92, owed: 18909.08 });
      expect(rows[23]).toMatchObject({ paid: 969.7, owed: 0 });
      expect(Math.abs(rows[23].paid - 969.73)).toBeLessThan(1);
    });

    it('the statement’s printed instalment of ₹970: 17.10', () => {
      const r = rate({ ...KFS, repayment: 970 });
      expect(roundTo(r.nominal, 2)).toBe(17.1);
      expect(r.perPeriodShown).toBe(1.425);
      expect(r.yearlyShown).toBe(17.1);
    });

    it('18% flat over a year is 31.7% a year, not 18% (and not the 33.2% rule of thumb)', () => {
      const r = rate({ amount: 20000, fee: 0, repayment: 1966.67, count: 12, period: 'month', first: 'later' });
      expect(r).toMatchObject({ repaid: 23600.04, cost: 3600.04, perPeriodShown: 2.643, yearlyShown: 31.7 });
      expect(roundTo(r.nominal, 2)).toBe(31.72);
      expect(roundTo(r.compounded, 1)).toBe(36.8);
    });

    it('first-business-loan’s Key Facts Statement: 11.0% a year', () => {
      const r = rate({ amount: 150000, fee: 0, repayment: 4910.81, count: 36, period: 'month', first: 'later' });
      expect(r).toMatchObject({ cost: 26789.16, perPeriodShown: 0.917, yearlyShown: 11 });
      expect(roundTo(r.compounded, 1)).toBe(11.6);
      const rows = rateSchedule(r, 4910.81);
      expect(rows.at(-1)).toMatchObject({ paid: 4910.82, owed: 0 });
    });

    it('repaying exactly what reached you is zero cost', () => {
      const r = yearlyRate({ amount: 10000, fee: 0, repayment: 10000, count: 1, period: 'month', first: 'later' });
      expect(r).toMatchObject({ kind: 'zero', cost: 0, rounding: 0, perPeriod: 0, yearlyShown: 0 });
    });

    it('a paisa per instalment either way is rounding, not a cost', () => {
      const thirds = yearlyRate({ amount: 10000, fee: 0, repayment: 3333.33, count: 3, period: 'month', first: 'later' });
      expect(thirds).toMatchObject({ kind: 'zero', repaid: 9999.99, rounding: 0.01 });
      const sixths = yearlyRate({ amount: 10000, fee: 0, repayment: 1666.67, count: 6, period: 'month', first: 'later' });
      expect(sixths).toMatchObject({ kind: 'zero', repaid: 10000.02, rounding: -0.02 });
      const onTheDay = yearlyRate({ amount: 10000, fee: 0, repayment: 3333.33, count: 3, period: 'month', first: 'on-the-day' });
      expect(onTheDay).toMatchObject({ kind: 'zero', received: 6666.67, repaid: 6666.66, rounding: 0.01 });
    });

    it('repaying less than reached you is not a rate', () => {
      const r = yearlyRate({ ...DEFAULT, repayment: 4000 });
      expect(r).toMatchObject({ kind: 'repaid-less', received: 5000, repaid: 4000 });
      expect(r).not.toHaveProperty('perPeriod');
      expect(r).not.toHaveProperty('yearlyShown');
    });

    it('fees that take the whole amount leave nothing to reach you', () => {
      expect(yearlyRate({ ...DEFAULT, fee: 5000 }).kind).toBe('nothing-reaches-you');
    });

    it('one repayment made on the day lends nothing', () => {
      expect(yearlyRate({ ...DEFAULT, first: 'on-the-day' }).kind).toBe('nothing-lent');
    });

    it('invalid inputs, each alone on the default, name their field and give no rate', () => {
      const cases: [Partial<YearlyRateInput>, string][] = [
        [{ period: 'days', days: -7 }, 'days'],
        [{ period: 'days', days: 0.5 }, 'days'],
        [{ period: 'days', days: 3651 }, 'days'],
        [{ fee: -500 }, 'fee'],
        [{ count: 0 }, 'count'],
        [{ count: 601 }, 'count'],
        [{ repayment: 0 }, 'repayment'],
        [{ amount: 1e12 + 1 }, 'amount'],
        [{ amount: Number.NaN }, 'amount'],
        [{ amount: null }, 'amount'],
      ];
      for (const [change, field] of cases) {
        const r = yearlyRate({ ...DEFAULT, ...change });
        expect(r.kind, JSON.stringify(change)).toBe('invalid');
        if (r.kind !== 'invalid') continue;
        expect(Object.keys(r.errors), JSON.stringify(change)).toEqual([field]);
        expect(r).not.toHaveProperty('perPeriod');
        expect(r).not.toHaveProperty('yearlyShown');
      }
    });

    it('a count that is not whole is counted as the whole number below, with a note', () => {
      const r = rate({ amount: 5000, fee: 0, repayment: 2800, count: 2.7, period: 'week', first: 'later' });
      expect(r.notes).toContain('count-floored');
      expect(r).toMatchObject({ later: 2, cost: 600, perPeriodDp: 4, perPeriodShown: 7.8999, yearlyShown: 411.9 });
    });

    it('a paisa reaching you: capped in the display, never a raw figure above 10,000%', () => {
      const r = rate({ ...DEFAULT, fee: 4999.99 });
      expect(r.received).toBe(0.01);
      expect(r.perPeriodShown).toBe(54999900);
      // The spec's "2867694786 (raw)" is 54,999,900 × 52.14; the maths multiplies by the exact
      // 365 ÷ 7, as the ledger's "365 ÷ 7" shows, which gives 2,867,851,928.6.
      expect(r.yearlyShown).toBe(roundTo(54999900 * (365 / 7), 1));
      expect(r.yearlyShown).toBe(2867851928.6);
      expect(periodRateText(r, IN)).toBe('over 10,000%');
      expect(yearlyText(r, IN)).toBe('over 10,000%');
    });

    it('returns without hanging at the largest figures, capped', () => {
      const r = rate({ amount: 1e12, fee: 999999999999.99, repayment: 1e12, count: 2, period: 'days', days: 1, first: 'later' });
      expect(r.capped).toBe(true);
      expect(r.perPeriod).toBe(1e6);
      expect(yearlyText(r, IN)).toBe('over 10,000%');
      expect(rateSchedule(r)).toEqual([]);
    });

    it('a rupee on a lakh: under 0.1% a year, never 0%', () => {
      const r = rate({ amount: 100000, fee: 0, repayment: 100001, count: 1, period: 'month', first: 'later' });
      expect(r).toMatchObject({ cost: 1, perPeriodShown: 0.001, yearlyShown: 0 });
      expect(yearlyText(r, IN)).toBe('under 0.1%');
      expect(ratePercent(r.yearlyShown, IN, 1)).toBe('0%'); // why yearlyText checks the cost
    });

    it('no jump between 28 and 30 days, and a month is exactly 12', () => {
      const byDays = [27, 28, 30, 91].map((days) => rate({ ...DEFAULT, period: 'days', days }).yearlyShown);
      expect(byDays).toEqual([135.2, 130.4, 121.7, 40.1]);
      expect(rate({ ...DEFAULT, period: 'month' }).yearlyShown).toBe(120);
    });

    it('600 daily repayments: five places for the daily rate, grouped in twelves', () => {
      const r = rate({ amount: 50000, fee: 0, repayment: 100, count: 600, period: 'days', days: 1, first: 'later' });
      expect(r).toMatchObject({ perPeriodDp: 5, perPeriodShown: 0.06265, yearlyShown: 22.9 });
      expect(roundTo(r.nominal, 2)).toBe(22.87);
      const rows = rateSchedule(r, 100);
      expect(rows).toHaveLength(600);
      expect(rows.at(-1)).toMatchObject({ paid: 100.04, owed: 0 });
      const groups = groupSchedule(rows, 12);
      expect(groups).toHaveLength(50);
      expect(rowLabel(groups[0])).toBe('1–12');
      expect(groups[0]).toMatchObject({ paid: 1200, charge: 373.04, owed: 49173.04 });
      expect(groups.at(-1)!.owed).toBe(0);
      expect(scheduleForTable(r)).toEqual(groups);
    });

    it('doc pin: a daily rate on the 7-day loan gives 500.4%, against 521.4% here', () => {
      const daily = (Math.pow(1.1, 1 / 7) - 1) * 365 * 100;
      expect(roundTo(daily, 2)).toBe(500.37);
      expect(roundTo(daily, 1)).toBe(500.4);
      expect(rate(DEFAULT).yearlyShown).toBe(521.4);
    });
  });

  describe('the shown figures multiply out', () => {
    it('the headline is the rate shown times the periods, within 0.0065 points of the unrounded rate', () => {
      for (const input of [DEFAULT, PHONE, KFS, { ...PHONE, first: 'on-the-day' as const }]) {
        const r = rate(input);
        expect(r.yearlyShown).toBe(roundTo(r.perPeriodShown * r.periodsPerYear, 1));
        expect(Math.abs(r.perPeriodShown * r.periodsPerYear - r.nominal)).toBeLessThanOrEqual(0.0065);
      }
    });

    it('every schedule ends at exactly 0, its last row within ₹1 of the instalment', () => {
      for (const input of [PHONE, KFS, { ...PHONE, first: 'on-the-day' as const }]) {
        const r = rate(input);
        const rows = rateSchedule(r);
        expect(rows.at(-1)!.owed).toBe(0);
        expect(Math.abs(rows.at(-1)!.paid - r.repayment)).toBeLessThan(1);
        expect(rows).toHaveLength(r.later);
      }
    });

    it('a long schedule at a high rate either closes within ₹1 of the instalment or is left out', () => {
      const cases: YearlyRateInput[] = [
        { amount: 20000, fee: 0, repayment: 1000, count: 120, period: 'month', first: 'later' },
        { amount: 100000, fee: 0, repayment: 3000.5, count: 600, period: 'month', first: 'later' },
        { amount: 10000, fee: 0, repayment: 101.5, count: 600, period: 'days', days: 1, first: 'later' },
        { amount: 1000, fee: 0, repayment: 999.99, count: 12, period: 'month', first: 'later' },
        { amount: 100000, fee: 0, repayment: 2034.9, count: 360, period: 'month', first: 'later' },
      ];
      for (const input of cases) {
        const r = rate(input);
        const rows = rateSchedule(r, input.repayment!);
        if (rows.length === 0) continue;
        expect(Math.abs(rows.at(-1)!.paid - input.repayment!), JSON.stringify(input)).toBeLessThan(1);
        expect(rows.at(-1)!.owed).toBe(0);
        for (const row of rows.slice(0, -1)) expect(row.paidOff, JSON.stringify(input)).toBeGreaterThan(0);
      }
      // The case that drifted furthest: 599 rows paying off nothing, then ₹1,03,000.50. Now no table.
      const worst = rate({ amount: 100000, fee: 0, repayment: 3000.5, count: 600, period: 'month', first: 'later' });
      expect(rateSchedule(worst, 3000.5)).toEqual([]);
      expect(scheduleForTable(worst)).toEqual([]);
      expect(yearlyText(worst, IN)).toBe('36%');
    });

    it('ordinary loans keep their table: ₹30 lakh over 20 and 30 years, and seven years', () => {
      const cases: YearlyRateInput[] = [
        { amount: 3000000, fee: 0, repayment: 26035.26, count: 240, period: 'month', first: 'later' },
        { amount: 3000000, fee: 0, repayment: 22037.41, count: 360, period: 'month', first: 'later' },
        { amount: 500000, fee: 5000, repayment: 8413.26, count: 84, period: 'month', first: 'later' },
      ];
      for (const input of cases) {
        const r = rate(input);
        const rows = rateSchedule(r, input.repayment!);
        expect(rows, JSON.stringify(input)).toHaveLength(input.count!);
        expect(Math.abs(rows.at(-1)!.paid - input.repayment!)).toBeLessThan(1);
      }
    });

    it('no schedule for one repayment or a result that is not a rate', () => {
      expect(rateSchedule(yearlyRate(DEFAULT))).toEqual([]);
      expect(rateSchedule(yearlyRate({ ...DEFAULT, fee: 5000 }))).toEqual([]);
    });
  });

  describe('the result sentence, every branch', () => {
    const say = (input: YearlyRateInput) => resultSentence(yearlyRate(input), IN);

    it('(1) invalid', () => expect(say({ ...DEFAULT, amount: null })).toBe('Fix the figure marked above to see the yearly rate.'));

    it('(2) nothing lent', () =>
      expect(say({ ...DEFAULT, first: 'on-the-day' })).toBe(
        'With one repayment made on the day, nothing is borrowed, so there is no rate to work out.',
      ));

    it('(3) nothing reaches you, by fees and by fees with a first repayment', () => {
      expect(say({ ...DEFAULT, fee: 5000 })).toBe(
        'The fees and charges take all of the ₹5,000, so nothing reaches you and there is no rate to work out.',
      );
      expect(say({ ...PHONE, fee: 8000, first: 'on-the-day' })).toBe(
        'The fees and the first repayment take all of the ₹12,000, so nothing reaches you and there is no rate to work out.',
      );
    });

    it('(4) repaid less', () =>
      expect(say({ ...DEFAULT, repayment: 4000 })).toBe(
        'The repayments add up to ₹4,000, less than the ₹5,000 that reached you, so there is no cost to work out. Check each figure against the offer.',
      ));

    it('(5) zero, exact, and (6) zero within rounding', () => {
      const tail = 'Anything not typed here, such as tax added to each instalment or a late fee, is not counted.';
      expect(say({ amount: 10000, fee: 0, repayment: 10000, count: 1, period: 'month', first: 'later' })).toBe(
        `From these figures you pay back exactly what reached you: 0% a year. ${tail}`,
      );
      expect(say({ amount: 10000, fee: 0, repayment: 1666.67, count: 6, period: 'month', first: 'later' })).toBe(
        `From these figures you pay back what reached you, give or take ₹0.02 of rounding in the instalments: 0% a year. ${tail}`,
      );
    });

    it('(7) one repayment, the default', () =>
      expect(say(DEFAULT)).toBe('Getting ₹5,000 and repaying ₹5,500 after 7 days costs ₹500: 10% for the 7 days, which is 521.4% a year.'));

    it('(8) instalments, the lesson’s phone', () =>
      expect(say(PHONE)).toBe(
        'Getting ₹11,400 and repaying 3 × ₹4,000, one each month, costs ₹600: 2.609% a month on what is still owed, which is 31.3% a year.',
      ));

    it('(9) first repayment on the day, with instalments and with one left', () => {
      expect(say({ ...PHONE, first: 'on-the-day' })).toBe(
        'With ₹4,600 paid on the day, ₹7,400 is borrowed, and repaying 2 × ₹4,000, one each month, costs ₹600: 5.359% a month on what is still owed, which is 64.3% a year.',
      );
      expect(say({ amount: 8000, fee: 0, repayment: 4200, count: 2, period: 'month', first: 'on-the-day' })).toBe(
        'With ₹4,200 paid on the day, ₹3,800 is borrowed, and repaying ₹4,200 after a month costs ₹400: 10.526% for the month, which is 126.3% a year.',
      );
    });

    it('(10) very small', () =>
      expect(say({ amount: 100000, fee: 0, repayment: 100001, count: 1, period: 'month', first: 'later' })).toBe(
        'Getting ₹1,00,000 and repaying ₹1,00,001 after a month costs ₹1: 0.001% for the month, which is under 0.1% a year.',
      ));

    it('(11) very large', () =>
      expect(say({ ...DEFAULT, fee: 4999.99 })).toBe(
        'Getting ₹0.01 and repaying ₹5,500 after 7 days costs ₹5,499.99: over 10,000% for the 7 days, which is over 10,000% a year.',
      ));

    it('periods counted in days read naturally, including a single day', () => {
      expect(say({ ...DEFAULT, period: 'days', days: 10 })).toBe(
        'Getting ₹5,000 and repaying ₹5,500 after 10 days costs ₹500: 10% for the 10 days, which is 365% a year.',
      );
      expect(say({ amount: 5000, fee: 0, repayment: 2600, count: 2, period: 'days', days: 15, first: 'later' })).toMatch(
        /^Getting ₹5,000 and repaying 2 × ₹2,600, one every 15 days, costs ₹200: [\d.]+% for each 15 days on what is still owed, which is [\d.]+% a year\.$/,
      );
      expect(say({ ...DEFAULT, period: 'days', days: 1 })).toMatch(/after 1 day costs ₹500: 10% for the day,/);
    });

    it('never judges the loan or compares offers', () => {
      const inputs: YearlyRateInput[] = [DEFAULT, PHONE, KFS, { ...PHONE, first: 'on-the-day' }, { ...DEFAULT, repayment: 4000 }];
      for (const input of inputs) {
        const text = say(input).toLowerCase();
        for (const word of ['better', 'worse', 'cheap', 'expensive', 'fine', 'avoid', 'good', 'bad', 'effective']) expect(text).not.toContain(word);
      }
    });
  });

  describe('the ledger adds up to the answer', () => {
    const labels = (r: YearlyRateResult) => ledgerLines(r, IN).map((l) => l.label);
    const values = (r: YearlyRateResult) => ledgerLines(r, IN).map((l) => l.value);

    it('the default: amount, fees, what reaches you, repaid, cost, rate, periods, yearly', () => {
      const r = yearlyRate(DEFAULT);
      expect(labels(r)).toEqual([
        'Amount borrowed',
        'Fees and charges at the start',
        'Reaches you',
        'Repaid after 7 days',
        'Cost of borrowing',
        'Rate for the 7 days',
        'Periods in a year, about 52.14',
        'Yearly rate',
      ]);
      expect(values(r)).toEqual(['₹5,000', '₹0', '₹5,000', '₹5,500', '₹500', '10%', '365 ÷ 7', '521.4%']);
      const lines = ledgerLines(r, IN);
      expect(lines.map((l) => l.op ?? '')).toEqual(['', '−', '', '', '', '', '×', '']);
      expect(lines.filter((l) => l.subtotal).map((l) => l.label)).toEqual(['Reaches you', 'Cost of borrowing']);
      expect(lines.filter((l) => l.main).map((l) => l.label)).toEqual(['Yearly rate']);
    });

    it('instalments name the count and the first date; on the day adds its own line', () => {
      expect(labels(yearlyRate(PHONE))).toContain('Repaid, 3 × ₹4,000, the first one period after');
      expect(labels(yearlyRate(PHONE))).toContain('Rate for each month, on what is still owed');
      expect(ledgerLines(yearlyRate(PHONE), IN).find((l) => l.label === 'Periods in a year')).toMatchObject({ value: '12', op: '×' });
      const day = yearlyRate({ ...PHONE, first: 'on-the-day' });
      expect(labels(day)).toEqual([
        'Amount borrowed',
        'Fees and charges at the start',
        'First repayment, paid on the day',
        'Reaches you',
        'Repaid later, 2 × ₹4,000',
        'Cost of borrowing',
        'Rate for each month, on what is still owed',
        'Periods in a year',
        'Yearly rate',
      ]);
      expect(values(day)).toEqual(['₹12,000', '₹600', '₹4,000', '₹7,400', '₹8,000', '₹600', '5.359%', '12', '64.3%']);
    });

    it('a rounding row keeps a zero cost adding up', () => {
      const thirds = ledgerLines(yearlyRate({ amount: 10000, fee: 0, repayment: 3333.33, count: 3, period: 'month', first: 'later' }), IN);
      expect(thirds.find((l) => l.label === 'Rounding in the instalments')).toMatchObject({ value: '₹0.01', op: '+' });
      expect(thirds.find((l) => l.label === 'Cost of borrowing')!.value).toBe('₹0');
      expect(thirds.at(-1)!.value).toBe('0%');
      const sixths = ledgerLines(yearlyRate({ amount: 10000, fee: 0, repayment: 1666.67, count: 6, period: 'month', first: 'later' }), IN);
      expect(sixths.find((l) => l.label === 'Rounding in the instalments')).toMatchObject({ value: '₹0.02', op: '−' });
      const exact = ledgerLines(yearlyRate({ amount: 10000, fee: 0, repayment: 10000, count: 1, period: 'month', first: 'later' }), IN);
      expect(exact.find((l) => l.label === 'Rounding in the instalments')).toBeUndefined();
    });

    it('a period in days prints the year’s basis', () => {
      const lines = ledgerLines(yearlyRate({ ...DEFAULT, period: 'days', days: 91 }), IN);
      expect(lines.find((l) => l.op === '×')).toMatchObject({ label: 'Periods in a year, about 4.01', value: '365 ÷ 91' });
      const five = ledgerLines(yearlyRate({ ...DEFAULT, period: 'days', days: 5 }), IN);
      expect(five.find((l) => l.op === '×')).toMatchObject({ label: 'Periods in a year, 73', value: '365 ÷ 5' });
    });

    it('fees above the amount: the figure below 0 carries a note, and 0 needs none', () => {
      const over = ledgerLines(yearlyRate({ ...DEFAULT, fee: 6000 }), IN).find((l) => l.label === 'Reaches you')!;
      expect(over).toMatchObject({ value: '−₹1,000', note: 'The fees and charges are more than the amount, so nothing reaches you.' });
      const day = ledgerLines(yearlyRate({ ...PHONE, fee: 9000, first: 'on-the-day' }), IN).find((l) => l.label === 'Reaches you')!;
      expect(day).toMatchObject({ value: '−₹1,000', note: 'The fees and the first repayment are more than the amount, so nothing reaches you.' });
      const exactly = ledgerLines(yearlyRate({ ...DEFAULT, fee: 5000 }), IN).find((l) => l.label === 'Reaches you')!;
      expect(exactly.value).toBe('₹0');
      expect(exactly).not.toHaveProperty('note');
      const ordinary = ledgerLines(yearlyRate(DEFAULT), IN);
      expect(ordinary.every((l) => l.note === undefined)).toBe(true);
    });

    it('shows a dash for anything not worked out', () => {
      const invalid = ledgerLines(yearlyRate({ ...DEFAULT, amount: null }), IN);
      expect(invalid.every((l) => l.value === '—')).toBe(true);
      const less = ledgerLines(yearlyRate({ ...DEFAULT, repayment: 4000 }), IN);
      expect(less.at(-1)).toMatchObject({ label: 'Yearly rate', value: '—', main: true });
      expect(yearlyText(yearlyRate({ ...DEFAULT, repayment: 4000 }), IN)).toBe('—');
    });
  });

  describe('field messages', () => {
    it('says what to type, in the spec’s words', () => {
      expect(errorText('amount', 'required', IN)).toBe('Enter the amount borrowed, more than 0.');
      expect(errorText('amount', 'too-large', IN)).toBe('Enter an amount of ₹10,00,00,00,00,000 or less.');
      expect(errorText('fee', 'negative', IN)).toBe('Fees cannot be below 0. Type 0 if there are none.');
      expect(errorText('repayment', 'required', IN)).toBe('Enter the repayment, more than 0.');
      expect(errorText('count', 'required', IN)).toBe('Enter how many repayments, at least 1.');
      expect(errorText('count', 'too-large', IN)).toBe('This tool works up to 600 repayments.');
      expect(errorText('days', 'required', IN)).toBe('Enter the days in each period, at least 1.');
      expect(errorText('days', 'too-large', IN)).toBe('Enter 3,650 days (ten years) or fewer.');
      expect(noteText('count-floored', 2, IN)).toBe('Counted as 2: repayments come whole.');
      expect(noteText('days-floored', 7, IN)).toBe('Counted as 7 days.');
    });

    it('a blank fee is 0, a number too large to hold is too large, and days are read only for days', () => {
      expect(rate({ ...DEFAULT, fee: null }).cost).toBe(500);
      const huge = yearlyRate({ ...DEFAULT, amount: Infinity });
      expect(huge.kind === 'invalid' && huge.errors.amount).toBe('too-large');
      expect(rate({ ...DEFAULT, period: 'week', days: -1 }).yearlyShown).toBe(521.4);
      const floored = rate({ ...DEFAULT, period: 'days', days: 7.9 });
      expect(floored.notes).toContain('days-floored');
      expect(floored.yearlyShown).toBe(521.4);
    });

    it('a figure too large to hold keeps its sign: hugely negative is required or negative, not “or less”', () => {
      expect(readFigure('-1e400')).toBe(-Infinity);
      expect(readFigure(' -1e400 ')).toBe(-Infinity);
      expect(readFigure('1e400')).toBe(Infinity);
      expect(readFigure('+1e400')).toBe(Infinity);
      expect(readFigure('₹-' + '9'.repeat(400))).toBe(-Infinity);
      expect(readFigure('9'.repeat(400))).toBe(Infinity);
      expect(readFigure('5,000')).toBe(5000);
      expect(readFigure('-500')).toBe(-500);
      expect(readFigure('')).toBeNull();
      expect(readFigure('abc')).toBeNull();

      const amount = yearlyRate({ ...DEFAULT, amount: -Infinity });
      expect(amount.kind === 'invalid' && amount.errors).toEqual({ amount: 'required' });
      const fee = yearlyRate({ ...DEFAULT, fee: -Infinity });
      expect(fee.kind === 'invalid' && fee.errors).toEqual({ fee: 'negative' });
      const count = yearlyRate({ ...DEFAULT, count: -Infinity });
      expect(count.kind === 'invalid' && count.errors).toEqual({ count: 'required' });
      const days = yearlyRate({ ...DEFAULT, period: 'days', days: -Infinity });
      expect(days.kind === 'invalid' && days.errors).toEqual({ days: 'required' });
      const repayment = yearlyRate({ ...DEFAULT, repayment: -Infinity });
      expect(repayment.kind === 'invalid' && repayment.errors).toEqual({ repayment: 'required' });
    });

    it('an unknown period or first repayment falls back to the default', () => {
      expect(rate({ ...DEFAULT, period: 'evil' as never }).yearlyShown).toBe(521.4);
      expect(rate({ ...DEFAULT, first: 'evil' as never }).yearlyShown).toBe(521.4);
    });
  });
});
