import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the Inventory Supply Management critical-path E2E.
 *
 * Run modes:
 *   1. Against the live compose.yaml stack (default):
 *        docker compose up -d
 *        npm test
 *
 *   2. Against a custom base URL:
 *        E2E_BASE_URL=https://staging.example.com npm test
 *
 * The default base URL points at the mobile-gateway port. Swap to the web
 * gateway (8080) for the Angular SPA flow.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:8090',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
