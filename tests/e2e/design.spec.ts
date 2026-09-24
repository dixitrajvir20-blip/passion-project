import { test, expect, type Page } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/*
 * Design v5.1 (docs/DESIGN.md), held as tests: the page stays white under a dark OS with one blue
 * bar, nothing scrolls sideways at phone widths or at 200% zoom, every control in the header,
 * footer, consent banner and lesson contents is a 44px target, the video question has one primary
 * button, the retired display face never comes back, and no page carries a style attribute (the
 * CSP would drop it).
 */

const WHITE = 'rgb(255, 255, 255)';
const BLUE = 'rgb(11, 74, 162)'; // --blue #0b4aa2: the header bar
const INK = 'rgb(11, 18, 64)'; // --ink #0b1240: every heading

// A long lesson, a tool with row lists, a legal table page and the dashboard, plus the two fronts.
const REFLOW_PAGES = ['', 'in', 'eu/learn/money-basics/first-payslip', 'in/tools/take-home-pay', 'cookies', 'dashboard'];

/** documentElement's scroll width against the window: more means the page scrolls sideways. */
async function sideways(page: Page) {
  return page.evaluate(() => {
    const extra = document.documentElement.scrollWidth - window.innerWidth;
    if (extra <= 0) return null;
    // Name the first element that pokes out, so a failure says where to look.
    const culprit = Array.from(document.querySelectorAll<HTMLElement>('body *')).find((el) => el.getBoundingClientRect().right > window.innerWidth + 1);
    return `${extra}px too wide${culprit ? ` (first: <${culprit.tagName.toLowerCase()} class="${culprit.className}">)` : ''}`;
  });
}

test.describe('a dark OS still gets the white page', () => {
  test.use({ colorScheme: 'dark' });

  for (const path of ['', 'in', 'in/learn/money-basics/first-payslip', 'in/tools/break-even']) {
    test(`/${path} is white, with the one blue bar and ink headings`, async ({ page }) => {
      await page.goto(path);
      const seen = await page.evaluate(() => {
        const header = document.querySelector('.site-header')!;
        return {
          body: getComputedStyle(document.body).backgroundColor,
          scheme: getComputedStyle(document.documentElement).colorScheme,
          bar: getComputedStyle(header, '::before').backgroundColor,
          h1: getComputedStyle(document.querySelector('h1')!).color,
          blueHeadings: Array.from(document.querySelectorAll('main :is(h1, h2, h3, h4)'))
            .filter((h) => getComputedStyle(h).color === 'rgb(11, 74, 162)')
            .map((h) => h.textContent?.trim()),
        };
      });
      expect(seen.body).toBe(WHITE);
      expect(seen.scheme).toBe('light');
      expect(seen.bar).toBe(BLUE);
      expect(seen.h1).toBe(INK);
      expect(seen.blueHeadings).toEqual([]);
    });
  }
});

for (const [width, height, what] of [
  [320, 640, 'at 320px'],
  [360, 800, 'at 360px'],
  // 1280x800 at 200% zoom lays out as 640x400 (WCAG 1.4.4 and 1.4.10).
  [640, 400, 'at 640x400, standing in for 200% zoom'],
] as const) {
  test.describe(`nothing scrolls sideways ${what}`, () => {
    test.use({ viewport: { width, height } });

    for (const path of REFLOW_PAGES) {
      test(`/${path}`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator('h1')).not.toContainText('That page does not exist');
        expect(await sideways(page)).toBeNull();
      });
    }
  });
}

test.describe('a wide money table scrolls in its own region, never the page', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('a large loan, year by year, at 320px', async ({ page }) => {
    // Figures never break between digits, so this table is wider than the phone. It must scroll
    // inside its wrap, and the wrap must be a named region a keyboard can reach (WCAG 2.1.1).
    await page.goto('in/tools/loan#principal=123456789');
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    await page.getByText('Year by year', { exact: true }).click();
    const wrap = page.locator('.tool details.how .table-wrap');
    await expect(wrap).toBeVisible();
    expect(await wrap.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await expect(wrap).toHaveAttribute('tabindex', '0');
    await expect(wrap).toHaveAttribute('role', 'region');
    await expect(wrap).toHaveAttribute('aria-label', 'Year by year');
    expect(await sideways(page)).toBeNull();
  });
});

