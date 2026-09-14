import { defineConfig, devices } from '@playwright/test';

import { testBaseUrl, testServerEnv } from './e2e/test-env';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'list' : 'html',
  use: {
    baseURL: testBaseUrl,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // The production build against its own database, so the suite never touches development data.
    // `migrate deploy` creates that database on the first run.
    command: 'pnpm db:migrate && pnpm build && pnpm start',
    url: testBaseUrl,
    // A separate build directory keeps a running `pnpm dev` intact.
    env: { ...testServerEnv, NEXT_DIST_DIR: '.next-e2e' },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
