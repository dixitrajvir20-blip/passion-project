/**
 * The payment drill's own rules, beyond the ones every bank meets in tests/unit/drills.test.ts:
 * the six situations in their fixed order under ids that never change, where the two ordinary
 * payments sit, the intro counted from the data, every name on a screen either a role or an
 * invented name that was searched for, the per-edition brand denylist with its case rules, the
 * reveal wording the revised spec settled (any approval sends money, no limit printed, the
 * euro-area scope), and the pins behind the page's amounts and its return line.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BANK_SCENARIO_ID, drillBankSchema, type DrillBankData } from '../../../src/content/schema';
import { bankCheckId, mergeDrill, type DrillSituation } from '../../../src/lib/drill-merge';
import { titleFor, toolBySlug, toolsFor } from '../../../src/lib/tools';
import { localeByCode, money } from '../../../src/lib/format';
import { emptyProgress, nextReturnAmong, saveProgress, type Progress } from '../../../src/lib/progress';
import { acronymsIn, loadLessonFrontmatter, sentences, words } from '../content-rules';

const DRILLS = join(__dirname, '../../../src/content/drills');
const TOOL = 'spot-the-fake';
const EDITIONS = ['in', 'eu'] as const;
type Edition = (typeof EDITIONS)[number];

const LESSON: Record<Edition, string> = {
  in: 'in/protect-your-money/upi-fraud-and-the-clock',
  eu: 'eu/credit-and-fraud/instant-transfer-check',
};

// ---- The spec's pure helpers, restated here so the pins hold the bank to them ----

const NUMBER_WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

/** 'One' to 'Ten'; anything else throws, so a set of more than ten situations fails here. */
function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 10) throw new Error(`numberWord: ${n} is not a whole number from 1 to 10`);
  return NUMBER_WORDS[n - 1];
}

/** The intro a set of this size must carry: the count, and the count of ordinary payments. */
function drillIntro(total: number, ordinary: number, scope?: string): string {
  const count = `${numberWord(total)} screens${scope ? ` ${scope}` : ''}.`;
  const plain = `${numberWord(ordinary)} ${ordinary === 1 ? 'is an ordinary payment' : 'are ordinary payments'}`;
  return `${count} ${plain}, so refusing everything is not the answer.`;
}

/** Every web address on a screen, as a hostname. The last label must be letters, so '₹1.00' is no host. */
function screenHosts(text: string): string[] {
  return (text.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b(?:\/[^\s]*)?/gi) ?? []).map((token) => new URL(`https://${token}`).hostname);
}

/**
 * The brands, apps, banks and public bodies no made-up screen may carry, per edition. Marks set
 * in capitals or mixed case (ING, iDEAL, CRED) match only as written, so 'Sending', 'an ideal
 * price' and 'your credit app' pass; the rest match in any case. Whole words either way.
 */
const DENY_CASE_SENSITIVE = [
  'ING', 'ECB', 'EBA', 'EPC', 'SEPA', 'BLIK', 'iDEAL', 'BHIM', 'CRED', 'UIDAI', 'I4C',
  'RBI', 'NPCI', 'SEBI', 'CBI', 'SBI', 'HDFC', 'ICICI', 'GPay',
];
const DENY: Record<Edition, string[]> = {
  in: [
    'RBI', 'Reserve Bank', 'NPCI', 'SEBI', 'CBI', 'SBI', 'HDFC', 'ICICI', 'Axis', 'Paytm', 'PhonePe', 'Google Pay', 'GPay',
    'BHIM', 'Amazon', 'Flipkart', 'WhatsApp', 'Amazon Pay', 'CRED', 'UIDAI', 'I4C',
  ],
  eu: [
    'Wero', 'Revolut', 'N26', 'ING', 'bunq', 'Klarna', 'PayPal', 'Vinted', 'eBay', 'Bizum', 'iDEAL', 'Swish', 'BLIK',
    'Satispay', 'Europol', 'ECB', 'EBA', 'EPC', 'SEPA',
  ],
};
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function denied(text: string, names: readonly string[] = [...DENY.in, ...DENY.eu]): string[] {
  return [...new Set(names)].filter((name) => {
    const flags = DENY_CASE_SENSITIVE.includes(name) ? '' : 'i';
    return new RegExp(`(?<![A-Za-z0-9])${escapeRe(name)}(?![A-Za-z0-9])`, flags).test(text);
  });
}

/**
 * Senders that are a role, not a business: nothing to search for. Everything else on a screen,
 * as a sender or a 'To:' payee, must be one of the bank's invented names.
 */
