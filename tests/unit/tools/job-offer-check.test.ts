/**
 * Job offers: spot the fake. The rules this drill adds beyond tests/unit/drills.test.ts: the six
 * situations per edition in their fixed order (the lesson's three, then the bank's), where the
 * ordinary cases sit and where the right answers sit, which way money moves in each, the reveal
 * wording (crime words only where money passes through the reader's account, short whys), the
 * per-edition names no screen may carry, the figures the screens print, and the return line's date.
 *
 * Pins from docs/research/interactive-tools-revised.json (job-offer-check), recomputed here.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BANK_SCENARIO_ID, drillBankSchema, type DrillBankData, type DrillScreen } from '../../../src/content/schema';
import { mergeDrill, type DrillSituation } from '../../../src/lib/drill-merge';
import { toolBySlug, toolsFor } from '../../../src/lib/tools';
import { localeByCode, money } from '../../../src/lib/format';
import { dayString, nextReturnAmong, type Progress } from '../../../src/lib/progress';
import { acronymsIn, loadLessonFrontmatter, words } from '../content-rules';

const SLUG = 'job-offer-check';
const EDITIONS = ['in', 'eu', 'us'] as const;
type Edition = (typeof EDITIONS)[number];
const LOCALE: Record<Edition, string> = { in: 'en-IN', eu: 'en-IE', us: 'en-US' };
const DRILLS = join(__dirname, '../../../src/content/drills');
const GLOSSARY = join(__dirname, '../../../src/content/glossary');

function loadBank(edition: Edition): DrillBankData {
  const raw = JSON.parse(readFileSync(join(DRILLS, edition, `${SLUG}.json`), 'utf8'));
  return drillBankSchema.parse(raw);
}

const banks = Object.fromEntries(EDITIONS.map((e) => [e, loadBank(e)])) as Record<Edition, DrillBankData>;

function merged(edition: Edition, bank: DrillBankData = banks[edition]): DrillSituation[] {
  const lesson = loadLessonFrontmatter(bank.fromLesson);
  if (!lesson || lesson.explorable?.kind !== 'drill') throw new Error(`${bank.fromLesson} has no drill`);
  return mergeDrill(edition, SLUG, bank.fromLesson, lesson.explorable.scenarios, bank.scenarios);
}

/** The set rule this tool is built to: six situations, exactly two ordinary, unique ids, answers in range. */
function setProblems(set: DrillSituation[]): string[] {
  const problems: string[] = [];
  if (set.length !== 6) problems.push('needs 6 situations');
  if (set.filter((s) => s.ordinary).length !== 2) problems.push('needs exactly 2 ordinary');
  if (new Set(set.map((s) => s.checkId)).size !== set.length) problems.push('duplicate check id');
  if (set.some((s) => s.check.answer < 0 || s.check.answer >= s.check.options.length)) problems.push('answer out of range');
  return problems;
}

