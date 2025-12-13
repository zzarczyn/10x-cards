/**
 * Flashcard Edit Flow Test (Using Storage State)
 * This version uses global authentication setup (most efficient)
 *
 * The user is automatically logged in via storage state configured in playwright.config.ts
 * No additional auth code needed in the test!
 */

import { test, expect } from "@playwright/test";
import { DashboardPage } from "./pages/DashboardPage";

test.describe("Flashcard Edit Flow (With Storage State)", () => {
  test("should edit first flashcard by adding random letters to front and back", async ({ page }) => {
    // ===== ARRANGE =====
    // User is already logged in via storage state!
    const dashboard = new DashboardPage(page);

    // 1. Przejdź do zakładki KnowledgeBaseTab
    await dashboard.goto();

    // Wait for React hydration to complete
    await page.waitForLoadState("networkidle");

    await dashboard.switchToKnowledgeBaseTab();

    // 2. Poczekaj aż załadują się wszystkie fiszki
    await dashboard.knowledgeBase.waitForFlashcards();

    // Upewnij się, że jest przynajmniej jedna fiszka
    const hasFlashcards = await dashboard.knowledgeBase.hasFlashcards();
    expect(hasFlashcards).toBe(true);

    // Pobierz pierwszą fiszkę
    const firstFlashcard = dashboard.knowledgeBase.getFirstFlashcard();
    await expect(firstFlashcard.container).toBeVisible();

    // Zapisz oryginalne treści przed edycją
    const originalFront = await firstFlashcard.getFrontText();
    const originalBack = await firstFlashcard.getBackText();

    expect(originalFront).toBeTruthy();
    expect(originalBack).toBeTruthy();

    // Wygeneruj losowe litery
    const randomLettersFront = generateRandomLetters(5);
    const randomLettersBack = generateRandomLetters(10);

    // ===== ACT =====
    // 3. Otwórz dialog edycji pierwszej fiszki
    await firstFlashcard.openEditDialog();
    await dashboard.knowledgeBase.editDialog.waitForVisible();

    // 4. Dodaj 5 losowych liter na końcu pytania
    await dashboard.knowledgeBase.editDialog.appendToFront(randomLettersFront);

    // 5. Dodaj 10 losowych liter na końcu odpowiedzi
    await dashboard.knowledgeBase.editDialog.appendToBack(randomLettersBack);

    // 6. Zapisz wprowadzone zmiany
    await dashboard.knowledgeBase.editDialog.save();

    // ===== ASSERT =====
    // 7. Sprawdź czy w pytaniu znajduje się 5 wprowadzonych liter
    const updatedFront = await firstFlashcard.getFrontText();
    expect(updatedFront).toContain(randomLettersFront);
    expect(updatedFront).toBe(`${originalFront}${randomLettersFront}`);

    // 8. Sprawdź czy w odpowiedzi znajduje się 10 wprowadzonych liter
    // Najpierw obróć fiszkę, żeby zobaczyć tył
    await firstFlashcard.flip();

    const updatedBack = await firstFlashcard.getBackText();
    expect(updatedBack).toContain(randomLettersBack);
    expect(updatedBack).toBe(`${originalBack}${randomLettersBack}`);
  });
});

/**
 * Generuje losowy ciąg liter (małe litery a-z)
 * @param length - długość ciągu do wygenerowania
 * @returns losowy ciąg liter
 */
function generateRandomLetters(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
