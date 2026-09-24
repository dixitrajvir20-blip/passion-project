/**
 * The drill banks (src/content/drills/<edition>/<tool>.json) and the lesson screens they reuse,
 * held to the drill rules: ordinary cases so refusing everything is not the answer, no real names,
 * .example hosts only, review ids that can never collide with a lesson's, and the same content
 * rules as lessons.
 *
 * A stub bank (no scenarios yet) skips the complete-bank rules by name; the release check requires
 * zero skips here.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BANK_SCENARIO_ID, drillBankSchema, type DrillBankData } from '../../src/content/schema';
import { bankCheckId, mergeDrill, type DrillSituation } from '../../src/lib/drill-merge';
import { TOOLS, toolsFor } from '../../src/lib/tools';
import { BANNED, MARKET_SIGNALS, acronymsIn, loadLessonFrontmatter, sentences, words } from './content-rules';

const DRILLS = join(__dirname, '../../src/content/drills');
const LESSONS = join(__dirname, '../../src/content/lessons');
const GLOSSARY = join(__dirname, '../../src/content/glossary');
const EDITIONS = ['in', 'eu', 'us'] as const;

const folders = (dir: string) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : []);

interface LoadedBank {
  folder: string;
  file: string;
  path: string;
  raw: unknown;
}

const banks: LoadedBank[] = folders(DRILLS).flatMap((folder) =>
  readdirSync(join(DRILLS, folder))
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const path = join(DRILLS, folder, file);
      return { folder, file: file.replace(/\.json$/, ''), path, raw: JSON.parse(readFileSync(path, 'utf8')) };
    }),
);

/** Real banks, apps, platforms, employers and public bodies: none may appear on a made-up screen. */
const REAL_NAMES = [
  'SBI', 'HDFC', 'ICICI', 'Axis', 'Paytm', 'PhonePe', 'Google Pay', 'GPay', 'BHIM', 'CRED', 'Amazon', 'Amazon Pay', 'Flipkart',
  'WhatsApp', 'Telegram', 'Instagram', 'LinkedIn', 'Indeed', 'Naukri', 'Handshake', 'Revolut', 'N26', 'bunq', 'ING', 'Wise', 'Wero',
  'PayPal', 'Venmo', 'Zelle', 'Cash App', 'Chase', 'Klarna', 'Afterpay', 'Vinted', 'eBay', 'Bizum', 'iDEAL', 'Swish', 'BLIK',
  'Satispay', 'RBI', 'Reserve Bank', 'SEBI', 'NPCI', 'UIDAI', 'I4C', 'CBI', 'Europol', 'ECB', 'EBA', 'EPC', 'FTC', 'IRS',
  // The brands job and payment scams borrow most.
  'Google', 'YouTube', 'Facebook', 'Meta', 'Apple', 'Microsoft', 'Uber', 'DoorDash', 'Upwork', 'Fiverr', 'ZipRecruiter',
  'Walmart', 'FedEx', 'DHL', 'UPS', 'USPS', 'India Post', 'Blue Dart', 'Kotak', 'Yes Bank', 'Bajaj', 'Airtel', 'Jio', 'Swiggy',
  'Zomato', 'Meesho', 'Myntra', 'Wells Fargo', 'Bank of America', 'Capital One', 'Citi', 'Affirm', 'Sezzle', 'Monzo',
  'Santander', 'BNP', 'Sparkasse', 'Deutsche Bank', 'Marktplaats', 'Leboncoin', 'Kleinanzeigen', 'TRAI',
  'Enforcement Directorate', 'FBI', 'SSA', 'Interpol',
  // Coined names that turned out to be real businesses, since renamed on every screen (job-offer-check).
  'Brightline', 'TaskPay', 'Parcelroute', 'Tutorful',
];
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Case-sensitive and whole-word, so 'Wise' is caught and 'wise' in a sentence is not.
const REAL_NAME_RES = REAL_NAMES.map((name) => ({ name, re: new RegExp(`(?<![A-Za-z0-9])${escapeRe(name)}(?![A-Za-z0-9])`) }));
const HOST = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi;
// For host labels, which are case-free: 'sbi-kyc.example' carries SBI however it is written.
const LOWER_NAMES = new Set(REAL_NAMES.map((name) => name.toLowerCase().replace(/\s+/g, '')));

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const COUNT = new RegExp(`^(${NUMBER_WORDS.join('|')})\\s+(screens|messages|situations)\\b`, 'i');
const ORDINARY = new RegExp(`\\b(${NUMBER_WORDS.join('|')})\\s+(?:is|are)\\s+(?:an?\\s+)?ordinary\\b`, 'i');
const numberOf = (word: string) => NUMBER_WORDS.indexOf(word.toLowerCase());

