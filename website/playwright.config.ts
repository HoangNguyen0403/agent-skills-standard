import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for Agent Skills Standard landing page.
 * Exercises served production static export at http://127.0.0.1:4321.
 * Uses installed Chromium exclusively across all projects with bounded DPR
 * to prevent high-DPR image footprints, and serial execution to protect shared clipboard state.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  outputDir: 'test-results',
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/playwright-report.json' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4321',
    browserName: 'chromium',
    trace: {
      mode: 'on-first-retry',
      screenshots: false,
      snapshots: true,
      sources: true,
    },
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'chromium-tablet',
      use: {
        browserName: 'chromium',
        viewport: { width: 768, height: 1024 },
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    command: 'pnpm run serve:export',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
