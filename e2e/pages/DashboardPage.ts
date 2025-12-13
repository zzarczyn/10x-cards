/**
 * Dashboard Page Object
 * Page Object Model for dashboard interactions
 */

import { type Page, type Locator } from "@playwright/test";
import { KnowledgeBaseTab } from "../page-objects/KnowledgeBaseTab";

export class DashboardPage {
  readonly page: Page;
  readonly welcomeHeading: Locator;
  readonly generatorTab: Locator;
  readonly knowledgeBaseTab: Locator;
  readonly generatorContent: Locator;
  readonly knowledgeBaseContent: Locator;
  readonly textInput: Locator;
  readonly generateButton: Locator;
  readonly flashcardsList: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;
  readonly knowledgeBase: KnowledgeBaseTab;

  constructor(page: Page) {
    this.page = page;
    this.welcomeHeading = page.getByRole("heading", { level: 1 });

    // Tabs using data-testid
    this.generatorTab = page.getByTestId("tab-generator");
    this.knowledgeBaseTab = page.getByTestId("tab-knowledge-base");
    this.generatorContent = page.getByTestId("tab-content-generator");
    this.knowledgeBaseContent = page.getByTestId("tab-content-knowledge-base");

    // Generator tab elements
    this.textInput = page.getByPlaceholder(/paste.*text|wklej.*tekst/i);
    this.generateButton = page.getByRole("button", {
      name: /generate|generuj/i,
    });
    this.flashcardsList = page.getByRole("list").filter({
      has: page.locator('[data-testid*="flashcard"]'),
    });

    // User menu
    this.userMenu = page.getByRole("button", { name: /user menu|menu/i });
    this.logoutButton = page.getByRole("menuitem", { name: /logout|wyloguj/i });

    // Knowledge Base Tab page object
    this.knowledgeBase = new KnowledgeBaseTab(page);
  }

  async goto() {
    await this.page.goto("/");
  }

  async switchToGeneratorTab() {
    await this.generatorTab.click();
    await this.generatorContent.waitFor({ state: "visible" });
  }

  async switchToKnowledgeBaseTab() {
    // Ensure the tab button is visible and clickable
    await this.knowledgeBaseTab.waitFor({ state: "visible" });
    await this.knowledgeBaseTab.click({ force: true });

    // Wait for content to become visible
    await this.knowledgeBaseContent.waitFor({ state: "visible", timeout: 15000 });
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
