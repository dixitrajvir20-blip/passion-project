/** Foundation stub: the job-offer-check builder replaces this file with the full-set tests. */
import { test, expect } from '@playwright/test';

test.describe('job-offer-check with JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  for (const edition of ['in', 'eu', 'us']) {
    test(`${edition}/tools/job-offer-check can be decided and revealed`, async ({ page }) => {
      await page.goto(`${edition}/tools/job-offer-check`);
      const situations = page.locator('.drill-list > li');
      expect(await situations.count()).toBeGreaterThanOrEqual(3);
      const first = situations.first();
      await first.locator('input[type=radio]').first().check();
      await first.locator('summary').click();
      await expect(first.locator('.answer')).toBeVisible();
    });
  }
});
