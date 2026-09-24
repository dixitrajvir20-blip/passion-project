#!/usr/bin/env node
/**
 * Full-page screenshots of key pages at phone, tablet and desktop widths. The site is light only,
 * so there is one set, plus a short pass at 360px and 1280px with the operating system in dark mode
 * (saved as *_dark-os.png) to show the pages stay white there too.
 * Usage: node scripts/screenshots.mjs [outDir] — needs `npm run preview` (or any server) on :4321.
 * Set PW_CHROMIUM to use a preinstalled Chromium instead of Playwright's download.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] ?? 'screenshots';
const base = process.env.BASE_URL ?? 'http://localhost:4321/passion-project/';
const pages = [
  '', 'in', 'in/learn', 'in/learn/start-something', 'in/learn/start-something/break-even-coaching-centre', 'in/learn/money-basics/first-payslip', 'dashboard',
  'in/review', 'in/tools', 'in/tools/break-even', 'in/tools/savings', 'in/tools/budget', 'in/tools/loan', 'in/tools/spot-the-fake',
  'account', 'privacy', 'glossary', 'search', 'about',
];
const darkOsPages = ['', 'in', 'in/learn/money-basics/first-payslip', 'in/tools/break-even'];
const viewports = [
  { name: '360', width: 360, height: 800, isMobile: true, deviceScaleFactor: 2 },
  { name: '768', width: 768, height: 1024, isMobile: true, deviceScaleFactor: 2 },
  { name: '1280', width: 1280, height: 800, isMobile: false, deviceScaleFactor: 1 },
];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
for (const vp of viewports) {
  // The dark-OS pass runs at the phone and laptop widths only: four pages each.
  const passes = [['light', pages, 'light'], ...(vp.name !== '768' ? [['dark', darkOsPages, 'dark-os']] : [])];
  for (const [scheme, list, suffix] of passes) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      deviceScaleFactor: vp.deviceScaleFactor,
      colorScheme: scheme,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    for (const path of list) {
      await page.goto(base + path, { waitUntil: 'networkidle' });
      const name = `${(path || 'home').replace(/\//g, '-')}_${vp.name}_${suffix}.png`;
      await page.screenshot({ path: join(out, name), fullPage: true });
      console.log('wrote', name);
    }
    await context.close();
  }
}
await browser.close();
