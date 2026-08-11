import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/verification',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries - we want to see failures clearly
  workers: 4,
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
      testIgnore: /verify-tabletop-integration/,
    },
    {
      name: 'two-app',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /verify-tabletop-integration/,
      dependencies: ['chromium'],
    },
  ],
});
