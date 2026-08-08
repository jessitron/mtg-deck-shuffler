import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for end-to-end verification tests.
 *
 * These tests verify app features through real browser interactions.
 * Run with: npm run test:verify
 *
 * The test script will automatically start and stop the server.
 */
export default defineConfig({
  testDir: './test/verification',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries - we want to see failures clearly
  workers: 4,
  // `list` owns the terminal; the OTel reporter traces the suite itself (spec,
  // test and step spans to the mtg-fleet-verify service, so "why is the suite
  // slow" is a query). It stays quiet when there's nowhere to send spans, so a
  // bare `npx playwright test` without `.be` sourced is unaffected.
  reporter: [['list'], ['./test/harness-telemetry/otelReporter.ts']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3001',
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
