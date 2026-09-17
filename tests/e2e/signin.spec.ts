import { test, expect, type Page } from '@playwright/test';

// Islands hydrate after the HTML paints; clicking before that hits a button with no handler.
async function openSignIn(page: Page) {
  await page.goto('account');
  await page.locator('.signin[data-hydrated]').waitFor();
}

test('sign-in is a preview and walks email → code → merge → done', async ({ page }) => {
  await openSignIn(page);
  await expect(page.locator('.preview-note').first()).toContainText('Preview');

  await page.getByRole('button', { name: 'Continue with email' }).click();
  await page.getByLabel('What year were you born?').fill('2005');
  await page.getByLabel('Where do you live?').selectOption('us');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Email').fill('marcus@example.com');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'Check your email.' })).toBeVisible();
  const code = (await page.locator('.preview-code').textContent())!.trim();
  expect(code).toMatch(/^\d{6}$/);
  await page.getByLabel('Six-digit code').fill(code);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // The passkey offer only shows where a platform authenticator exists; either path ends at merge.
  const heading = page.getByRole('heading', { name: /Sign in faster next time|Combine progress/ });
  await expect(heading).toBeVisible();
  if ((await heading.textContent())?.includes('faster')) {
    await page.getByRole('button', { name: 'Not now' }).click();
  }
  await page.getByRole('button', { name: 'Combine' }).click();
  await expect(page.getByRole('heading', { name: "You’re signed in." })).toBeVisible();
});

test('a wrong code is explained in text and the field is marked invalid', async ({ page }) => {
  await openSignIn(page);
  await page.getByRole('button', { name: 'Continue with email' }).click();
  await page.getByLabel('What year were you born?').fill('2004');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Email').fill('ana@example.com');
  await page.getByRole('button', { name: 'Continue' }).click();
  const code = (await page.locator('.preview-code').textContent())!.trim();
  const wrong = code === '000000' ? '111111' : '000000';
  await page.getByLabel('Six-digit code').fill(wrong);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('#si-code-error')).toContainText("didn't match");
  await expect(page.getByLabel('Six-digit code')).toHaveAttribute('aria-invalid', 'true');
});

test('under-18 in India is routed to a parent', async ({ page }) => {
  await openSignIn(page);
  await page.getByRole('button', { name: 'Continue with email' }).click();
  await page.getByLabel('What year were you born?').fill('2010');
  await page.getByLabel('Where do you live?').selectOption('in');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: /parent or guardian/ })).toBeVisible();
});

test('under-13 anywhere stays on the device', async ({ page }) => {
  await openSignIn(page);
  await page.getByRole('button', { name: 'Continue with email' }).click();
  await page.getByLabel('What year were you born?').fill('2016');
  await page.getByLabel('Where do you live?').selectOption('us');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Your progress stays on this device.' })).toBeVisible();
});

test('the age screen cannot be re-answered in the same session', async ({ page }) => {
  await openSignIn(page);
  await page.getByRole('button', { name: 'Continue with email' }).click();
  await page.getByLabel('What year were you born?').fill('2016');
  await page.getByLabel('Where do you live?').selectOption('us');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Your progress stays on this device.' })).toBeVisible();

  // Reload and try again: the gate remembers "not yet" and never offers the year field.
  await openSignIn(page);
  await page.getByRole('button', { name: 'Continue with email' }).click();
  await expect(page.getByRole('heading', { name: 'Your progress stays on this device.' })).toBeVisible();
  await expect(page.getByLabel('What year were you born?')).toHaveCount(0);

  // Only the outcome is kept, never the year, and only for this session.
  const stored = await page.evaluate(() => window.sessionStorage.getItem('lp:agegate'));
  expect(stored).toBe('none');
});

test('a sync code round-trips progress between visits', async ({ page }) => {
  await page.goto('account');
  await page.evaluate(() => {
    window.localStorage.setItem(
      'lp:progress',
      JSON.stringify({ v: 1, done: ['in/money-basics/first-earnings'], quiz: {}, updatedAt: '2026-09-01T00:00:00Z' }),
    );
  });
  await page.reload();
  await page.locator('.signin[data-hydrated]').waitFor();
  await page.getByRole('button', { name: 'Use a sync code instead' }).click();
  const code = await page.getByLabel('Your code').inputValue();
  expect(code.startsWith('LP1.')).toBe(true);

  await page.evaluate(() => window.localStorage.removeItem('lp:progress'));
  await page.reload();
  await page.locator('.signin[data-hydrated]').waitFor();
  await page.getByRole('button', { name: 'Use a sync code instead' }).click();
  await page.getByLabel('Paste a code from another device').fill(code);
  await page.getByRole('button', { name: 'Add that progress here' }).click();
  await expect(page.locator('.signin-status')).toContainText('1 lessons');
});
