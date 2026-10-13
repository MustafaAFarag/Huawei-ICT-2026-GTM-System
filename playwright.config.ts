import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
if (existsSync(".env")) process.loadEnvFile(".env");
export default defineConfig({
  testDir: "./e2e",
  timeout: 120000,
  expect: { timeout: 30000 },
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.TEST_BASE_URL ?? "http://localhost:3100",
    browserName: "chromium",
    launchOptions: {
      executablePath:
        process.env.CHROME_PATH === "playwright"
          ? undefined
          : (process.env.CHROME_PATH ?? "/usr/bin/google-chrome-stable"),
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
