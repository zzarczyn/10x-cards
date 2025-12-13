/**
 * FlashcardItem Page Object
 * Represents a single flashcard item with all its interactions
 */

import { type Page, type Locator } from "@playwright/test";

export class FlashcardItem {
  readonly page: Page;
  readonly index: number;
  readonly container: Locator;
  readonly frontText: Locator;
  readonly backText: Locator;
  readonly flipButton: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;

  constructor(page: Page, index: number) {
    this.page = page;
    this.index = index;
    this.container = page.getByTestId(`flashcard-item-${index}`);
    this.frontText = page.getByTestId(`flashcard-front-${index}`);
    this.backText = page.getByTestId(`flashcard-back-${index}`);
    this.flipButton = page.getByTestId(`flashcard-flip-btn-${index}`);
    this.editButton = page.getByTestId(`flashcard-edit-btn-${index}`);
    this.deleteButton = page.getByTestId(`flashcard-delete-btn-${index}`);
  }

  /**
   * Hover over the flashcard to reveal action buttons
   */
  async hover() {
    await this.container.hover();
  }

  /**
   * Get the front (question) text of the flashcard
   */
  async getFrontText(): Promise<string> {
    const text = await this.frontText.textContent();
    return text || "";
  }

  /**
   * Get the back (answer) text of the flashcard
   */
  async getBackText(): Promise<string> {
    const text = await this.backText.textContent();
    return text || "";
  }

  /**
   * Flip the flashcard to see the other side
   * @param waitForAnimation - Whether to wait for flip animation (default: true)
   */
  async flip(waitForAnimation = true) {
    await this.flipButton.click();
    if (waitForAnimation) {
      // Wait for flip animation to complete (500ms + buffer)
      await this.page.waitForTimeout(600);
    }
  }

  /**
   * Click the flashcard container to flip it
   */
  async clickToFlip(waitForAnimation = true) {
    await this.container.click();
    if (waitForAnimation) {
      await this.page.waitForTimeout(600);
    }
  }

  /**
   * Open the edit dialog for this flashcard
   */
  async openEditDialog() {
    await this.hover();
    await this.editButton.click();
  }

  /**
   * Open the delete confirmation dialog for this flashcard
   */
  async openDeleteDialog() {
    await this.hover();
    await this.deleteButton.click();
  }

  /**
   * Check if the flashcard is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.container.isVisible();
  }

  /**
   * Wait for the flashcard to be visible
   */
  async waitForVisible() {
    await this.container.waitFor({ state: "visible" });
  }
}
