import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/*
 * Every character a page shows must be one the self-hosted font draws. Anything else is borrowed
 * from a system font and looks pasted in: the "←" the crumbs used to carry (U+2190) was one, and an
 * arrow glyph in link text besides (BRAND_GUIDE §7).
 *
 * The check reads the unicode-range lines of src/styles/fonts.css and every .astro and .tsx file
 * under src/, and fails on a non-ASCII character outside those ranges. Comments are left out
 * (nobody reads them on a page); the rest is scanned whole, markup and code alike, because a
 * non-ASCII character in either usually ends up on screen.
 *
 * A declared range is a promise, not proof: fonts.css declares the standard Latin subset ranges,
 * and the subset files ship fewer glyphs than those ranges name (U+2000–206F is declared whole, yet
 * the file has 14 of its 112 code points; U+2191 and U+2193 are declared and absent). So a second
 * check holds every character to what the files are known to draw: Latin-1, or the allowlist
 * below, each entry read off the files' character maps on 23 September 2026.
 */

const FONTS_CSS = 'src/styles/fonts.css';

/** [first, last] code points from every unicode-range declaration in fonts.css. */
function declaredRanges(css: string): [number, number][] {
  const ranges: [number, number][] = [];
  for (const [, list] of css.matchAll(/unicode-range:\s*([^;]+);/g)) {
    for (const token of list.split(',').map((t) => t.trim())) {
      const m = /^U\+([0-9A-F?]+)(?:-([0-9A-F]+))?$/i.exec(token);
      if (!m) throw new Error(`${FONTS_CSS}: cannot read unicode-range "${token}"`);
      // U+4?? is a wildcard range: ? runs 0 to F.
      const first = parseInt(m[1].replace(/\?/g, '0'), 16);
      const last = m[2] ? parseInt(m[2], 16) : parseInt(m[1].replace(/\?/g, 'F'), 16);
      ranges.push([first, last]);
    }
  }
  return ranges;
}

/** Characters outside Latin-1 that the font files draw and the site uses, checked in the files. */
const KNOWN_SAFE = new Map<string, string>([
  ['₹', 'rupee sign (atkinson-latin-ext)'],
  ['€', 'euro sign'],
  ['−', 'minus sign'],
  ['‘', 'left single quote'],
  ['’', 'right single quote, apostrophe'],
  ['“', 'left double quote'],
  ['”', 'right double quote'],
  ['–', 'en dash'],
  ['—', 'em dash'],
  ['…', 'ellipsis'],
  ['ł', 'l with stroke, as in złoty (atkinson-latin-ext)'],
]);
/** Latin-1 is in atkinson-latin whole, except the soft hyphen and the micro sign. */
const inLatin1 = (cp: number) => cp >= 0xa0 && cp <= 0xff && cp !== 0xad && cp !== 0xb5;

/** Every .astro and .tsx file under src/. */
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.(astro|tsx)$/.test(entry.name) ? [path] : [];
  });
}

/** The file with its comments blanked: HTML, block (JSX's {/* *\/} too) and line comments. */
function withoutComments(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[\s;{}(),])\/\/.*$/gm, '$1');
}

interface Use {
  char: string;
  cp: number;
  where: string;
}

/** Every non-ASCII character outside comments, with the first place it appears. */
function nonAscii(): Use[] {
  const seen = new Map<number, Use>();
  for (const file of sources('src')) {
    const lines = withoutComments(readFileSync(file, 'utf8')).split('\n');
    lines.forEach((line, index) => {
      for (const char of line) {
        const cp = char.codePointAt(0)!;
        if (cp < 0x80 || seen.has(cp)) continue;
        seen.set(cp, { char, cp, where: `${file}:${index + 1}` });
      }
    });
  }
  return [...seen.values()];
}

const hex = (cp: number) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;

describe('every character on a page is drawn by the self-hosted font', () => {
  const ranges = declaredRanges(readFileSync(FONTS_CSS, 'utf8'));
  const uses = nonAscii();
  const declared = (cp: number) => ranges.some(([first, last]) => cp >= first && cp <= last);

  it('reads the ranges fonts.css declares, and finds characters to check', () => {
    expect(ranges.length).toBeGreaterThan(10);
    // The latin file covers ASCII and Latin-1; if this fails, the parse above has broken.
    expect(declared(0x41) && declared(0xe9)).toBe(true);
    expect(uses.length).toBeGreaterThan(5);
  });

  it('every non-ASCII character falls inside a declared unicode-range', () => {
    const outside = uses.filter((u) => !declared(u.cp)).map((u) => `${hex(u.cp)} "${u.char}" at ${u.where}`);
    expect(outside, `outside every unicode-range in ${FONTS_CSS}: use a character the font has, or markup (<sup>)`).toEqual([]);
  });

  it('and is one the font files are known to draw (Latin-1 or the allowlist)', () => {
    const unknown = uses.filter((u) => !inLatin1(u.cp) && !KNOWN_SAFE.has(u.char)).map((u) => `${hex(u.cp)} "${u.char}" at ${u.where}`);
    expect(
      unknown,
      'not on the list of glyphs checked in public/fonts/: look it up in the woff2 files before adding it to KNOWN_SAFE',
    ).toEqual([]);
  });

  it('the arrow the crumbs dropped is not back', () => {
    expect(uses.filter((u) => u.cp >= 0x2190 && u.cp <= 0x21ff).map((u) => `${hex(u.cp)} at ${u.where}`)).toEqual([]);
  });
});
