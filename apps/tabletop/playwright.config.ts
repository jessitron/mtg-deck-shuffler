import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end verification for the Tabletop. The server is started by
 * verify.sh on port 5183 (distinct from dev's 5180 and the Shuffler's ports).
 */
export default defineConfig({
  testDir: "./test/verification",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.TABLETOP_BASE_URL ?? "http://localhost:5183",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
