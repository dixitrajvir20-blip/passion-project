#!/usr/bin/env node
/**
 * Checks every text/background pair the design system relies on against WCAG 2.2 AA.
 * Run `npm run contrast` after touching src/styles/tokens.css. Fails (exit 1) on a miss.
 */
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

function block(source, marker) {
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`Missing ${marker}`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') depth--;
    if (depth === 0) return source.slice(open, i);
  }
  throw new Error('Unbalanced braces');
}

function tokens(text) {
  const out = {};
  for (const m of text.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)) out[m[1]] = m[2].toLowerCase();
  return out;
}

const light = tokens(block(css, ':root'));
const dark = { ...light, ...tokens(block(css, '@media (prefers-color-scheme: dark)')) };

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground, background, minimum, what it is]
const pairs = [
  ['ink', 'bg', 4.5, 'body headings'],
  ['ink-2', 'bg', 4.5, 'body text'],
  ['muted', 'bg', 4.5, 'secondary text'],
  ['ink', 'bg-2', 4.5, 'headings on cards'],
  ['ink-2', 'bg-2', 4.5, 'text on cards'],
  ['muted', 'bg-2', 4.5, 'secondary text on cards'],
  ['accent-text', 'bg', 4.5, 'links'],
  ['accent-text', 'bg-2', 4.5, 'links on cards'],
  ['on-accent', 'accent', 4.5, 'primary button label'],
  ['on-accent', 'accent-hover', 4.5, 'primary button hover'],
  ['gold-text', 'bg', 4.5, 'eyebrow labels'],
  ['on-gold', 'gold', 4.5, 'text on a gold fill'],
  ['ink', 'highlight', 4.5, 'highlighted key sentence'],
  ['ink', 'bg-3', 4.5, 'text on a hovered panel'],
  ['error', 'bg', 4.5, 'error text'],
  ['error', 'bg-2', 4.5, 'error text on cards'],
  ['success', 'bg', 4.5, 'success text'],
  ['focus', 'bg', 3, 'focus ring (non-text)'],
  ['accent', 'bg', 3, 'accent as a graphic on the page'],
];

let failed = false;
for (const [name, theme] of [['light', light], ['dark', dark]]) {
  console.log(`\n${name}`);
  for (const [fg, bg, min, what] of pairs) {
    const r = ratio(theme[fg], theme[bg]);
    const ok = r >= min;
    if (!ok) failed = true;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(6)}  ${fg} on ${bg}  (${what}, min ${min})`);
  }
}
// More-contrast overrides. The dark one exists because an unscoped block once leaked its
// light values into dark mode; checking both keeps that from coming back unnoticed.
const lightMore = { ...light, ...tokens(block(css, '@media (prefers-contrast: more)')) };
const darkMore = { ...dark, ...tokens(block(css, '@media (prefers-contrast: more) and (prefers-color-scheme: dark)')) };
for (const [name, theme] of [['light + more contrast', lightMore], ['dark + more contrast', darkMore]]) {
  console.log(`\n${name}`);
  for (const [fg, bg, min, what] of [['muted', 'bg', 7, 'secondary text'], ['muted', 'bg-2', 7, 'secondary text on cards']]) {
    const r = ratio(theme[fg], theme[bg]);
    if (r < min) failed = true;
    console.log(`  ${r >= min ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(6)}  ${fg} on ${bg}  (${what}, min ${min})`);
  }
}

// Navy sections re-map the tokens (the .section-dark block in tokens.css); check those pairs too.
const navy = tokens(block(css, '.section-dark {'));
console.log('\nsection-dark');
for (const [fg, min, what] of [['ink', 4.5, 'headings'], ['ink-2', 4.5, 'text'], ['muted', 4.5, 'secondary'], ['accent-text', 4.5, 'links'], ['gold-text', 4.5, 'eyebrow'], ['focus', 3, 'focus ring']]) {
  const r = ratio(navy[fg], navy.bg);
  if (r < min) failed = true;
  console.log(`  ${r >= min ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(6)}  ${fg} on navy (${what})`);
}
process.exit(failed ? 1 : 0);
