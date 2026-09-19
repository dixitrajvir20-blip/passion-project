import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

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
  ...REGIONS.flatMap((r) => [r, `${r}/learn`, `${r}/learn/money-basics`, `${r}/learn/start-something`, `${r}/learn/how-business-works`, `${r}/review`, `${r}/tools`]),
  ...['break-even', 'budget', 'savings', 'side-hustle', 'loan'].map((tool) => `in/tools/${tool}`),
  'eu/tools/break-even',
  'us/tools/loan',
  ...LESSONS,
  'in/tools/spot-the-fake',
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
