import { test, expect } from '@playwright/test';

test('every shareable page points at a share image of its own that actually exists', async ({ page, request }) => {
  for (const path of ['', 'in', 'in/learn/start-something/profit-vs-cash', 'eu/tools/loan', 'glossary', 'search']) {
    await page.goto(path);
    const image = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(image, path).toMatch(/\/passion-project\/og\/[a-z0-9-]+\.png$/);
    const res = await request.get(image!.replace('https://dixitrajvir20-blip.github.io', 'http://localhost:4321'));
    expect(res.status(), `${path} -> ${image}`).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  }
});

test('pages that are not for sharing keep the generic image', async ({ page }) => {
  for (const path of ['account', 'in/review']) {
    await page.goto(path);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og-default\.png$/);
  }
});
