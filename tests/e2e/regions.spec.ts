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

  await page.locator('.region-tabs').getByRole('link', { name: 'Europe' }).click();

  await expect(page).toHaveURL(/\/eu\/tools\/break-even\/?$/);
  await expect(page.locator('.region-tabs a[aria-current]')).toHaveText('Europe');
});

test('each edition opens its calculator on its own currency and scenario', async ({ page }) => {
  await page.goto('in/tools/break-even');
  await expect(page.locator('.results')).toContainText('₹');
  await expect(page.getByLabel('Fixed costs per month')).toHaveValue('2000');

  await page.goto('us/tools/break-even');
  await expect(page.locator('.results')).toContainText('$');
  await expect(page.getByLabel('Fixed costs per month')).toHaveValue('90');

  await page.goto('eu/tools/break-even');
  await expect(page.locator('.results')).toContainText('€');
  await expect(page.getByLabel('Fixed costs per month')).toHaveValue('150');
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
    const sources = page.locator('.stat-source a');
    await expect(sources).toHaveCount(3);
    for (const link of await sources.all()) {
      await expect(link).toHaveAttribute('href', /^https:\/\//);
    }
  }
});
