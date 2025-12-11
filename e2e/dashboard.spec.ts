/**
 * E2E Tests for Dashboard
 * Tests flashcard generation, management, and review features
 */

import { test, expect } from "@playwright/test";
import { DashboardPage } from "./pages/DashboardPage";
import { generateMockTextContent } from "../tests/utils/faker-setup";

test.describe("Dashboard", () => {
  test.describe("Navigation", () => {
    test.skip("should display dashboard after login", async ({ page }) => {
      // Skip: Requires auth setup
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      await expect(dashboardPage.welcomeHeading).toBeVisible();
      await expect(dashboardPage.generatorTab).toBeVisible();
      await expect(dashboardPage.knowledgeBaseTab).toBeVisible();
    });

    test.skip("should switch between tabs", async ({ page }) => {
      // Skip: Requires auth setup
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Start on generator tab (default)
      await expect(dashboardPage.generatorTab).toHaveAttribute("data-state", "active");

      // Switch to knowledge base
      await dashboardPage.switchToKnowledgeBaseTab();
      await expect(dashboardPage.knowledgeBaseTab).toHaveAttribute("data-state", "active");

      // Switch back to generator
      await dashboardPage.switchToGeneratorTab();
      await expect(dashboardPage.generatorTab).toHaveAttribute("data-state", "active");
    });
  });

  test.describe("Flashcard Generation", () => {
    test.skip("should generate flashcards from text", async ({ page }) => {
      // Skip: Requires auth setup and API mocking
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      const textContent = generateMockTextContent(3);

      await dashboardPage.generateFlashcards(textContent);

      // Wait for generation to complete
      await expect(dashboardPage.generateButton).toBeEnabled({
        timeout: 30000,
      });

      // Should display generated flashcards
      const flashcardsCount = await dashboardPage.getFlashcardsCount();
      expect(flashcardsCount).toBeGreaterThan(0);
    });

    test.skip("should show validation error for empty text", async ({ page }) => {
      // Skip: Requires auth setup
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      await dashboardPage.generateButton.click();

      // Should show validation error
      await expect(page.getByText(/text.*required|paste.*text/i)).toBeVisible();
    });

    test.skip("should show loading state during generation", async ({ page }) => {
      // Skip: Requires auth setup
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      const textContent = generateMockTextContent(3);
      await dashboardPage.textInput.fill(textContent);
      await dashboardPage.generateButton.click();

      // Button should be disabled during generation
      await expect(dashboardPage.generateButton).toBeDisabled();

      // Should show loading indicator
      await expect(page.getByText(/generating|loading/i)).toBeVisible();
    });
  });

  test.describe("Flashcard Management", () => {
    test.skip("should edit flashcard", async ({ page }) => {
      // Skip: Requires auth and existing flashcards
      await page.goto("/");

      // Navigate to knowledge base
      await page.getByRole("tab", { name: /knowledge base/i }).click();

      // Click edit on first flashcard
      await page.locator('[data-testid="flashcard-item"]').first().getByRole("button", { name: /edit/i }).click();

      // Edit dialog should be visible
      await expect(page.getByRole("dialog", { name: /edit/i })).toBeVisible();

      // Modify question
      const questionInput = page.getByLabel(/question/i);
      await questionInput.clear();
      await questionInput.fill("Updated question");

      // Save changes
      await page.getByRole("button", { name: /save/i }).click();

      // Should show success message
      await expect(page.getByText(/saved|updated/i)).toBeVisible();
    });

    test.skip("should delete flashcard", async ({ page }) => {
      // Skip: Requires auth and existing flashcards
      await page.goto("/");

      // Navigate to knowledge base
      await page.getByRole("tab", { name: /knowledge base/i }).click();

      const initialCount = await page.locator('[data-testid="flashcard-item"]').count();

      // Click delete on first flashcard
      await page
        .locator('[data-testid="flashcard-item"]')
        .first()
        .getByRole("button", { name: /delete/i })
        .click();

      // Confirm deletion in dialog
      await expect(page.getByRole("alertdialog", { name: /delete/i })).toBeVisible();
      await page.getByRole("button", { name: /confirm|delete/i }).click();

      // Flashcard count should decrease
      await expect(page.locator('[data-testid="flashcard-item"]')).toHaveCount(initialCount - 1);
    });

    test.skip("should filter flashcards by source", async ({ page }) => {
      // Skip: Requires auth and existing flashcards
      await page.goto("/");

      await page.getByRole("tab", { name: /knowledge base/i }).click();

      // Apply filter
      await page.getByRole("button", { name: /filter/i }).click();
      await page.getByRole("menuitem", { name: /ai-full/i }).click();

      // Should display only AI-generated flashcards
      const flashcards = page.locator('[data-testid="flashcard-item"]');
      const count = await flashcards.count();

      for (let i = 0; i < count; i++) {
        await expect(flashcards.nth(i)).toContainText(/ai-full/i);
      }
    });
  });

  test.describe("Review Mode", () => {
    test.skip("should start review session", async ({ page }) => {
      // Skip: Requires auth and existing flashcards
      await page.goto("/");

      await page.getByRole("button", { name: /start review|review/i }).click();

      // Should display review card
      await expect(page.getByTestId("review-card")).toBeVisible();
      await expect(page.getByRole("button", { name: /show answer/i })).toBeVisible();
    });

    test.skip("should flip flashcard to show answer", async ({ page }) => {
      // Skip: Requires auth and review session
      await page.goto("/");

      await page.getByRole("button", { name: /start review/i }).click();

      // Initially should show question only
      await expect(page.getByTestId("review-question")).toBeVisible();
      await expect(page.getByTestId("review-answer")).not.toBeVisible();

      // Show answer
      await page.getByRole("button", { name: /show answer/i }).click();

      // Answer should now be visible
      await expect(page.getByTestId("review-answer")).toBeVisible();
    });

    test.skip("should navigate through flashcards in review", async ({ page }) => {
      // Skip: Requires auth and review session
      await page.goto("/");

      await page.getByRole("button", { name: /start review/i }).click();

      // Navigate to next card
      await page.getByRole("button", { name: /next/i }).click();

      // Card should change (check by question text changing)
      // Implementation depends on actual review component
    });
  });

  test.describe("Pagination", () => {
    test.skip("should paginate flashcard list", async ({ page }) => {
      // Skip: Requires auth and many flashcards
      await page.goto("/");

      await page.getByRole("tab", { name: /knowledge base/i }).click();

      // Click next page
      await page.getByRole("button", { name: /next page/i }).click();

      // URL should update with page parameter
      await expect(page).toHaveURL(/[?&]page=2/);

      // Should load different flashcards
      await expect(page.locator('[data-testid="flashcard-item"]')).toHaveCount(10);
    });
  });
});
