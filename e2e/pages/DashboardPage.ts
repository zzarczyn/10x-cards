/**
 * Dashboard Page Object
 * Page Object Model for dashboard interactions
 */

import { Page, Locator } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly welcomeHeading: Locator;
  readonly generatorTab: Locator;
  readonly knowledgeBaseTab: Locator;
  readonly textInput: Locator;
  readonly generateButton: Locator;
  readonly flashcardsList: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeHeading = page.getByRole("heading", { level: 1 });
    this.generatorTab = page.getByRole("tab", { name: /generator|generuj/i });
    this.knowledgeBaseTab = page.getByRole("tab", {
      name: /knowledge base|baza wiedzy/i,
    });
    this.textInput = page.getByPlaceholder(/paste.*text|wklej.*tekst/i);
    this.generateButton = page.getByRole("button", {
      name: /generate|generuj/i,
    });
    this.flashcardsList = page.getByRole("list").filter({
      has: page.locator('[data-testid*="flashcard"]'),
    });
    this.userMenu = page.getByRole("button", { name: /user menu|menu/i });
    this.logoutButton = page.getByRole("menuitem", { name: /logout|wyloguj/i });
  }

  async goto() {
    await this.page.goto("/");
  }

  async switchToGeneratorTab() {
    await this.generatorTab.click();
  }

  async switchToKnowledgeBaseTab() {
    await this.knowledgeBaseTab.click();
  }

  async generateFlashcards(text: string) {
    await this.textInput.fill(text);
    await this.generateButton.click();
  }

  async getFlashcardsCount() {
    return await this.flashcardsList.locator('[data-testid*="flashcard"]').count();
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutButton.click();
  }
}
