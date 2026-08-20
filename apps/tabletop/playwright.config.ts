import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test/verification",
  // A minimal fake Spine on the default SPINE_URL port (4600): verify.sh's server has no
  // real Spine to talk to, and the library-portal swallow (ticket 12) needs a 2xx to
  // complete its send-then-commit flow.
  globalSetup: "./test/verification/support/globalSetup.ts",
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
