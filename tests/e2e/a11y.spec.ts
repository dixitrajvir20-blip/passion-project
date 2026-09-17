import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const REGIONS = ['in', 'eu', 'us'];

// Relative, no leading slash: these must resolve under the /passion-project base.
const PAGES = [
  '',
  'glossary',
  'about',
  'privacy',
  'cookies',
  'terms',
  'accessibility',
  'disclaimer',
  'account',
  ...REGIONS.flatMap((r) => [r, `${r}/learn`, `${r}/tools`, `${r}/tools/break-even`]),
];

for (const path of PAGES) {
  test(`/${path} has no serious or critical accessibility issues`, async ({ page }) => {
    await page.goto(path);
    // Guard against silently auditing the 404 page if a base path ever breaks.
    await expect(page.locator('h1')).not.toContainText('That page does not exist');
    // Reveal-on-scroll content starts transparent; wait for the safety net so axe sees real colours.
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]')).every(
        (el) => el.classList.contains('is-in') && getComputedStyle(el).opacity === '1',
      ),
    );

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
