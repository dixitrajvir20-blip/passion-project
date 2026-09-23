/**
 * Take-home pay: every pin of the revised spec (docs/research/interactive-tools-revised.json),
 * recomputed, plus the sentences, notes, checks and field copy the island prints.
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  CONFIG,
  epfNotes,
  epfShare,
  fieldCopy,
  checkLines,
  ficaNotes,
  countWords,
  needsCents,
  numberFieldValue,
  NUMBER_KEYS,
  parsePfOn,
  parseStartFrom,
  perMonth,
  rateText,
  ruleValue,
  statusSentence,
  takeHome,
  usualPaychecks,
  type EpfInput,
  type FicaInput,
  type TakeHomePayConfig,
  type TypedInput,
} from '../../../src/lib/tools/take-home-pay';
import { deductions, parsePayFrequency, shareOf, toCents } from '../../../src/lib/finance';
import { localeByCode, money, number, percentValue } from '../../../src/lib/format';
import { decodeLines } from '../../../src/lib/lines-link';

const IN = localeByCode('en-IN');
const EU = localeByCode('en-IE');
const US = localeByCode('en-US');

const inConfig = CONFIG.in as Extract<TakeHomePayConfig, { mode: 'epf' }>;
const euConfig = CONFIG.eu as Extract<TakeHomePayConfig, { mode: 'typed' }>;
const usConfig = CONFIG.us as Extract<TakeHomePayConfig, { mode: 'fica' }>;

const IN_RULES = { epfRate: 12, epfWageCeiling: 25000, professionalTaxYearCap: 2500 };
const US_RULES = { socialSecurityRate: 6.2, medicareRate: 1.45, socialSecurityWageBase: 184500, additionalMedicareThreshold: 200000, overtimeMultiplier: 1.5 };

const epf = (over: Partial<EpfInput> = {}): EpfInput => ({
  mode: 'epf',
  startFrom: 'ctc',
  start: 35000,
  otherEmployerCosts: 0,
  pfOn: 'all',
  pfWages: 17500,
  epfPrinted: null,
  employerEpfPrinted: null,
  professionalTax: 200,
  tds: 0,
  others: [],
  rules: IN_RULES,
  ...over,
});

const typed = (over: Partial<TypedInput> = {}): TypedInput => ({
  mode: 'typed',
  start: 1500,
  rows: [
    { label: 'Pension contribution', amount: 135 },
    { label: 'Health cover', amount: 135 },
    { label: 'Unemployment cover', amount: 30 },
    { label: 'Income tax', amount: 50 },
  ],
  employerOnTop: 300,
  ...over,
});

const fica = (over: Partial<FicaInput> = {}): FicaInput => ({
  mode: 'fica',
  start: 1600,
  hours: 80,
  hourlyRate: 20,
  overtimeHours: 0,
  socialSecurity: 99.2,
  medicare: 23.2,
  federal: 110,
  state: 50,
  others: [],
  paidEvery: 'fortnightly',
  rules: US_RULES,
  ...over,
});

describe('take-home-pay config', () => {
  it('has a config for each edition it is listed in', () => expect(Object.keys(CONFIG).sort()).toEqual(['eu', 'in', 'us']));

  it('binds India to EPF, Europe to typed lines and the US to FICA', () => {
    expect(inConfig.mode).toBe('epf');
    expect(euConfig.mode).toBe('typed');
    expect(usConfig.mode).toBe('fica');
  });

  it('keeps the rule values the maths uses equal to the spec', () => {
    const v = (key: string) => ruleValue(inConfig.rules, key);
    expect([v('epfRate'), v('epfReducedRate'), v('epfWageCeiling'), v('epfShareAtCeiling'), v('wagesHalfRule'), v('epfCoverageStaff'), v('professionalTaxYearCap')]).toEqual([
      12, 10, 25000, 3000, 50, 20, 2500,
    ]);
    const u = (key: string) => ruleValue(usConfig.rules, key);
    expect([u('socialSecurityRate'), u('medicareRate'), u('socialSecurityWageBase'), u('additionalMedicareRate'), u('additionalMedicareThreshold'), u('overtimeMultiplier'), u('overtimeWeeklyHours')]).toEqual([
      6.2, 1.45, 184500, 0.9, 200000, 1.5, 40,
    ]);
    expect(() => ruleValue(inConfig.rules, 'nope')).toThrow();
  });

  it('gives each rule a source and a checked date, with review dates where figures change', () => {
    for (const rule of [...inConfig.rules, ...usConfig.rules]) {
      expect(rule.source.url).toMatch(/^https:\/\//);
      expect(rule.asOf).toBe('2026-09-22');
    }
    for (const key of ['epfRate', 'epfWageCeiling', 'epfShareAtCeiling', 'wagesHalfRule', 'epfCoverageStaff', 'epfReducedRate']) {
      expect(inConfig.rules.find((r) => r.key === key)!.reviewBy).toBe('2027-03-22');
    }
    for (const key of ['socialSecurityRate', 'medicareRate', 'socialSecurityWageBase', 'additionalMedicareRate', 'additionalMedicareThreshold']) {
      expect(usConfig.rules.find((r) => r.key === key)!.reviewBy).toBe('2027-01-15');
    }
  });

  it('prints the rules line the spec lists, and keeps hint-only rules out of it', () => {
    expect(inConfig.rules.filter((r) => r.inLine !== false).map((r) => r.key)).toEqual(['epfRate', 'epfWageCeiling', 'epfShareAtCeiling', 'professionalTaxYearCap']);
    expect(usConfig.rules.filter((r) => r.inLine !== false).map((r) => r.key)).toEqual([
      'socialSecurityRate',
      'medicareRate',
      'socialSecurityWageBase',
      'additionalMedicareRate',
      'overtimeMultiplier',
    ]);
    expect(euConfig.rules).toBeUndefined();
  });

  it('opens on the lessons’ examples', () => {
    expect(inConfig.defaults).toMatchObject({ startFrom: 'ctc', start: '35000', otherEmployerCosts: '0', pfOn: 'all', pfWages: '17500', professionalTax: '200', tds: '0', others: '' });
    expect(decodeLines(euConfig.defaults.lines, 8).map((r) => [r.label, r.amount])).toEqual([
      ['Pension contribution', '135'],
      ['Health cover', '135'],
      ['Unemployment cover', '30'],
      ['Income tax', '50'],
    ]);
    expect(euConfig.defaults).toMatchObject({ start: '1500', employerOnTop: '300' });
    expect(usConfig.defaults).toMatchObject({ start: '1600', hours: '80', hourlyRate: '20', overtimeHours: '0', socialSecurity: '99.20', medicare: '23.20', federal: '110', state: '50', paidEvery: 'fortnightly' });
  });

  it('lists the terms the spec names for each edition, all in the glossary', () => {
    expect(inConfig.glossary).toEqual(['ctc', 'gross-pay', 'basic-pay', 'epf', 'eps', 'wage-ceiling', 'professional-tax', 'tds', 'esi', 'gratuity', 'in-hand-pay']);
    expect(euConfig.glossary).toEqual(['payslip', 'gross-pay', 'net-pay', 'social-contributions', 'employer-contributions']);
    // The employee's hourly wage, not 'hourly-rate', which defines a freelancer's price to a customer.
    expect(usConfig.glossary).toEqual(['pay-stub', 'gross-pay', 'fica', 'w-4', 'withholding', 'net-pay', 'hourly-wage']);
    for (const id of [...inConfig.glossary!, ...euConfig.glossary!, ...usConfig.glossary!]) {
      expect(existsSync(join(__dirname, '../../../src/content/glossary', `${id}.json`)), id).toBe(true);
    }
  });
});

describe('takeHome, India (epf)', () => {
  it('pin: the default CTC payslip', () => {
    const r = takeHome(epf());
    expect(r.lines.map((l) => l.amount)).toEqual([2100, 2100, 200, 0]);
    expect(r.running).toEqual([32900, 30800, 30600, 30600]);
    expect(r.net).toBe(30600);
    expect(r.deducted).toBe(4400);
    expect(r.lineCount).toBe(3);
    expect(r.fundTotal).toBe(4200);
    expect(r.netShare).toBe(87.4);
    expect(r.status).toBe('ok');
    expect(r.notes.halfRule).toBe(false);
    expect(r.notes.aboveCeiling).toBe(false);
    expect(r.gross).toBe(32900);
    expect(r.lines[0]).toMatchObject({ label: "Employer's EPF share", kind: 'employer-epf', subtotalLabel: 'Gross salary' });
    expect(r.lines.map((l) => l.kind)).toEqual(['employer-epf', 'your-epf', 'professional-tax', 'tds']);
  });

  it('pin: PF wages 17,504 give whole rupees, not ₹2,100.48', () => {
    const r = takeHome(epf({ pfWages: 17504 }));
    expect(r.yours).toBe(2100);
    expect(r.employer).toBe(2100);
    expect(epfShare(17504, 12)).toBe(2100);
  });

  it('pin: capped at the ₹25,000 ceiling', () => {
    const r = takeHome(epf({ start: 60000, pfOn: 'capped', pfWages: 30000 }));
    expect([r.yours, r.employer]).toEqual([3000, 3000]);
    expect(r.running).toEqual([57000, 54000, 53800, 53800]);
    expect(r.net).toBe(53800);
    expect(r.deducted).toBe(6200);
    expect(r.netShare).toBe(89.7);
    expect(r.notes.aboveCeiling).toBe(false);
    expect(r.capApplied).toBe(true);
  });

  it('pin: 12% of all PF wages above the ceiling', () => {
    const r = takeHome(epf({ start: 60000, pfOn: 'all', pfWages: 30000 }));
    expect([r.yours, r.employer]).toEqual([3600, 3600]);
    expect(r.running).toEqual([56400, 52800, 52600, 52600]);
    expect(r.net).toBe(52600);
    expect(r.netShare).toBe(87.7);
    expect(r.notes.aboveCeiling).toBe(true);
    expect(r.capApplied).toBe(false);
  });

  it('pin: starting from gross salary', () => {
    const r = takeHome(epf({ startFrom: 'gross', start: 32900 }));
    expect(r.lines.some((l) => l.kind === 'employer-epf')).toBe(false);
    expect(r.running).toEqual([30800, 30600, 30600]);
    expect(r.net).toBe(30600);
    expect(r.deducted).toBe(2300);
    expect(r.lineCount).toBe(2);
    expect(r.netShare).toBe(93.0);
    expect(r.fundTotal).toBe(2100);
  });

  it('pin: as printed, with the employer’s share assumed equal', () => {
    const r = takeHome(epf({ pfOn: 'printed', epfPrinted: 1800, employerEpfPrinted: null }));
    expect(r.employer).toBe(1800);
    expect(r.employerAssumed).toBe(true);
    expect(r.running).toEqual([33200, 31400, 31200, 31200]);
    expect(r.net).toBe(31200);
    expect(r.deducted).toBe(3800);
    expect(r.netShare).toBe(89.1);
    expect(r.fundTotal).toBe(3600);
  });

  it('as printed, with the employer’s share typed', () => {
    const r = takeHome(epf({ pfOn: 'printed', epfPrinted: 1800, employerEpfPrinted: 2000 }));
    expect([r.yours, r.employer, r.employerAssumed]).toEqual([1800, 2000, false]);
    expect(r.running).toEqual([33000, 31200, 31000, 31000]);
  });

  it('pin: no EPF line', () => {
    const r = takeHome(epf({ pfOn: 'none' }));
    expect(r.lines.map((l) => [l.label, l.amount])).toEqual([
      ['Professional tax', 200],
      ['TDS', 0],
    ]);
    expect(r.running).toEqual([34800, 34800]);
    expect(r.net).toBe(34800);
    expect(r.lineCount).toBe(1);
    expect(r.fundTotal).toBeNull();
    expect(r.netShare).toBe(99.4);
  });

  it('pin: gross ₹20,000 with an ESI line, under the half-of-pay line', () => {
    const r = takeHome(epf({ startFrom: 'gross', start: 20000, pfWages: 9000, others: [{ label: 'ESI', amount: 150 }] }));
    expect(r.yours).toBe(1080);
    expect(r.running).toEqual([18920, 18720, 18720, 18570]);
    expect(r.net).toBe(18570);
    expect(r.deducted).toBe(1430);
    expect(r.lineCount).toBe(3);
    expect(r.netShare).toBe(92.9);
    expect(r.notes.halfRule).toBe(true);
    expect(r.lines[3]).toMatchObject({ label: 'ESI', kind: 'other' });
  });

  it('pin: other parts of the CTC come off before the gross salary subtotal', () => {
    const r = takeHome(epf({ otherEmployerCosts: 850 }));
    expect(r.running).toEqual([32900, 32050, 29950, 29750, 29750]);
    expect(r.lines[0].subtotalLabel).toBeUndefined();
    expect(r.lines[1]).toMatchObject({ label: 'Other parts of the CTC', subtotalLabel: 'Gross salary', kind: 'other-ctc' });
    expect(r.gross).toBe(32050);
    expect(r.net).toBe(29750);
    expect(r.lineCount).toBe(4);
    expect(r.netShare).toBe(85.0);
    expect(r.fundTotal).toBe(4200);
  });

  it('pin: lines past a small gross hold the answer back', () => {
    const r = takeHome(epf({ startFrom: 'gross', start: 2000 }));
    expect(r.running).toEqual([-100, -300, -300]);
    expect(r.net).toBe(-300);
    expect(r.deducted).toBe(2300);
    expect(r.status).toBe('over');
    expect(r.netShare).toBeNull();
    expect(r.notes.pfWagesAbovePay).toBe(true);
  });

  it('flags blank PF wages, a blank printed line, and professional tax above ₹208 a month', () => {
    const blank = takeHome(epf({ pfWages: 0 }));
    expect(blank.notes.wagesBlank).toBe(true);
    expect([blank.yours, blank.employer]).toEqual([0, 0]);
    expect(blank.lines.map((l) => l.kind)).toEqual(['your-epf', 'professional-tax', 'tds']);
    expect(blank.fundTotal).toBeNull();

    const printed = takeHome(epf({ pfOn: 'printed', epfPrinted: null }));
    expect(printed.notes.printedBlank).toBe(true);
    expect([printed.yours, printed.employer]).toEqual([0, 0]);

    expect(takeHome(epf({ professionalTax: 208 })).notes.ptAboveMonthly).toBe(false);
    expect(takeHome(epf({ professionalTax: 300 })).notes.ptAboveMonthly).toBe(true);
    // A note about PF wages never fires when the tool is not working EPF out.
    expect(takeHome(epf({ startFrom: 'gross', start: 2000, pfOn: 'none' })).notes.pfWagesAbovePay).toBe(false);
  });

  it('treats a blank, zero or negative start as nothing typed yet', () => {
    for (const start of [0, -5, Number.NaN]) {
      const r = takeHome(epf({ start }));
      expect(r.status).toBe('no-start');
      expect(r.netShare).toBeNull();
    }
  });

  it('counts a negative line as 0, and keeps five other lines at most', () => {
    const r = takeHome(epf({ tds: -100, others: Array.from({ length: 7 }, (_, i) => ({ label: '', amount: 10 * (i + 1) })) }));
    expect(r.lines.find((l) => l.kind === 'tds')!.amount).toBe(0);
    const others = r.lines.filter((l) => l.kind === 'other');
    expect(others.map((l) => l.label)).toEqual(['Other line 1', 'Other line 2', 'Other line 3', 'Other line 4', 'Other line 5']);
  });

  it('allow-lists the two selects', () => {
    expect(parseStartFrom('gross')).toBe('gross');
    expect(parseStartFrom('net')).toBe('ctc');
    expect(parsePfOn('capped')).toBe('capped');
    expect(parsePfOn('__proto__')).toBe('all');
    expect(takeHome(epf({ pfOn: 'daily' as never })).pfOn).toBe('all');
  });
});

describe('takeHome, Europe (typed)', () => {
  it('pin: the lesson’s four lines and the employer’s contributions', () => {
    const r = takeHome(typed());
    expect(r.running).toEqual([1365, 1230, 1200, 1150]);
    expect(r.net).toBe(1150);
    expect(r.deducted).toBe(350);
    expect(r.lineCount).toBe(4);
    expect(r.impliedPercents).toEqual([9.0, 9.0, 2.0, 3.3]);
    expect(r.netShare).toBe(76.7);
    expect(r.employerCost).toBe(1800);
  });

  it('pin: employer contributions of 0 or blank hide the employer facts', () => {
    expect(takeHome(typed({ employerOnTop: 0 })).employerCost).toBeNull();
    expect(takeHome(typed({ employerOnTop: null })).employerCost).toBeNull();
    expect(takeHome(typed({ employerOnTop: null })).employerOnTop).toBeNull();
  });

  it('names a blank line, keeps eight at most, and gives no percentages without gross', () => {
    const r = takeHome(typed({ rows: Array.from({ length: 9 }, () => ({ label: ' ', amount: 1 })) }));
    expect(r.lines).toHaveLength(8);
    expect(r.lines[0].label).toBe('Line 1');
    expect(takeHome(typed({ start: 0 })).impliedPercents).toEqual([null, null, null, null]);
    expect(takeHome(typed({ start: 0 })).employerCost).toBeNull();
  });
});

describe('takeHome, United States (fica)', () => {
  it('pin: the default stub', () => {
    const r = takeHome(fica());
    expect(r.running).toEqual([1500.8, 1477.6, 1367.6, 1317.6]);
    expect(r.net).toBe(1317.6);
    expect(r.deducted).toBe(282.4);
    expect(r.lineCount).toBe(4);
    expect(r.netShare).toBe(82.4);
    expect(r.checks.socialSecurity).toEqual({ expected: 99.2, diff: 0, match: true });
    expect(r.checks.medicare).toEqual({ expected: 23.2, diff: 0, match: true });
    expect(r.checks.hours).toEqual({ expected: 1600, diff: 0, match: true });
    expect(r.employerMatch).toBe(122.4);
    expect(r.wageBaseNote).toBe(false);
    expect(r.n).toBe(26);
    expect(r.projection).toEqual({ year: 34257.6, usualCount: 2, usualMonth: 2635.2, monthsWithExtra: 2 });
  });

  it('pin: perMonth at 26, 24, 12, 52 and 27 paychecks', () => {
    expect(perMonth(1317.6, 26)).toEqual({ year: 34257.6, usualCount: 2, usualMonth: 2635.2, monthsWithExtra: 2 });
    expect(perMonth(1317.6, 24)).toEqual({ year: 31622.4, usualCount: 2, usualMonth: 2635.2, monthsWithExtra: 0 });
    expect(perMonth(1317.6, 12)).toEqual({ year: 15811.2, usualCount: 1, usualMonth: 1317.6, monthsWithExtra: 0 });
    expect(perMonth(1317.6, 52)).toEqual({ year: 68515.2, usualCount: 4, usualMonth: 5270.4, monthsWithExtra: 4 });
    expect(perMonth(1317.6, 27)).toEqual({ year: 35575.2, usualCount: 2, usualMonth: 2635.2, monthsWithExtra: 3 });
  });

  it('pin: shareOf in basis points, half up', () => {
    expect([
      shareOf(toCents(150), 6.2),
      shareOf(toCents(150), 1.45),
      shareOf(toCents(162.5), 6.2),
      shareOf(toCents(1050), 1.45),
      shareOf(toCents(1600), 6.2),
      shareOf(toCents(1600), 1.45),
    ]).toEqual([930, 218, 1008, 1523, 9920, 2320]);
  });

  it('pin: overtime at 1.5 times the rate', () => {
    expect(takeHome(fica({ overtimeHours: 4, start: 1720 })).checks.hours).toEqual({ expected: 1720, diff: 0, match: true });
  });

  it('pin: a sub-cent hours figure is a match within a cent', () => {
    expect(takeHome(fica({ hours: 37.5, hourlyRate: 15.35, start: 575.62 })).checks.hours).toEqual({ expected: 575.63, diff: -0.01, match: true });
  });

  it('pin: a gross line $50 above the hours', () => {
    expect(takeHome(fica({ start: 1650 })).checks.hours).toEqual({ expected: 1600, diff: 50, match: false });
  });

  it('pin: no FICA on the stub', () => {
    const r = takeHome(fica({ socialSecurity: 0, medicare: 0 }));
    expect(r.running).toEqual([1600, 1600, 1490, 1440]);
    expect(r.net).toBe(1440);
    expect(r.deducted).toBe(160);
    expect(r.lineCount).toBe(2);
    expect(r.netShare).toBe(90.0);
    expect(r.checks.socialSecurity).toMatchObject({ diff: -99.2, match: false });
    expect(r.checks.medicare).toMatchObject({ diff: -23.2, match: false });
    expect(r.employerMatch).toBeNull();
  });

  it('pin: the Social Security wage base over a year', () => {
    expect(takeHome(fica({ start: 7100 })).wageBaseNote).toBe(true);
    expect(takeHome(fica({ start: 7000 })).wageBaseNote).toBe(false);
    expect(takeHome(fica({ start: 7700 })).additionalMedicareNote).toBe(true);
    expect(takeHome(fica({ start: 7600 })).additionalMedicareNote).toBe(false);
  });

  it('pin: another line on the stub', () => {
    const r = takeHome(fica({ others: [{ label: 'State disability insurance', amount: 20.8 }] }));
    expect(r.running).toEqual([1500.8, 1477.6, 1367.6, 1317.6, 1296.8]);
    expect(r.net).toBe(1296.8);
    expect(r.deducted).toBe(303.2);
    expect(r.lineCount).toBe(5);
    expect(r.netShare).toBe(81.1);
  });

  it('pin: lines past a small gross', () => {
    const r = takeHome(fica({ start: 200 }));
    expect(r.running).toEqual([100.8, 77.6, -32.4, -82.4]);
    expect(r.net).toBe(-82.4);
    expect(r.status).toBe('over');
    expect(r.netShare).toBeNull();
    expect(r.projection).toBeNull();
  });

  it('hides the hours check when hours or rate is 0, and falls back to every two weeks', () => {
    expect(takeHome(fica({ hours: 0 })).checks.hours).toBeNull();
    expect(takeHome(fica({ hourlyRate: 0 })).checks.hours).toBeNull();
    const daily = takeHome(fica({ paidEvery: 'daily' }));
    expect(daily.paidEvery).toBe('fortnightly');
    expect(daily.n).toBe(26);
  });

  it('pin: parsePayFrequency', () => {
    expect(parsePayFrequency('daily', 'fortnightly')).toBe('fortnightly');
    expect(parsePayFrequency('weekly', 'fortnightly')).toBe('weekly');
  });
});

describe('shared money pins', () => {
  it('pin: toCents rounds the decimal as typed', () => {
    expect([toCents(575.625), toCents(1.005), toCents(-2.5), toCents(Number.NaN)]).toEqual([57563, 101, -250, 0]);
  });

  it('pin: display formats', () => {
    expect(number(82.4, US, 1) + '%').toBe('82.4%');
    expect(number(87.4, IN, 1) + '%').toBe('87.4%');
    expect(number(93, IN, 1) + '%').toBe('93.0%');
    expect(money(1600, US, 2)).toBe('$1,600.00');
    expect(money(-300, IN, 0)).toBe('−₹300');
    // The island uses percentValue, which prints the same.
    expect([percentValue(82.4, US, 1), percentValue(87.4, IN, 1), percentValue(93, IN, 1)]).toEqual(['82.4%', '87.4%', '93.0%']);
  });

  it('pin: deductions() unchanged after the move to cents', () => {
    const a = deductions(35000, [
      { label: 'a', amount: 2100 },
      { label: 'b', amount: 2100 },
      { label: 'c', amount: 200 },
    ]);
    expect(a.running).toEqual([32900, 30800, 30600]);
    expect(a.deducted).toBe(4400);
    const b = deductions(1600, [
      { label: 'a', amount: 99.2 },
      { label: 'b', amount: 23.2 },
    ]);
    expect(b.running).toEqual([1500.8, 1477.6]);
    expect(b.net).toBe(1477.6);
  });
});

describe('the words', () => {
  const inWords = { locale: IN, cents: false };
  const euWords = { locale: EU, cents: false };
  const usWords = { locale: US, cents: true };

  it('says the spec’s three examples at the defaults', () => {
    expect(statusSentence(takeHome(epf()), inWords)).toBe(
      'Of a monthly CTC of ₹35,000, ₹30,600 reaches your account: 87.4% of it. ₹4,400 comes off in three lines, and ₹4,200 of that goes into the provident fund and pension scheme for you.',
    );
    expect(statusSentence(takeHome(typed()), euWords)).toBe(
      'Of gross pay of €1,500 this month, €1,150 reaches your account: 76.7% of it. €350 comes off in four lines. Your employer pays €300 on top, so the job costs it €1,800.',
    );
    expect(statusSentence(takeHome(fica()), usWords)).toBe(
      'Of gross pay of $1,600.00 on this paycheck, $1,317.60 reaches your account: 82.4% of it. $282.40 comes off in four lines. If every paycheck matched this one, 26 paychecks make $34,257.60 a year; most months hold two, $2,635.20, and usually two months a year hold a third.',
    );
  });

  it('says each India ending', () => {
    expect(statusSentence(takeHome(epf({ startFrom: 'gross', start: 32900 })), inWords)).toBe(
      'Of a gross salary of ₹32,900, ₹30,600 reaches your account: 93.0% of it. ₹2,300 comes off in two lines, and ₹2,100 of that is your own EPF share, kept in a fund in your name. Your employer adds its own share outside this sum.',
    );
    expect(statusSentence(takeHome(epf({ pfOn: 'none' })), inWords)).toBe(
      'Of a monthly CTC of ₹35,000, ₹34,800 reaches your account: 99.4% of it. ₹200 comes off in one line.',
    );
  });

  it('says the Europe sentence without the employer when there is none', () => {
    expect(statusSentence(takeHome(typed({ employerOnTop: null })), euWords)).toBe(
      'Of gross pay of €1,500 this month, €1,150 reaches your account: 76.7% of it. €350 comes off in four lines.',
    );
  });

  it('says each US pay frequency', () => {
    const at = (paidEvery: string) => statusSentence(takeHome(fica({ paidEvery })), usWords).split('four lines. ')[1];
    expect(at('weekly')).toBe('If every paycheck matched this one, 52 paychecks make $68,515.20 a year; most months hold four, $5,270.40, and usually four months a year hold a fifth.');
    expect(at('twice-monthly')).toBe('If every paycheck matched this one, 24 paychecks make $31,622.40 a year, two in every month, $2,635.20.');
    expect(at('monthly')).toBe('If every paycheck matched this one, 12 paychecks make $15,811.20 a year, one each month.');
  });

  it('says what to do with no start, lines past the start, lines equal to it, and no lines', () => {
    expect(statusSentence(takeHome(epf({ start: 0 })), inWords)).toBe('Type the top figure on your payslip, the monthly CTC, to see what reaches your account.');
    expect(statusSentence(takeHome(typed({ start: 0 })), euWords)).toBe('Type the top figure on your payslip, the gross pay, to see what reaches your account.');
    expect(statusSentence(takeHome(fica({ start: 0 })), usWords)).toBe('Type the gross pay from your pay stub to see what reaches your account.');
    expect(statusSentence(takeHome(epf({ startFrom: 'gross', start: 2000 })), inWords)).toBe(
      'These lines add up to ₹2,300, more than the gross salary of ₹2,000. Check each one against your payslip; the answer is held back until they fit.',
    );
    expect(statusSentence(takeHome(typed({ start: 350 })), euWords)).toBe(
      'These lines add up to the whole gross pay of €350, so nothing would reach your account. Check each one against your payslip.',
    );
    expect(statusSentence(takeHome(epf({ pfOn: 'none', professionalTax: 0 })), inWords)).toBe(
      'Of a monthly CTC of ₹35,000, all of it reaches your account, because every line is 0. Check that against your payslip.',
    );
  });

  it('calls the US document a pay stub in every branch', () => {
    expect(statusSentence(takeHome(fica({ start: 200 })), usWords)).toBe(
      'These lines add up to $282.40, more than the gross pay of $200.00. Check each one against your pay stub; the answer is held back until they fit.',
    );
    expect(statusSentence(takeHome(fica({ start: 282.4 })), usWords)).toBe(
      'These lines add up to the whole gross pay of $282.40, so nothing would reach your account. Check each one against your pay stub.',
    );
    expect(statusSentence(takeHome(fica({ socialSecurity: 0, medicare: 0, federal: 0, state: 0 })), usWords)).toBe(
      'Of gross pay of $1,600.00 on this paycheck, all of it reaches your account, because every line is 0. Check that against your pay stub.',
    );
    for (const result of [takeHome(fica({ start: 0 })), takeHome(fica({ start: 200 })), takeHome(fica({ start: 282.4 })), takeHome(fica())]) {
      expect(statusSentence(result, usWords)).not.toContain('payslip');
    }
  });

  it('never prints 100.0% while money comes off, or 0.0% while some arrives', () => {
    expect(statusSentence(takeHome(epf({ start: 500000, pfOn: 'none', professionalTax: 200 })), inWords)).toBe(
      'Of a monthly CTC of ₹5,00,000, ₹4,99,800 reaches your account: almost all of it. ₹200 comes off in one line.',
    );
    expect(statusSentence(takeHome(fica({ start: 1_000_000_000, hours: 0 })), usWords)).toContain('reaches your account: almost all of it. $282.40 comes off');
    expect(statusSentence(takeHome(typed({ start: 1_000_000, rows: [{ label: 'Income tax', amount: 999_999 }], employerOnTop: null })), euWords)).toBe(
      'Of gross pay of €1,000,000 this month, €1 reaches your account: almost none of it. €999,999 comes off in one line.',
    );
    // Just under the edge, the figure stays.
    expect(statusSentence(takeHome(epf({ start: 100000, pfOn: 'none', professionalTax: 200 })), inWords)).toContain('99.8% of it');
  });

  it('counts lines in words to ten, then in digits', () => {
    expect([countWords(1), countWords(3), countWords(10), countWords(11)]).toEqual(['one', 'three', 'ten', '11']);
    expect(usualPaychecks('fortnightly')).toBe('two paychecks');
    expect(usualPaychecks('weekly')).toBe('four paychecks');
    expect(usualPaychecks('twice-monthly')).toBe('two paychecks');
    expect(usualPaychecks('monthly')).toBe('one paycheck');
  });

  it('uses two decimals in the US always, and elsewhere only when a figure has cents', () => {
    expect(needsCents(takeHome(fica()))).toBe(true);
    expect(needsCents(takeHome(epf()))).toBe(false);
    expect(needsCents(takeHome(epf({ tds: 12.5 })))).toBe(true);
    expect(needsCents(takeHome(typed()))).toBe(false);
    expect(needsCents(takeHome(typed({ employerOnTop: 300.5 })))).toBe(true);
    expect(needsCents(takeHome(epf()), [17500.25])).toBe(true);
  });
});

describe('the US checks, never the word error', () => {
  const words = { locale: US, cents: true };
  const lines = (over: Partial<FicaInput> = {}) => {
    const input = fica(over);
    return checkLines(takeHome(input), input, words);
  };

  it('match the stub at the defaults', () => {
    expect(lines()).toEqual([
      'Hours: 80 at $20.00 is $1,600.00, the same as the gross line.',
      'Social Security: 6.2% of $1,600.00 is $99.20, the same as the stub.',
      'Medicare: 1.45% of $1,600.00 is $23.20, the same as the stub.',
    ]);
  });

  it('name overtime, at the rate the sum uses, part-cent and all', () => {
    expect(lines({ overtimeHours: 4, start: 1720 })[0]).toBe('Hours: 80 at $20.00, plus 4 overtime hours at $30.00, is $1,720.00, the same as the gross line.');
    // 37.5 × $15.35 + 4 × $23.025 = $575.625 + $92.10 = $667.725, which rounds half up to $667.73.
    expect(lines({ hours: 37.5, hourlyRate: 15.35, overtimeHours: 4, start: 667.73 })[0]).toBe(
      'Hours: 37.5 at $15.35, plus 4 overtime hours at $23.025, is $667.73, the same as the gross line.',
    );
  });

  it('prints a rate with the decimals it has, two to four', () => {
    expect([rateText(20, US), rateText(15.35, US), rateText(15.35 * 1.5, US), rateText(15.3333, US), rateText(15.33333, US)]).toEqual([
      '$20.00',
      '$15.35',
      '$23.025',
      '$15.3333',
      '$15.3333',
    ]);
  });

  it('send a difference to payroll with the lawful reasons first', () => {
    expect(lines({ start: 1650 })[0]).toBe(
      'Hours: 80 at $20.00 is $1,600.00; the gross line is $1,650.00, $50.00 more. Overtime, tips, a second rate or a bonus can explain a difference. If none applies, ask payroll, with your shift notes and your offer.',
    );
    expect(lines({ start: 1550 })[0]).toContain('the gross line is $1,550.00, $50.00 less.');
    const noFica = lines({ socialSecurity: 0 });
    expect(noFica[1]).toBe(
      'Social Security: 6.2% of $1,600.00 is $99.20; the stub shows $0.00. A pre-tax health plan lowers the pay this is worked on; students working for their own school, under-18s working in a business owned only by a parent, and some international students on F-1 or J-1 student visas pay none. Payroll can say which applies.',
    );
    for (const text of [...lines({ start: 1650 }), ...noFica, ...lines({ start: 200 })]) expect(text).not.toMatch(/error/i);
  });

  it('accept payroll’s sub-cent rounding, say a cent apart when it is, and hide the hours check without hours', () => {
    expect(lines({ hours: 37.5, hourlyRate: 15.35, start: 575.62 })[0]).toBe(
      'Hours: 37.5 at $15.35 is $575.63; the gross line is $575.62, a cent apart, which is how payroll rounds part of a cent.',
    );
    expect(lines({ hours: 37.5, hourlyRate: 15.35, start: 575.63 })[0]).toBe('Hours: 37.5 at $15.35 is $575.63, the same as the gross line.');
    expect(lines({ start: 162.5, socialSecurity: 10.07, medicare: 2.36, hours: 0 })).toEqual([
      'Social Security: 6.2% of $162.50 is $10.08; the stub shows $10.07, a cent apart, which is how payroll rounds part of a cent.',
      'Medicare: 1.45% of $162.50 is $2.36, the same as the stub.',
    ]);
    // Two cents is a difference, with the lawful reasons first.
    expect(lines({ start: 162.5, socialSecurity: 10.06, medicare: 2.36, hours: 0 })[0]).toMatch(/^Social Security: 6\.2% of \$162\.50 is \$10\.08; the stub shows \$10\.06\. A pre-tax health plan/);
    expect(lines({ hours: 0 })).toHaveLength(2);
    expect(lines({ start: 0 })).toEqual([]);
  });
});

describe('the notes', () => {
  const inRules = { epfWageCeiling: 25000, epfShareAtCeiling: 3000, professionalTaxYearCap: 2500 };
  const usRules = { socialSecurityWageBase: 184500, additionalMedicareRate: 0.9, additionalMedicareThreshold: 200000 };

  it('say nothing at the India defaults, and each India note when it applies', () => {
    expect(epfNotes(takeHome(epf()), inRules, IN)).toEqual([]);
    expect(epfNotes(takeHome(epf({ pfWages: 0 })), inRules, IN)).toEqual(['No EPF worked out: type PF wages above 0.']);
    expect(epfNotes(takeHome(epf({ pfOn: 'printed', epfPrinted: null })), inRules, IN)).toEqual(['Type your EPF line as printed.']);
    expect(epfNotes(takeHome(epf({ startFrom: 'gross', start: 2000 })), inRules, IN)).toEqual([
      'PF wages are part of your pay, so they are rarely above the gross salary; check the breakup.',
    ]);
    expect(epfNotes(takeHome(epf({ startFrom: 'gross', start: 20000, pfWages: 9000 })), inRules, IN)[0]).toMatch(/^PF wages here are under half of the gross salary\. .*may be higher/);
    expect(epfNotes(takeHome(epf({ start: 60000, pfWages: 30000 })), inRules, IN)[0]).toBe(
      'PF wages are above the ₹25,000 ceiling. Above it the contribution is voluntary, so an employer may cap both shares there, at ₹3,000 each; if your payslip does, choose “12% of PF wages up to the ₹25,000 ceiling”.',
    );
    expect(epfNotes(takeHome(epf({ professionalTax: 300 })), inRules, IN)).toEqual([
      'Professional tax is capped at ₹2,500 a year, about ₹208 a month; some states charge more in one month to reach the cap. Check the line against your payslip.',
    ]);
  });

  it('warn about the wage base, and add the extra Medicare above $200,000', () => {
    expect(ficaNotes(takeHome(fica()), usRules, US)).toEqual([]);
    expect(ficaNotes(takeHome(fica({ start: 7100 })), usRules, US)).toEqual([
      "At this pay, a year's wages would pass $184,500, where Social Security stops (IRS Topic 751), so later stubs in the year may show none.",
    ]);
    expect(ficaNotes(takeHome(fica({ start: 7700 })), usRules, US)).toEqual([
      "At this pay, a year's wages would pass $184,500, where Social Security stops (IRS Topic 751), so later stubs in the year may show none, and above $200,000 an extra 0.9% of Medicare is withheld.",
    ]);
  });
});

describe('the field copy', () => {
  const ACRONYMS: Record<string, string> = {
    CTC: 'cost to company',
    EPF: 'employees’ provident fund',
    TDS: 'tax deducted at source',
    ESI: 'employees’ state insurance',
    DA: 'dearness allowance',
    FICA: 'social security and medicare',
    'W-4': 'withholding form',
    PF: 'provident fund',
  };
  const editions: [string, TakeHomePayConfig, ReturnType<typeof localeByCode>][] = [
    ['in', inConfig, IN],
    ['eu', euConfig, EU],
    ['us', usConfig, US],
  ];

  for (const [edition, config, locale] of editions) {
    it(`${edition}: every acronym a reader meets is expanded in that field or is one of the page’s terms`, () => {
      const glossary = new Set(config.glossary ?? []);
      for (const [key, copy] of Object.entries(fieldCopy(config, locale))) {
        const text = [copy.label, copy.hint ?? '', ...(copy.options ?? []).map((o) => o.label)].join(' ');
        const plain = text.toLowerCase().replace(/'/g, '’');
        for (const acronym of text.match(/\bW-4\b|\b[A-Z]{2,}\b/g) ?? []) {
          expect(Object.keys(ACRONYMS), `${edition}.${key}: "${acronym}" is not a known acronym`).toContain(acronym);
          const expanded = plain.includes(ACRONYMS[acronym]);
          const defined = glossary.has(acronym.toLowerCase());
          expect(expanded || defined, `${edition}.${key}: "${acronym}" is neither expanded nor in the terms`).toBe(true);
        }
      }
    });
  }

  it('prints the rule values in the India hints, and the lesson’s examples', () => {
    const copy = fieldCopy(inConfig, IN);
    expect(copy.pfOn.options!.map((o) => o.label)).toEqual(['12% of all PF wages', '12% of PF wages up to the ₹25,000 ceiling', 'As printed on my payslip', 'No EPF line on this payslip']);
    expect(copy.pfOn.hint).toContain('fewer than 20 staff');
    // PF is expanded in the hint of the first field whose options print it.
    expect(copy.pfOn.hint).toMatch(/^EPF, the Employees’ Provident Fund, often printed as PF \(provident fund\)\./);
    expect(copy.pfOn.hint).not.toContain('voluntary;');
    expect(copy.pfOn.hint).toContain('use 10%');
    expect(copy.professionalTax.hint).toBe('A state tax on jobs. Some states charge none, and the Constitution caps it at ₹2,500 a year. ₹200 is an example.');
    expect(copy.startCtc.label).toBe('Monthly CTC');
    expect(copy.startGross.label).toBe('Gross salary this month');
    expect(copy.startFrom.options!.map((o) => o.value)).toEqual(['ctc', 'gross']);
  });

  it('prints the rule values in the US hints', () => {
    const copy = fieldCopy(usConfig, US);
    expect(copy.overtimeHours.hint).toBe('Hours over 40 in a week, paid at least 1.5 times the rate under federal law. 0 if none.');
    expect(copy.socialSecurity.hint).toContain('against 6.2% of gross');
    expect(copy.medicare.hint).toContain('against 1.45% of gross');
    expect(copy.federal.hint).toContain('$110 is this stub’s figure.');
    expect(copy.paidEvery.options!.map((o) => o.value)).toEqual(['weekly', 'fortnightly', 'twice-monthly', 'monthly']);
    expect(copy.start.label).toBe('Gross pay on this paycheck');
    expect(fieldCopy(euConfig, EU).start.label).toBe('Gross pay this month');
  });
});

describe('a link value a number field cannot show', () => {
  it('is rewritten as the figure the sum uses, or blanked when there is none', () => {
    expect(numberFieldValue('35,000')).toBe('35000');
    expect(numberFieldValue('0x10')).toBe('10');
    expect(numberFieldValue('+5')).toBe('5');
    expect(numberFieldValue('5.')).toBe('5');
    expect(numberFieldValue(' 1500 ')).toBe('1500');
    expect(numberFieldValue('abc')).toBe('');
    expect(numberFieldValue('--')).toBe('');
  });

  it('keeps what a number field already shows as it is', () => {
    for (const v of ['', '0', '1500', '99.20', '.5', '-200', '1e5', '1E+5', '37.5']) expect(numberFieldValue(v), v).toBe(v);
  });

  it('covers every number field of each mode, and no select', () => {
    expect(NUMBER_KEYS.epf).not.toContain('startFrom');
    expect(NUMBER_KEYS.epf).not.toContain('pfOn');
    expect(NUMBER_KEYS.fica).not.toContain('paidEvery');
    expect([...NUMBER_KEYS.typed]).toEqual(['start', 'employerOnTop']);
    expect(NUMBER_KEYS.fica).toHaveLength(8);
    expect(NUMBER_KEYS.epf).toHaveLength(7);
  });
});
