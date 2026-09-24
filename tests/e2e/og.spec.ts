import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';

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

test('each card is drawn from its own page: home, about and the generic card differ', async ({ request }) => {
  const sha1 = async (path: string) => {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    return createHash('sha1').update(await res.body()).digest('hex');
  };
  const hashes = await Promise.all(['og/home.png', 'og/about.png', 'og-default.png'].map(sha1));
  expect(new Set(hashes).size).toBe(3);
});

test('a card is the site in miniature: a white field under one blue bar, and no gold', async ({ page, baseURL }) => {
  // Same origin as the page, so the canvas can be read back.
  await page.goto('about');
  const card = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const at = (x: number, y: number) => Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3));
    // Every pixel, to look for the retired marigold (#F2C14E) anywhere on the card.
    const all = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let gold = 0;
    for (let i = 0; i < all.length; i += 4) if (Math.abs(all[i] - 242) < 12 && Math.abs(all[i + 1] - 193) < 12 && Math.abs(all[i + 2] - 78) < 12) gold++;
    return { width: img.naturalWidth, height: img.naturalHeight, bar: at(1150, 48), field: at(1150, 320), foot: at(1150, 615), gold };
  }, new URL('og/about.png', baseURL).href);
  expect([card.width, card.height]).toEqual([1200, 630]);
  expect(card.bar).toEqual([11, 74, 162]); // --blue, the 96px bar
  expect(card.field).toEqual([255, 255, 255]); // --bg
  expect(card.foot).toEqual([255, 255, 255]);
  expect(card.gold).toBe(0);
});
