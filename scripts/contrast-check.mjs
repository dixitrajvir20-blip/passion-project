#!/usr/bin/env node
/**
 * Checks every colour pair the design system relies on against WCAG 2.2 AA (v5.1, light only).
 * Run `npm run contrast` after touching src/styles/tokens.css. Fails (exit 1) on a miss, and
 * throws, naming the token, when a checked token is missing or is not a 6-digit hex.
 *
 * It reads the top-level token block, the prefers-contrast block and the two band remaps
 * (.on-band, and .on-band-wide from 1024px), through scripts/tokens.mjs.
 */
import { blockTokens, contrast, hex, readTokenSource, rootTokens } from './tokens.mjs';

const source = readTokenSource();
const root = rootTokens(source);
const more = { ...root, ...blockTokens(source, /^@media \(prefers-contrast: more\)\s*\{/m) };
const band = blockTokens(source, /^\.on-band\s*\{/m);
const bandWide = blockTokens(source, /^\s*\.on-band-wide\s*\{/m);

let failed = false;
const line = (fg, bg, r, min, what) => {
  const ok = r >= min;
  if (!ok) failed = true;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(6)}  ${fg} on ${bg}  (${what}, min ${min})`);
};
const check = (title, set, pairs, where) => {
  console.log(`\n${title}`);
  for (const [fg, bg, min, what] of pairs) line(fg, bg, contrast(hex(set, fg, where), hex(set, bg, where)), min, what);
};

const SURFACES = ['bg', 'surface', 'tint'];
const TEXT = [
  ['ink', 'headings, labels, figures, row titles'],
  ['ink-2', 'body text'],
  ['muted', 'captions, meta, hints'],
  ['blue', 'links in running text'],
  ['blue-dark', 'link and button hover'],
  ['error', 'error text'],
  ['success', 'confirmations'],
];

check('light: text (4.5:1)', root, [
  ...TEXT.flatMap(([fg, what]) => SURFACES.map((bg) => [fg, bg, 4.5, what])),
  ['on-blue', 'blue', 4.5, 'primary button label, text on the bar'],
  ['on-blue', 'blue-dark', 4.5, 'primary button hover'],
], 'root');

check('light: non-text (3:1)', root, [
  ...SURFACES.flatMap((bg) => [
    ['border', bg, 3, 'the edge of a control or instrument'],
    ['focus', bg, 3, 'the focus ring'],
  ]),
  ['on-blue', 'blue', 3, 'the skip link ring and current bars on the bar'],
], 'root');

check('light + more contrast', more, [
  ['muted', 'bg', 7, 'secondary text'],
  ['muted', 'surface', 7, 'secondary text on the surface'],
  ...SURFACES.map((bg) => ['border', bg, 3, 'control edges']),
], 'prefers-contrast: more');

// The remaps are read against the bar itself: :root --blue.
for (const [title, set, where] of [['on-band (the bar)', band, '.on-band'], ['on-band-wide (the edition summary from 1024px)', bandWide, '.on-band-wide']]) {
  console.log(`\n${title}`);
  for (const [fg, min, what] of [['ink', 4.5, 'wordmark, nav, Menu'], ['ink-2', 4.5, 'text'], ['muted', 4.5, 'secondary'], ['focus', 3, 'focus ring']]) {
    line(fg, 'blue', contrast(hex(set, fg, where), hex(root, 'blue')), min, what);
  }
}

process.exit(failed ? 1 : 0);
