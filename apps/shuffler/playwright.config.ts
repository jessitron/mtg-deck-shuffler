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
