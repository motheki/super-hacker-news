import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  outputDir: "./.artifacts/results",
  reporter: [["list"], ["html", { outputFolder: fileURLToPath(new URL("./.artifacts/report", import.meta.url)), open: "never" }]],
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: { baseURL: process.env.TEST_BASE_URL ?? "http://127.0.0.1:4330", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.TEST_BASE_URL ? undefined : {
    command: "bun __tests_/build-fixture.ts && node node_modules/wrangler/bin/wrangler.js dev --config wrangler.jsonc --assets __tests_/.artifacts/site --ip 127.0.0.1 --port 4330 --local --log-level warn",
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    url: "http://127.0.0.1:4330/search",
    timeout: 60_000,
    reuseExistingServer: false,
  },
});
