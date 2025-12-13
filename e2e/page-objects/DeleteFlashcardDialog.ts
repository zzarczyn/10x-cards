/**
 * DeleteFlashcardDialog Page Object
 * Represents the flashcard delete confirmation dialog
 */

import { type Page, type Locator } from "@playwright/test";

export class DeleteFlashcardDialog {
  readonly page: Page;
  readonly dialog: Locator;
  readonly cancelButton: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByTestId("delete-flashcard-dialog");
    this.cancelButton = page.getByTestId("delete-flashcard-cancel-btn");
    this.confirmButton = page.getByTestId("delete-flashcard-confirm-btn");
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
   * Confirm the deletion
   * @param waitForClose - Whether to wait for the dialog to close (default: true)
   */
  async confirm(waitForClose = true) {
    await this.confirmButton.click();
    if (waitForClose) {
      await this.waitForHidden();
      // Wait for data refresh
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Cancel the deletion
   * @param waitForClose - Whether to wait for the dialog to close (default: true)
   */
  async cancel(waitForClose = true) {
    await this.cancelButton.click();
    if (waitForClose) {
      await this.waitForHidden();
    }
  }

  /**
   * Check if confirm button is disabled
   */
  async isConfirmDisabled(): Promise<boolean> {
    return await this.confirmButton.isDisabled();
  }

  /**
   * Check if the dialog is in deleting state
   */
  async isDeleting(): Promise<boolean> {
    const text = await this.confirmButton.textContent();
    return text?.includes("Usuwanie") || false;
  }
}
