import { defineConfig, devices } from "@playwright/test";

const APP_URL = "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: APP_URL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun run dev",
    reuseExistingServer: process.env.CI === undefined,
    url: APP_URL,
  },
  projects: [
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
