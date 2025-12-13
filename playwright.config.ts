import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

/**
 * Playwright E2E Testing Configuration
 * Following guidelines: Chromium only, parallel execution, trace on failure
 */
export default defineConfig({
  // Test directory
  testDir: "./e2e",

  // Global setup - authenticate once and save state
  globalSetup: "./e2e/global.setup.ts",

  // Fully parallel execution for faster runs
  fullyParallel: true,

  // Fail the build on CI if tests were accidentally left in test.only
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Parallel workers
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [["html"], ["list"], ["json", { outputFile: "test-results/results.json" }]],

  // Shared test configuration
  use: {
    // Base URL for testing
    baseURL: process.env.BASE_URL || "http://localhost:3000",

    // Collect trace on first retry for debugging
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Video on failure
    video: "retain-on-failure",

    // Context options
    viewport: { width: 1280, height: 720 },

    // Artifacts
    actionTimeout: 10000,
  },

  // Configure projects - Chromium only as per guidelines
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use saved authentication state for all tests
        storageState: "./e2e/.auth/user.json",
      },
    },
  ],

  // Web server configuration
  // Note: Start dev server manually with 'npm run dev' or configure this section
  webServer: process.env.CI
    ? {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: false,
        timeout: 120000,
      }
    : undefined,

  // Output folder
  outputDir: "test-results/",
});
