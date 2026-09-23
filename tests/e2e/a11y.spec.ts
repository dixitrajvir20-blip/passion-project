import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { registeredFor, toolsFor } from '../../src/lib/tools';

const REGIONS = ['in', 'eu', 'us'];

// Every published lesson, found from the content folder, so a new lesson is audited the day it lands:
// src/content/lessons/<edition>/<track>/<slug>.mdx is served at <edition>/learn/<track>/<slug>.
const LESSON_ROOT = 'src/content/lessons';
// Folders only: macOS drops .DS_Store files into any folder opened in Finder.
const folders = (dir: string) => readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
const LESSONS = folders(LESSON_ROOT).flatMap((edition) =>
  folders(join(LESSON_ROOT, edition)).flatMap((track) =>
    readdirSync(join(LESSON_ROOT, edition, track))
      .filter((file) => file.endsWith('.mdx'))
      .map((file) => `${edition}/learn/${track}/${file.replace(/\.mdx$/, '')}`),
  ),
);

// Every tool page, from the registry: each calculator an edition has, and each drill whose bank
// exists (src/content/drills/<edition>/<tool>.json), so a new tool is audited the day it builds.
const TOOL_PAGES = REGIONS.flatMap((edition) =>
  toolsFor(edition)
    .filter((tool) => tool.format === 'calculator' || existsSync(`src/content/drills/${edition}/${tool.slug}.json`))
    .map((tool) => `${edition}/tools/${tool.slug}`),
);

// Relative, no leading slash: these must resolve under the /passion-project base.
const PAGES = [
  '',
  'glossary',
  'search',
  'about',
  'write',
  'dashboard',
  'privacy',
  'cookies',
  'terms',
  'accessibility',
  'disclaimer',
  'account',
  ...REGIONS.flatMap((r) => [r, `${r}/learn`, ...folders(join(LESSON_ROOT, r)).map((track) => `${r}/learn/${track}`), `${r}/review`, `${r}/tools`]),
  ...TOOL_PAGES,
  ...LESSONS,
];

for (const path of PAGES) {
  test(`/${path} has no serious or critical accessibility issues`, async ({ page }) => {
    await page.goto(path);
    // Guard against silently auditing the 404 page if a base path ever breaks.
    await expect(page.locator('h1')).not.toContainText('That page does not exist');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );

    expect(
      blocking,
      blocking.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`).join('\n'),
    ).toEqual([]);
  });
}

test('every tool page is in the audit', () => {
  // 29 calculators and 5 drills with banks when the tools foundation landed, less the pages of any
  // calculator still marked ready: false (it has no page until its island is built).
  const unbuilt = REGIONS.flatMap((edition) => registeredFor(edition).filter((tool) => tool.ready === false)).length;
  expect(TOOL_PAGES.length).toBeGreaterThanOrEqual(34 - unbuilt);
  expect(TOOL_PAGES).toContain('in/tools/spot-the-fake');
  expect(TOOL_PAGES).not.toContain('us/tools/spot-the-fake');
});

test('the skip link takes keyboard users straight to the content', async ({ page }) => {
  await page.goto('');
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

for (const path of PAGES) {
  test(`/${path} never scrolls sideways`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
  });
}

// WCAG 2.4.11: a jump target or a focused element must never sit under the sticky header. The
// scroll padding and scroll margins are sized from --header-h, so wherever the header is sticky it
// has to fit inside them, including the widths where the nav could wrap to a second row.
for (const width of [900, 960, 1000, 1040, 1280]) {
  test.describe(`at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 800 } });

    test('a sticky header fits inside the scroll padding', async ({ page }) => {
      let stuckAnywhere = false;
      for (const path of ['', 'us', 'us/tools', 'eu/tools', 'in/learn/money-basics/first-payslip', 'dashboard']) {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        const { h, stuck, pad } = await page.evaluate(() => {
          const header = document.querySelector('.site-header')!;
          return {
            h: header.getBoundingClientRect().height,
            stuck: ['sticky', 'fixed'].includes(getComputedStyle(header).position),
            pad: parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop),
          };
        });
        if (stuck) expect(h, `/${path}: a ${h}px sticky header in ${pad}px of scroll padding`).toBeLessThanOrEqual(pad - 8);
        stuckAnywhere ||= stuck;
      }
      if (width >= 1280) expect(stuckAnywhere, 'the header is sticky on a wide screen').toBe(true);
    });
  });
}
