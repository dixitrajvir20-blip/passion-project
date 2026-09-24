/**
 * The content rules shared by tests/unit/lessons.test.ts and tests/unit/drills.test.ts, so a drill
 * bank's text is held to exactly the rules a lesson is. Not a test file: Vitest only runs
 * *.test.ts, and this is imported by them.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// Astro already depends on js-yaml for frontmatter; no new dependency.
import yaml from 'js-yaml';

/**
 * Markup out, words in, for counting. Only for measuring prose (nothing here is ever rendered),
 * but written so no tag can survive: strip until nothing changes, then drop stray brackets.
 */
export function stripTags(text: string): string {
  let out = text;
  let previous;
  do {
    previous = out;
    out = out.replace(/<[^<>]*>/g, '');
  } while (out !== previous);
  return out.replace(/[<>]/g, ' ');
}

export function collectStrings(value: unknown, skipKeys: Set<string>, key = ''): string[] {
  if (skipKeys.has(key)) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap((v) => collectStrings(v, skipKeys, key));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => collectStrings(v, skipKeys, k));
  }
  return [];
}

export const sentences = (text: string) =>
  text
    .split(/(?<=[.?!])\s+(?=[A-Z₹"“])/)
    .map((s) => s.trim())
    .filter(Boolean);
export const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

// docs/BRAND_GUIDE.md §7
export const BANNED = [
  'unlock', 'supercharge', 'seamless', 'revolutionary', 'revolutionize', 'game-changer', 'game changer',
  'effortless', 'empower', 'elevate', 'oops', 'fast-paced world', 'financial journey', 'your journey',
  'get rich', 'passive income',
];

// Anything that reads as a market signal. SEBI's education-only rule (docs/LEGAL_AND_PRIVACY.md).
export const MARKET_SIGNALS = [
  /\bnifty\b/i, /\bsensex\b/i, /\bNSE:\s*\w+/, /\bBSE:\s*\w+/, /\btarget price\b/i, /\bprice target\b/i,
  /\bwill (reach|hit|touch|cross)\b/i, /\bguaranteed returns?\b/i, /\breturns? of \d/i, /\bmultibagger\b/i,
  /\b(buy|sell|hold) (this|the) (stock|share|fund|coin)\b/i,
];

/** A capitalised run of 2 to 6 letters: every one a reader meets must be a defined term. */
export const ACRONYM = /\b[A-Z]{2,6}\b/g;
/** Place names read as words, not terms. */
export const ACRONYM_EXCEPTION = /^(US|EU|UK|USA)$/;

/** The acronyms in a text that need a definition. */
export function acronymsIn(text: string): Set<string> {
  return new Set((text.match(ACRONYM) ?? []).filter((a) => !ACRONYM_EXCEPTION.test(a)));
}

const LESSON_ROOT = join(__dirname, '../../src/content/lessons');

/** A lesson's frontmatter as data, from src/content/lessons/<id>.mdx, or null when there is no such file. */
export function loadLessonFrontmatter(id: string): Record<string, any> | null {
  let raw: string;
  try {
    raw = readFileSync(join(LESSON_ROOT, `${id}.mdx`), 'utf8');
  } catch {
    return null;
  }
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error(`${id}: no frontmatter block`);
  return yaml.load(match[1]) as Record<string, any>;
}