test.describe('every control in the chrome is a 44px target at 360px', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  /** Every visible a, button and summary in the site header, the site footer, the consent banner
   *  and the lesson contents that is under 44px tall or 24px wide. */
  const small = (page: Page) =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>(':is(.site-header, .site-footer, .consent-banner, .lesson-steps) :is(a, button, summary)'))
        .filter((el) => {
          const box = el.getBoundingClientRect();
          // Closed panels and the other width's nav are not rendered; the skip link is moved off
          // screen until it has focus, and is checked with focus in the test.
          if (box.width === 0 && box.height === 0) return false;
          if (el.classList.contains('skip-link')) return false;
          return box.height < 44 || box.width < 24;
        })
        .map((el) => {
          const box = el.getBoundingClientRect();
          return `${el.tagName.toLowerCase()} "${el.textContent?.trim().slice(0, 40)}" ${box.width.toFixed(0)}x${box.height.toFixed(0)}`;
        }),
    );

  for (const path of ['', 'in', 'in/learn/money-basics/first-payslip', 'in/tools/take-home-pay', 'cookies', 'dashboard']) {
    test(`/${path}, with the consent banner up and each menu open in turn`, async ({ page }) => {
      await page.goto(path); // a first visit, so the consent banner is showing
      await expect(page.locator('.consent-banner')).toBeVisible();
      expect(await small(page)).toEqual([]);

      // The skip link, once it has focus and is on screen.
      await page.keyboard.press('Tab');
      const skip = page.locator('.skip-link');
      await expect(skip).toBeFocused();
      const box = (await skip.boundingBox())!;
      expect(box.height, 'skip link height').toBeGreaterThanOrEqual(44);
      expect(box.width, 'skip link width').toBeGreaterThanOrEqual(24);

      await page.locator('.nav-menu > summary').click();
      await expect(page.locator('.menu-panel')).toBeVisible();
      expect(await small(page), 'with Menu open').toEqual([]);

      await page.locator('.region-tabs summary').click();
      await expect(page.locator('.region-tabs a').first()).toBeVisible();
      expect(await small(page), 'with the edition menu open').toEqual([]);

      const steps = page.locator('[data-steps-fold]');
      if ((await steps.count()) > 0) {
        await page.keyboard.press('Escape');
        await steps.locator('summary').click();
        await expect(steps.locator('a').first()).toBeVisible();
        expect(await small(page), 'with "In this lesson" open').toEqual([]);
      }
    });
  }
});

test.describe('the video question', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test('tapping Play before a yes to videos leaves exactly one primary button in the frame', async ({ page }) => {
    await page.goto('in/learn/money-basics/first-payslip');
    const video = page.locator('.video');
    await video.scrollIntoViewIfNeeded();
    await expect(video.locator('astro-island[ssr]')).toHaveCount(0);
    const primaries = video.locator('.video-frame .btn:not(.btn-secondary)');
    await expect(primaries).toHaveCount(1); // Play, before the tap

    await video.getByRole('button', { name: /^Play/ }).click();
    await expect(video.locator('.video-ask')).toBeVisible();
    await expect(primaries).toHaveCount(1);
    await expect(primaries).toHaveText('Choose, then play');
    await expect(video.locator('iframe')).toHaveCount(0);
  });
});

test.describe('one typeface', () => {
  for (const path of ['', 'in', 'in/learn/money-basics/first-payslip', 'in/tools/take-home-pay', 'cookies', 'dashboard']) {
    test(`/${path} sets nothing in Bricolage and never requests it`, async ({ page }) => {
      const fetched: string[] = [];
      page.on('request', (req) => {
        if (/bricolage/i.test(req.url())) fetched.push(req.url());
      });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const bricolage = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('*'))
          .filter((el) => /^["']?bricolage/i.test(getComputedStyle(el).fontFamily))
          .map((el) => el.tagName.toLowerCase()),
      );
      expect(bricolage).toEqual([]);
      expect(fetched).toEqual([]);
      expect(await page.evaluate(() => getComputedStyle(document.querySelector('h1')!).fontFamily)).toMatch(/^["']?Atkinson Hyperlegible Next/);
    });
  }
});

test('no built page carries a style attribute (the CSP would drop it)', async ({}, testInfo) => {
  // Reads dist/ from disk, so once is enough; the mobile project has nothing to add.
  test.skip(testInfo.project.name === 'mobile', 'reads files, not the browser');
  const pages = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return pages(path);
      return name.endsWith('.html') ? [path] : [];
    });
  const files = pages('dist');
  expect(files.length, 'run npm run build first').toBeGreaterThan(100);
  const offenders = files.flatMap((file) =>
    Array.from(readFileSync(file, 'utf8').matchAll(/<[a-zA-Z][^<>]*?\sstyle\s*=/g), (m) => `${file}: ${m[0].slice(0, 80)}`),
  );
  expect(offenders).toEqual([]);
});
