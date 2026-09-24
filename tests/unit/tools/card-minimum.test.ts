/**
 * Card balance at the minimum payment: every pin in the revised spec
 * (docs/research/interactive-tools-revised.json, card-minimum), recomputed on integer cents.
 * Three pins differ by a few cents from the old float runs ($1,200, $5,000, $10,000); the integer
 * figures are the right ones, so do not "fix" them back.
 */
import { describe, it, expect } from 'vitest';
import {
  CARD_FIELDS,
  CONFIG,
  INVALID_SENTENCE,
  compareSentence,
  minimumRun,
  readCardFields,
  runSentence,
  type CardMinimumConfig,
  type MinimumRunInput,
  type MinimumRunResult,
} from '../../../src/lib/tools/card-minimum';
import { divRoundHalfUp, toCents } from '../../../src/lib/finance';
import { formatDuration, localeByCode } from '../../../src/lib/format';

const IN_LOCALE = localeByCode('en-IN');
const US_LOCALE = localeByCode('en-US');

const INDIA: MinimumRunInput = { balance: 20000, aprPercent: 42, rule: 'percent', minPercent: 5, minFloor: 200, interestBase: 'statement' };
const US: MinimumRunInput = { balance: 400, aprPercent: 27.5, rule: 'interest-plus', minPercent: 1, minFloor: 25, interestBase: 'carried' };

const completed: { name: string; run: MinimumRunResult; balance: number }[] = [];
/** Runs and keeps every completed run for the invariant at the end. */
const run = (name: string, input: MinimumRunInput) => {
  const result = minimumRun(input);
  if (result.months !== null) completed.push({ name, run: result, balance: input.balance });
  return result;
};

