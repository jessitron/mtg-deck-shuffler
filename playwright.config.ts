import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for end-to-end verification tests.
 *
 * These tests verify app features through real browser interactions.
 * Run with: npx playwright test
 *
 * Make sure the app is running on port 3001 before running tests:
 * PORT=3001 ./run
 */
export default defineConfig({
  testDir: './notes/verification',
  fullyParallel: false, // Run tests sequentially - we're testing concurrent state
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries - we want to see failures clearly
  workers: 1, // Single worker for state isolation
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3001',
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
