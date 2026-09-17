import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Relative, no leading slash: these must resolve under the /passion-project base.
const PAGES = ['', 'learn', 'tools', 'tools/break-even', 'glossary', 'about', 'privacy', 'disclaimer'];

for (const path of PAGES) {
  test(`/${path} has no serious or critical accessibility issues`, async ({ page }) => {
    await page.goto(path);
    // Guard against silently auditing the 404 page if a base path ever breaks.
    await expect(page.locator('h1')).not.toContainText('That page does not exist');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

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
