/**
 * EditFlashcardDialog Page Object
 * Represents the flashcard edit dialog with all its interactions
 */

import { type Page, type Locator } from "@playwright/test";

export class EditFlashcardDialog {
  readonly page: Page;
  readonly dialog: Locator;
  readonly frontInput: Locator;
  readonly backInput: Locator;
  readonly cancelButton: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByTestId("edit-flashcard-dialog");
    this.frontInput = page.getByTestId("edit-flashcard-front-input");
    this.backInput = page.getByTestId("edit-flashcard-back-input");
    this.cancelButton = page.getByTestId("edit-flashcard-cancel-btn");
    this.saveButton = page.getByTestId("edit-flashcard-save-btn");
  }

  /**
   * Wait for the dialog to be visible
   */
  async waitForVisible() {
    await this.dialog.waitFor({ state: "visible" });
  }

  /**
   * Wait for the dialog to be hidden
   */
  async waitForHidden() {
    await this.dialog.waitFor({ state: "hidden" });
  }

  /**
   * Check if the dialog is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.dialog.isVisible();
  }

  /**
   * Get the current value of the front input
   */
  async getFrontValue(): Promise<string> {
    return await this.frontInput.inputValue();
  }

  /**
   * Get the current value of the back input
   */
  async getBackValue(): Promise<string> {
    return await this.backInput.inputValue();
  }

  /**
   * Fill the front (question) input
   */
  async fillFront(text: string) {
    await this.frontInput.fill(text);
  }

  /**
   * Fill the back (answer) input
   */
  async fillBack(text: string) {
    await this.backInput.fill(text);
  }

  /**
   * Append text to the existing front input value
   */
  async appendToFront(text: string) {
    const currentValue = await this.getFrontValue();
    await this.fillFront(currentValue + text);
  }

  /**
   * Append text to the existing back input value
   */
  async appendToBack(text: string) {
    const currentValue = await this.getBackValue();
    await this.fillBack(currentValue + text);
  }

  /**
   * Edit the flashcard with new front and back text
   * @param front - New front text (or undefined to keep current)
   * @param back - New back text (or undefined to keep current)
   */
  async editFlashcard(front?: string, back?: string) {
    if (front !== undefined) {
      await this.fillFront(front);
    }
    if (back !== undefined) {
      await this.fillBack(back);
    }
  }

  /**
   * Save the changes and close the dialog
   * @param waitForClose - Whether to wait for the dialog to close (default: true)
   */
  async save(waitForClose = true) {
    await this.saveButton.click();
    if (waitForClose) {
      await this.waitForHidden();
      // Wait for data refresh
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Cancel the edit and close the dialog
   * @param waitForClose - Whether to wait for the dialog to close (default: true)
   */
  async cancel(waitForClose = true) {
    await this.cancelButton.click();
    if (waitForClose) {
      await this.waitForHidden();
    }
  }

  /**
   * Complete edit flow: edit and save
   */
  async editAndSave(front?: string, back?: string) {
    await this.waitForVisible();
    await this.editFlashcard(front, back);
    await this.save();
  }

  /**
   * Check if save button is disabled
   */
  async isSaveDisabled(): Promise<boolean> {
    return await this.saveButton.isDisabled();
  }

  /**
   * Check if the dialog is in submitting state
   */
  async isSubmitting(): Promise<boolean> {
    const text = await this.saveButton.textContent();
    return text?.includes("Zapisywanie") || false;
  }
}
