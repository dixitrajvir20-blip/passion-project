import { test, expect } from '@playwright/test';

test('search runs on the device, finds a lesson, and links to it under the site base', async ({ page }) => {
  const outside: string[] = [];
  page.on('request', (req) => {
    if (new URL(req.url()).hostname !== 'localhost') outside.push(req.url());
  });

  await page.goto('search');
  await page.getByLabel('Search for').fill('payslip');
  const first = page.locator('.results li').first();
  await expect(first.locator('.r-title')).toContainText('payslip');
  // Every edition has a payslip lesson; which one ranks first is Pagefind's call, not ours.
  await expect(first.locator('.r-title')).toHaveAttribute('href', /^\/passion-project\/(in|eu|us)\/learn\/money-basics\/first-pay(slip|check)\/?$/);
  await expect(first.locator('.r-excerpt mark').first()).toBeVisible();
  await expect(page.locator('[data-status]')).toContainText(/result/);
  expect(outside).toEqual([]);

  await first.locator('.r-title').click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('payslip');
});

test('the edition filter narrows results and remembers the reader’s edition', async ({ page }) => {
  await page.goto('in');
  await page.goto('search?q=calculator');
  await expect(page.locator('#edition')).toHaveValue('India');
  await expect(page.locator('.results li').first()).toBeVisible();
  const india = await page.locator('.results li').count();

  await page.locator('#edition').selectOption('');
  await expect(page.locator('[data-status]')).toContainText(/result/);
  expect(await page.locator('.results li').count()).toBeGreaterThanOrEqual(india);
});

test('a search with no match says so, and the engine is only loaded once the box is used', async ({ page }) => {
  const engine: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/pagefind/')) engine.push(req.url());
  });
  await page.goto('search');
  await page.waitForLoadState('networkidle');
  expect(engine).toEqual([]);

  // An absent word, quoted: Pagefind shortens an unmatched term until something matches ("zzz"
  // found four pages, and "brontosaurus" found one once the lessons grew), and only a quoted term
  // is looked up exactly.
  await page.getByLabel('Search for').fill('"brontosaurus"');
  await expect(page.locator('[data-status]')).toContainText('Nothing found');
  expect(engine.length).toBeGreaterThan(0);
});

test('the WebAssembly allowance exists on the search page and nowhere else', async ({ page }) => {
  await page.goto('search');
  const searchCsp = await page.locator('meta[http-equiv="content-security-policy"]').getAttribute('content');
  expect(searchCsp).toContain("'wasm-unsafe-eval'");
  expect(searchCsp).toMatch(/script-src[^;]*'self'/); // the allowance is added to 'self', never in place of it
  await page.goto('in/learn/money-basics/first-payslip');
  const lessonCsp = await page.locator('meta[http-equiv="content-security-policy"]').getAttribute('content');
  expect(lessonCsp).not.toContain('wasm-unsafe-eval');
});
