/** Foundation stub: the yearly-rate builder replaces this file with the spec's e2e cases. */
import { test, expect } from '@playwright/test';
import { toolBySlug } from '../../../src/lib/tools';
import { waitForIslands } from '../helpers';

// While the island is a stub the registry marks it ready: false, and the tool has no page. The
// builder deletes that line in src/lib/tools.ts when the island is real, and this opens it.
const ready = toolBySlug('yearly-rate')!.ready !== false;

for (const edition of ['in']) {
  test(`${edition}/tools/yearly-rate opens`, async ({ page }) => {
    const response = await page.goto(`${edition}/tools/yearly-rate`);
    if (!ready) {
      expect(response?.status()).toBe(404);
      return;
    }
    await waitForIslands(page);
    await expect(page.locator('h1')).toHaveText("A loan's cost as a yearly rate");
    await expect(page.locator('.tool')).toBeVisible();
  });
}

// Owed by the builder: the release check allows no test.fixme in tests/e2e/tools.
test.fixme('a link value outside the select\'s options falls back to the default', async () => {});
test.fixme('RulesLine text, source links and ToolTerms render and pass axe', async () => {});
