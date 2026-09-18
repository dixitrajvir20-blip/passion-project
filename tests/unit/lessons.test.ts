/**
 * Rules for lesson content, as tests. These read the prose itself, because a frontmatter flag
 * only proves what the author declared: a lesson marked `marketData: false` can still say
 * "Sensex crossed…" in its body, and the schema would never see it.
 *
 * Deliberately NOT here: a Flesch-Kincaid gate. It counts syllables the way a US textbook does,
 * so it punishes "professional tax", "Provident Fund" and "cybercrime.gov.in" while a wall of
 * short hype sentences passes. Sentence and section length are what actually stop a reader.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
// Astro already depends on js-yaml for frontmatter; no new dependency.
import yaml from 'js-yaml';

/**
 * Markup out, words in, for counting. Only for measuring prose (nothing here is ever rendered),
 * but written so no tag can survive: strip until nothing changes, then drop stray brackets.
 */
function stripTags(text: string): string {
  let out = text;
  let previous;
  do {
    previous = out;
    out = out.replace(/<[^<>]*>/g, '');
  } while (out !== previous);
  return out.replace(/[<>]/g, ' ');
}

const ROOT = join(__dirname, '../../src/content/lessons');
const GLOSSARY: { id: string }[] = JSON.parse(readFileSync(join(__dirname, '../../src/content/glossary.json'), 'utf8'));
const GLOSSARY_IDS = new Set(GLOSSARY.map((entry) => entry.id));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith('.mdx') ? [path] : [];
  });
}

interface Loaded {
  id: string;
  data: Record<string, any>;
  body: string;
  /** Body with tags, tables and markdown marks removed: what a reader actually reads. */
  prose: string;
  /** Every reader-facing string in the frontmatter. */
  strings: string[];
}

function collectStrings(value: unknown, skipKeys: Set<string>, key = ''): string[] {
  if (skipKeys.has(key)) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap((v) => collectStrings(v, skipKeys, key));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => collectStrings(v, skipKeys, k));
  }
  return [];
}

