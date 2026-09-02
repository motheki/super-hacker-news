import { defineConfig, devices } from "@playwright/test";

const APP_PORT = 3100;
const APP_URL = `http://localhost:${APP_PORT}`;

export default defineConfig({
  testDir: "./tests/instant",
  testMatch: "**/*.instant.ts",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: APP_URL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `bun run start --port ${APP_PORT}`,
    reuseExistingServer: false,
    url: APP_URL,
  },
  projects: [
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
