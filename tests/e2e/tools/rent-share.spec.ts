/** Foundation stub: the rent-share builder replaces this file with the spec's e2e cases. */
import { test, expect } from '@playwright/test';
import { toolBySlug } from '../../../src/lib/tools';
import { waitForIslands } from '../helpers';

// While the island is a stub the registry marks it ready: false, and the tool has no page. The
// builder deletes that line in src/lib/tools.ts when the island is real, and this opens it.
const ready = toolBySlug('rent-share')!.ready !== false;

for (const edition of ['eu']) {
  test(`${edition}/tools/rent-share opens`, async ({ page }) => {
    const response = await page.goto(`${edition}/tools/rent-share`);
    if (!ready) {
      expect(response?.status()).toBe(404);
      return;
    }
    await waitForIslands(page);
    await expect(page.locator('h1')).toHaveText('Rent and bills as a share of net pay');
    await expect(page.locator('.tool')).toBeVisible();
  });
}

// Owed by the builder: the release check allows no test.fixme in tests/e2e/tools.
test.fixme('a link value outside the select\'s options falls back to the default', async () => {});
test.fixme('RulesLine text, source links and ToolTerms render and pass axe', async () => {});
