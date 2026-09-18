import { defineConfig, devices } from '@playwright/test';

// Trailing slash matters: goto() resolves with `new URL(path, baseURL)`, so a
// baseURL without it (or a path starting with "/") drops the /passion-project base.
const BASE = 'http://localhost:4321/passion-project/';

// PW_CHROMIUM lets a machine with a pre-installed Chromium (or a different Playwright
// browser build) run the suite without downloading browsers.
const launchOptions = process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {};

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: BASE, trace: 'on-first-retry', launchOptions },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 5'], launchOptions } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions } },
  ],
  webServer: {
    // npm run build, not astro build: share images are drawn in a step after astro build. A server
    // built without it passes locally (a full build is already being served) and 404s in CI.
    command: 'npm run build && npx astro preview --port 4321 --ignore-lock',
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
