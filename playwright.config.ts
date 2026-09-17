import { defineConfig, devices } from '@playwright/test';

// Trailing slash matters: goto() resolves with `new URL(path, baseURL)`, so a
// baseURL without it (or a path starting with "/") drops the /passion-project base.
const BASE = 'http://localhost:4321/passion-project/';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: BASE, trace: 'on-first-retry' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npx astro build && npx astro preview --port 4321',
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