const screenText = (s: DrillSituation) => [s.screen.from, ...s.screen.lines, s.screen.action ?? ''].filter(Boolean);

/** Content rules a lesson's prose meets: banned words, market signals, no '!', sentences of 30 words or fewer. */
function contentProblems(texts: string[]): string[] {
  const problems: string[] = [];
  for (const text of texts) {
    const lower = text.toLowerCase();
    for (const word of BANNED) if (lower.includes(word)) problems.push(`banned "${word}": ${text}`);
    for (const pattern of MARKET_SIGNALS) if (pattern.test(text)) problems.push(`market signal ${pattern}: ${text}`);
    if (text.includes('!')) problems.push(`exclamation mark: ${text}`);
    for (const sentence of sentences(text)) if (words(sentence) > 30) problems.push(`sentence over 30 words: ${sentence}`);
  }
  return problems;
}

describe('drill bank schema', () => {
  const screen = { kind: 'message', from: 'Unknown number', lines: ['Hello there'] };
  const check = { q: 'What do you do with this one?', options: [{ text: 'A', why: 'Because of this.' }, { text: 'B', why: 'Because of that.' }], answer: 0 };
  const bank = (ids: string[], extra: Record<string, unknown> = {}) => ({
    tool: 'spot-the-fake',
    region: 'in',
    fromLesson: 'in/protect-your-money/upi-fraud-and-the-clock',
    intro: 'Two screens to decide before you look.',
    reflection: 'Which one were you slowest on, and why?',
    scenarios: ids.map((id) => ({ id, ordinary: false, screen, check })),
    ...extra,
  });

  it('refuses a bank that uses one id twice', () => {
    expect(drillBankSchema.safeParse(bank(['dup', 'dup'])).success).toBe(false);
  });

  it('refuses ids that could be read as a lesson quiz or drill id', () => {
    expect(drillBankSchema.safeParse(bank(['qr-refund'])).success).toBe(false);
    expect(drillBankSchema.safeParse(bank(['d2'])).success).toBe(false);
    expect(BANK_SCENARIO_ID.test('d12-late')).toBe(false);
    expect(drillBankSchema.safeParse(bank(['kyc-link'])).success).toBe(true);
  });

  it('refuses a source id the bank does not list', () => {
    const withSource = bank(['kyc-link'], { sources: [{ id: 'npci', title: 'A circular', url: 'https://x.example', publisher: 'Someone' }] });
    (withSource.scenarios[0] as Record<string, unknown>).sourceIds = ['npci'];
    expect(drillBankSchema.safeParse(withSource).success).toBe(true);
    (withSource.scenarios[0] as Record<string, unknown>).sourceIds = ['nobody'];
    expect(drillBankSchema.safeParse(withSource).success).toBe(false);
  });
});

