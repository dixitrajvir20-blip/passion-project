/** Foundation stub: the spot-the-fake builder replaces this file with the full-set tests. */
import { test, expect } from '@playwright/test';

test.describe('spot-the-fake with JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  for (const edition of ['in', 'eu']) {
    test(`${edition}/tools/spot-the-fake can be decided and revealed`, async ({ page }) => {
      await page.goto(`${edition}/tools/spot-the-fake`);
      const situations = page.locator('.drill-list > li');
      expect(await situations.count()).toBeGreaterThanOrEqual(3);
      const first = situations.first();
      await first.locator('input[type=radio]').first().check();
      await first.locator('summary').click();
      await expect(first.locator('.answer')).toBeVisible();
    });
  }
});
