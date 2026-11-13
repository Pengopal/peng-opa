import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * Journeys run against the production build (`pnpm build` first): one Node process serving API + app,
 * its own OPA on port 8190, and the database from DATABASE_URL in the repo .env (unique users per run).
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "chromium", testIgnore: /mobile\.spec\.ts/, use: { ...devices["Desktop Chrome"], viewport: { width: 1400, height: 900 } } },
    { name: "mobile", testMatch: /mobile\.spec\.ts/, use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
  webServer: {
    command: "pnpm --filter server db:deploy && node ../server/dist/main.js",
    url: `http://localhost:${PORT}/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { PORT: String(PORT), APP_URL: `http://localhost:${PORT}`, OPA_PORT: "8190", OPA_URL: "" },
  },
});
