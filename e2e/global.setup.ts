/**
 * Playwright Global Setup
 * Performs one-time authentication and saves storage state
 * This is the most efficient approach - login once, reuse for all tests
 */

/* eslint-disable no-console */

import { chromium, type FullConfig } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Storage state file path
 */
export const STORAGE_STATE_PATH = path.join(__dirname, ".auth", "user.json");

/**
 * Global setup function - runs once before all tests
 */
async function globalSetup(config: FullConfig) {
  console.log("🔐 Starting global authentication setup...");

  // Create .auth directory if it doesn't exist
  const authDir = path.join(__dirname, ".auth");
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Get base URL from environment variable or config
  const baseURL = process.env.BASE_URL || config.projects[0].use.baseURL || "http://localhost:3000";

  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Get test credentials
    const testEmail = process.env.TEST_USER_EMAIL || "test@example.com";
    const testPassword = process.env.TEST_USER_PASSWORD || "testpassword123";

    console.log(`📧 Logging in as: ${testEmail}`);
    console.log(`🌐 Base URL: ${baseURL}`);

    // Perform login
    const loginPage = new LoginPage(page);
    await page.goto(`${baseURL}/auth/login`);
    console.log(`📍 Navigated to: ${page.url()}`);

    // Wait for page to be fully loaded
    await page.waitForLoadState("networkidle");

    await loginPage.login(testEmail, testPassword);
    console.log(`⌛ Waiting for navigation after login...`);

    // Wait for either redirect or error message
    try {
      await Promise.race([
        loginPage.waitForNavigation(),
        page.waitForSelector('[role="alert"]', { timeout: 5000 }).then(() => {
          throw new Error("Login error message appeared");
        }),
      ]);
    } catch (error) {
      if (error instanceof Error && error.message === "Login error message appeared") {
        const errorText = await loginPage.getErrorText();
        throw new Error(`❌ Authentication failed with error: ${errorText}`);
      }
      throw error;
    }

    // Verify we're logged in by checking we're not on login page
    const currentURL = page.url();
    console.log(`📍 After login URL: ${currentURL}`);

    if (currentURL.includes("/auth/login")) {
      // Take a screenshot for debugging
      await page.screenshot({ path: "e2e/.auth/login-failure.png" });
      throw new Error("❌ Authentication failed - still on login page. Check credentials in .env.test");
    }

    console.log("✅ Authentication successful!");

    // Save storage state (cookies, localStorage, sessionStorage)
    await context.storageState({ path: STORAGE_STATE_PATH });
    console.log(`💾 Storage state saved to: ${STORAGE_STATE_PATH}`);
  } catch (error) {
    console.error("❌ Global setup failed:", error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }

  console.log("🎉 Global setup completed successfully!\n");
}

export default globalSetup;
