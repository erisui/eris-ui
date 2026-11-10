import { defineConfig, devices } from "@playwright/test";

// CHROME_PATH lets you run against an installed Chrome instead of Playwright's download.
const executablePath = process.env.CHROME_PATH;

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4321",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], ...(executablePath ? { launchOptions: { executablePath } } : {}) },
    },
  ],
  webServer: {
    command: "pnpm exec astro preview --port 4321 --ignore-lock",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
  },
});
