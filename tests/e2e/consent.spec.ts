import { test, expect } from '@playwright/test';

test('no banner appears while nothing optional is in use', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('.consent-banner')).toHaveCount(0);
});

test('privacy choices open from the footer, list storage, and close by keyboard', async ({ page }) => {
  await page.goto('');
  await page.locator('[data-consent][data-hydrated]').waitFor({ state: 'attached' });
  const opener = page.getByRole('button', { name: 'Privacy choices' });
  await opener.click();

  const dialog = page.locator('dialog.consent-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('lp:region');
  await expect(dialog).toContainText('lp:progress');
  await expect(dialog).toContainText('Not in use');
  await expect(dialog.getByRole('button', { name: 'Save choices' })).toBeDisabled();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('no cookies are set and no third-party requests are made', async ({ page, context }) => {
  const thirdParty: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.hostname !== 'localhost') thirdParty.push(req.url());
  });
  await page.goto('in/tools/break-even');
  await page.getByLabel('Price you charge').fill('20');
  expect(await context.cookies()).toEqual([]);
  expect(thirdParty).toEqual([]);
});

test('the CSP blocks nothing the site needs', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (msg) => {
    if (msg.text().includes('Content Security Policy')) violations.push(msg.text());
  });
  await page.goto('');
  await page.goto('in/tools/break-even');
  await page.getByLabel('Price you charge').fill('20');
  await expect(page.locator('.results')).toContainText('₹');
  expect(violations).toEqual([]);
});
