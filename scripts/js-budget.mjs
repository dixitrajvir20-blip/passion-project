#!/usr/bin/env node
/**
 * The JavaScript budget, as a check rather than a sentence in a doc. For every built page it
 * follows what the page actually loads (module scripts, each island's component and renderer, and
 * their static imports), gzips it, and fails the run if a page is over budget.
 *
 * Budgets are from docs/PROJECT_BRIEF.md §9: 50 KB for reading pages, 90 KB for tool pages.
 * Run after `npm run build`.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname, resolve } from 'node:path';

const DIST = resolve('dist');
const BASE = '/passion-project';
const KB = 1024;
const budgetFor = (page) => (/\/tools\/[^/]+\//.test(page) || page.startsWith('/account') ? 90 : 50) * KB;

function pages(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '_astro' ? [] : pages(path);
    return name.endsWith('.html') ? [path] : [];
  });
}

const toFile = (url) => join(DIST, url.replace(BASE, '').split('?')[0]);

/** A module plus everything it statically imports. Dynamic imports load later and do not count. */
function closure(entry, seen = new Set()) {
  if (seen.has(entry) || !existsSync(entry)) return seen;
  seen.add(entry);
  const source = readFileSync(entry, 'utf8');
  for (const match of source.matchAll(/(?:import|from)\s*["'](\.{1,2}\/[^"']+\.js)["']/g)) {
    closure(resolve(dirname(entry), match[1]), seen);
  }
  return seen;
}

let failed = false;
const rows = [];
for (const file of pages(DIST)) {
  const html = readFileSync(file, 'utf8');
  const entries = new Set();
  for (const m of html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)) entries.add(toFile(m[1]));
  for (const m of html.matchAll(/(?:component-url|renderer-url)="([^"]+\.js)"/g)) entries.add(toFile(m[1]));

  const files = new Set();
  for (const entry of entries) closure(entry, files);
  const inline = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('');
  const bytes = [...files].reduce((sum, f) => sum + gzipSync(readFileSync(f)).length, 0) + gzipSync(inline).length;

  const page = '/' + file.slice(DIST.length + 1).replace(/index\.html$/, '');
  const budget = budgetFor(page);
  if (bytes > budget) failed = true;
  rows.push({ page, bytes, budget });
}

rows.sort((a, b) => b.bytes - a.bytes);
for (const { page, bytes, budget } of rows) {
  const mark = bytes > budget ? 'OVER' : 'ok  ';
  console.log(`  ${mark} ${(bytes / KB).toFixed(1).padStart(6)} KB / ${budget / KB} KB  ${page}`);
}
console.log(failed ? '\nJavaScript budget exceeded.' : `\nAll ${rows.length} pages are inside their JavaScript budget.`);
process.exit(failed ? 1 : 0);
