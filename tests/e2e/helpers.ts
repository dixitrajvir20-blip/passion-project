import type { Page } from '@playwright/test';

/**
 * Astro removes the `ssr` attribute from an <astro-island> once it has hydrated. Waiting for
 * that is the difference between testing the calculator and testing a race against the JS
 * download — on the Pixel 5 profile the race is lost often enough to matter.
 */
export async function waitForIslands(page: Page, within?: string): Promise<void> {
  // `within` narrows the wait to the island holding that element: a lesson's video island hydrates
  // only when scrolled into view, so a test that jumps straight to the explorer would wait forever.
  await page.waitForFunction(
    (selector) => document.querySelectorAll(selector ? `astro-island[ssr]:has(${selector})` : 'astro-island[ssr]').length === 0,
    within ?? '',
    { timeout: 15_000 },
  );
}
