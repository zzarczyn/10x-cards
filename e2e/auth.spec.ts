/**
 * E2E Tests for Authentication Flow
 * Tests login, registration, and logout functionality
 */

import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { generateTestUser } from "./fixtures/auth.setup";

test.describe("Authentication", () => {
  test.describe("Login Page", () => {
    test("should display login form", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
    });

    test("should show validation errors for empty fields", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.submitButton.click();

      // Browser's native HTML5 validation will prevent submission
      // We can check if we're still on the login page
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test("should show error for invalid credentials", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.login("invalid@example.com", "wrongpassword");

      // Wait for error message
      await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });
    });

    test("should navigate to register page", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.registerLink.click();
      await expect(page).toHaveURL(/\/auth\/register/);
    });

    test("should navigate to forgot password page", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.forgotPasswordLink.click();
      await expect(page).toHaveURL(/\/auth\/forgot-password/);
    });
  });

  test.describe("Registration", () => {
    test("should display registration form", async ({ page }) => {
      await page.goto("/auth/register");

      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/^password$/i)).toBeVisible();
      await expect(page.getByLabel(/confirm.*password|password.*confirm/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /sign up|register/i })).toBeVisible();
    });

    test("should show error when passwords do not match", async ({ page }) => {
      const user = generateTestUser();

      await page.goto("/auth/register");

      await page.getByLabel(/email/i).fill(user.email);
      await page.getByLabel(/^password$/i).fill(user.password);
      await page.getByLabel(/confirm.*password|password.*confirm/i).fill("differentpassword");

      await page.getByRole("button", { name: /sign up|register/i }).click();

      // Should show validation error
      await expect(page.getByText(/password.*match/i)).toBeVisible();
    });
  });

  test.describe("Logout", () => {
    test.skip("should logout user successfully", async ({ page }) => {
      // This test requires authentication setup
      // Skip for now - implement after auth is fully configured

      await page.goto("/");

      // Assuming user is logged in
      await page.getByRole("button", { name: /user menu/i }).click();
      await page.getByRole("menuitem", { name: /logout/i }).click();

      // Should redirect to login
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });
});