describe('mergeDrill', () => {
  it('puts the lesson’s screens first under their lesson ids, then the bank’s under tool ids', () => {
    const screen = { kind: 'chat' as const, from: 'Someone', lines: ['A line'] };
    const check = { q: 'What do you do now?', options: [{ text: 'A', why: 'Because of this.' }], answer: 0 };
    const merged = mergeDrill(
      'in',
      'job-offer-check',
      'in/protect-your-money/money-mule',
      [{ screen, check }, { screen, check, ordinary: true }, { screen, check }],
      [{ id: 'joining-kit', ordinary: false, screen, check }],
    );
    expect(merged.map((s) => s.checkId)).toEqual([
      'in/protect-your-money/money-mule#d1',
      'in/protect-your-money/money-mule#d2',
      'in/protect-your-money/money-mule#d3',
      'in/tools/job-offer-check#joining-kit',
    ]);
    expect(merged.map((s) => s.origin)).toEqual(['lesson', 'lesson', 'lesson', 'bank']);
    expect(merged.map((s) => s.ordinary)).toEqual([false, true, false, false]);
  });
});

describe('drill banks', () => {
  it('there is at least one bank', () => {
    expect(banks.length).toBeGreaterThan(0);
  });

  it('every drill in every edition it lists has a bank, so no drill page silently disappears', () => {
    for (const tool of TOOLS.filter((t) => t.format === 'drill')) {
      for (const edition of tool.regions ?? EDITIONS) {
        expect(existsSync(join(DRILLS, edition, `${tool.slug}.json`)), `src/content/drills/${edition}/${tool.slug}.json`).toBe(true);
      }
    }
  });

  it('no lesson folder is named tools, so a bank id can never collide with a lesson id', () => {
    for (const edition of folders(LESSONS)) expect(folders(join(LESSONS, edition))).not.toContain('tools');
  });

  for (const loaded of banks) {
    const name = `${loaded.folder}/${loaded.file}`;
    describe(name, () => {
      const parsed = drillBankSchema.safeParse(loaded.raw);

      it('matches the drill bank schema', () => {
        const why = parsed.success ? '' : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
        expect(parsed.success, why).toBe(true);
      });
      if (!parsed.success) return;
      const bank: DrillBankData = parsed.data;

      it('lives in the folder of its edition, in a file named after its tool', () => {
        expect(bank.region).toBe(loaded.folder);
        expect(bank.tool).toBe(loaded.file);
      });

      it('belongs to a drill its edition has', () => {
        const tool = toolsFor(bank.region).find((t) => t.slug === bank.tool);
        expect(tool, `${bank.tool} is not in toolsFor('${bank.region}')`).toBeDefined();
        expect(tool!.format).toBe('drill');
      });

      const lesson = loadLessonFrontmatter(bank.fromLesson);
      it('takes its first screens from a drill lesson of the same edition that links to this tool', () => {
        expect(lesson, `fromLesson ${bank.fromLesson}`).not.toBeNull();
        expect(lesson!.region).toBe(bank.region);
        expect(lesson!.explorable?.kind).toBe('drill');
        expect(lesson!.tool).toBe(bank.tool);
      });
      if (!lesson || lesson.explorable?.kind !== 'drill') return;

      const merged = mergeDrill(bank.region, bank.tool, bank.fromLesson, lesson.explorable.scenarios, bank.scenarios);
      const ordinary = merged.filter((s) => s.ordinary).length;

      it('gives every situation a unique review id that cannot be read as a quiz or a lesson drill', () => {
        const ids = merged.map((s) => s.checkId);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) expect(id.length, id).toBeLessThanOrEqual(200);
        for (const s of merged.filter((m) => m.origin === 'bank')) {
          const prefix = bankCheckId(bank.region, bank.tool, '');
          expect(s.checkId.startsWith(prefix), s.checkId).toBe(true);
          expect(BANK_SCENARIO_ID.test(s.checkId.slice(prefix.length)), s.checkId).toBe(true);
          expect(s.checkId).not.toMatch(/#q\d+$/);
          expect(s.checkId).not.toMatch(/#d\d+$/);
        }
      });

      it('lists only glossary terms that exist', () => {
        for (const id of bank.glossary) expect(existsSync(join(GLOSSARY, `${id}.json`)), `glossary id "${id}"`).toBe(true);
      });

      it('writes its intro and reflection to the content rules', () => {
        expect(contentProblems([bank.intro, bank.reflection])).toEqual([]);
      });

      it('names no real bank, app, platform, employer or public body on any screen, or in its intro, scope note or reflection', () => {
        const found: string[] = [];
        const scan = (where: string, text: string) => {
          for (const { name, re } of REAL_NAME_RES) if (re.test(text)) found.push(`${where}: "${name}" in "${text}"`);
        };
        for (const s of merged) for (const text of screenText(s)) scan(s.checkId, text);
        for (const [where, text] of [['intro', bank.intro], ['scopeNote', bank.scopeNote ?? ''], ['reflection', bank.reflection]]) {
          if (text) scan(where, text);
        }
        expect(found).toEqual([]);
      });

      it('shows only made-up .example addresses on its screens, with no real brand in any part of one', () => {
        const hosts: string[] = [];
        for (const s of merged) {
          for (const text of screenText(s)) {
            for (const token of text.match(HOST) ?? []) {
              let host = '';
              try {
                host = new URL(`https://${token}`).hostname;
              } catch {
                host = token;
              }
              if (!host.endsWith('.example')) hosts.push(`${s.checkId}: ${token}`);
              for (const label of host.split(/[.-]/)) {
                if (LOWER_NAMES.has(label.toLowerCase())) hosts.push(`${s.checkId}: brand "${label}" in ${token}`);
              }
            }
          }
        }
        expect(hosts).toEqual([]);
      });

      it('says as many situations, and as many ordinary ones, as it has', () => {
        const count = bank.intro.match(COUNT);
        if (count) expect(numberOf(count[1]), `"${bank.intro}" for ${merged.length} situations`).toBe(merged.length);
        const said = bank.intro.match(ORDINARY);
        if (said) expect(numberOf(said[1]), `"${bank.intro}" for ${ordinary} ordinary`).toBe(ordinary);
      });

      const stub = bank.scenarios.length === 0;
      if (stub) {
        it.skip(`${bank.region}/${bank.tool} is a stub: its builder adds the situations`, () => {});
        return;
      }

      it('has five to eight situations, with at least two ordinary and at least two not', () => {
        expect(merged.length).toBeGreaterThanOrEqual(5);
        expect(merged.length).toBeLessThanOrEqual(8);
        expect(ordinary).toBeGreaterThanOrEqual(2);
        expect(ordinary).toBeLessThanOrEqual(merged.length - 2);
      });

      it('records the day its invented names were checked', () => {
        expect(bank.namesCheckedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      it('puts one of its invented names on every screen that is not from a generic sender', () => {
        const GENERIC = ['Unknown', 'Caller', 'Your bank app', 'Seller', 'Recruiter', 'Support'];
        for (const name of bank.inventedNames) {
          expect(LOWER_NAMES.has(name.toLowerCase().replace(/\s+/g, '')), `invented name "${name}" is a real one`).toBe(false);
        }
        const unnamed = bank.scenarios
          .filter((s) => !GENERIC.some((generic) => s.screen.from.startsWith(generic)))
          .filter((s) => !bank.inventedNames.some((name) => s.screen.from.includes(name)))
          .map((s) => `${s.id}: "${s.screen.from}"`);
        expect(unnamed, 'screen.from with no name from inventedNames').toEqual([]);
      });

      it('writes every screen, question and reveal to the content rules, with every acronym defined', () => {
        const texts = bank.scenarios.flatMap((s) => [
          s.screen.from,
          ...s.screen.lines,
          s.screen.action ?? '',
          s.check.q,
          ...s.check.options.flatMap((o) => [o.text, o.why]),
        ]).filter(Boolean);
        expect(contentProblems(texts)).toEqual([]);
        const defined = new Set(bank.glossary.map((id) => id.toUpperCase().replace(/-/g, '')));
        const missing = [...acronymsIn(texts.join(' '))].filter((a) => !defined.has(a));
        expect(missing, 'acronyms not in the bank glossary').toEqual([]);
      });
    });
  }
});
