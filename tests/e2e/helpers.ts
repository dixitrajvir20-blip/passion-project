import type { Page } from '@playwright/test';

/**
 * Astro removes the `ssr` attribute from an <astro-island> once it has hydrated. Waiting for
 * that is the difference between testing the calculator and testing a race against the JS
 * download — on the Pixel 5 profile the race is lost often enough to matter.
 */
export async function waitForIslands(page: Page): Promise<void> {
  await page.waitForFunction(
    () => document.querySelectorAll('astro-island[ssr]').length === 0,
    undefined,
    { timeout: 15_000 },
  );
}
