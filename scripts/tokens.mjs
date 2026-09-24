/**
 * Reads colour tokens out of src/styles/tokens.css for the build scripts (contrast-check.mjs and
 * og-images.mjs), so neither keeps a copy of a colour. Deliberately small and strict:
 *
 * - comments are stripped before parsing, so a word inside a comment cannot be read as a selector;
 * - the token set is every top-level root block, merged in order (the v4 names were retired on
 *   23 September 2026, so there is no alias block to skip);
 * - a missing token, or one whose value is not a 6-digit hex, throws with the token's name.
 */
import { readFileSync } from 'node:fs';

export const TOKENS_URL = new URL('../src/styles/tokens.css', import.meta.url);

/** The token file with comments removed. */
export function readTokenSource(url = TOKENS_URL) {
  return readFileSync(url, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
}

/** The body of the brace block that starts at `open` (the index of its '{'). */
function body(source, open) {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') depth--;
    if (depth === 0) return source.slice(open + 1, i);
  }
  throw new Error('tokens.css: unbalanced braces');
}

/** Every `--name: #rrggbb` declaration in a block of CSS. Other values are kept as strings. */
function declarations(text) {
  const out = {};
  for (const m of text.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) out[m[1]] = m[2].trim().toLowerCase();
  return out;
}

/** The merged top-level root blocks (a root block nested in a media query is not top level). */
export function rootTokens(source) {
  const out = {};
  for (const m of source.matchAll(/^:root\s*\{/gm)) Object.assign(out, declarations(body(source, m.index + m[0].length - 1)));
  if (Object.keys(out).length === 0) throw new Error('tokens.css: no top-level root block found');
  return out;
}

/** The declarations inside the first block whose opening text matches `pattern`. */
export function blockTokens(source, pattern) {
  const m = source.match(pattern);
  if (!m) throw new Error(`tokens.css: missing block ${pattern}`);
  const open = source.indexOf('{', m.index + m[0].length - 1);
  // A media query wraps an inner rule: read the inner rule's declarations.
  const inner = body(source, open);
  const nested = inner.indexOf('{');
  return declarations(nested === -1 ? inner : body(inner, nested));
}

/** A token's value, which must be a 6-digit hex. */
export function hex(set, name, where = 'root') {
  const value = set[name];
  if (value === undefined) throw new Error(`tokens.css: --${name} is missing (${where})`);
  if (!/^#[0-9a-f]{6}$/.test(value)) throw new Error(`tokens.css: --${name} is "${value}", not a 6-digit hex (${where})`);
  return value;
}

const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (value) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/** The WCAG 2.x contrast ratio of two 6-digit hex colours. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
