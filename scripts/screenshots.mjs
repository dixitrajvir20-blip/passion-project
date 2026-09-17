#!/usr/bin/env node
/**
 * Full-page screenshots of key pages at phone and desktop widths, light and dark.
 * Usage: node scripts/screenshots.mjs [outDir] — needs `npm run preview` (or any server) on :4321.
 * Set PW_CHROMIUM to use a preinstalled Chromium instead of Playwright's download.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] ?? 'screenshots';
const base = process.env.BASE_URL ?? 'http://localhost:4321/passion-project/';
const pages = [
  '', 'in', 'in/learn', 'in/learn/how-business-works', 'in/learn/how-business-works/chai-stall',
  'in/review', 'in/tools', 'in/tools/break-even', 'in/tools/savings', 'in/tools/budget', 'in/tools/loan',
  'account', 'privacy', 'glossary',
];
const viewports = [
  { name: '360', width: 360, height: 800, isMobile: true, deviceScaleFactor: 2 },
  { name: '1280', width: 1280, height: 800, isMobile: false, deviceScaleFactor: 1 },
];
const schemes = ['light', 'dark'];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
for (const vp of viewports) {
  for (const scheme of schemes) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      deviceScaleFactor: vp.deviceScaleFactor,
      colorScheme: scheme,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    for (const path of pages) {
      await page.goto(base + path, { waitUntil: 'networkidle' });
      const name = `${(path || 'home').replace(/\//g, '-')}_${vp.name}_${scheme}.png`;
      await page.screenshot({ path: join(out, name), fullPage: true });
      console.log('wrote', name);
    }
    await context.close();
  }
}
await browser.close();
