import { test, expect } from '@playwright/test';

test('the front page offers all three editions and redirects nobody', async ({ page }) => {
  await page.goto('');

  await expect(page).toHaveURL(/\/passion-project\/?$/);
  for (const name of ['India', 'Europe', 'United States']) {
    await expect(page.getByRole('link', { name, exact: false }).first()).toBeVisible();
  }
});

test('the region tabs switch edition and keep you on the same kind of page', async ({ page }) => {
  await page.goto('in/tools/break-even');

  // The edition menu is a dropdown: open it, then pick.
  await page.locator('.region-tabs summary').click();
  await page.locator('.region-tabs').getByRole('link', { name: 'Europe' }).click();

  await expect(page).toHaveURL(/\/eu\/tools\/break-even\/?$/);
  await expect(page.locator('.region-tabs a[aria-current]')).toContainText('Europe');
});

test('each edition opens its calculator on its own currency and scenario', async ({ page }) => {
  await page.goto('in/tools/break-even');
  await expect(page.locator('.results')).toContainText('₹');
  await expect(page.getByLabel('Fixed costs per month')).toHaveValue('18000');

  await page.goto('us/tools/break-even');
  await expect(page.locator('.results')).toContainText('$');
  await expect(page.getByLabel('Fixed costs per month')).toHaveValue('900');

  await page.goto('eu/tools/break-even');
  await expect(page.locator('.results')).toContainText('€');
  await expect(page.getByLabel('Fixed costs per month')).toHaveValue('320');
});

test('each edition names problems specific to it', async ({ page }) => {
  await page.goto('in');
  await expect(page.locator('main')).toContainText('UPI');

  await page.goto('eu');
  await expect(page.locator('main')).toContainText('pay later');

  await page.goto('us');
  await expect(page.locator('main')).toContainText('credit score');
});

test('every regional statistic cites a source', async ({ page }) => {
  for (const region of ['in', 'eu', 'us']) {
    await page.goto(region);
    // Every figure shown links to its source; a figure without a solid source is dropped, not kept.
    const sources = page.locator('.stat-source a');
    expect(await sources.count()).toBeGreaterThanOrEqual(2);
    await expect(page.locator('.stat')).toHaveCount(await sources.count());
    for (const link of await sources.all()) {
      await expect(link).toHaveAttribute('href', /^https:\/\//);
    }
  }
});
