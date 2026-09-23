/**
 * rent-share: every pin in the revised spec (docs/research/interactive-tools-revised.json), worked
 * again here, plus the config the page reads. The browser cases are in tests/e2e/tools/rent-share.spec.ts.
 */
import { describe, it, expect } from 'vitest';
import {
  CONFIG,
  LINE_KEY,
  MAX_AMOUNT,
  UPFRONT_OPTIONS,
  cents,
  dayOneCost,
  housingShare,
  linePercentOf,
  readUpfront,
  requiredLinePercent,
  ruleOf,
} from '../../../src/lib/tools/rent-share';
import { localeByCode, money, percent } from '../../../src/lib/format';

const eu = CONFIG.eu!;
const euro = localeByCode('en-IE');

describe('rent-share', () => {
  it('has a config for each edition it is listed in', () => expect(Object.keys(CONFIG).sort()).toEqual(['eu']));

  describe('config', () => {
    it('opens on the lesson’s room', () => {
      expect(eu.defaults).toEqual({
        netPay: '1125',
        rent: '520',
        bills: '80',
        deposit: '1040',
        firstMonthUpfront: 'yes',
        moveCosts: '140',
        saved: '1200',
      });
      expect(eu.scenario).toBe("The lesson's room: €520 a month plus about €80 of bills, on €1,125 net pay.");
    });

    it('sets the monthly sum against Eurostat’s 40% line, a whole number, from the edition', () => {
      const line = ruleOf(eu, LINE_KEY)!;
      expect(line.value).toBe(40);
      // housingShare's exact comparison (housing × 100 against net pay × line) needs a whole number.
      expect(Number.isInteger(line.value)).toBe(true);
      expect(line.source.url).toBe('https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Glossary:Housing_cost_overburden_rate');
      expect(line.asOf).toBe('2026-09-22');
      expect(line.inLine).not.toBe(false);
      expect(linePercentOf(eu)).toBe(40);
      expect(linePercentOf({ rules: [] })).toBeNull();
    });

    it('gives the page a finite whole-number line from the edition, and never a figure of its own', () => {
      const line = requiredLinePercent(eu);
      expect(line).toBe(40);
      expect(Number.isFinite(line) && Number.isInteger(line)).toBe(true);
      // No sourced line, or one the exact comparison cannot use: the build fails rather than print a 40.
      expect(() => requiredLinePercent({ rules: [] })).toThrow(/overburdenLine/);
      const rule = ruleOf(eu, LINE_KEY)!;
      expect(() => requiredLinePercent({ rules: [{ ...rule, value: 40.5 }] })).toThrow(/overburdenLine/);
      expect(() => requiredLinePercent({ rules: [{ ...rule, value: Number.NaN }] })).toThrow(/overburdenLine/);
    });

    it('never calls the 40% line a rule or a limit set for the reader', () => {
      expect(eu.rulesLead).toBe('Checked');
      expect(ruleOf(eu, LINE_KEY)!.label).toContain('not a limit');
    });

    it('keeps the figures used only in How this is worked out out of the line under the tool', () => {
      const copyOnly = eu.rules.filter((r) => r.key !== LINE_KEY);
      expect(copyOnly.map((r) => [r.key, r.value])).toEqual([
        ['overburdenYoung2025', 9.1],
        ['overburdenAll2025', 7.7],
        ['depositCapFrUnfurnished', 1],
        ['depositCapFrFurnished', 2],
        ['depositCapDe', 3],
      ]);
      for (const rule of copyOnly) expect(rule.inLine, rule.key).toBe(false);
    });

    it('reads the first-month select: anything but no is yes', () => {
      expect(UPFRONT_OPTIONS).toEqual(['yes', 'no']);
      expect(readUpfront('no')).toBe('no');
      expect(readUpfront('yes')).toBe('yes');
      expect(readUpfront('evil')).toBe('yes');
      expect(readUpfront('')).toBe('yes');
    });
  });

  describe('housingShare', () => {
    it('the tool’s example: 520 + 80 on 1,125', () => {
      const r = housingShare(1125, 520, 80, 40);
      expect(r).toMatchObject({ housing: 600, left: 525, share: 53.3, line: 450, gap: 150, position: 'over' });
      expect(r.ratio).toBeCloseTo(0.5333333333, 9);
      expect(percent(r.ratio!, euro, 1)).toBe('53.3%');
      expect(r).toMatchObject({ netPay: 1125, rent: 520, bills: 80, afterRent: 605 });
    });

    it('the lesson’s practice, practiceMore and first quiz question', () => {
      expect(housingShare(1240, 430, 70, 40)).toMatchObject({ housing: 500, left: 740, share: 40.3, line: 496, gap: 4, position: 'over' });
      expect(housingShare(1400, 480, 70, 40)).toMatchObject({ housing: 550, left: 850, share: 39.3, line: 560, gap: -10, position: 'under' });
      expect(housingShare(1350, 500, 70, 40)).toMatchObject({ housing: 570, left: 780, share: 42.2, line: 540, gap: 30, position: 'over' });
    });

    it('exactly at the line', () => {
      expect(housingShare(1125, 400, 50, 40)).toMatchObject({ housing: 450, left: 675, share: 40, line: 450, gap: 0, position: 'at' });
    });

    it('a cent over the line prints 40.0%, but the position is over', () => {
      const r = housingShare(1125, 400, 50.01, 40);
      expect(r).toMatchObject({ housing: 450.01, left: 674.99, share: 40, line: 450, gap: 0.01, position: 'over' });
      expect(percent(r.ratio!, euro, 1)).toBe('40.0%');
      expect(money(r.gap!, euro, 2)).toBe('€0.01');
    });

    it('less than a cent under the line: the gap rounds to 0, the position stays under', () => {
      const r = housingShare(1125.01, 400, 50, 40);
      expect(r).toMatchObject({ housing: 450, left: 675.01, share: 40, line: 450, gap: 0, position: 'under' });
      expect(percent(r.ratio!, euro, 1)).toBe('40.0%');
    });

    it('net pay of 0 or less gives no share, line or position', () => {
      const none = { housing: 600, left: null, ratio: null, share: null, line: null, gap: null, position: null, afterRent: null };
      expect(housingShare(0, 520, 80, 40)).toMatchObject(none);
      expect(housingShare(-100, 520, 80, 40)).toMatchObject(none);
      expect(housingShare(Number.NaN, 520, 80, 40)).toMatchObject(none);
      expect(housingShare(Infinity, 520, 80, 40)).toMatchObject(none);
    });

    it('a negative rent counts as 0', () => {
      expect(housingShare(1125, -520, 80, 40)).toMatchObject({ housing: 80, left: 1045, share: 7.1, line: 450, gap: -370, position: 'under', rent: 0 });
    });

    it('rent and bills above net pay', () => {
      const r = housingShare(500, 520, 80, 40);
      expect(r).toMatchObject({ housing: 600, left: -100, ratio: 1.2, share: 120, line: 200, gap: 400, position: 'over' });
      expect(percent(r.ratio!, euro, 1)).toBe('120.0%');
      expect(money(r.left!, euro)).toBe('−€100');
    });

    it('rent and bills equal to net pay leave nothing, and are not above it', () => {
      expect(housingShare(600, 520, 80, 40)).toMatchObject({ housing: 600, left: 0, share: 100, line: 240, gap: 360, position: 'over' });
    });

    it('adds in cents, so no float slips in', () => {
      const r = housingShare(1000, 0.1, 0.2, 40);
      expect(r.housing).toBe(0.3);
      expect(r.left).toBe(999.7);
    });

    it('the lesson’s explorer at €900 and €1,400', () => {
      expect(housingShare(900, 520, 80, 40)).toMatchObject({ housing: 600, left: 300, share: 66.7, line: 360, gap: 240, position: 'over' });
      expect(housingShare(1400, 520, 80, 40)).toMatchObject({ housing: 600, left: 800, share: 42.9, line: 560, gap: 40, position: 'over' });
    });

    it('rent and bills of 0 are a share of 0, under the line', () => {
      expect(housingShare(1125, 0, 0, 40)).toMatchObject({ housing: 0, left: 1125, share: 0, gap: -450, position: 'under' });
    });

    it('an amount too large for exact cents counts as 0, so nothing prints ∞ or NaN', () => {
      expect(housingShare(1e307, 520, 80, 40).position).toBeNull();
      expect(housingShare(1e307, 520, 80, 40)).toMatchObject({ netPay: 0, left: null, ratio: null, share: null });
      expect(housingShare(1125, 1e307, 0, 40).housing).toBe(0);
      expect(housingShare(1e307, 1e307, 0, 40)).toMatchObject({ housing: 0, left: null, afterRent: null });
      // Above MAX_AMOUNT's safe range the old integer test said 'at' for a cent over.
      expect(housingShare(1e15, 4e14, 0.01, 40).position).toBeNull();
    });

    it('stays exact at MAX_AMOUNT: a cent over the line is over, and the line itself is at', () => {
      expect(MAX_AMOUNT).toBe(1e11);
      expect(Number.isSafeInteger(cents(MAX_AMOUNT) * 100)).toBe(true);
      expect(housingShare(MAX_AMOUNT, MAX_AMOUNT * 0.4, 0.01, 40)).toMatchObject({ position: 'over', gap: 0.01 });
      expect(housingShare(MAX_AMOUNT, MAX_AMOUNT * 0.4, 0, 40)).toMatchObject({ position: 'at', gap: 0 });
      expect(housingShare(MAX_AMOUNT + 0.01, MAX_AMOUNT * 0.4, 0, 40).position).toBe('under');
    });
  });

  describe('cents', () => {
    it('whole cents; negatives, NaN, Infinity and amounts past the safe range count as 0', () => {
      expect(cents(1125)).toBe(112500);
      expect(cents(0.1)).toBe(10);
      expect(cents(0.001)).toBe(0);
      expect(cents(0.005)).toBe(1);
      expect(cents(-5)).toBe(0);
      expect(cents(Number.NaN)).toBe(0);
      expect(cents(Infinity)).toBe(0);
      expect(cents(1e307)).toBe(0);
      expect(cents(MAX_AMOUNT)).toBe(1e13);
    });
  });

  describe('dayOneCost', () => {
    it('the lesson’s day one: deposit, first month and the move, against €1,200 saved', () => {
      expect(dayOneCost(520, 1040, true, 140, 1200)).toEqual({
        deposit: 1040,
        firstMonth: 520,
        moveCosts: 140,
        total: 1700,
        saved: 1200,
        gap: 500,
        position: 'more',
      });
    });

    it('no first month in advance', () => {
      expect(dayOneCost(520, 1040, false, 140, 1200)).toMatchObject({ firstMonth: 0, total: 1180, gap: -20, position: 'covered' });
    });

    it('exactly what is saved', () => {
      expect(dayOneCost(520, 1040, true, 140, 1700)).toMatchObject({ total: 1700, gap: 0, position: 'exact' });
    });

    it('no deposit, and a negative deposit counts as 0', () => {
      expect(dayOneCost(520, 0, true, 140, 1200)).toMatchObject({ deposit: 0, total: 660, gap: -540, position: 'covered' });
      expect(dayOneCost(520, -1040, true, 140, 1200)).toMatchObject({ deposit: 0, total: 660, gap: -540, position: 'covered' });
    });

    it('a negative saved counts as 0', () => {
      expect(dayOneCost(520, 1040, true, 140, -50)).toMatchObject({ saved: 0, total: 1700, gap: 1700, position: 'more' });
    });

    it('the lesson’s second quiz question and its body', () => {
      expect(dayOneCost(480, 960, true, 0, 1300)).toMatchObject({ total: 1440, gap: 140, position: 'more' });
      expect(dayOneCost(520, 1040, true, 0, 0)).toMatchObject({ total: 1560, gap: 1560, position: 'more' });
    });

    it('nothing due and nothing saved', () => {
      expect(dayOneCost(0, 0, true, 0, 0)).toMatchObject({ total: 0, gap: 0, position: 'exact' });
    });

    it('adds in cents', () => {
      expect(dayOneCost(0.1, 0.2, true, 0, 0).total).toBe(0.3);
    });

    it('amounts too large for exact cents count as 0, so the total stays finite', () => {
      const r = dayOneCost(1e307, 1e307, true, 0, 0);
      expect(Number.isFinite(r.total)).toBe(true);
      expect(Number.isFinite(r.gap)).toBe(true);
      expect(r).toMatchObject({ deposit: 0, firstMonth: 0, total: 0, gap: 0, position: 'exact' });
    });
  });
});