/** What checks.json writes as a drill situation's review context (src/pages/[region]/checks.json.ts). */
function drillContext(screen: DrillScreen, localeCode: string): string {
  const locale = localeByCode(localeCode);
  return [
    `${screen.from}:`,
    screen.amount === undefined ? '' : money(screen.amount, locale, Number.isInteger(screen.amount) ? 0 : 2),
    ...screen.lines,
    screen.action ? `[${screen.action}]` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

const screenTexts = (s: DrillSituation) => [s.screen.from, ...s.screen.lines, s.screen.action ?? ''].filter(Boolean);
const scenarioById = (edition: Edition, id: string) => banks[edition].scenarios.find((s) => s.id === id)!;

describe('job-offer-check: registry and banks', () => {
  it('is a drill in the scams group, in all three editions', () => {
    const tool = toolBySlug(SLUG)!;
    expect(tool.format).toBe('drill');
    expect(tool.group).toBe('scams');
    expect(tool.title).toBe('Job offers: spot the fake');
    for (const edition of EDITIONS) expect(toolsFor(edition).map((t) => t.slug)).toContain(SLUG);
  });

  it('takes its first three situations from the lesson each edition teaches the pattern in', () => {
    expect(banks.in.fromLesson).toBe('in/protect-your-money/money-mule');
    expect(banks.eu.fromLesson).toBe('eu/credit-and-fraud/money-mule');
    expect(banks.us.fromLesson).toBe('us/how-business-works/job-scam');
  });

  it('has three situations of its own in each edition, cited to at least one source each', () => {
    for (const edition of EDITIONS) {
      const bank = banks[edition];
      expect(bank.scenarios).toHaveLength(3);
      for (const s of bank.scenarios) expect(s.sourceIds.length, `${edition}#${s.id}`).toBeGreaterThanOrEqual(1);
      for (const source of bank.sources) expect(source.url.startsWith('https://'), source.url).toBe(true);
    }
  });

  it('cites each situation to a source that says what the situation turns on', () => {
    // Hired by text with no call, then asked for bank details: the FTC's remote-job alert (13 Nov 2023)
    // says this; its job-scams page does not mention interviews, so no title may claim it does.
    const textInterview = scenarioById('us', 'text-interview');
    expect(textInterview.sourceIds).toContain('ftc-remote-job-alert');
    expect(textInterview.sourceIds).not.toContain('ftc-job-scams');
    expect(scenarioById('us', 'fake-check').sourceIds).toContain('ftc-job-scams');
    for (const edition of EDITIONS) {
      for (const source of banks[edition].sources) expect(source.title, source.id).not.toMatch(/interview before they hire/i);
    }
    // The reveal must point at what the reader can see: in India the text message, not an unseen letter.
    const internship = scenarioById('in', 'internship-offer');
    expect(internship.check.options[2].why).toMatch(/^The message asks for them in person\./);
    // The fake check's question means the bank the check went into, not the payment app on the screen.
    expect(scenarioById('us', 'fake-check').check.q).toContain('banking app');
  });

  it('opens with the same intro and reflection in every edition, and gives no count of ordinary cases', () => {
    for (const edition of EDITIONS) {
      expect(banks[edition].intro).toBe(
        'Six messages about work. Some are ordinary jobs, so refusing everything is not the skill. Decide, then look.',
      );
      expect(banks[edition].reflection).toBe('Which message were you least sure of, and which way would the money have moved?');
      // Knowing how many are ordinary lets a reader refuse the rest once they have found them.
      expect(banks[edition].intro).not.toMatch(/\b(one|two|three|four|five|six|\d+)\s+(?:is|are)\s+(?:an?\s+)?ordinary\b/i);
    }
  });

  it('lists the terms each page defines, and every one exists', () => {
    expect(banks.in.glossary).toEqual(['money-mule', 'pan']);
    expect(banks.eu.glossary).toEqual(['money-mule', 'iban']);
    expect(banks.us.glossary).toEqual(['ftc', 'task-scam', 'reshipping', 'w-4', 'form-i-9', 'fake-check', 'identity-theft']);
    for (const edition of EDITIONS) {
      for (const id of banks[edition].glossary) expect(existsSync(join(GLOSSARY, `${id}.json`)), id).toBe(true);
    }
  });
});

describe('job-offer-check: the six situations (pins)', () => {
  it('India: the lesson’s three, then internship-offer, premium-tasks, joining-kit', () => {
    const set = merged('in');
    expect(set.map((s) => s.checkId)).toEqual([
      'in/protect-your-money/money-mule#d1',
      'in/protect-your-money/money-mule#d2',
      'in/protect-your-money/money-mule#d3',
      'in/tools/job-offer-check#internship-offer',
      'in/tools/job-offer-check#premium-tasks',
      'in/tools/job-offer-check#joining-kit',
    ]);
    expect(set.map((s) => s.ordinary)).toEqual([false, true, false, true, false, false]);
    expect(set.map((s) => s.check.answer)).toEqual([1, 1, 1, 0, 2, 1]);
    expect(setProblems(set)).toEqual([]);
  });

  it('Europe: the lesson’s three, then payment-agent, apprenticeship, account-for-hire', () => {
    const set = merged('eu');
    expect(set.map((s) => s.checkId)).toEqual([
      'eu/credit-and-fraud/money-mule#d1',
      'eu/credit-and-fraud/money-mule#d2',
      'eu/credit-and-fraud/money-mule#d3',
      'eu/tools/job-offer-check#payment-agent',
      'eu/tools/job-offer-check#apprenticeship',
      'eu/tools/job-offer-check#account-for-hire',
    ]);
    expect(set.map((s) => s.ordinary)).toEqual([false, true, false, false, true, false]);
    expect(set.map((s) => s.check.answer)).toEqual([1, 0, 1, 0, 2, 1]);
    expect(setProblems(set)).toEqual([]);
  });

  it('United States: the lesson’s three, then fake-check, text-interview, campus-job', () => {
    const set = merged('us');
    expect(set.map((s) => s.checkId)).toEqual([
      'us/how-business-works/job-scam#d1',
      'us/how-business-works/job-scam#d2',
      'us/how-business-works/job-scam#d3',
      'us/tools/job-offer-check#fake-check',
      'us/tools/job-offer-check#text-interview',
      'us/tools/job-offer-check#campus-job',
    ]);
    expect(set.map((s) => s.ordinary)).toEqual([false, true, false, false, false, true]);
    expect(set.map((s) => s.check.answer)).toEqual([1, 1, 1, 2, 0, 0]);
    expect(setProblems(set)).toEqual([]);
  });

  it('the set rule catches a lost ordinary case and a missing situation', () => {
    const noOrdinary = { ...banks.in, scenarios: banks.in.scenarios.map((s) => (s.id === 'internship-offer' ? { ...s, ordinary: false } : s)) };
    expect(setProblems(merged('in', noOrdinary))).toEqual(['needs exactly 2 ordinary']);
    const short = { ...banks.in, scenarios: banks.in.scenarios.filter((s) => s.id !== 'joining-kit') };
    expect(setProblems(merged('in', short))).toContain('needs 6 situations');
  });

  it('puts the new ordinary case at a different position in each edition (4, 5, 6)', () => {
    const positions = EDITIONS.map((e) => merged(e).findIndex((s, i) => i >= 3 && s.ordinary) + 1);
    expect(positions).toEqual([4, 5, 6]);
    // The lesson's own ordinary screen is always the second.
    for (const edition of EDITIONS) expect(merged(edition).map((s) => s.ordinary).slice(0, 3)).toEqual([false, true, false]);
  });

  it('varies where the right answer sits within each bank, so "always the second" never works', () => {
    expect(banks.in.scenarios.map((s) => s.check.answer)).toEqual([0, 2, 1]);
    expect(banks.eu.scenarios.map((s) => s.check.answer)).toEqual([0, 2, 1]);
    expect(banks.us.scenarios.map((s) => s.check.answer)).toEqual([2, 0, 0]);
    for (const edition of EDITIONS) expect(new Set(banks[edition].scenarios.map((s) => s.check.answer)).size).toBeGreaterThan(1);
  });

  it('gives each bank id a review key that can never be read as a quiz or a lesson drill', () => {
    const ids = EDITIONS.flatMap((e) => banks[e].scenarios.map((s) => s.id));
    expect(ids).toHaveLength(9);
    for (const id of ids) expect(BANK_SCENARIO_ID.test(id), id).toBe(true);
    for (const bad of ['qr-offer', 'ab', ' ab']) expect(BANK_SCENARIO_ID.test(bad), bad).toBe(false);
    const isQuizCheck = (id: string) => /#q\d+$/.test(id);
    expect(['in/a#q1', 'in/a#q12', 'in/tools/job-offer-check#qr-offer', 'in/tools/job-offer-check#premium-tasks'].map(isQuizCheck)).toEqual([
      true,
      true,
      false,
      false,
    ]);
    for (const edition of EDITIONS) for (const s of merged(edition)) expect(isQuizCheck(s.checkId), s.checkId).toBe(false);
  });
});

describe('job-offer-check: which way the money moves, and how the reveals say it', () => {
  it('records the direction of every situation of its own', () => {
    const flows = Object.fromEntries(EDITIONS.flatMap((e) => banks[e].scenarios.map((s) => [s.id, s.flow])));
    expect(flows).toEqual({
      'internship-offer': 'to-you',
      'premium-tasks': 'from-you',
      'joining-kit': 'from-you',
      'payment-agent': 'through-you',
      apprenticeship: 'to-you',
      'account-for-hire': 'through-you',
      'fake-check': 'from-you',
      'text-interview': 'from-you',
      'campus-job': 'to-you',
    });
    // Every ordinary case is money coming to the reader from an employer.
    for (const edition of EDITIONS) {
      for (const s of banks[edition].scenarios) if (s.ordinary) expect(s.flow, s.id).toBe('to-you');
    }
  });

  it('says crime only where other people’s money passes through the reader’s account', () => {
    const CRIME = /\b(crime|criminal|launder\w*|offence|illegal)\b/i;
    for (const edition of EDITIONS) {
      for (const s of banks[edition].scenarios) {
        const texts = [...screenTexts({ screen: s.screen } as DrillSituation), s.check.q, ...s.check.options.flatMap((o) => [o.text, o.why])];
        const said = texts.filter((t) => CRIME.test(t));
        if (s.flow !== 'through-you') expect(said, `${edition}#${s.id}`).toEqual([]);
      }
    }
    // Both through-you screens do say it, and neither calls the reader a criminal.
    for (const id of ['payment-agent', 'account-for-hire']) {
      const whys = scenarioById('eu', id).check.options.map((o) => o.why).join(' ');
      expect(whys, id).toMatch(/can be a crime/);
      expect(whys, id).not.toMatch(/\byou are a criminal\b|\byou('re| are) (a )?(criminal|launderer)\b/i);
    }
  });

  it('keeps every reveal to 25 words or fewer', () => {
    for (const edition of EDITIONS) {
      for (const s of banks[edition].scenarios) {
        for (const o of s.check.options) expect(words(o.why), `${edition}#${s.id}: ${o.why}`).toBeLessThanOrEqual(25);
      }
    }
  });

  it('never has an ordinary job ask for details to be sent by message', () => {
    for (const edition of EDITIONS) {
      for (const s of merged(edition).filter((m) => m.ordinary)) {
        for (const text of screenTexts(s)) expect(text, `${s.checkId}: ${text}`).not.toMatch(/\bsend\b/i);
      }
    }
    const inD2 = merged('in')[1];
    expect(inD2.screen.lines).toContain('Bring your bank details on your first day, for salary.');
  });

  it('defines every acronym a reader meets on the page: all six screens, questions and reveals', () => {
    for (const edition of EDITIONS) {
      const defined = new Set(banks[edition].glossary.map((id) => id.toUpperCase().replace(/-/g, '')));
      const texts = merged(edition).flatMap((s) => [...screenTexts(s), s.check.q, ...s.check.options.flatMap((o) => [o.text, o.why])]);
      const missing = [...acronymsIn(texts.join(' '))].filter((a) => !defined.has(a));
      expect(missing, `${edition}: acronyms not in the bank glossary`).toEqual([]);
    }
  });
});

describe('job-offer-check: names on the screens', () => {
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const DENY: Record<Edition, string[]> = {
    in: ['RBI', 'SEBI', 'NPCI', 'SBI', 'HDFC', 'ICICI', 'Axis', 'Paytm', 'PhonePe', 'Google Pay', 'BHIM', 'WhatsApp', 'Telegram', 'Naukri', 'LinkedIn', 'Indeed', 'Amazon', 'Flipkart'],
    eu: ['Europol', 'EBF', 'Revolut', 'N26', 'Wise', 'Wero', 'PayPal', 'Klarna', 'bunq', 'ING', 'WhatsApp', 'Telegram', 'LinkedIn', 'Indeed'],
    us: ['FTC', 'IRS', 'USCIS', 'Chase', 'Venmo', 'Zelle', 'Cash App', 'PayPal', 'Indeed', 'LinkedIn', 'Handshake', 'WhatsApp', 'Telegram', 'Brightline', 'TaskPay', 'Parcelroute', 'Tutorful'],
  };
  // Names that turned out to be real businesses, renamed in the lessons: caught in any case, even inside a host.
  const RENAMED = /brightline|taskpay|parcel\s?route|tutorfeld|tutorful|northgate|kova[cč]/i;

  for (const edition of EDITIONS) {
    it(`${edition}: no real bank, app, platform, employer or public body on any of the six screens`, () => {
      const found: string[] = [];
      for (const s of merged(edition)) {
        for (const text of screenTexts(s)) {
          for (const name of DENY[edition]) {
            if (new RegExp(`(?<![A-Za-z0-9])${escapeRe(name)}(?![A-Za-z0-9])`).test(text)) found.push(`${s.checkId}: "${name}" in "${text}"`);
          }
          if (RENAMED.test(text)) found.push(`${s.checkId}: renamed brand in "${text}"`);
          for (const token of text.match(/\b[a-z0-9-]+(\.[a-z0-9-]+)+\b/gi) ?? []) {
            if (!/^\d+(\.\d+)*$/.test(token) && !token.endsWith('.example')) found.push(`${s.checkId}: host "${token}"`);
          }
        }
      }
      expect(found).toEqual([]);
    });
  }

  it('uses the renamed senders in the lessons', () => {
    expect(merged('eu')[1].screen.from).toBe('Tutoring platform you teach on (payments)');
    expect(merged('us').slice(0, 3).map((s) => s.screen.from)).toEqual([
      'Support, a task app you joined',
      "The grocery store's own careers page",
      'Recruiter, parcel forwarding job',
    ]);
  });

  it('names no business on its own screens: every sender is a role', () => {
    const senders = Object.fromEntries(EDITIONS.flatMap((e) => banks[e].scenarios.map((s) => [s.id, s.screen.from])));
    expect(senders).toEqual({
      'internship-offer': 'Office manager, the firm where you interviewed',
      'premium-tasks': 'Task group admin',
      'joining-kit': 'Recruiter, unknown number',
      'payment-agent': 'Overseas trading company (a free email address)',
      apprenticeship: 'The bakery where you did a trial shift',
      'account-for-hire': 'Recruiter, met in a group chat',
      'fake-check': 'Hiring team, events company',
      'text-interview': 'Recruiter, text only',
      'campus-job': 'Campus jobs office',
    });
    for (const edition of EDITIONS) expect(banks[edition].namesCheckedOn).toBe('2026-09-22');
  });

  it('draws the email kind for the three emails, and a text message for the India internship', () => {
    const kinds = Object.fromEntries(EDITIONS.flatMap((e) => banks[e].scenarios.map((s) => [s.id, s.screen.kind])));
    expect(kinds).toEqual({
      'internship-offer': 'message',
      'premium-tasks': 'chat',
      'joining-kit': 'message',
      'payment-agent': 'email',
      apprenticeship: 'email',
      'account-for-hire': 'chat',
      'fake-check': 'email',
      'text-interview': 'chat',
      'campus-job': 'message',
    });
  });
});

describe('job-offer-check: the figures the screens print (pins)', () => {
  it('formats every amount in its edition’s money, whole units only', () => {
    expect(['internship-offer', 'premium-tasks', 'joining-kit'].map((id) => money(scenarioById('in', id).screen.amount!, localeByCode('en-IN')))).toEqual([
      '₹12,000',
      '₹1,000',
      '₹1,499',
    ]);
    expect(['payment-agent', 'account-for-hire'].map((id) => money(scenarioById('eu', id).screen.amount!, localeByCode('en-IE')))).toEqual(['€900', '€300']);
    expect(money(scenarioById('us', 'fake-check').screen.amount!, localeByCode('en-US'))).toBe('$3,160');
    for (const edition of EDITIONS) {
      for (const s of banks[edition].scenarios) {
        if (s.screen.amount === undefined) continue;
        expect(Number.isInteger(s.screen.amount), s.id).toBe(true);
        // The amount drawn above the lines is one the lines themselves name.
        const shown = money(s.screen.amount, localeByCode(LOCALE[edition]));
        expect(screenTexts({ screen: s.screen } as DrillSituation).join(' '), s.id).toContain(shown);
      }
    }
  });

  it('fake-check: $3,160 deposited, $260 kept, $2,900 sent, and −$2,900 once the check is taken back', () => {
    const us = localeByCode('en-US');
    const deposit = 3160;
    const keep = 260;
    const sent = deposit - keep;
    expect(sent).toBe(2900);
    const s = scenarioById('us', 'fake-check');
    expect(s.screen.lines).toContain(`We mailed you a check for ${money(deposit, us)}.`);
    expect(s.screen.lines.join(' ')).toContain(`Keep ${money(keep, us)}`);
    expect(s.screen.action).toBe(`Send ${money(sent, us)} to the supplier`);
    const balance = deposit - sent - deposit;
    expect(money(balance, us)).toBe('−$2,900');
    expect(s.check.options[0].why).toContain('owe the bank $2,900');
    expect(s.check.options[1].why).toContain(`whole ${money(deposit, us)}`);
  });

  it('writes the review context as the reader saw the screen, amount included', () => {
    expect(drillContext(scenarioById('in', 'joining-kit').screen, 'en-IN')).toBe(
      'Recruiter, unknown number: ₹1,499 Selected for data entry from home, ₹18,000 a month. No interview needed. Pay ₹1,499 for your joining kit to start. [Pay ₹1,499]',
    );
    expect(drillContext(scenarioById('us', 'text-interview').screen, 'en-US')).toBe(
      "Recruiter, text only: Great chat. You're hired, no call needed. Send your Social Security number and online banking login for direct deposit. [Send details]",
    );
  });
});

describe('job-offer-check: when the situations come back (pins)', () => {
  const progress = (review: Progress['review']): Progress => ({ v: 1, done: [], quiz: {}, review, updatedAt: '2026-09-22' });

  it('names the earliest day among this page’s situations, ignoring other pages and missing ids', () => {
    const p = progress({
      'in/protect-your-money/money-mule#d1': { box: 2, due: '2026-09-25' },
      'in/other#q1': { box: 1, due: '2026-09-24' },
      'in/tools/job-offer-check#premium-tasks': { box: 1, due: '2026-09-23' },
    });
    const back = nextReturnAmong(p, ['in/protect-your-money/money-mule#d1', 'in/tools/job-offer-check#premium-tasks', 'in/tools/job-offer-check#missing']);
    expect(back).not.toBeNull();
    expect(dayString(back!)).toBe('2026-09-23');
    expect(back!.getHours()).toBe(0);
    expect(nextReturnAmong(p, ['in/tools/job-offer-check#missing'])).toBeNull();
  });

  it('writes the day with the edition’s own date order', () => {
    const day = new Date(2026, 8, 23);
    const format = (code: string) => new Intl.DateTimeFormat(code, { weekday: 'long', day: 'numeric', month: 'long' }).format(day);
    expect(format('en-IN')).toBe('Wednesday, 23 September');
    expect(format('en-IE')).toBe('Wednesday, 23 September');
    expect(format('en-US')).toBe('Wednesday, September 23');
  });
});