const lessons: Loaded[] = walk(ROOT).map((path) => {
  const raw = readFileSync(path, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${path}: no frontmatter`);
  const body = match[2];
  const prose = stripTags(body.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/^\|.*\|$/gm, ' '))
    .replace(/[*_`#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const data = yaml.load(match[1]) as Record<string, any>;
  return {
    id: relative(ROOT, path).replace(/\.mdx$/, ''),
    data,
    body,
    prose,
    strings: collectStrings(data, new Set(['url', 'sources', 'glossary', 'tool', 'kind', 'track', 'region'])),
  };
});

const sentences = (text: string) =>
  text
    .split(/(?<=[.?!])\s+(?=[A-Z₹"“])/)
    .map((s) => s.trim())
    .filter(Boolean);
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

// docs/BRAND_GUIDE.md §7
const BANNED = [
  'unlock', 'supercharge', 'seamless', 'revolutionary', 'revolutionize', 'game-changer', 'game changer',
  'effortless', 'empower', 'elevate', 'oops', 'fast-paced world', 'financial journey', 'your journey',
  'get rich', 'passive income',
];

// Anything that reads as a market signal. SEBI's education-only rule (docs/LEGAL_AND_PRIVACY.md).
const MARKET_SIGNALS = [
  /\bnifty\b/i, /\bsensex\b/i, /\bNSE:\s*\w+/, /\bBSE:\s*\w+/, /\btarget price\b/i, /\bprice target\b/i,
  /\bwill (reach|hit|touch|cross)\b/i, /\bguaranteed returns?\b/i, /\breturns? of \d/i, /\bmultibagger\b/i,
  /\b(buy|sell|hold) (this|the) (stock|share|fund|coin)\b/i,
];

describe('lesson content', () => {
  it('there is something to check', () => {
    expect(lessons.length).toBeGreaterThan(0);
  });

  for (const lesson of lessons) {
    describe(lesson.id, () => {
      it('lives in the folder its frontmatter names', () => {
        const [region, track] = lesson.id.split('/');
        expect(lesson.data.region).toBe(region);
        expect(lesson.data.track).toBe(track);
      });

      it('keeps sentences short: none over 30 words, 18 on average', () => {
        const all = sentences(lesson.prose);
        const long = all.filter((s) => words(s) > 30);
        expect(long, `Too long:\n${long.join('\n')}`).toEqual([]);
        const mean = all.reduce((sum, s) => sum + words(s), 0) / all.length;
        expect(mean, `Average sentence is ${mean.toFixed(1)} words`).toBeLessThanOrEqual(18);
      });

      it('has no wall of text: every section is 120 words or fewer', () => {
        const sections = lesson.body.split(/^## /m).slice(1);
        for (const section of sections) {
          const [heading, ...rest] = section.split('\n');
          // Drop table rows line by line BEFORE joining: once joined, `^…$` no longer matches a row.
          const joined = rest.filter((line) => !/^\s*\|.*\|\s*$/.test(line)).join(' ');
          const text = stripTags(joined.replace(/<svg[\s\S]*?<\/svg>/g, ' '));
          expect(words(text), `"${heading}" is ${words(text)} words`).toBeLessThanOrEqual(120);
        }
      });

      it('uses none of the banned hype words and no exclamation marks', () => {
        const everything = [lesson.prose, ...lesson.strings].join(' \n ').toLowerCase();
        for (const word of BANNED) expect(everything, `banned: "${word}"`).not.toContain(word);
        expect([lesson.prose, ...lesson.strings].filter((s) => s.includes('!')), 'exclamation marks').toEqual([]);
      });

      it('publishes nothing that reads as a market signal unless it declares and dates it', () => {
        if (lesson.data.marketData === true) {
          expect(lesson.data.dataAsOf, 'marketData needs dataAsOf').toBeTruthy();
          return;
        }
        const everything = [lesson.prose, ...lesson.strings].join(' \n ');
        for (const pattern of MARKET_SIGNALS) expect(everything, `matches ${pattern}`).not.toMatch(pattern);
      });

      it('defines every term it uses, and uses every term it lists', () => {
        const used = [...lesson.body.matchAll(/<Term id="([^"]+)"/g)].map((m) => m[1]);
        for (const id of used) {
          expect(GLOSSARY_IDS.has(id), `<Term id="${id}"> is not in glossary.json`).toBe(true);
          expect(lesson.data.glossary, `"${id}" is used but not listed in frontmatter glossary`).toContain(id);
        }
        for (const id of lesson.data.glossary ?? []) {
          expect(used, `"${id}" is listed but never appears as a <Term> in the body`).toContain(id);
        }
      });

      it('has no inline style, style block or script (the CSP drops them silently)', () => {
        expect(lesson.body).not.toMatch(/\sstyle=/);
        expect(lesson.body).not.toMatch(/<style/i);
        expect(lesson.body).not.toMatch(/<script/i);
      });

      it('keeps links in frontmatter, where they are rendered safely, and nothing executable in the body', () => {
        // Body links would skip rel="noopener noreferrer"; sources and reportTo are rendered with it.
        expect(lesson.body, 'markdown link in body').not.toMatch(/\]\(\s*(https?:|\/\/)/i);
        expect(lesson.body, 'raw link-like element in body').not.toMatch(/<(a|link|meta|base|form|iframe|object|embed)\b/i);
        expect(lesson.body, 'inline event handler').not.toMatch(/\son[a-z]+\s*=/i);
        expect(lesson.body, 'script URL').not.toMatch(/javascript:|data:text\/html|vbscript:/i);
      });

      it('gives every diagram a title and a description', () => {
        for (const svg of lesson.body.match(/<svg[\s\S]*?<\/svg>/g) ?? []) {
          expect(svg).toMatch(/role="img"/);
          expect(svg).toMatch(/<title/);
          expect(svg).toMatch(/<desc/);
        }
      });

      it('asks decisions, not recall: every check has feedback for each option', () => {
        const checks = [lesson.data.prediction, ...lesson.data.quiz];
        for (const check of checks) {
          expect(check.options.length).toBeGreaterThanOrEqual(2);
          expect(check.answer).toBeLessThan(check.options.length);
          for (const option of check.options) expect(option.why.length, `"${option.text}" needs a why`).toBeGreaterThan(8);
        }
        expect(lesson.data.quiz.length).toBeGreaterThanOrEqual(3);
      });

      it('ends a scam lesson with the official reporting route', () => {
        const isScam = /scam|fraud/i.test(`${lesson.id} ${lesson.data.title}`);
        if (!isScam) return;
        expect(lesson.data.reportTo, 'scam lessons need reportTo').toBeTruthy();
        if (lesson.data.region === 'in') {
          expect(lesson.data.reportTo.phone).toBe('1930');
          expect(lesson.data.reportTo.url).toContain('cybercrime.gov.in');
        }
      });

      it('is written, not copied: any quotation is short, and nothing is embedded from elsewhere', () => {
        // docs/CONTENT_GUIDE.md, "Copyright and reuse". Facts are free to use; wording is not.
        const quoted = lesson.body.split('\n').filter((line) => line.startsWith('>')).join(' ').replace(/^>\s?/gm, '');
        expect(words(quoted), 'a blockquote may be 25 words at most').toBeLessThanOrEqual(25);
        for (const match of lesson.prose.matchAll(/[“"]([^”"]{0,600})[”"]/g)) {
          expect(words(match[1]), `quotation too long: "${match[1].slice(0, 60)}…"`).toBeLessThanOrEqual(25);
        }
        // Screenshots, stock photos and hot-linked media are out; diagrams are drawn inline.
        expect(lesson.body).not.toMatch(/<img|!\[[^\]]*\]\(|<iframe|<video|<embed|<object/i);
      });

      it('cites at least two https sources', () => {
        expect(lesson.data.sources.length).toBeGreaterThanOrEqual(2);
        for (const source of lesson.data.sources) expect(source.url).toMatch(/^https:\/\//);
      });
    });
  }
});
