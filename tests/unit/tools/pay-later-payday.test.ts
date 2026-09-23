import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import {
  CONFIG,
  errorText,
  lateFeeAmount,
  linkQuery,
  paydayAfterPlans,
  paydaySentence,
  plainText,
  readField,
  showsInField,
  textParts,
  type PaydayInput,
  type PaydayResult,
  type PlanInput,
} from '../../../src/lib/tools/pay-later-payday';
import { deductions } from '../../../src/lib/finance';
import { localeByCode, percent } from '../../../src/lib/format';
import { toolBySlug } from '../../../src/lib/tools';

const EN_IE = localeByCode('en-IE');
const EN_US = localeByCode('en-US');
const PT_BR = localeByCode('pt-BR');
const EU_WORDS = CONFIG.eu!.words;
const US_WORDS = CONFIG.us!.words;

const plan = (amount: number | null, k: number | null, n: number | null, d: number | null): PlanInput => ({ amount, k, n, d });
const EU_PLANS = [plan(30, 2, 4, 1), plan(36, 2, 4, 1), plan(24, 2, 4, 1)];
const US_PLANS = [plan(15, 2, 4, 1), plan(15, 2, 4, 1), plan(15, 2, 4, 1)];
const EU: PaydayInput = { pay: 1200, living: 804, savings: 0, plans: EU_PLANS };
const US: PaydayInput = { pay: 1317, living: 817, savings: 132, plans: US_PLANS };

/** The figures of a valid result, so a test can read them without narrowing each time. */
function ok(result: PaydayResult) {
  if (result.status === 'invalid') throw new Error(`expected figures, got errors ${JSON.stringify(result.errors)}`);
  return result;
}
const euSentence = (input: PaydayInput, locale = EN_IE) => paydaySentence(paydayAfterPlans(input), locale, EU_WORDS);
const usSentence = (input: PaydayInput) => paydaySentence(paydayAfterPlans(input), EN_US, US_WORDS);

