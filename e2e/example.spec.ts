/**
 * Example E2E Test
 * Demonstrates Playwright best practices and Page Object Model usage
 */

import { test, expect } from "@playwright/test";

test.describe("Example E2E Tests", () => {
  test("should load the home page", async ({ page }) => {
    await page.goto("/");

    // Page should load successfully
    await expect(page).toHaveTitle(/10xCards/i);
  });

  test("should have accessible navigation", async ({ page }) => {
    await page.goto("/");

    // Navigation should be accessible
    const nav = page.getByRole("navigation");
    await expect(nav).toBeVisible();
  });

  test("should handle responsive design", async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    await expect(page).toHaveURL("/");
  });

  test("should capture screenshot on failure", async ({ page }) => {
    await page.goto("/");

    // This will capture a screenshot if it fails
    await expect(page.locator("body")).toBeVisible();
  });

  test("should check page performance", async ({ page }) => {
    await page.goto("/");

    // Wait for page to be fully loaded
    await page.waitForLoadState("networkidle");

    // Page should load within reasonable time
    // Performance checks can be added here
  });

  test("should handle keyboard navigation", async ({ page }) => {
    await page.goto("/");

    // Test keyboard navigation
    await page.keyboard.press("Tab");

    // First focusable element should be focused
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test.describe("API Testing", () => {
    test("should intercept and mock API calls", async ({ page }) => {
      // Mock API response
      await page.route("**/api/flashcards", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{ id: "1", question: "Test Q", answer: "Test A" }]),
        });
      });

      await page.goto("/");

      // API call should be intercepted
    });

    test("should handle API errors gracefully", async ({ page }) => {
      // Mock API error
      await page.route("**/api/flashcards", (route) => {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal Server Error" }),
        });
      });

      await page.goto("/");

      // App should handle error gracefully
    });
  });

  test.describe("Visual Regression Testing", () => {
    test.skip("should match visual snapshot", async ({ page }) => {
      // Skip by default - enable when baseline screenshots are established
      await page.goto("/");

      // Take screenshot and compare with baseline
      await expect(page).toHaveScreenshot("homepage.png");
    });
  });
});
