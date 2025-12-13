/**
 * KnowledgeBaseTab Page Object
 * Represents the Knowledge Base tab with all flashcards
 */

import { type Page, type Locator } from "@playwright/test";
import { FlashcardItem } from "./FlashcardItem";
import { EditFlashcardDialog } from "./EditFlashcardDialog";
import { DeleteFlashcardDialog } from "./DeleteFlashcardDialog";

export class KnowledgeBaseTab {
  readonly page: Page;
  readonly container: Locator;
  readonly loadingIndicator: Locator;
  readonly flashcardsGrid: Locator;
  readonly editDialog: EditFlashcardDialog;
  readonly deleteDialog: DeleteFlashcardDialog;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("knowledge-base-tab");
    this.loadingIndicator = page.getByTestId("flashcards-loading");
    this.flashcardsGrid = page.getByTestId("flashcards-grid");
    this.editDialog = new EditFlashcardDialog(page);
    this.deleteDialog = new DeleteFlashcardDialog(page);
  }

  /**
   * Wait for flashcards to finish loading
   * @param timeout - Maximum time to wait in milliseconds (default: 10000)
   */
  async waitForLoaded(timeout = 10000) {
    await this.loadingIndicator.waitFor({ state: "hidden", timeout });
    await this.flashcardsGrid.waitFor({ state: "visible" });
  }

  /**
   * Check if flashcards are currently loading
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingIndicator.isVisible();
  }

  /**
   * Get a flashcard item by index
   * @param index - Zero-based index of the flashcard
   */
  getFlashcard(index: number): FlashcardItem {
    return new FlashcardItem(this.page, index);
  }

  /**
   * Get the first flashcard
   */
  getFirstFlashcard(): FlashcardItem {
    return this.getFlashcard(0);
  }

  /**
   * Get the count of visible flashcards
   */
  async getFlashcardsCount(): Promise<number> {
    return await this.page.getByTestId(/^flashcard-item-\d+$/).count();
  }

  /**
   * Check if there are any flashcards
   */
  async hasFlashcards(): Promise<boolean> {
    const count = await this.getFlashcardsCount();
    return count > 0;
  }

  /**
   * Wait for at least one flashcard to be visible
   */
  async waitForFlashcards() {
    await this.waitForLoaded();
    const firstFlashcard = this.getFirstFlashcard();
    await firstFlashcard.waitForVisible();
  }

  /**
   * Edit a flashcard by index
   * @param index - Zero-based index of the flashcard
   * @param front - New front text (or undefined to keep current)
   * @param back - New back text (or undefined to keep current)
   */
  async editFlashcard(index: number, front?: string, back?: string) {
    const flashcard = this.getFlashcard(index);
    await flashcard.openEditDialog();
    await this.editDialog.editAndSave(front, back);
  }

  /**
   * Delete a flashcard by index
   * @param index - Zero-based index of the flashcard
   */
  async deleteFlashcard(index: number) {
    const flashcard = this.getFlashcard(index);
    await flashcard.openDeleteDialog();
    await this.deleteDialog.confirm();
  }

  /**
   * Edit the first flashcard
   * @param front - New front text (or undefined to keep current)
   * @param back - New back text (or undefined to keep current)
   */
  async editFirstFlashcard(front?: string, back?: string) {
    await this.editFlashcard(0, front, back);
  }

  /**
   * Delete the first flashcard
   */
  async deleteFirstFlashcard() {
    await this.deleteFlashcard(0);
  }
}
