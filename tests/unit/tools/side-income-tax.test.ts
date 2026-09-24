/**
 * side-income-tax: every pin in docs/research/interactive-tools-revised.json (side-income-tax),
 * recomputed by hand in the comments, plus the config's rules and the wording the tool depends on
 * in the lessons and glossary (net earnings are 92.35% of net profit, never net profit itself).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import yaml from 'js-yaml';
import {
  CONFIG,
  ERRORS,
  US_RULE_KEYS,
  beyondScopeProfit,
  checkAmount,
  dateFromRule,
  indiaRulesFrom,
  profitForNetEarnings,
  ruleValue,
  seCombinedRate,
  seStartProfit,
  selfEmploymentSetAside,
  tdsBalance,
  usRulesFrom,
  type SetAside,
  type TdsBalance,
} from '../../../src/lib/tools/side-income-tax';
import { toCents } from '../../../src/lib/finance';
import { readAmount } from '../../../src/lib/fields';
import { collectStrings, stripTags } from '../content-rules';

const US = usRulesFrom(CONFIG.us!.rules);
const IN = indiaRulesFrom(CONFIG.in!.rules);

const se = (moneyIn: number, costs: number, incomeTaxPercent: number, alreadyPaid: number): SetAside =>
  selfEmploymentSetAside({ moneyIn, costs, incomeTaxPercent, alreadyPaid }, US);
const tds = (
  tdsOnStatement: number,
  otherCredits: number,
  taxDue: number,
  missing: number,
  invoiced: number | null,
  arrived: number | null,
): TdsBalance => tdsBalance({ tdsOnStatement, otherCredits, taxDue, missing, invoiced, arrived }, IN);

const allFinite = (result: object) =>
  Object.values(result).every((v) => v === null || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)));

describe('side-income-tax', () => {
  it('has a config for each edition it is listed in', () => expect(Object.keys(CONFIG).sort()).toEqual(['in', 'us']));

  it('holds the US rules at the values the spec cites', () => {
    expect(US).toEqual({
      seNetEarningsShare: 92.35,
      seThreshold: 400,
      seSocialSecurityRate: 12.4,
      seMedicareRate: 2.9,
      ssWageBase: 184500,
      additionalMedicareThreshold: 200000,
      estimatedTaxLine: 1000,
    });
    expect(ruleValue(CONFIG.us!.rules, 'standardDeductionSingle2026')).toBe(16100);
    expect(ruleValue(CONFIG.us!.rules, 'dependentStandardDeductionFloor2026')).toBe(1350);
    expect(ruleValue(CONFIG.us!.rules, 'dependentEarnedIncomeAddOn2026')).toBe(450);
    expect(US_RULE_KEYS).toHaveLength(7);
  });

  it('holds the India rules at the values the spec cites', () => {
    expect(IN).toEqual({ advanceTaxLine: 10000 });
    expect(ruleValue(CONFIG.in!.rules, 'advanceTaxInterestPerMonth')).toBe(1);
    // The four instalment dates come from a department page that lists them, not from Tax payments.
    const instalments = CONFIG.in!.rules.find((r) => r.key === 'advanceTaxInstalments')!;
    expect(instalments.value).toBe(4);
    expect(instalments.label).toContain('15 June, 45% by 15 September, 75% by 15 December and all of it by 15 March');
    expect(instalments.source.url).toMatch(/^https:\/\/www\.incometaxindia\.gov\.in\//);
    expect(CONFIG.in!.rules.find((r) => r.key === 'advanceTaxLine')!.label).not.toMatch(/15 (?:June|September|December)/);
    expect(ruleValue(CONFIG.in!.rules, 'belatedReturnLastDay')).toBe(20261231);
    // The belated-return rule is wrong after its own date, so it carries it as reviewBy.
    expect(CONFIG.in!.rules.find((r) => r.key === 'belatedReturnLastDay')!.reviewBy).toBe('2026-12-31');
    expect(new Date(dateFromRule(20261231)).toISOString().slice(0, 10)).toBe('2026-12-31');
  });

  it('a missing rule is a build error, not a silent default', () => {
    expect(() => ruleValue([], 'seThreshold')).toThrow(/seThreshold/);
  });

  it('opens on the lessons’ numbers', () => {
    expect(CONFIG.us!.defaults).toEqual({ moneyIn: '6000', costs: '1000', incomeTaxPercent: '0', alreadyPaid: '0' });
    expect(CONFIG.in!.defaults).toEqual({ tdsOnStatement: '15000', otherCredits: '0', taxDue: '0', missing: '0', invoiced: '150000', arrived: '135000' });
  });

  it('links only to official https pages', () => {
    for (const edition of ['in', 'us'] as const) {
      for (const [key, link] of Object.entries(CONFIG[edition]!.links)) {
        expect(link.url, `${edition} ${key}`).toMatch(edition === 'in' ? /^https:\/\/www\.incometax\.gov\.in\// : /^https:\/\/www\.(irs|usa)\.gov\//);
        expect(link.title.length, `${edition} ${key}`).toBeGreaterThan(4);
      }
    }
  });
});

describe('selfEmploymentSetAside: the revised spec’s pins', () => {
  it('6000, 1000, 0, 0: the opening numbers, the se-tax lesson’s $707, no estimated-tax fact', () => {
    // 500,000 cents × 9,235 ÷ 1,000,000 = 4,617.5 → 4,618; 4,618 × 153 ÷ 1,000 = 706.554 → 707.
    expect(se(6000, 1000, 0, 0)).toEqual({
      net: 5000,
      loss: false,
      profit: 5000,
      netEarnings: 4618,
      seApplies: true,
      seTax: 707,
      incomeTax: 0,
      tax: 707,
      balance: 707,
      seShareOfProfit: 14.1,
      beyondScope: false,
      expectDuringYear: false,
    });
  });

  it('6000, 1000, 10, 0: $1,207 with the estimated-tax fact', () => {
    expect(se(6000, 1000, 10, 0)).toMatchObject({ netEarnings: 4618, seTax: 707, incomeTax: 500, tax: 1207, balance: 1207, seShareOfProfit: 14.1, expectDuringYear: true });
  });

  it('the lesson’s practice and practiceMore answers', () => {
    expect(se(3000, 0, 0, 0)).toMatchObject({ netEarnings: 2771, seTax: 424 });
    expect(se(8000, 0, 0, 0)).toMatchObject({ netEarnings: 7388, seTax: 1130, expectDuringYear: true });
    expect(se(8000, 0, 12, 0)).toMatchObject({ seTax: 1130, incomeTax: 960, tax: 2090 });
  });

  it('the se-tax quiz answers and the net-earnings glossary example', () => {
    expect(se(7500, 0, 0, 0)).toMatchObject({ netEarnings: 6926, seTax: 1060 });
    expect(se(1500, 0, 0, 0)).toMatchObject({ netEarnings: 1385, seTax: 212 });
    expect(se(540, 0, 0, 0)).toMatchObject({ netEarnings: 499, seTax: 76 });
    expect(se(680, 0, 0, 0)).toMatchObject({ netEarnings: 628, seTax: 96 });
    // The self-employment-tax glossary example: $1,800 of profit, $1,662 of net earnings.
    expect(se(1800, 0, 0, 0).netEarnings).toBe(1662);
  });

  it('the $400 line is tested on the rounded net earnings, so the tax starts at $432.60 of profit', () => {
    expect(se(432.59, 0, 0, 0)).toMatchObject({ netEarnings: 399, seApplies: false, seTax: 0, seShareOfProfit: null });
    expect(se(432.6, 0, 0, 0)).toMatchObject({ netEarnings: 400, seApplies: true, seTax: 61 });
    expect(se(433.13, 0, 0, 0)).toMatchObject({ netEarnings: 400, seApplies: true, seTax: 61 });
    expect(se(434, 0, 0, 0)).toMatchObject({ netEarnings: 401, seTax: 61 });
    expect(se(400, 0, 0, 0)).toMatchObject({ netEarnings: 369, seApplies: false, seTax: 0 });
  });

  it('derives the start profit from the rules: Math.ceil(399.5 × 1e6 ÷ 9235) ÷ 100', () => {
    expect(Math.ceil((399.5 * 1e6) / 9235) / 100).toBe(432.6);
    expect(seStartProfit(US)).toBe(432.6);
    expect(profitForNetEarnings(400, US)).toBe(432.6);
    // One cent below the start is under the line; the start itself is on it.
    expect(se(seStartProfit(US) - 0.01, 0, 0, 0).seApplies).toBe(false);
    expect(se(seStartProfit(US), 0, 0, 0).seApplies).toBe(true);
  });

  it('the 12.4% stops at the 2026 wage base; the 2.9% does not', () => {
    expect(se(150000, 0, 0, 0)).toMatchObject({ netEarnings: 138525, seTax: 21194, seShareOfProfit: 14.1, beyondScope: false });
    // 184,500 × 153 ÷ 1,000 = 28,228.5, a tie taken up.
    expect(se(199783, 0, 0, 0)).toMatchObject({ netEarnings: 184500, seTax: 28229 });
    expect(se(199784, 0, 0, 0)).toMatchObject({ netEarnings: 184501, seTax: 28229 });
    expect(se(216567, 0, 0, 0)).toMatchObject({ netEarnings: 200000, seTax: 28678, seShareOfProfit: 13.2, beyondScope: false });
    expect(se(216568, 0, 0, 0)).toMatchObject({ netEarnings: 200001, beyondScope: true });
    // The uncapped formula would give 42,389.
    expect(se(300000, 0, 0, 0)).toMatchObject({ netEarnings: 277050, seTax: 30912, beyondScope: true });
  });

  it('where the tool stops, in profit: about $216,600', () => {
    // 21,656,795 cents × 9,235 = 200,000,501,825, which is 200,000.50 and rounds to 200,001.
    expect(beyondScopeProfit(US)).toBe(216567.95);
    expect(se(216567.94, 0, 0, 0)).toMatchObject({ netEarnings: 200000, beyondScope: false });
    expect(se(216567.95, 0, 0, 0)).toMatchObject({ netEarnings: 200001, beyondScope: true });
    expect(Math.round(beyondScopeProfit(US) / 100) * 100).toBe(216600);
    expect(seCombinedRate(US)).toBe(15.3);
  });

  it('a loss and an empty year give no NaN or Infinity', () => {
    const loss = se(500, 900, 10, 0);
    expect(loss).toMatchObject({ net: -400, loss: true, profit: 0, netEarnings: 0, seTax: 0, incomeTax: 0, tax: 0, balance: 0, seShareOfProfit: null });
    expect(allFinite(loss)).toBe(true);
    const empty = se(0, 0, 10, 0);
    expect(empty).toMatchObject({ net: 0, loss: false, profit: 0, seShareOfProfit: null, tax: 0 });
    expect(allFinite(empty)).toBe(true);
  });

  it('already paid: below, equal to and above the tax', () => {
    expect(se(500, 900, 0, 200)).toMatchObject({ loss: true, tax: 0, balance: -200 });
    expect(se(6000, 1000, 0, 800)).toMatchObject({ tax: 707, balance: -93 });
    expect(se(6000, 1000, 10, 1207)).toMatchObject({ tax: 1207, balance: 0, expectDuringYear: true });
  });

  it('cents and a fractional rate', () => {
    expect(se(6000.5, 1000.25, 12.5, 0)).toMatchObject({ net: 5000.25, netEarnings: 4618, seTax: 707, incomeTax: 625, tax: 1332, balance: 1332 });
  });

  it('passes negative inputs through as numbers; the island is what refuses them', () => {
    const r = se(-100, 0, -10, -5);
    expect(allFinite(r)).toBe(true);
    expect(r).toMatchObject({ net: -100, loss: true, profit: 0, tax: 0, balance: 5 });
    expect(Object.is(se(6000, 1000, -10, 0).incomeTax, -500)).toBe(true);
  });
});

describe('tdsBalance: the revised spec’s pins', () => {
  it('15000, 0, 0, 0, 150000, 135000: the opening numbers, the tds-refund lesson’s ₹15,000', () => {
    expect(tds(15000, 0, 0, 0, 150000, 135000)).toEqual({
      credits: 15000,
      balance: 15000,
      comesBack: 15000,
      stillToPay: 0,
      missing: 0,
      gap: 15000,
      gapMatches: true,
      advanceTaxDue: false,
    });
  });

  it('the lesson’s practice and practiceMore: a missing credit is shown, never subtracted', () => {
    expect(tds(18000, 0, 0, 6000, 240000, 216000)).toMatchObject({ comesBack: 18000, missing: 6000, gap: 24000, gapMatches: true });
    expect(tds(52500, 0, 0, 17500, 700000, 630000)).toMatchObject({ comesBack: 52500, gap: 70000, gapMatches: true });
  });

  it('no invoices given: no check', () => {
    expect(tds(15000, 0, 0, 0, null, null)).toMatchObject({ comesBack: 15000, gap: null, gapMatches: null });
    expect(tds(15000, 0, 0, 0, 150000, null)).toMatchObject({ gap: null, gapMatches: null });
  });

  it('still to pay, before interest, and the advance-tax line', () => {
    expect(tds(15000, 0, 20000, 0, 150000, 140000)).toMatchObject({ balance: -5000, comesBack: 0, stillToPay: 5000, gap: 10000, gapMatches: false, advanceTaxDue: false });
    expect(tds(15000, 5000, 40000, 0, null, null)).toMatchObject({ credits: 20000, stillToPay: 20000, advanceTaxDue: true });
    expect(tds(15000, 0, 26000, 0, null, null)).toMatchObject({ stillToPay: 11000, advanceTaxDue: true });
    expect(tds(15000, 0, 24999, 0, null, null)).toMatchObject({ stillToPay: 9999, advanceTaxDue: false });
    expect(tds(15000, 0, 25000, 0, null, null)).toMatchObject({ stillToPay: 10000, advanceTaxDue: true });
  });

  it('the advance-tax line counts tax deducted but missing from the statement', () => {
    // 25,000 due − 15,000 on the statement = 10,000 still to pay on the credits on record, but
    // 20,000 more was deducted: the year's tax after all TDS is 25,000 − 35,000, below 0.
    expect(tds(15000, 0, 25000, 20000, null, null)).toMatchObject({ stillToPay: 10000, advanceTaxDue: false });
    // 35,000 − 15,000 − 10,000 = 10,000: on the line. One rupee less is under it.
    expect(tds(15000, 0, 35000, 10000, null, null)).toMatchObject({ stillToPay: 20000, advanceTaxDue: true });
    expect(tds(15000, 0, 34999, 10000, null, null)).toMatchObject({ stillToPay: 19999, advanceTaxDue: false });
    // A refund case never carries the fact, whatever is missing.
    expect(tds(15000, 0, 0, 6000, null, null)).toMatchObject({ comesBack: 15000, advanceTaxDue: false });
  });

  it('equal: nothing comes back, nothing to pay', () => {
    expect(tds(15000, 0, 15000, 0, null, null)).toMatchObject({ balance: 0, comesBack: 0, stillToPay: 0 });
  });

  it('works in cents', () => {
    expect(tds(0.1, 0.2, 0, 0, null, null).credits).toBe(0.3);
    expect(tds(1000.25, 0, 0.5, 0, 10000.25, 9000).gap).toBe(1000.25);
  });
});

describe('the helpers the maths leans on', () => {
  it('toCents from src/lib/finance', () => {
    expect([toCents(432.6), toCents(1000.25), toCents(0.1 + 0.2)]).toEqual([43260, 100025, 30]);
  });

  it('readAmount, which replaces the old toNumber for new calculators, reads 1e5 as 100,000', () => {
    // The spec pinned the old toNumber after a fix; the foundation added readAmount instead.
    expect(readAmount('1e5').value).toBe(100000);
    expect(readAmount('1,00,000').value).toBe(100000);
    expect(readAmount('-5').value).toBe(-5);
  });

  it('checkAmount: blank, negative, too large, a rate above 100, and the optional pair', () => {
    expect(checkAmount(readAmount(''))).toEqual({ value: 0 });
    expect(checkAmount(readAmount(''), { optional: true })).toEqual({ value: null });
    expect(checkAmount(readAmount('-5'))).toEqual({ value: null, error: ERRORS.negative });
    expect(checkAmount(readAmount('1000000000001'))).toEqual({ value: null, error: ERRORS.tooBig });
    expect(checkAmount(readAmount('1000000000000'))).toEqual({ value: 1e12 });
    expect(checkAmount(readAmount('9'.repeat(400)))).toEqual({ value: null, error: ERRORS.tooBig });
    expect(checkAmount(readAmount('100.5'), { percent: true })).toEqual({ value: null, error: ERRORS.rate });
    expect(checkAmount(readAmount('100'), { percent: true })).toEqual({ value: 100 });
    expect(ERRORS).toEqual({
      negative: 'Enter 0 or more.',
      tooBig: 'That figure is larger than this tool works with.',
      rate: 'A rate cannot be more than 100%.',
      arrived: 'More arrived than was invoiced. Check both figures.',
    });
  });
});

describe('the lessons and glossary agree with the tool', () => {
  const ROOT = join(__dirname, '../../../src/content');
  const glossary = (id: string) => JSON.parse(readFileSync(join(ROOT, 'glossary', `${id}.json`), 'utf8'));

  it('net earnings are defined as 92.35% of net profit', () => {
    expect(glossary('net-earnings').define).toContain('92.35%');
    expect(glossary('self-employment-tax').define).toContain('92.35% of net profit');
    for (const id of ['net-earnings', 'self-employment-tax']) {
      expect(Object.values(glossary(id)).filter((text) => typeof text === 'string' && TWICE.test(text)), id).toEqual([]);
    }
  });

  it('the glossary examples add up under the tool’s maths', () => {
    // $800 − $120 = $680 of net profit; 92.35% of it, rounded, is $628.
    expect(glossary('net-earnings').example).toContain('$680 of net profit and $628 of net earnings');
    expect(se(680, 0, 0, 0).netEarnings).toBe(628);
    expect(glossary('self-employment-tax').example).toContain('$1,662 of net earnings');
    expect(se(1800, 0, 0, 0).netEarnings).toBe(1662);
  });

  // In any lesson that defines net earnings, nothing may call them net profit itself.
  const SLIP = /net earnings(?: from self-employment)?(?:,| are| is)\s+(?:your\s+)?(?:net profit|what (?:came|the work|your own work))/i;
  // Net earnings are already 92.35% of net profit, so "92.35% of net earnings" takes the share twice.
  const TWICE = /92\.35% of (?:your )?net earnings/i;
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : path.endsWith('.mdx') ? [path] : [];
    });
  const lessonsRoot = join(ROOT, 'lessons');
  const using = walk(lessonsRoot)
    .map((path) => {
      const raw = readFileSync(path, 'utf8');
      const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)!;
      return { id: relative(lessonsRoot, path).replace(/\.mdx$/, ''), data: yaml.load(match[1]) as Record<string, any>, body: match[2] };
    })
    .filter((lesson) => (lesson.data.glossary ?? []).includes('net-earnings'));

  it('finds the lessons that define net earnings', () => {
    expect(using.map((l) => l.id).sort()).toEqual(expect.arrayContaining(['us/start-something/pricing-a-job', 'us/start-something/se-tax']));
  });

  for (const lesson of using) {
    it(`${lesson.id}: never says net earnings are net profit`, () => {
      const texts = [...collectStrings(lesson.data, new Set(['url'])), stripTags(lesson.body).replace(/\s+/g, ' ')];
      const slips = texts.filter((text) => SLIP.test(text));
      expect(slips).toEqual([]);
    });

    it(`${lesson.id}: never takes 92.35% of net earnings`, () => {
      const texts = [...collectStrings(lesson.data, new Set(['url'])), stripTags(lesson.body).replace(/\s+/g, ' ')];
      expect(texts.filter((text) => TWICE.test(text))).toEqual([]);
    });
  }

  it('se-tax says where the tax starts in profit, and the summary fits', () => {
    const lesson = using.find((l) => l.id === 'us/start-something/se-tax')!;
    expect(lesson.data.summary).toContain('about $433 of profit');
    expect(lesson.data.summary.length).toBeLessThanOrEqual(120);
    expect(Math.round(seStartProfit(US))).toBe(433);
  });
});
