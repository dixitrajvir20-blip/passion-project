#!/usr/bin/env node
/**
 * Share images, one per page, drawn at build time from each page's own title. Runs after
 * `astro build` (see package.json). The output is a PNG per page under dist/og/, and BaseLayout
 * points each page's og:image at its own file. Nothing here touches the JavaScript readers get.
 *
 * Colours come from src/styles/tokens.css so the images cannot drift from the brand. The font is
 * scripts/fonts/BricolageGrotesque (SIL OFL, licence beside it) and is not shipped to readers.
 * resvg lays the text out itself, so this is plain SVG: no HTML-to-SVG layer in between.
 */
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

import { badge } from './brand-mark.mjs';

const DIST = resolve('dist');
const OUT = join(DIST, 'og');
const W = 1200;
const H = 630;
const FONT = resolve('scripts/fonts/BricolageGrotesque[opsz,wdth,wght].ttf');

const tokens = readFileSync(resolve('src/styles/tokens.css'), 'utf8');
const token = (name, block = tokens) => {
  const m = block.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'));
  if (!m) throw new Error(`tokens.css has no --${name}`);
  return m[1];
};
const dark = tokens.slice(tokens.indexOf('@media (prefers-color-scheme: dark)'));
const colour = { navy: token('field'), gold: token('brand-gold'), ink: '#FFFFFF', muted: '#C2D4F0' };
const NAME = 'Business Lab';
const REGION = { in: 'India edition', eu: 'Europe edition', us: 'United States edition' };

function pages(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return ['_astro', 'og', 'pagefind', 'fonts', 'icons', 'brand'].includes(name) ? [] : pages(path);
    return name === 'index.html' ? [path] : [];
  });
}

const slugFor = (file) => {
  const rel = file.slice(DIST.length + 1).replace(/\/?index\.html$/, '');
  return rel === '' ? 'home' : rel.replace(/\//g, '-');
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// One pass over the string: chained replaces would decode "&amp;lt;" twice, into "<".
const ENTITIES = { '&amp;': '&', '&#39;': "'", '&quot;': '"', '&lt;': '<', '&gt;': '>' };
const unescapeHtml = (s) => s.replace(/&(?:amp|#39|quot|lt|gt);/g, (entity) => ENTITIES[entity]);

function describe(file, html) {
  const rel = '/' + file.slice(DIST.length + 1).replace(/index\.html$/, '');
  const parts = unescapeHtml(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? NAME).split(' — ').map((p) => p.trim());
  // Page titles are "<Page> — Business Lab <edition>"; the home page is "Business Lab — <tagline>".
  const title = parts[0] === NAME && parts[1] ? parts[1] : parts[0];
  const region = rel.match(/^\/(in|eu|us)\//)?.[1];
  const kind = /\/learn\/[^/]+\/[^/]+\//.test(rel) ? 'Lesson' : /\/tools\/[^/]+\//.test(rel) ? 'Calculator' : /\/learn\//.test(rel) ? 'Lessons' : null;
  const label = [kind, region ? REGION[region] : null].filter(Boolean).join('  ·  ');
  return { title, label, skip: /\/(account|review)\//.test(rel) || rel === '/404/' };
}

/** Greedy wrap on an average glyph width; resvg has no text wrapping of its own. */
function wrap(text, size, maxWidth, maxLines) {
  const perLine = Math.floor(maxWidth / (size * 0.52));
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > perLine && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\W*\w+$/, '') + '…';
  }
  return lines;
}

function card({ title, label }) {
  const size = title.length > 48 ? 58 : title.length > 30 ? 68 : 78;
  const lines = wrap(title, size, 1000, 3);
  const lineHeight = size * 1.1;
  const top = H / 2 - ((lines.length - 1) * lineHeight) / 2 + size * 0.35;
  const titleText = lines
    .map((l, i) => `<text x="72" y="${(top + i * lineHeight).toFixed(1)}" font-size="${size}" font-weight="700" letter-spacing="-1.5" fill="${colour.ink}">${esc(l)}</text>`)
    .join('');
  const foot = label || 'Free lessons and calculators for ages 15 to 21';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Bricolage Grotesque">
  <rect width="${W}" height="${H}" fill="${colour.navy}"/>
  <g transform="translate(72 60) scale(0.9375)">${badge()}</g>
  <text x="146" y="106" font-size="36" font-weight="800" letter-spacing="-0.7" fill="${colour.ink}">${NAME}</text>
  ${titleText}
  <text x="72" y="572" font-size="26" font-weight="600" fill="${colour.gold}">${esc(foot)}</text>
  <text x="${W - 72}" y="572" font-size="26" text-anchor="end" fill="${colour.muted}">Free. No ads, nothing to sell.</text>
</svg>`;
}

mkdirSync(OUT, { recursive: true });
let made = 0;
for (const file of pages(DIST)) {
  const page = describe(file, readFileSync(file, 'utf8'));
  if (page.skip) continue;
  const png = new Resvg(card(page), {
    font: { fontFiles: [FONT], loadSystemFonts: false, defaultFontFamily: 'Bricolage Grotesque' },
  }).render().asPng();
  writeFileSync(join(OUT, `${slugFor(file)}.png`), png);
  made++;
}
// The generic card, for pages that are not meant to be shared on their own.
writeFileSync(join(DIST, 'og-default.png'), new Resvg(card({ title: 'Money and business, taught for where you live.', label: '' }), {
  font: { fontFiles: [FONT], loadSystemFonts: false, defaultFontFamily: 'Bricolage Grotesque' },
}).render().asPng());
console.log(`Share images: ${made} written to dist/og/, plus og-default.png`);