describe('pay-later-payday', () => {
  it('has a config for each edition it is listed in', () => expect(Object.keys(CONFIG).sort()).toEqual(['eu', 'us']));

  it('is listed for Europe and the US, and is ready', () => {
    const tool = toolBySlug('pay-later-payday')!;
    expect(tool.regions).toEqual(['eu', 'us']);
    expect(tool.ready).toBeUndefined();
  });

  describe('the config', () => {
    it('opens each edition on its lesson’s worked payday', () => {
      expect(CONFIG.eu!.defaults).toEqual({
        pay: '1200',
        living: '804',
        savings: '0',
        plans: [
          { amount: '30', k: '2', n: '4', d: '1' },
          { amount: '36', k: '2', n: '4', d: '1' },
          { amount: '24', k: '2', n: '4', d: '1' },
        ],
      });
      expect(CONFIG.us!.defaults.pay).toBe('1317');
      expect(CONFIG.us!.defaults.living).toBe('817');
      expect(CONFIG.us!.defaults.savings).toBe('132');
      expect(CONFIG.us!.defaults.plans).toEqual(Array.from({ length: 3 }, () => ({ amount: '15', k: '2', n: '4', d: '1' })));
    });

    it('uses each edition’s word for a payment', () => {
      expect(EU_WORDS).toEqual({ one: 'instalment', other: 'instalments' });
      expect(US_WORDS).toEqual({ one: 'installment', other: 'installments' });
    });

    it('names no shop, lender or app in any example', () => {
      const text = JSON.stringify(CONFIG);
      for (const name of ['Klarna', 'Afterpay', 'Affirm', 'PayPal', 'Zip', 'Sezzle', 'Clearpay', 'Scalapay', 'Riverty', 'Alma', 'Oney']) {
        expect(text, name).not.toContain(name);
      }
    });

    it('keeps the US fee as a $10 example, with the CFPB’s confirmed 2023 share of loans charged one as the sourced rule', () => {
      const rule = CONFIG.us!.rules!.find((r) => r.key === 'lateFeeShare2023')!;
      expect(rule.value).toBe(4.1);
      expect(rule.source.url).toBe('https://files.consumerfinance.gov/f/documents/cfpb_bnpl-market-report_2025-12.pdf');
      expect(rule.asOf).toBe('2026-09-22');
      expect(rule.label).toContain('4.1%');
      expect(rule.label).not.toContain('$');
      expect(lateFeeAmount(CONFIG.us!)).toBe(10);
    });

    it('keeps Europe’s fee as the lesson’s made-up example, with no rule', () => {
      expect(CONFIG.eu!.rules ?? []).toEqual([]);
      expect(CONFIG.eu!.feeNote.fee).toEqual({ kind: 'example', amount: 15, fromLesson: 'eu/credit-and-fraud/bnpl-is-credit' });
      expect(existsSync(`src/content/lessons/${CONFIG.eu!.feeNote.fee.kind === 'example' ? CONFIG.eu!.feeNote.fee.fromLesson : ''}.mdx`)).toBe(true);
      expect(lateFeeAmount(CONFIG.eu!)).toBe(15);
    });

    it('gives every detail an https source', () => {
      for (const edition of ['eu', 'us'] as const) {
        for (const detail of CONFIG[edition]!.details) expect(detail.source.url, detail.text).toMatch(/^https:\/\//);
        const link = CONFIG[edition]!.feeNote.link;
        if (link) expect(link.url).toMatch(/^https:\/\//);
      }
    });

    it('cites EUR-Lex Article 48 for the date the directive applies', () => {
      const dated = CONFIG.eu!.details.filter((detail) => detail.text.includes('20 November 2026'));
      expect(dated.length).toBe(1);
      expect(dated[0].text).toContain('Article 48');
      expect(dated[0].source.url).toBe('https://eur-lex.europa.eu/eli/dir/2023/2225/oj');
      expect(dated[0].source.title).toContain('48');
    });
  });

  describe('the fee note', () => {
    it('Europe: the lesson’s €15, a made-up example', () => {
      expect(`${CONFIG.eu!.feeNote.label}: ${plainText(textParts(CONFIG.eu!.feeNote.text, CONFIG.eu!, EN_IE))}`).toBe(
        'Late fee if a payment is missed: the lesson’s screen uses €15, a made-up example. Each plan’s terms set the real fee, and each EU country’s law sets any limit on it. A payment that fails can also bring a charge from your bank.',
      );
    });

    it('US: an example fee beside the CFPB’s 2023 share, linked to the report', () => {
      const parts = textParts(CONFIG.us!.feeNote.text, CONFIG.us!, EN_US);
      expect(`${CONFIG.us!.feeNote.label}: ${plainText(parts)}`).toBe(
        'Late fee if a payment is missed: a late fee of $10 is an example, close to the 2023 average the CFPB reports at four large pay-in-four lenders, where 4.1% of loans were charged one (Consumer Financial Protection Bureau, December 2025). Each plan’s terms set the real fee, and some states limit it. Your bank can add an overdraft or non-sufficient funds fee when an automatic payment finds too little in the account.',
      );
      expect(parts.find((p) => 'href' in p)).toEqual({
        text: 'Consumer Financial Protection Bureau, December 2025',
        href: 'https://files.consumerfinance.gov/f/documents/cfpb_bnpl-market-report_2025-12.pdf',
      });
    });

    it('is written in the edition’s currency, whatever the picker says', () => {
      // The island passes localeByCode(localeCode), the edition's own locale; the picker never reaches it.
      expect(plainText(textParts(CONFIG.eu!.feeNote.text, CONFIG.eu!, EN_IE))).toContain('€15');
      expect(plainText(textParts('{fee}', CONFIG.us!, EN_US))).toBe('$10');
    });
  });

  describe('pins', () => {
    it('Europe default', () => {
      const r = ok(paydayAfterPlans(EU));
      expect(r.status).toBe('ok');
      expect(r.afterLiving).toBe(396);
      expect(r.beforePlans).toBe(396);
      expect(r.lines).toEqual([
        { label: 'Plan 1', amount: 30 },
        { label: 'Plan 2', amount: 36 },
        { label: 'Plan 3', amount: 24 },
      ]);
      expect(r.plansTotal).toBe(90);
      expect(r.left).toBe(306);
      expect(r.count).toBe(3);
      expect(r.plansCounted).toBe(3);
      expect(r.share).toBe(0.075);
      expect(percent(r.share!, EN_IE, 1)).toBe('7.5%');
      expect(r.owedIncluding).toBe(270);
      expect(r.owedAfter).toBe(180);
      expect(r.lastPayments).toBe(false);
    });

    it('US default', () => {
      const r = ok(paydayAfterPlans(US));
      expect(r.status).toBe('ok');
      expect(r.afterLiving).toBe(500);
      expect(r.beforePlans).toBe(368);
      expect(r.plansTotal).toBe(45);
      expect(r.left).toBe(323);
      expect(r.count).toBe(3);
      expect(r.share!.toFixed(6)).toBe('0.034169');
      expect(percent(r.share!, EN_US, 1)).toBe('3.4%');
      expect(r.owedIncluding).toBe(135);
      expect(r.owedAfter).toBe(90);
    });

    it('agrees with deductions() on both defaults', () => {
      const eu = deductions(1200, [804, 30, 36, 24].map((amount) => ({ label: '', amount })));
      expect(eu.running).toEqual([396, 366, 330, 306]);
      expect(eu.net).toBe(306);
      const us = deductions(1317, [817, 132, 15, 15, 15].map((amount) => ({ label: '', amount })));
      expect(us.running).toEqual([500, 368, 353, 338, 323]);
      expect(us.net).toBe(323);
      const e = ok(paydayAfterPlans(EU));
      const u = ok(paydayAfterPlans(US));
      expect([e.afterLiving, e.left]).toEqual([eu.running[0], eu.net]);
      expect([u.afterLiving, u.beforePlans, u.left]).toEqual([us.running[0], us.running[1], us.net]);
    });

    it('Europe default sentence', () => {
      expect(euSentence(EU)).toBe(
        'After living costs and 3 instalments, €306 is left of €1,200. The plans take €90, 7.5% of this pay, and €180 is still owed on them after these instalments.',
      );
    });

    it('US default sentence', () => {
      expect(usSentence(US)).toBe(
        'After living costs, $132 to savings and 3 installments, $323 is left of $1,317. The plans take $45, 3.4% of this pay, and $90 is still owed on them after these installments.',
      );
    });

    it('a monthly payer with 2 payments on each two-weekly plan', () => {
      const input = { ...EU, plans: [plan(30, 2, 4, 2), plan(36, 2, 4, 2), plan(24, 2, 4, 2)] };
      const r = ok(paydayAfterPlans(input));
      expect(r.lines).toEqual([
        { label: 'Plan 1, 2 payments', amount: 60 },
        { label: 'Plan 2, 2 payments', amount: 72 },
        { label: 'Plan 3, 2 payments', amount: 48 },
      ]);
      expect(r.plansTotal).toBe(180);
      expect(r.left).toBe(216);
      expect(r.count).toBe(6);
      expect(percent(r.share!, EN_IE, 1)).toBe('15.0%');
      expect(r.owedIncluding).toBe(270);
      expect(r.owedAfter).toBe(90);
      expect(euSentence(input)).toBe(
        'After living costs and 6 instalments, €216 is left of €1,200. The plans take €180, 15.0% of this pay, and €90 is still owed on them after these instalments.',
      );
    });

    it('the lessons’ explorable taps', () => {
      const eu900 = ok(paydayAfterPlans({ ...EU, pay: 900 }));
      expect(eu900.left).toBe(6);
      expect(percent(eu900.share!, EN_IE, 1)).toBe('10.0%');
      expect(ok(paydayAfterPlans({ ...EU, pay: 1500 })).left).toBe(606);
      expect(ok(paydayAfterPlans({ ...US, pay: 1100 })).left).toBe(106);
      expect(ok(paydayAfterPlans({ ...US, pay: 1500 })).left).toBe(506);
    });

    it('Europe with pay 850: short only after the plans', () => {
      const input = { ...EU, pay: 850 };
      const r = ok(paydayAfterPlans(input));
      expect(r.status).toBe('short-after-plans');
      expect(r.beforePlans).toBe(46);
      expect(r.left).toBe(-44);
      expect(euSentence(input)).toBe('This pay is €44 short after 3 instalments: living costs leave €46, and the plans take €90.');
    });

    it('Europe with pay 800: short before any plan, and the plans are not blamed', () => {
      const input = { ...EU, pay: 800 };
      const r = ok(paydayAfterPlans(input));
      expect(r.status).toBe('short-before-plans');
      expect(r.beforePlans).toBe(-4);
      expect(r.left).toBe(-94);
      expect(euSentence(input)).toBe('Living costs of €804 are €4 more than this pay of €800, before any plan. On top of that, the plans take €90.');
    });

    it('US with pay 700: living costs and savings more than the pay', () => {
      const input = { ...US, pay: 700 };
      expect(ok(paydayAfterPlans(input)).status).toBe('short-before-plans');
      expect(usSentence(input)).toBe(
        'Living costs and savings come to $949, $249 more than this pay of $700, before any plan. On top of that, the plans take $45.',
      );
    });

    it('US with savings 500: nothing left before the plans', () => {
      const input = { ...US, savings: 500 };
      const r = ok(paydayAfterPlans(input));
      expect(r.beforePlans).toBe(0);
      expect(r.left).toBe(-45);
      expect(r.status).toBe('short-after-plans');
      expect(usSentence(input)).toBe('This pay is $45 short after 3 installments: living costs and savings leave $0, and the plans take $45.');
    });

    it('US with pay 960 and one plan', () => {
      const input = { ...US, pay: 960, plans: [plan(15, 2, 4, 1)] };
      expect(ok(paydayAfterPlans(input)).left).toBe(-4);
      expect(usSentence(input)).toBe('This pay is $4 short after 1 installment: living costs and savings leave $11, and the plan takes $15.');
    });

    it('US with no plans, and with only zero or blank rows', () => {
      for (const plans of [[], [plan(0, 2, 4, 1), plan(null, 2, 4, 1)]]) {
        const input = { ...US, plans };
        const r = ok(paydayAfterPlans(input));
        expect(r.status).toBe('no-plans');
        expect(r.left).toBe(368);
        expect(r.count).toBe(0);
        expect(r.share).toBeNull();
        expect(usSentence(input)).toBe('No pay-later payments are entered. After living costs, $132 to savings, $368 is left of $1,317.');
      }
      expect(ok(paydayAfterPlans({ ...US, plans: [plan(0, 2, 4, 1), plan(null, 2, 4, 1)] })).lines).toEqual([
        { label: 'Plan 1', amount: 0 },
        { label: 'Plan 2', amount: 0 },
      ]);
    });

    it('an amount under one whole cent is not a payment', () => {
      const r = ok(paydayAfterPlans({ ...EU, plans: [plan(0.001, 2, 4, 1)] }));
      expect(r.status).toBe('no-plans');
      expect(r.count).toBe(0);
      expect(r.plansCounted).toBe(0);
      expect(r.plansTotal).toBe(0);
      expect(r.lines).toEqual([{ label: 'Plan 1', amount: 0 }]);
      // Not checked either: its counts can be anything, as for a row at 0.
      expect(paydayAfterPlans({ ...EU, plans: [plan(0.004, 9, 2, 4)] }).status).toBe('no-plans');
      // Half a cent rounds to one whole cent, so it counts.
      expect(ok(paydayAfterPlans({ ...EU, plans: [plan(0.005, 2, 4, 1)] })).count).toBe(1);
    });

    it('a zero row is not checked: its counts can be anything', () => {
      const r = paydayAfterPlans({ ...US, plans: [plan(0, 9, 2, 4), plan(null, null, null, null)] });
      expect(r.status).toBe('no-plans');
    });

    it('Europe, living costs above the pay, no plans', () => {
      const input = { pay: 1200, living: 1210, savings: 0, plans: [] };
      expect(ok(paydayAfterPlans(input)).status).toBe('short-before-plans');
      expect(euSentence(input)).toBe('Living costs of €1,210 are €10 more than this pay of €1,200, before any plan.');
    });

    it('one plan on its last payment: nothing is owed after it', () => {
      const input = { ...EU, plans: [plan(30, 4, 4, 1)] };
      const r = ok(paydayAfterPlans(input));
      expect(r.owedIncluding).toBe(30);
      expect(r.owedAfter).toBe(0);
      expect(r.lastPayments).toBe(true);
      expect(euSentence(input)).toBe(
        'After living costs and 1 instalment, €366 is left of €1,200. The plan takes €30, 2.5% of this pay, and nothing is owed on it after this instalment.',
      );
    });

    it('one plan, payment 2 of 4', () => {
      expect(euSentence({ ...EU, plans: [plan(30, 2, 4, 1)] })).toBe(
        'After living costs and 1 instalment, €366 is left of €1,200. The plan takes €30, 2.5% of this pay, and €60 is still owed on it after this instalment.',
      );
    });

    it('one plan with its last 3 payments before the next pay', () => {
      const input = { ...EU, plans: [plan(30, 2, 4, 3)] };
      const r = ok(paydayAfterPlans(input));
      expect(r.lines).toEqual([{ label: 'Plan 1, 3 payments', amount: 90 }]);
      expect(r.left).toBe(306);
      expect(r.owedIncluding).toBe(90);
      expect(r.owedAfter).toBe(0);
      expect(euSentence(input)).toBe(
        'After living costs and 3 instalments, €306 is left of €1,200. The plan takes €90, 7.5% of this pay, and nothing is owed on it after these instalments.',
      );
    });

    it('a fourth plan that takes exactly what is left', () => {
      const input = { ...EU, plans: [...EU_PLANS, plan(306, 2, 4, 1)] };
      const r = ok(paydayAfterPlans(input));
      expect(r.left).toBe(0);
      expect(r.status).toBe('ok');
      expect(percent(r.share!, EN_IE, 1)).toBe('33.0%');
      expect(euSentence(input)).toBe(
        'After living costs and 4 instalments, nothing is left of €1,200. The plans take €396, 33.0% of this pay, and €792 is still owed on them after these instalments.',
      );
    });

    it('invalid rows and fields', () => {
      const plansError = (p: PlanInput) => paydayAfterPlans({ ...EU, plans: [p] });
      expect(plansError(plan(30, 2, 4, 4))).toEqual({ status: 'invalid', errors: { 'plans.0.d': 'due-too-many' } });
      expect(plansError(plan(30, 5, 4, 1))).toEqual({ status: 'invalid', errors: { 'plans.0.k': 'k-of-n' } });
      expect(plansError(plan(30, 2.5, 4, 1))).toEqual({ status: 'invalid', errors: { 'plans.0.k': 'k-of-n' } });
      expect(plansError(plan(30, 0, 4, 1))).toEqual({ status: 'invalid', errors: { 'plans.0.k': 'k-of-n' } });
      expect(plansError(plan(30, 2, 49, 1))).toEqual({ status: 'invalid', errors: { 'plans.0.n': 'k-of-n' } });
      expect(plansError(plan(30, null, 4, 1))).toEqual({ status: 'invalid', errors: { 'plans.0.k': 'k-of-n-missing' } });
      expect(plansError(plan(30, 2, null, 1))).toEqual({ status: 'invalid', errors: { 'plans.0.n': 'k-of-n-missing' } });
      expect(plansError(plan(30, 2, 4, 5))).toEqual({ status: 'invalid', errors: { 'plans.0.d': 'due' } });
      expect(plansError(plan(-30, 2, 4, 1))).toEqual({ status: 'invalid', errors: { 'plans.0.amount': 'below-zero' } });
      expect(plansError(plan(Number.NaN, 2, 4, 1))).toEqual({ status: 'invalid', errors: { 'plans.0.amount': 'nan' } });
      expect(paydayAfterPlans({ ...EU, living: -30 })).toEqual({ status: 'invalid', errors: { living: 'below-zero' } });
      expect(paydayAfterPlans({ ...EU, pay: 1e12 })).toEqual({ status: 'invalid', errors: { pay: 'too-big' } });
      expect(paydayAfterPlans({ ...EU, pay: Number.NaN })).toEqual({ status: 'invalid', errors: { pay: 'nan' } });
      expect(paydayAfterPlans({ ...EU, savings: 10_000_000.01 })).toEqual({ status: 'invalid', errors: { savings: 'too-big' } });
      const invalid = paydayAfterPlans({ ...EU, pay: Number.NaN });
      expect('left' in invalid).toBe(false);
      expect(paydaySentence(invalid, EN_IE, EU_WORDS)).toBe('A number above needs a change first: the note under it says what.');
    });

    it('no pay: blank or 0', () => {
      for (const pay of [null, 0]) {
        const r = paydayAfterPlans({ ...EU, pay });
        expect(r.status).toBe('no-pay');
        expect(ok(r).share).toBeNull();
        expect(paydaySentence(r, EN_IE, EU_WORDS)).toBe('Enter the pay arriving this payday to see what is left.');
      }
    });

    it('amounts with cents never drift', () => {
      const r = ok(paydayAfterPlans({ pay: 100, living: 0, savings: 0, plans: [plan(33.33, 2, 4, 1), plan(33.33, 2, 4, 1), plan(33.33, 2, 4, 1)] }));
      expect(100 - 33.33 * 3).not.toBe(0.01); // what plain floats give
      expect(r.plansTotal).toBe(99.99);
      expect(r.left).toBe(0.01);
      expect(r.owedIncluding).toBe(299.97);
      expect(r.owedAfter).toBe(199.98);
    });

    it('reads only the first 8 rows', () => {
      const r = ok(paydayAfterPlans({ ...EU, plans: Array.from({ length: 9 }, () => plan(30, 2, 4, 1)) }));
      expect(r.lines).toHaveLength(8);
      expect(r.plansTotal).toBe(240);
      expect(r.left).toBe(156);
      expect(r.count).toBe(8);
      expect(r.owedIncluding).toBe(720);
      expect(r.owedAfter).toBe(480);
    });

    it('formats the reader’s figures in the picker’s locale, and the fee in the edition’s', () => {
      expect(percent(0.075, PT_BR, 1)).toBe('7,5%');
      const sentence = euSentence(EU, PT_BR);
      expect(sentence).toContain('R$ 306');
      expect(sentence).toContain('R$ 1.200');
      expect(sentence).toContain('7,5%');
      expect(plainText(textParts(CONFIG.eu!.feeNote.text, CONFIG.eu!, EN_IE))).toContain('€15');
    });

    it('the Europe link after the #', () => {
      const query = linkQuery({ pay: '1200', living: '804', savings: '0' }, CONFIG.eu!.defaults.plans, 'en-IE');
      expect(query.plans).toBe('30~2~4~1|36~2~4~1|24~2~4~1');
      expect(new URLSearchParams(query).toString()).toBe(
        'pay=1200&living=804&savings=0&plans=30%7E2%7E4%7E1%7C36%7E2%7E4%7E1%7C24%7E2%7E4%7E1&cur=en-IE',
      );
    });

    it('the US link after the #', () => {
      const query = linkQuery({ pay: '1317', living: '817', savings: '132' }, CONFIG.us!.defaults.plans, 'en-US');
      expect(new URLSearchParams(query).toString()).toBe(
        'pay=1317&living=817&savings=132&plans=15%7E2%7E4%7E1%7C15%7E2%7E4%7E1%7C15%7E2%7E4%7E1&cur=en-US',
      );
    });
  });

  describe('words', () => {
    it('never moralises in any branch', () => {
      const inputs: PaydayInput[] = [
        EU,
        US,
        { ...EU, pay: 850 },
        { ...EU, pay: 800 },
        { ...US, pay: 700 },
        { ...US, plans: [] },
        { ...EU, plans: [plan(30, 4, 4, 1)] },
        { ...EU, pay: null },
        { ...EU, pay: Number.NaN },
      ];
      for (const input of inputs) {
        const text = paydaySentence(paydayAfterPlans(input), EN_IE, EU_WORDS);
        expect(text).not.toMatch(/\b(overspent|overspend|avoid|cut|should|free|must|bad|mistake)\b/i);
      }
    });

    it('left at 0 with no plans says nothing is left', () => {
      expect(euSentence({ pay: 1200, living: 1200, savings: 0, plans: [] })).toBe(
        'No pay-later payments are entered. After living costs, nothing is left of €1,200.',
      );
    });

    it('reads a field’s text strictly', () => {
      expect(readField('')).toBeNull();
      expect(readField('   ')).toBeNull();
      expect(readField(' 1200 ')).toBe(1200);
      expect(readField('30.5')).toBe(30.5);
      expect(readField('-30')).toBe(-30);
      expect(readField('1e12')).toBe(1e12);
      for (const text of ['abc', '0x1F', 'Infinity', '1,200', '€30', '-']) expect(readField(text), text).toBeNaN();
    });

    it('tells which link values a number input can show', () => {
      for (const text of ['', '0', '1200', '30.5', '.5', '-30', '1e3', '1E3', '2.5e-1', '007']) expect(showsInField(text), text).toBe(true);
      for (const text of ['abc', '0x10', 'Infinity', '-Infinity', 'NaN', '1e999', '+5', ' 5', '5.', '5 ', '1,200', '€30', '-', '.', 'e3']) {
        expect(showsInField(text), text).toBe(false);
      }
    });

    it('explains every error in words', () => {
      expect(errorText('pay', 'nan', EN_IE)).toBe('Enter a number.');
      expect(errorText('pay', 'below-zero', EN_IE)).toBe('Pay cannot be below 0.');
      expect(errorText('living', 'below-zero', EN_IE)).toBe('Living costs cannot be below 0.');
      expect(errorText('savings', 'below-zero', EN_IE)).toBe('Savings cannot be below 0.');
      expect(errorText('amount', 'below-zero', EN_IE)).toBe('A payment cannot be below 0.');
      expect(errorText('pay', 'too-big', EN_US)).toBe('Enter an amount up to 10,000,000.');
      expect(errorText('k', 'k-of-n-missing', EN_IE)).toBe(
        'Enter the payment number and the total as the plan shows them, for example payment 2 of 4.',
      );
      expect(errorText('n', 'k-of-n-missing', EN_IE)).toBe(errorText('k', 'k-of-n-missing', EN_IE));
      expect(errorText('k', 'k-of-n', EN_IE)).toBe('Payment number must be a whole number, no higher than the total.');
      expect(errorText('n', 'k-of-n', EN_IE)).toBe('A plan here can have from 1 to 48 payments.');
      expect(errorText('d', 'due-too-many', EN_IE, 3)).toBe('This plan has only 3 payments left, counting this one.');
      expect(errorText('d', 'due-too-many', EN_IE, 1)).toBe('This plan has only 1 payment left, counting this one.');
    });
  });
});
