import { test, expect } from '@playwright/test';

test('the banner asks about learning time, and a no is a no', async ({ page }) => {
  await page.goto('');
  const banner = page.locator('.consent-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('learning time');
  await banner.getByRole('button', { name: 'Reject all' }).click();
  await expect(banner).toHaveCount(0);
  const record = await page.evaluate(() => JSON.parse(localStorage.getItem('lp:consent') ?? 'null'));
  expect(record.choices.stats).toBe(false);
});

test('Global Privacy Control counts as no: no banner, nothing recorded', async ({ page, context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true });
  });
  await page.goto('');
  await page.locator('[data-consent][data-hydrated]').waitFor({ state: 'attached' });
  await expect(page.locator('.consent-banner')).toHaveCount(0);
  await page.waitForTimeout(6000);
  expect(await page.evaluate(() => localStorage.getItem('lp:activity'))).toBeNull();
  const record = await page.evaluate(() => JSON.parse(localStorage.getItem('lp:consent') ?? 'null'));
  expect(record?.source).toBe('gpc');
});

test.skip('no banner appears while nothing optional is in use', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('.consent-banner')).toHaveCount(0);
});

test('privacy choices open from the footer, list storage, and close by keyboard', async ({ page }) => {
  await page.goto('');
  await page.locator('[data-consent][data-hydrated]').waitFor({ state: 'attached' });
  // The first-visit banner asks first, in the flow under the header; answer it, as a reader would.
  await page.locator('.consent-banner').getByRole('button', { name: 'Reject all' }).click();
  const opener = page.getByRole('button', { name: 'Privacy choices' });
  await opener.click();

  const dialog = page.locator('dialog.consent-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('lp:region');
  await expect(dialog).toContainText('lp:progress');
  await expect(dialog).toContainText('Not in use');
  // One optional category (learning time) is live, so the dialog offers a real choice to save.
  await expect(dialog).toContainText('Learning time on this device');
  await expect(dialog.getByRole('button', { name: 'Save choices' })).toBeEnabled();

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
