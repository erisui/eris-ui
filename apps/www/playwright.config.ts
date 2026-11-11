import { defineConfig, devices } from "@playwright/test";

const executablePath = process.env.CHROME_PATH;

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:4340", trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], ...(executablePath ? { launchOptions: { executablePath } } : {}) },
    },
  ],
  webServer: {
    command: "pnpm exec astro preview --port 4340 --ignore-lock",
    url: "http://localhost:4340",
    reuseExistingServer: !process.env.CI,
  },
});
