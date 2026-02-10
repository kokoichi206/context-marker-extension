import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "specs/**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5678",
  },
  webServer: {
    command: "npx serve e2e/pages -p 5678 --no-clipboard",
    port: 5678,
    reuseExistingServer: !process.env.CI,
  },
});