const ROLES: Record<Edition, string[]> = {
  in: ['Refund team', 'Caller: bank security team', 'Video call: caller in uniform', 'Account alert', 'Your app: receive money'],
  eu: ['Unknown number', 'Your bank app', 'Seller, online marketplace'],
};

// ---- The banks, their lessons and the merged sets, read from disk ----

interface Loaded {
  bank: DrillBankData;
  lesson: Record<string, any>;
  merged: DrillSituation[];
}

function load(edition: Edition): Loaded {
  const raw = JSON.parse(readFileSync(join(DRILLS, edition, `${TOOL}.json`), 'utf8'));
  const bank = drillBankSchema.parse(raw);
  const lesson = loadLessonFrontmatter(bank.fromLesson);
  if (!lesson || lesson.explorable?.kind !== 'drill') throw new Error(`${bank.fromLesson} is not a drill lesson`);
  return { bank, lesson, merged: mergeDrill(edition, TOOL, bank.fromLesson, lesson.explorable.scenarios, bank.scenarios) };
}

const SETS: Record<Edition, Loaded> = { in: load('in'), eu: load('eu') };

const screenStrings = (s: DrillSituation) => [s.screen.from, ...s.screen.lines, s.screen.action ?? ''].filter(Boolean);
const checkStrings = (s: DrillSituation) => [s.check.q, ...s.check.options.flatMap((o) => [o.text, o.why])];
const rightWhy = (s: DrillSituation) => s.check.options[s.check.answer].why;
const byId = (edition: Edition, id: string) => SETS[edition].merged.find((s) => s.checkId.endsWith(`#${id}`))!;
/** The reviewContext line the spec pins: sender, amount as printed, lines, [button]. */
const reviewContext = (s: DrillSituation, localeCode: string) =>
  [
    `${s.screen.from}:`,
    s.screen.amount === undefined ? '' : money(s.screen.amount, localeByCode(localeCode)),
    ...s.screen.lines,
    s.screen.action ? `[${s.screen.action}]` : '',
  ]
    .filter(Boolean)
    .join(' ');

// ---- Pins on the helpers themselves ----

describe('spot-the-fake: the spec’s helpers', () => {
  it('builds the intro from the counts', () => {
    expect(drillIntro(6, 2)).toBe('Six screens. Two are ordinary payments, so refusing everything is not the answer.');
    expect(drillIntro(6, 2, 'on the way to paying')).toBe(
      'Six screens on the way to paying. Two are ordinary payments, so refusing everything is not the answer.',
    );
    expect(drillIntro(4, 1)).toBe('Four screens. One is an ordinary payment, so refusing everything is not the answer.');
    expect(drillIntro(3, 1)).toBe('Three screens. One is an ordinary payment, so refusing everything is not the answer.');
  });

  it('has number words for one to ten only, so a set of eleven fails', () => {
    expect(numberWord(1)).toBe('One');
    expect(numberWord(10)).toBe('Ten');
    expect(() => numberWord(0)).toThrow();
    expect(() => numberWord(11)).toThrow();
    expect(() => numberWord(2.5)).toThrow();
  });

  it('reads a host only where the last label is letters', () => {
    expect(screenHosts('Update now or your account will be blocked: kyc-update.example/verify')).toEqual(['kyc-update.example']);
    expect(screenHosts('Update at kyc-update.in/verify')).toEqual(['kyc-update.in']);
    expect(screenHosts('Paying ₹1.00 now')).toEqual([]);
    expect(screenHosts('Name on the account: Rovaskel Property Oy.')).toEqual([]);
    expect(screenHosts('Update at kyc-update.in/verify').every((h) => h.endsWith('.example'))).toBe(false);
  });

  it('matches capitalised marks as written and the rest in any case, as whole words', () => {
    expect(denied('Sending money to ING now')).toEqual(['ING']);
    expect(denied('Confirm and send')).toEqual([]);
    expect(denied('an ideal price')).toEqual([]);
    expect(denied('Pay with iDEAL')).toEqual(['iDEAL']);
    expect(denied('Open your credit app')).toEqual([]);
    expect(denied('CRED pay')).toEqual(['CRED']);
    expect(denied('Revolut transfer')).toEqual(['Revolut']);
    expect(denied('pay by paypal')).toEqual(['PayPal']);
  });

  it('keeps bank ids short, lower-case and unlike a lesson’s q1 or d2', () => {
    const ids = ['kyc-link', 'own-code', 'no-check', 'club-match', 'shop-match', 'q1', 'd2', 'ab', 'Kyc-link', 'a'.repeat(41)];
    expect(ids.map((id) => BANK_SCENARIO_ID.test(id))).toEqual([true, true, true, true, true, false, false, false, false, false]);
    // The longest possible full id is well under the 200 characters isProgress allows.
    expect(bankCheckId('eu', TOOL, 'a'.repeat(40)).length).toBe(63);
  });

  it('prints each screen’s amount as a whole number of rupees or euros', () => {
    const inr = localeByCode('en-IN');
    const eur = localeByCode('en-IE');
    expect([money(300, inr), money(85, inr)]).toEqual(['₹300', '₹85']);
    expect([money(45, eur), money(95, eur), money(240, eur), money(450, eur)]).toEqual(['€45', '€95', '€240', '€450']);
    // Why the amounts are whole: at no decimals, 44.5 would show as a different figure.
    expect(money(44.5, eur)).toBe('€45');
  });

  it('says when the situations come back from the earliest of the page’s own ids', () => {
    const progress: Progress = {
      ...emptyProgress(new Date(2026, 8, 22)),
      review: { a: { box: 1, due: '2026-09-23' }, c: { box: 3, due: '2026-09-28' }, z: { box: 1, due: '2026-09-20' } },
    };
    const back = nextReturnAmong(progress, ['a', 'c']);
    expect(back).toEqual(new Date(2026, 8, 23));
    const format = (locale: string) => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(back!);
    expect(format('en-IN')).toBe('Wednesday, 23 September');
    expect(format('en-IE')).toBe('Wednesday, 23 September');
    expect(`These situations come back from ${format('en-IN')}. Nothing to do until then.`).toBe(
      'These situations come back from Wednesday, 23 September. Nothing to do until then.',
    );
    expect(nextReturnAmong(progress, ['x'])).toBeNull();
  });

  it('cannot tell a saved schedule from no storage by saveProgress alone, so the page also checks storage', () => {
    expect(saveProgress(undefined, emptyProgress())).toBe(true);
  });
});

