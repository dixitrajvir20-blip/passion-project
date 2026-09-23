/** Foundation stub: the pay-later-payday builder replaces this file with the spec's e2e cases. */
import { test, expect } from '@playwright/test';
import { toolBySlug } from '../../../src/lib/tools';
import { waitForIslands } from '../helpers';

// While the island is a stub the registry marks it ready: false, and the tool has no page. The
// builder deletes that line in src/lib/tools.ts when the island is real, and this opens it.
const ready = toolBySlug('pay-later-payday')!.ready !== false;

for (const edition of ['eu', 'us']) {
  test(`${edition}/tools/pay-later-payday opens`, async ({ page }) => {
    const response = await page.goto(`${edition}/tools/pay-later-payday`);
    if (!ready) {
      expect(response?.status()).toBe(404);
      return;
    }
    await waitForIslands(page);
    await expect(page.locator('h1')).toHaveText('Pay-later plans against one payday');
    await expect(page.locator('.tool')).toBeVisible();
  });
}

// Owed by the builder: the release check allows no test.fixme in tests/e2e/tools.
test.fixme('keyboard only at 360px: Add moves focus to the new row\'s first field; Remove moves it to the row now in its place (or Add) and is announced in role=status; at the cap Add is disabled with visible text', async () => {});
test.fixme('a link value outside the select\'s options falls back to the default', async () => {});
test.fixme('RulesLine text, source links and ToolTerms render and pass axe', async () => {});
