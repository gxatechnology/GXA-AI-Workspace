import { defineConfig } from '@playwright/test';

const port = 4332;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // The local JSON fallback is intentionally single-writer. Production uses PostgreSQL.
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    colorScheme: 'light',
    locale: 'en-IN',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: `http://127.0.0.1:${port}/api/admin/config`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      PORT: String(port),
      GXA_DB_FILE: './db.e2e.json',
      PERSISTENCE_PROVIDER: 'json',
      NODE_ENV: 'test',
    },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
