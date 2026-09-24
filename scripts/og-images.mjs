#!/usr/bin/env node
/**
 * Share images, one per page, drawn at build time from each page's own title. Runs after
 * `astro build` (see package.json). The output is a PNG per page under dist/og/, and BaseLayout
 * points each page's og:image at its own file. Nothing here touches the JavaScript readers get.
 *
 * The card is the site in miniature: a white field, the 96px blue bar across the top with the
 * inverse badge and the name in white, the title in navy ink, a rule, and a muted foot line. No gold.
 * Colours are read by name from the token block of src/styles/tokens.css (scripts/tokens.mjs), so
 * the images cannot drift from the brand; a missing token, or ink that fails 4.5:1 on the field,
 * fails the build rather than drawing a blank card.
 *
 * The font is scripts/fonts/BricolageGrotesque (SIL OFL, licence beside it), used at build time only
 * and never shipped to readers, until an Atkinson Hyperlegible Next TTF (OFL) is approved; then FONT
 * and the font family below swap. resvg lays the text out itself, so this is plain SVG.
 */
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

import { badgeInverse } from './brand-mark.mjs';
import { contrast, hex, readTokenSource, rootTokens } from './tokens.mjs';

const DIST = resolve('dist');
const OUT = join(DIST, 'og');
const W = 1200;
const H = 630;
const BAR = 96;
const RULE_Y = 540;
const FONT = resolve('scripts/fonts/BricolageGrotesque[opsz,wdth,wght].ttf');
const FAMILY = 'Bricolage Grotesque';

const tokens = rootTokens(readTokenSource());
const colour = {
  bg: hex(tokens, 'bg'),
  blue: hex(tokens, 'blue'),
  onBlue: hex(tokens, 'on-blue'),
  ink: hex(tokens, 'ink'),
  muted: hex(tokens, 'muted'),
  rule: hex(tokens, 'rule'),
};
for (const [fg, bg] of [['ink', 'bg'], ['muted', 'bg'], ['onBlue', 'blue']]) {
  const r = contrast(colour[fg], colour[bg]);
  if (r < 4.5) throw new Error(`og-images: ${fg} on ${bg} is ${r.toFixed(2)}:1, under 4.5:1; the cards would not be readable`);
}
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
  // The build-time font has no non-breaking hyphen ("in‑hand"), so draw a plain one.
  const title = (parts[0] === NAME && parts[1] ? parts[1] : parts[0]).replace(/‑/g, '-');
  const region = rel.match(/^\/(in|eu|us)\//)?.[1];
  // A tool page is a drill when the page says so to search (data-pagefind-meta="kind:Practice").
  const toolKind = html.includes('data-pagefind-meta="kind:Practice"') ? 'Practice' : 'Calculator';
  const kind = /\/learn\/[^/]+\/[^/]+\//.test(rel) ? 'Lesson' : /\/tools\/[^/]+\//.test(rel) ? toolKind : /\/learn\//.test(rel) ? 'Lessons' : null;
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
  // The title block is centred in the white area between the bar and the rule.
  const middle = (BAR + RULE_Y) / 2;
  const top = middle - ((lines.length - 1) * lineHeight) / 2 + size * 0.35;
  const titleText = lines
    .map((l, i) => `<text x="72" y="${(top + i * lineHeight).toFixed(1)}" font-size="${size}" font-weight="700" letter-spacing="${(-size * 0.01).toFixed(2)}" fill="${colour.ink}">${esc(l)}</text>`)
    .join('');
  const foot = label || 'Free lessons and calculators for ages 15 to 21';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="${FAMILY}">
  <rect width="${W}" height="${H}" fill="${colour.bg}"/>
  <rect width="${W}" height="${BAR}" fill="${colour.blue}"/>
  <g transform="translate(72 18) scale(0.9375)">${badgeInverse()}</g>
  <text x="150" y="61" font-size="36" font-weight="700" fill="${colour.onBlue}">${NAME}</text>
  ${titleText}
  <rect x="72" y="${RULE_Y}" width="${W - 144}" height="1" fill="${colour.rule}"/>
  <text x="72" y="594" font-size="26" font-weight="700" fill="${colour.muted}">${esc(foot)}</text>
  <text x="${W - 72}" y="594" font-size="26" text-anchor="end" fill="${colour.muted}">Free. No ads, nothing to sell.</text>
</svg>`;
}

const render = (svg) =>
  new Resvg(svg, { font: { fontFiles: [FONT], loadSystemFonts: false, defaultFontFamily: FAMILY } }).render().asPng();

mkdirSync(OUT, { recursive: true });
let made = 0;
for (const file of pages(DIST)) {
  const page = describe(file, readFileSync(file, 'utf8'));
  if (page.skip) continue;
  writeFileSync(join(OUT, `${slugFor(file)}.png`), render(card(page)));
  made++;
}
// The generic card, for pages that are not meant to be shared on their own.
writeFileSync(join(DIST, 'og-default.png'), render(card({ title: 'Money and business, taught for where you live.', label: '' })));
console.log(`Share images: ${made} written to dist/og/, plus og-default.png`);