// ---- The registry ----

describe('spot-the-fake: the registry', () => {
  const tool = toolBySlug(TOOL)!;

  it('is a drill in India and Europe only, titled for each', () => {
    expect(tool.format).toBe('drill');
    expect(tool.regions).toEqual(['in', 'eu']);
    expect(toolsFor('us').some((t) => t.slug === TOOL)).toBe(false);
    expect(titleFor(tool, 'in')).toBe('UPI: spot the fake');
    expect(titleFor(tool, 'eu')).toBe('Payments: spot the fake');
  });

  it('is shown wherever it is listed', () => {
    expect(tool.ready).toBeUndefined();
    for (const edition of EDITIONS) expect(toolsFor(edition).some((t) => t.slug === TOOL)).toBe(true);
  });
});

// ---- Each edition's set ----

const EXPECTED_IDS: Record<Edition, string[]> = {
  in: [
    'in/protect-your-money/upi-fraud-and-the-clock#d1',
    'in/protect-your-money/upi-fraud-and-the-clock#d2',
    'in/protect-your-money/upi-fraud-and-the-clock#d3',
    'in/protect-your-money/upi-fraud-and-the-clock#d4',
    'in/tools/spot-the-fake#kyc-link',
    'in/tools/spot-the-fake#own-code',
  ],
  eu: [
    'eu/credit-and-fraud/instant-transfer-check#d1',
    'eu/credit-and-fraud/instant-transfer-check#d2',
    'eu/credit-and-fraud/instant-transfer-check#d3',
    'eu/tools/spot-the-fake#no-check',
    'eu/tools/spot-the-fake#club-match',
    'eu/tools/spot-the-fake#shop-match',
  ],
};
/** Where the two ordinary payments sit, counting situations from 1. */
const ORDINARY_AT: Record<Edition, number[]> = { in: [2, 6], eu: [2, 5] };
const SCOPE: Record<Edition, string | undefined> = { in: undefined, eu: 'on the way to paying' };
const LESSON_COUNTS: Record<Edition, [number, number]> = { in: [4, 1], eu: [3, 1] };
/** The row of each right answer, counting from 0: two per row in each edition. */
const ANSWER_ROWS: Record<Edition, number[]> = { in: [1, 1, 0, 2, 2, 0], eu: [1, 2, 0, 2, 1, 0] };

