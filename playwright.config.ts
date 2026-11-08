import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  timeout: 180000,
  expect: { timeout: 15000 },
  use: {
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
          args: JSON.parse(process.env.PLAYWRIGHT_CHROMIUM_ARGS ?? "[]"),
        }
      : undefined,
    baseURL: "http://127.0.0.1:3100",
    actionTimeout: 15000,
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  reporter: "list",
});
