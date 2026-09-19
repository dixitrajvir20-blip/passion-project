/**
 * Hand-lettered notes, drawn at build time. Kalam (Indian Type Foundry, SIL OFL 1.1, the file in
 * scripts/fonts/) is turned into SVG outlines here, so the notes look hand-written while readers
 * download no third font: the page stays inside its font budget on a slow connection.
 * Runs only during the build (Astro frontmatter), never in the browser.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// fontkitten arrives with Astro (it reads font metrics for Astro's font support) rather than being
// a direct dependency; pinning it means a lockfile change, which is Rajvir's call. If a future
// Astro drops it, notes fall back to plain text instead of breaking the build.
type Glyph = { path: { toSVG(): string }; advanceWidth: number };
type Font = { ascent: number; descent: number; glyphForCodePoint(cp: number): Glyph };
let font: Font | null | undefined;
async function load(): Promise<Font | null> {
  if (font !== undefined) return font;
  try {
    const { create } = (await import('fontkitten')) as { create: (buf: Buffer) => Font };
    font = create(readFileSync(join(process.cwd(), 'scripts/fonts/Kalam-Regular.ttf')));
  } catch {
    font = null;
  }
  return font;
}

/** Rounds every number in an SVG path to one decimal: the outlines stay smooth and half the size. */
const tidy = (d: string) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10));

export interface HandDrawing {
  /** One path per glyph, each already moved to its place on the line. */
  glyphs: { d: string; x: number }[];
  width: number;
  /** viewBox origin and height in font units (y is flipped by the SVG). */
  top: number;
  height: number;
}

export async function drawHand(text: string): Promise<HandDrawing | null> {
  const f = await load();
  if (!f) return null;
  const glyphs: HandDrawing['glyphs'] = [];
  let x = 0;
  for (const ch of text) {
    const glyph = f.glyphForCodePoint(ch.codePointAt(0)!);
    const d = glyph.path.toSVG();
    if (d) glyphs.push({ d: tidy(d), x: Math.round(x) });
    x += glyph.advanceWidth;
  }
  // Kalam's ascent/descent leave a lot of room; trim to the part letters actually use.
  const top = Math.round(f.ascent * 0.9);
  const bottom = Math.round(f.descent * 0.75);
  return { glyphs, width: Math.round(x), top, height: top - bottom };
}