for (const edition of EDITIONS) {
  const { bank, lesson, merged } = SETS[edition];
  const ordinary = merged.filter((s) => s.ordinary);

  describe(`spot-the-fake: ${edition}`, () => {
    it('takes its first screens from the lesson it names, in this edition', () => {
      expect(bank.fromLesson).toBe(LESSON[edition]);
      expect(bank.region).toBe(edition);
      expect(lesson.region).toBe(edition);
      expect(lesson.tool).toBe(TOOL);
    });

    it('shows six situations: the lesson’s in lesson order, then the bank’s in file order, under ids that never change', () => {
      expect(merged.map((s) => s.checkId)).toEqual(EXPECTED_IDS[edition]);
      expect(merged.map((s) => s.origin)).toEqual(EXPECTED_IDS[edition].map((id) => (id.includes('/tools/') ? 'bank' : 'lesson')));
      for (const s of bank.scenarios) expect(BANK_SCENARIO_ID.test(s.id), s.id).toBe(true);
    });

    it('has two ordinary payments in six, at fixed places and never side by side', () => {
      const at = merged.flatMap((s, index) => (s.ordinary ? [index + 1] : []));
      expect(at).toEqual(ORDINARY_AT[edition]);
      expect(ordinary.length).toBeGreaterThanOrEqual(2);
      expect(ordinary.length).toBeLessThanOrEqual(merged.length - 2);
      expect(ordinary.length * 3).toBeGreaterThanOrEqual(merged.length);
      for (let i = 1; i < at.length; i++) expect(at[i] - at[i - 1], 'two ordinary payments in a row').toBeGreaterThan(1);
    });

    it('carries the intro its counts give, and the lesson’s intro its own counts', () => {
      expect(bank.intro).toBe(drillIntro(merged.length, ordinary.length, SCOPE[edition]));
      const [total, plain] = LESSON_COUNTS[edition];
      expect(lesson.explorable.scenarios).toHaveLength(total);
      expect(lesson.explorable.scenarios.filter((s: { ordinary?: boolean }) => s.ordinary === true)).toHaveLength(plain);
      const said = (lesson.explorable.intro as string).match(/[A-Z][a-z]+/g)!.filter((w) => NUMBER_WORDS.includes(w));
      expect(said.slice(0, 2)).toEqual([numberWord(total), numberWord(plain)]);
    });

    it('ends on the lesson’s own reflection and reporting route, not a copy that can drift', () => {
      expect(bank.reflection).toBe(lesson.explorable.reflection);
      expect(bank.reportTo).toBeUndefined();
      expect(lesson.reportTo?.url).toMatch(/^https:\/\//);
      if (edition === 'in') expect(lesson.reportTo.phone).toBe('1930');
    });

    it('puts on every screen only a role or an invented name that was searched for', () => {
      expect(bank.namesCheckedOn).toBe('2026-09-22');
      const known = [...ROLES[edition], ...bank.inventedNames];
      const shown: string[] = [];
      for (const s of merged) {
        shown.push(s.screen.from);
        for (const line of s.screen.lines) {
          const to = line.match(/^To: ([^,]+)/);
          if (to) shown.push(to[1].trim());
        }
      }
      const unknown = shown.filter((name) => !known.some((k) => name === k || name.includes(k)));
      expect(unknown, 'names on screens that are neither a role nor an invented name').toEqual([]);
      const stale = bank.inventedNames.filter((name) => !merged.some((s) => screenStrings(s).some((text) => text.includes(name))));
      expect(stale, 'invented names no screen uses').toEqual([]);
    });

    it('names no brand, bank, app or public body on any screen or in any question or reveal', () => {
      const found = merged.flatMap((s) => [...screenStrings(s), ...checkStrings(s)].flatMap((text) => denied(text, DENY[edition]).map((name) => `${s.checkId}: ${name}`)));
      for (const text of [bank.intro, bank.reflection, bank.scopeNote ?? '']) found.push(...denied(text, DENY[edition]));
      expect(found).toEqual([]);
    });

    it('shows only .example addresses on its screens', () => {
      const hosts = merged.flatMap((s) => screenStrings(s).flatMap(screenHosts));
      expect(hosts.filter((host) => !host.endsWith('.example'))).toEqual([]);
    });

    it('defines every acronym on its screens and in its questions, the lesson’s included', () => {
      const defined = new Set(bank.glossary.map((id) => id.toUpperCase().replace(/-/g, '')));
      const text = merged.flatMap((s) => [...screenStrings(s), ...checkStrings(s)]).join(' ');
      expect([...acronymsIn(text)].filter((a) => !defined.has(a))).toEqual([]);
    });

    it('prints whole amounts only, so the screen and the review show the same figure', () => {
      for (const s of merged) if (s.screen.amount !== undefined) expect(Number.isInteger(s.screen.amount), s.checkId).toBe(true);
    });

    it('cites a source for every situation of its own, and lists no source it does not use', () => {
      for (const s of bank.scenarios) expect(s.sourceIds.length, s.id).toBeGreaterThan(0);
      const used = new Set(bank.scenarios.flatMap((s) => s.sourceIds));
      expect(bank.sources.map((source) => source.id).filter((id) => !used.has(id))).toEqual([]);
    });

    it('does not put the right answer in the same row every time, so tapping one row never scores six', () => {
      const rows = merged.map((s) => s.check.answer);
      expect(new Set(rows).size).toBeGreaterThan(1);
      expect(new Set(bank.scenarios.map((s) => s.check.answer)).size).toBeGreaterThan(1);
    });

    it('rewards neither a favourite row nor the longest option: at most two right answers per row, the longest right in at most three', () => {
      const rows = merged.map((s) => s.check.answer);
      expect(rows).toEqual(ANSWER_ROWS[edition]);
      const perRow = new Map<number, number>();
      for (const row of rows) perRow.set(row, (perRow.get(row) ?? 0) + 1);
      for (const [row, count] of perRow) expect(count, `row ${row + 1} holds ${count} right answers`).toBeLessThanOrEqual(2);
      // A reader who always taps the longest option: strictly longer than every other option counts.
      const longestRight = merged.filter((s) => {
        const right = s.check.options[s.check.answer].text.length;
        return s.check.options.every((o, i) => i === s.check.answer || o.text.length < right);
      });
      expect(longestRight.length, longestRight.map((s) => s.checkId).join(', ')).toBeLessThanOrEqual(3);
    });

    it('describes the pattern, never the reader: no loss lines, no blame, no fear words', () => {
      const texts = [bank.intro, bank.reflection, bank.scopeNote ?? '', ...merged.flatMap(checkStrings)];
      const moralising = /\b(you (would|could|might) have lost|you lost|careless|stupid|foolish|gullible|naive|fell for|should have known|your fault|victim|terrifying|panic)\b/i;
      expect(texts.filter((text) => moralising.test(text))).toEqual([]);
      for (const text of texts) for (const sentence of sentences(text)) expect(words(sentence), sentence).toBeLessThanOrEqual(30);
    });

    it('makes the right answer on an ordinary payment a check (the name, the amount or whose code it is), not a wave-through', () => {
      for (const s of ordinary) expect(s.check.options[s.check.answer].text + rightWhy(s), s.checkId).toMatch(/amount|code|name|compare/i);
    });
  });
}

// ---- Reveal wording the revised spec settled, per edition ----

describe('spot-the-fake: India’s screens and reveals', () => {
  const { merged } = SETS.in;
  const all = merged.flatMap((s) => [...screenStrings(s), ...checkStrings(s)]);

  it('draws no payment request: person-to-person collect requests ended on 1 October 2025', () => {
    expect(merged.map((s) => s.screen.kind)).not.toContain('request');
  });

  it('says any approval sends money, PIN, fingerprint or face, and prints no approval limit', () => {
    const ownCode = byId('in', 'own-code');
    expect(ownCode.check.options.map((o) => o.why).join(' ')).toContain('by PIN, fingerprint or face');
    // Being paid asks for none of the three, face included.
    expect(rightWhy(ownCode)).toBe('Being paid needs only your code or your number. No scan, and no PIN, fingerprint or face from you.');
    expect(rightWhy(byId('in', 'd1'))).toBe('A real refund shows there, and needs no scan or approval.');
    const biometric = all.flatMap(sentences).filter((sentence) => /fingerprint|face/i.test(sentence));
    expect(biometric.length).toBeGreaterThan(0);
    for (const sentence of biometric) expect(sentence, 'a rupee figure beside a fingerprint or face').not.toMatch(/₹\s?\d/);
  });

  it('never makes the sender the tell on the KYC text: the deadline, the threat and the link are', () => {
    const kyc = byId('in', 'kyc-link');
    expect(kyc.screen.from).toBe('Account alert');
    // RBI's KYC FAQ says 'in advance'; nothing sources 'well ahead'.
    expect(rightWhy(kyc)).toMatch(/in advance/);
    expect(rightWhy(kyc)).not.toMatch(/well ahead/);
    expect(kyc.check.options[0].why).toMatch(/same-day deadline, a threat to block the account and a link/);
    // A page cannot install an app by itself; it gets the reader to (RBI, 2 February 2024).
    expect(kyc.check.options[0].why).toMatch(/get you to install an app/);
    // The acronym stays on the screen and in the question, where the glossary defines it.
    expect(kyc.check.q + kyc.screen.lines.join(' ')).toMatch(/KYC/);
    expect(all.join(' ')).not.toMatch(/a bank (never|does not) update[s]? KYC through a link/i);
  });

  it('reads the renamed lesson screens, and each screen as the review page will show it', () => {
    expect(merged[0].screen.from).toBe('Refund team');
    expect(merged[1].screen.from).toBe('Tulvana General Store');
    expect(reviewContext(byId('in', 'own-code'), 'en-IN')).toBe(
      'Your app: receive money: ₹300 Your own payment code Whoever scans this pays you. [Show code]',
    );
    expect(reviewContext(merged[1], 'en-IN')).toBe(
      'Tulvana General Store: ₹85 Paying Tulvana General Store You scanned this code at the counter. [Enter UPI PIN to pay]',
    );
  });
});

describe('spot-the-fake: Europe’s screens and reveals', () => {
  const { bank, merged } = SETS.eu;

  it('captions every bank screen with a name check as a transfer to confirm', () => {
    const withCheck = merged.filter((s) => s.screen.lines.some((line) => line.startsWith('Name check:')));
    expect(withCheck.map((s) => s.checkId)).toEqual([
      'eu/credit-and-fraud/instant-transfer-check#d2',
      'eu/tools/spot-the-fake#no-check',
      'eu/tools/spot-the-fake#club-match',
      'eu/tools/spot-the-fake#shop-match',
    ]);
    for (const s of withCheck) expect(s.screen.kind, s.checkId).toBe('transfer');
    for (const s of withCheck) expect(s.screen.from, s.checkId).toBe('Your bank app');
  });

  it('covers all four name-check results across the set: match, close match, no match in the lesson, not possible here', () => {
    const results = merged.flatMap((s) => s.screen.lines.filter((l) => l.startsWith('Name check:')).map((l) => l.replace(/^Name check: /, '').split('.')[0]));
    expect(results).toEqual(['close match', 'not possible', 'match', 'match']);
  });

  it('says where the name check does not run yet, above the set and in two reveals', () => {
    expect(bank.scopeNote).toContain('9 October 2025');
    expect(bank.scopeNote).toContain('9 July 2027');
    expect(rightWhy(byId('eu', 'no-check'))).toContain('until July 2027');
    expect(rightWhy(byId('eu', 'no-check'))).toMatch(/^Use a phone number, web address or front desk you find yourself, not the email\./);
    expect(rightWhy(byId('eu', 'club-match'))).toMatch(/no name check yet/);
  });

  it('teaches that a match says whose account it is, not that the shop will deliver', () => {
    const shop = byId('eu', 'shop-match');
    expect(shop.screen.lines).toContain('Name check: match.');
    expect(rightWhy(shop)).toMatch(/not that the shop will deliver/);
    expect(rightWhy(shop)).toMatch(/cannot be taken back/);
    // The cue is in the reveal, not in the option: the right option does not explain itself.
    expect(shop.check.options[shop.check.answer].text).toBe('Stop, and pay this shop nothing');
    expect(rightWhy(shop)).toMatch(/^A price far below other shops and a transfer-only checkout are the tells\./);
    // The price and the transfer-only checkout are in the question, not drawn on the bank screen.
    expect(shop.check.q).toMatch(/60% below other shops/);
    expect(screenStrings(shop).join(' ')).not.toMatch(/%/);
  });

  it('reads each screen as the review page will show it', () => {
    expect(reviewContext(byId('eu', 'club-match'), 'en-IE')).toBe(
      'Your bank app: €45 To: Lirmavik Rowing Club Name check: match. You paid this account in March. [Confirm and send]',
    );
    expect(reviewContext(byId('eu', 'shop-match'), 'en-IE')).toBe(
      'Your bank app: €240 To: Velquist Phones Name check: match. Speed: instant Reference: order 4471 [Confirm and send]',
    );
    expect(reviewContext(byId('eu', 'no-check'), 'en-IE')).toBe(
      'Your bank app: €95 To: Ostrakel Driving School New payee: first payment to this IBAN Name check: not possible. [Send anyway]',
    );
  });
});