describe('card-minimum', () => {
  it('has a config for each edition it is listed in', () => expect(Object.keys(CONFIG).sort()).toEqual(['in', 'us']));

  it('takes the minimum rule and the interest model from the edition, never from a field', () => {
    expect(CONFIG.in!.rule).toBe('percent');
    expect(CONFIG.in!.interestBase).toBe('statement');
    expect(CONFIG.us!.rule).toBe('interest-plus');
    expect(CONFIG.us!.interestBase).toBe('carried');
    for (const config of Object.values(CONFIG) as CardMinimumConfig[]) {
      expect(Object.keys(config.defaults).sort()).toEqual([...CARD_FIELDS].sort());
      expect(Object.keys(config.labels).sort()).toEqual([...CARD_FIELDS].sort());
      expect(Object.keys(config.hints).sort()).toEqual([...CARD_FIELDS].sort());
      expect(config.paidInFull.source.url).toMatch(/^https:\/\//);
    }
  });

  it('opens each edition on the lesson’s statement', () => {
    expect(CONFIG.in!.defaults).toEqual({ balance: '20000', apr: '42', minPercent: '5', minFloor: '200', compare: '1000' });
    expect(CONFIG.us!.defaults).toEqual({ balance: '400', apr: '27.5', minPercent: '1', minFloor: '25', compare: '50' });
  });

  it('prints the RBI, CBIC, CFPB and Regulation Z sources in the rules line, and keeps the lesson examples out of it', () => {
    const shown = (edition: 'in' | 'us') => CONFIG[edition]!.rules!.filter((r) => r.inLine !== false).map((r) => r.key);
    expect(shown('in')).toEqual(['minimumMustNotGrow', 'interestFreeSuspended', 'interestOnOutstanding', 'gstOnCardInterest']);
    expect(shown('us')).toEqual(['aprExample', 'minPercentCommon', 'minFloorCommon', 'boxNoGracePeriod', 'boxYearsFrom', 'gracePeriodLost']);
    for (const rule of CONFIG.in!.rules!.filter((r) => r.key.startsWith('minimum') || r.key.startsWith('interest'))) {
      expect(rule.source.url).toBe('https://rbi.org.in/scripts/BS_ViewMasDirections.aspx?id=13155');
    }
    expect(CONFIG.us!.rules!.find((r) => r.key === 'aprExample')!.value).toBe(27.5);
    expect(CONFIG.us!.rules!.find((r) => r.key === 'minFloorCommon')!.value).toBe(40);
  });
});

describe('minimumRun, India (5% of what you owe, interest on the whole statement)', () => {
  it('clears the lesson’s ₹20,000 in 142 months with ₹40,332.68 of interest', () => {
    const r = run('in default', INDIA);
    expect(r.months).toBe(142);
    expect(r.reason).toBeUndefined();
    expect(r.totalInterest).toBe(40332.68);
    expect(r.totalPaid).toBe(60332.68);
    expect(r.first).toMatchObject({ owed: 20000, interest: 700, minimumDue: 1000, payment: 1000, next: 19700 });
    expect(r.belowMinAt).toBeNull();
    expect(r.years).toHaveLength(12);
    expect(r.years[0]).toEqual({ year: 1, paid: 11057.88, interest: 7740.52, balance: 16682.64 });
    expect(r.years[11]).toEqual({ year: 12, paid: 1896.88, interest: 306.68, balance: 0 });
    expect(formatDuration(r.months!)).toBe('11 years 10 months');
  });

  it('a fixed ₹1,000 a month clears it in 35 months', () => {
    const r = run('in fixed 1000', { ...INDIA, fixed: 1000 });
    expect(r.months).toBe(35);
    expect(r.totalInterest).toBe(14997.77);
    expect(r.totalPaid).toBe(34997.77);
    expect(r.belowMinAt).toBeNull();
    expect(formatDuration(35)).toBe('2 years 11 months');
  });

  it('a 3.5% minimum only covers the interest: flat', () => {
    const r = run('in 3.5%', { ...INDIA, minPercent: 3.5 });
    expect(r.months).toBeNull();
    expect(r.reason).toBe('flat');
    expect(r.first).toMatchObject({ interest: 700, payment: 700, next: 20000 });
  });

  it('a 3% minimum is less than the interest: grows', () => {
    const r = run('in 3%', { ...INDIA, minPercent: 3 });
    expect(r.months).toBeNull();
    expect(r.reason).toBe('grows');
    expect(r.first).toMatchObject({ interest: 700, payment: 600, next: 20100 });
  });

  it('at 0% the rule alone clears it in 52 months', () => {
    const r = run('in apr 0', { ...INDIA, aprPercent: 0 });
    expect(r.months).toBe(52);
    expect(r.totalInterest).toBe(0);
    expect(r.totalPaid).toBe(20000);
  });

  it('the whole statement paid in month one carries no interest', () => {
    const r = run('in fixed 20000', { ...INDIA, fixed: 20000 });
    expect(r.months).toBe(1);
    expect(r.totalInterest).toBe(0);
    expect(r.totalPaid).toBe(20000);
    expect(r.first.interest).toBe(0);
  });

  it('a balance below the ₹200 floor is paid in one go, with no interest', () => {
    const r = run('in balance 150', { ...INDIA, balance: 150 });
    expect(r.months).toBe(1);
    expect(r.totalInterest).toBe(0);
    expect(r.totalPaid).toBe(150);
    expect(r.first).toMatchObject({ interest: 0, payment: 150, next: 0 });
  });

  it('a fixed ₹800 is under the ₹1,000 minimum in month one', () => {
    expect(run('in fixed 800', { ...INDIA, fixed: 800 }).belowMinAt).toBe(1);
  });

  it('a fixed ₹650 on a 3% rule is never under the minimum, and the balance grows', () => {
    const r = run('in 3% fixed 650', { ...INDIA, minPercent: 3, fixed: 650 });
    expect(r.belowMinAt).toBeNull();
    expect(r.months).toBeNull();
    expect(r.reason).toBe('grows');
  });

  it('a billion at 3.51% with a ₹1 floor takes more than 100 years', () => {
    const r = run('in over 100', { balance: 1_000_000_000, aprPercent: 42, rule: 'percent', minPercent: 3.51, minFloor: 1, interestBase: 'statement' });
    expect(r.months).toBeNull();
    expect(r.reason).toBe('over-100-years');
  });
});

describe('minimumRun, US (interest plus 1%, interest on what carries)', () => {
  it('clears the lesson’s $400 in 20 months with $89.79 of interest', () => {
    const r = run('us default', US);
    expect(r.months).toBe(20);
    expect(r.totalInterest).toBe(89.79);
    expect(r.totalPaid).toBe(489.79);
    expect(r.first).toEqual({ owed: 400, interest: 8.59, minimumDue: 25, payment: 25, carried: 375, next: 383.59 });
    expect(r.years).toEqual([
      { year: 1, paid: 300, interest: 76.3, balance: 176.3 },
      { year: 2, paid: 189.79, interest: 13.49, balance: 0 },
    ]);
    expect(formatDuration(20)).toBe('1 year 8 months');
  });

  it('a fixed $50 clears it in 9 months', () => {
    const r = run('us fixed 50', { ...US, fixed: 50 });
    expect(r.months).toBe(9);
    expect(r.totalInterest).toBe(35.97);
    expect(r.totalPaid).toBe(435.97);
    expect(r.belowMinAt).toBeNull();
  });

  it('$1,116 is flat in month one, then falls: 89 months', () => {
    const r = run('us 1116', { ...US, balance: 1116 });
    expect(r.first).toMatchObject({ payment: 25, interest: 25 });
    expect(r.months).toBe(89);
    expect(r.totalInterest).toBe(1297.44);
    expect(r.totalPaid).toBe(2413.44);
  });

  it('pins larger balances on integer cents, half up', () => {
    const cases: [number, number, number][] = [
      [1200, 96, 1485.53],
      [2000, 147, 3277.92],
      [5000, 236, 9942.86],
      [10000, 304, 21032.31],
    ];
    for (const [balance, months, interest] of cases) {
      const r = run(`us ${balance}`, { ...US, balance });
      expect(r.months, `$${balance}`).toBe(months);
      expect(r.totalInterest, `$${balance}`).toBe(interest);
    }
  });

  it('rounds the half-cent on $9,900 up: 226.88', () => {
    const r = minimumRun({ ...US, balance: 10000 });
    expect(r.first).toMatchObject({ payment: 100, carried: 9900, interest: 226.88, next: 10126.88 });
    expect(divRoundHalfUp(990000 * 2750, 120000)).toBe(22688);
  });

  it('at 80% month one is flat, and month two falls: 46 months', () => {
    const r = run('us apr 80', { ...US, aprPercent: 80 });
    expect(r.months).toBe(46);
    expect(r.totalInterest).toBe(767.39);
  });

  it('a fixed $30 on $1,000 is under the minimum from month two ($22.23 + $9.92 = $32.15)', () => {
    expect(run('us 1000 fixed 30', { ...US, balance: 1000, fixed: 30 }).belowMinAt).toBe(2);
  });

  it('a fixed $150 on $10,000 is under the minimum from month two, and the balance grows', () => {
    const r = run('us 10000 fixed 150', { ...US, balance: 10000, fixed: 150 });
    expect(r.belowMinAt).toBe(2);
    expect(r.months).toBeNull();
    expect(r.reason).toBe('grows');
  });

  it('at 0% the rule alone clears it in 16 months', () => {
    const r = run('us apr 0', { ...US, aprPercent: 0 });
    expect(r.months).toBe(16);
    expect(r.totalInterest).toBe(0);
    expect(r.totalPaid).toBe(400);
  });

  it('a balance below the $25 floor is paid in one go', () => {
    const r = run('us balance 20', { ...US, balance: 20 });
    expect(r.months).toBe(1);
    expect(r.totalInterest).toBe(0);
    expect(r.totalPaid).toBe(20);
  });

  it('a fixed amount of the whole statement clears it in month one', () => {
    const r = run('us fixed 400', { ...US, fixed: 400 });
    expect(r.months).toBe(1);
    expect(r.totalInterest).toBe(0);
    expect(r.totalPaid).toBe(400);
  });

  it('a 0.01% minimum on $40 at 200% rounds the percentage part to 0 cents: flat, and the US flat sentence', () => {
    const input: MinimumRunInput = { balance: 40, aprPercent: 200, rule: 'interest-plus', minPercent: 0.01, minFloor: 1, interestBase: 'carried' };
    const r = minimumRun(input);
    expect(r.months).toBeNull();
    expect(r.reason).toBe('flat');
    expect(runSentence(r, { balance: 40, aprPercent: 200, minPercent: 0.01, minFloor: 1 }, CONFIG.us!.never, US_LOCALE)).toBe(CONFIG.us!.never.flat);
  });

  it('a fixed $5 is under the minimum in month one, and the balance grows', () => {
    const r = run('us fixed 5', { ...US, fixed: 5 });
    expect(r.belowMinAt).toBe(1);
    expect(r.months).toBeNull();
    expect(r.reason).toBe('grows');
  });
});

describe('the statement box and the CFPB’s own example', () => {
  it('worked on the whole balance, as Appendix M1 assumes, the $400 takes 21 months and $104.02', () => {
    const r = run('box 400', { ...US, interestBase: 'statement' });
    expect(r.months).toBe(21);
    expect(r.totalInterest).toBe(104.02);
    expect(r.totalPaid).toBe(504.02);
  });

  it('reproduces the CFPB report’s $2,000 at 29% (1% plus interest, or $35)', () => {
    const cfpb = { balance: 2000, aprPercent: 29, rule: 'interest-plus', minPercent: 1, minFloor: 35 } as const;
    const box = run('cfpb statement', { ...cfpb, interestBase: 'statement' });
    expect(box.months).toBe(119);
    expect(box.totalInterest).toBe(3157.84);
    const tool = run('cfpb carried', { ...cfpb, interestBase: 'carried' });
    expect(tool.months).toBe(116);
    expect(tool.totalInterest).toBe(2995.58);
  });
});

describe('formatDuration', () => {
  it('says months and years without "1 years" or "0 years"', () => {
    const pins: [number, string][] = [
      [1, '1 month'],
      [9, '9 months'],
      [12, '1 year'],
      [13, '1 year 1 month'],
      [20, '1 year 8 months'],
      [24, '2 years'],
      [35, '2 years 11 months'],
      [142, '11 years 10 months'],
    ];
    for (const [months, text] of pins) expect(formatDuration(months)).toBe(text);
  });
});

describe('the invariant over every completed run above', () => {
  it('total paid is the balance plus the interest, to the cent, and the years add up to the totals', () => {
    expect(completed.length).toBeGreaterThan(15);
    for (const { name, run: r, balance } of completed) {
      expect(toCents(r.totalPaid), name).toBe(toCents(balance) + toCents(r.totalInterest));
      expect(r.years.reduce((sum, y) => sum + toCents(y.paid), 0), name).toBe(toCents(r.totalPaid));
      expect(r.years.reduce((sum, y) => sum + toCents(y.interest), 0), name).toBe(toCents(r.totalInterest));
      expect(r.years[r.years.length - 1].balance, name).toBe(0);
    }
  });
});

describe('reading the fields', () => {
  const inFields = { balance: '20000', apr: '42', minPercent: '5', minFloor: '200', compare: '1000' };
  const floorIn = CONFIG.in!.floorError;

  it('reads the defaults as valid, with the compare amount', () => {
    const read = readCardFields(inFields, IN_LOCALE, floorIn);
    expect(read.errors).toEqual({});
    expect(read.inputs).toEqual({ balance: 20000, aprPercent: 42, minPercent: 5, minFloor: 200 });
    expect(read.compare).toBe(1000);
  });

  it('refuses a blank, 0 or negative balance, and one above the cap in the edition’s grouping', () => {
    for (const balance of ['', '   ', '0', '-5', 'abc', '0.001']) {
      const read = readCardFields({ ...inFields, balance }, IN_LOCALE, floorIn);
      expect(read.errors.balance, JSON.stringify(balance)).toBe('Enter what you owe, more than 0.');
      expect(read.inputs).toBeNull();
    }
    expect(readCardFields({ ...inFields, balance: '1000000001' }, IN_LOCALE, floorIn).errors.balance).toBe('Enter an amount up to 1,00,00,00,000.');
    expect(readCardFields({ ...inFields, balance: '9'.repeat(400) }, US_LOCALE, floorIn).errors.balance).toBe('Enter an amount up to 1,000,000,000.');
    expect(readCardFields({ ...inFields, balance: '1000000000' }, IN_LOCALE, floorIn).errors.balance).toBeUndefined();
  });

  it('allows a rate from 0 to 200', () => {
    expect(readCardFields({ ...inFields, apr: '0' }, IN_LOCALE, floorIn).errors.apr).toBeUndefined();
    expect(readCardFields({ ...inFields, apr: '200' }, IN_LOCALE, floorIn).errors.apr).toBeUndefined();
    expect(readCardFields({ ...inFields, apr: '' }, IN_LOCALE, floorIn).errors.apr).toBe('Enter the yearly rate, 0 or more.');
    expect(readCardFields({ ...inFields, apr: '-1' }, IN_LOCALE, floorIn).errors.apr).toBe('Enter the yearly rate, 0 or more.');
    expect(readCardFields({ ...inFields, apr: '200.5' }, IN_LOCALE, floorIn).errors.apr).toBe('Enter a yearly rate up to 200%.');
  });

  it('needs a minimum above 0 and up to 100%', () => {
    for (const minPercent of ['', '0', '-2', '0.001']) {
      expect(readCardFields({ ...inFields, minPercent }, IN_LOCALE, floorIn).errors.minPercent).toBe('Enter the minimum as a percentage, more than 0.');
    }
    expect(readCardFields({ ...inFields, minPercent: '100' }, IN_LOCALE, floorIn).errors.minPercent).toBeUndefined();
    expect(readCardFields({ ...inFields, minPercent: '101' }, IN_LOCALE, floorIn).errors.minPercent).toBe('Enter a percentage up to 100.');
  });

  it('needs a floor of at least 1, in the edition’s currency', () => {
    expect(readCardFields({ ...inFields, minFloor: '0' }, IN_LOCALE, floorIn).errors.minFloor).toBe('Enter the smallest minimum on your statement, at least ₹1.');
    expect(readCardFields({ ...inFields, minFloor: '' }, US_LOCALE, CONFIG.us!.floorError).errors.minFloor).toBe(
      'Enter the smallest minimum on your statement, at least $1.',
    );
    expect(readCardFields({ ...inFields, minFloor: '1' }, IN_LOCALE, floorIn).errors.minFloor).toBeUndefined();
  });

  it('hides the compare line when it is blank, and an error there leaves the run alone', () => {
    const blank = readCardFields({ ...inFields, compare: '' }, IN_LOCALE, floorIn);
    expect(blank.compare).toBeUndefined();
    expect(blank.errors).toEqual({});
    const zero = readCardFields({ ...inFields, compare: '0' }, IN_LOCALE, floorIn);
    expect(zero.compare).toBe(0);
    const negative = readCardFields({ ...inFields, compare: '-1' }, IN_LOCALE, floorIn);
    expect(negative.errors.compare).toBe('Enter an amount, 0 or more, or leave it blank.');
    expect(negative.compare).toBeUndefined();
    expect(negative.inputs).not.toBeNull();
    expect(readCardFields({ ...inFields, compare: '2000000000' }, IN_LOCALE, floorIn).errors.compare).toBe('Enter an amount up to 1,00,00,00,000.');
  });
});

describe('the result in words', () => {
  const inInputs = { balance: 20000, aprPercent: 42, minPercent: 5, minFloor: 200 };
  const usInputs = { balance: 400, aprPercent: 27.5, minPercent: 1, minFloor: 25 };

  it('India default', () => {
    const text = `${runSentence(minimumRun(INDIA), inInputs, CONFIG.in!.never, IN_LOCALE)} ${compareSentence(minimumRun({ ...INDIA, fixed: 1000 }), 1000, IN_LOCALE)}`;
    expect(text).toBe(
      'Paying only the minimum clears ₹20,000 in 11 years 10 months and adds ₹40,332.68 of interest, ₹60,332.68 in all. At a fixed ₹1,000 a month it clears in 2 years 11 months and adds ₹14,997.77.',
    );
  });

  it('US default', () => {
    const text = `${runSentence(minimumRun(US), usInputs, CONFIG.us!.never, US_LOCALE)} ${compareSentence(minimumRun({ ...US, fixed: 50 }), 50, US_LOCALE)}`;
    expect(text).toBe(
      'Paying only the minimum clears $400 in 1 year 8 months and adds $89.79 of interest, $489.79 in all. At a fixed $50 a month it clears in 9 months and adds $35.97.',
    );
  });

  it('US $1,000 with a fixed $30: below the minimum from month 2', () => {
    expect(compareSentence(minimumRun({ ...US, balance: 1000, fixed: 30 }), 30, US_LOCALE)).toBe(
      'A fixed $30 is below the minimum due from month 2, so from then it would not count as on time.',
    );
  });

  it('every other branch', () => {
    expect(runSentence(minimumRun({ ...INDIA, balance: 150 }), { ...inInputs, balance: 150 }, CONFIG.in!.never, IN_LOCALE)).toBe(
      'The minimum here covers the whole ₹150, so it is paid in one go by the due date, with no interest.',
    );
    expect(runSentence(minimumRun({ ...INDIA, aprPercent: 0 }), { ...inInputs, aprPercent: 0 }, CONFIG.in!.never, IN_LOCALE)).toBe(
      'Paying only the minimum clears ₹20,000 in 4 years 4 months. At 0% nothing is added.',
    );
    expect(runSentence(minimumRun({ ...INDIA, minPercent: 3 }), inInputs, CONFIG.in!.never, IN_LOCALE)).toContain('grows every month');
    expect(runSentence(minimumRun({ ...INDIA, minPercent: 3 }), inInputs, CONFIG.in!.never, IN_LOCALE)).toContain('RBI');
    expect(runSentence(minimumRun({ ...INDIA, minPercent: 3.5 }), inInputs, CONFIG.in!.never, IN_LOCALE)).toBe(
      'On this rule the minimum only covers the interest, so the balance stays where it is. Check the rule printed on your statement.',
    );
    expect(runSentence(minimumRun({ ...INDIA, minPercent: 3.5 }), inInputs, CONFIG.in!.never, IN_LOCALE)).not.toContain('RBI');
    const huge = { balance: 1_000_000_000, aprPercent: 42, minPercent: 3.51, minFloor: 1 };
    expect(runSentence(minimumRun({ ...huge, rule: 'percent', interestBase: 'statement' }), huge, CONFIG.in!.never, IN_LOCALE)).toBe(
      'Paying only the minimum, ₹1,00,00,00,000 takes more than 100 years to clear on these figures.',
    );
    expect(INVALID_SENTENCE).toBe('Enter what you owe, the rate, the minimum rule and the smallest minimum to see how long the minimum takes.');

    expect(compareSentence(minimumRun({ ...INDIA, fixed: 800 }), 800, IN_LOCALE)).toBe(
      'A fixed ₹800 is below this month’s minimum due, so it would not count as on time.',
    );
    expect(compareSentence(minimumRun({ ...INDIA, minPercent: 3, fixed: 650 }), 650, IN_LOCALE)).toBe('At a fixed ₹650 a month the balance does not fall.');
    // ₹1 a month above the interest at 0.1% a month: it falls, but too slowly to finish in 1,200 months.
    const slow = minimumRun({ ...INDIA, balance: 1_000_000_000, aprPercent: 1.2, minPercent: 0.01, fixed: 1_000_001 });
    expect(slow.belowMinAt).toBeNull();
    expect(compareSentence(slow, 1_000_001, IN_LOCALE)).toBe('At a fixed ₹10,00,001 a month it takes more than 100 years.');
    expect(compareSentence(minimumRun({ ...INDIA, fixed: 20000 }), 20000, IN_LOCALE)).toBe(
      'At a fixed ₹20,000 the whole statement is paid by the due date, with no interest.',
    );
    expect(compareSentence(minimumRun({ ...INDIA, aprPercent: 0, fixed: 1000 }), 1000, IN_LOCALE)).toBe(
      'At a fixed ₹1,000 a month it clears in 1 year 8 months, with nothing added.',
    );
  });

  it('never tells the reader to pay more, pay less or change card', () => {
    const all = [
      ...Object.values(CONFIG).flatMap((c) => [c!.never.grows, c!.never.flat, c!.paidInFull.text, ...c!.assumptions]),
      runSentence(minimumRun(US), usInputs, CONFIG.us!.never, US_LOCALE),
    ].join(' ');
    expect(all).not.toMatch(/\byou should\b|\bpay more\b|\bpay less\b|\bswitch\b|\bbalance transfer\b|!/i);
  });
});
