import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://saoviet.localhost:3000",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
