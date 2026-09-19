import { test, expect } from '@playwright/test';
import { waitForIslands } from './helpers';

test('break-even updates live as the numbers change', async ({ page }) => {
  await page.goto('in/tools/break-even');
  await waitForIslands(page);

  const results = page.locator('.results');
  await expect(results).toContainText('₹1,600'); // 2000 − 400 kept per student
  await expect(results.locator('.result-figure-value')).toHaveText('8'); // ceil(12000 / 1600)

  await page.getByLabel('Fixed costs per month').fill('24000');
  await expect(results.locator('.result-figure-value')).toHaveText('15'); // 24000 / 1600
});

test('a price below cost explains the problem instead of showing a number', async ({ page }) => {
  await page.goto('in/tools/break-even');
  await waitForIslands(page);

  await page.getByLabel('Price you charge').fill('5');

  await expect(page.locator('#be-price-error')).toBeVisible();
  await expect(page.getByLabel('Price you charge')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.results')).toContainText('Not reachable');
});

test('shared links restore the numbers in the inputs, not just the results', async ({ page }) => {
  await page.goto('in/tools/break-even?fixed=5000&variable=8&price=20&units=600');
  await waitForIslands(page);

  await expect(page.getByLabel('Fixed costs per month')).toHaveValue('5000');
  await expect(page.getByLabel('Price you charge')).toHaveValue('20');
  await expect(page.locator('.results')).toContainText('417'); // ceil(5000 / 12)
});

test('reset returns the tool to its starting numbers', async ({ page }) => {
  await page.goto('in/tools/break-even');
  await waitForIslands(page);

  await page.getByLabel('Price you charge').fill('99');
  await page.getByRole('button', { name: 'Reset' }).click();

  await expect(page.getByLabel('Price you charge')).toHaveValue('2000');
});

test('currency choice changes the formatting', async ({ page }) => {
  await page.goto('in/tools/break-even');
  await waitForIslands(page);

  await expect(page.locator('.results')).toContainText('₹');
  await page.getByLabel('Currency').selectOption('en-US');
  await expect(page.locator('.results')).toContainText('$');
});
