/**
 * Login Page Object
 * Page Object Model for login page interactions
 */

import { type Page, type Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId("login-email-input");
    this.passwordInput = page.getByTestId("login-password-input");
    this.submitButton = page.getByTestId("login-submit-btn");
    this.errorMessage = page.getByRole("alert");
    this.forgotPasswordLink = page.getByRole("link", {
      name: /zapomniałeś hasła/i,
    });
    this.registerLink = page.getByRole("link", { name: /zarejestruj/i });
  }

  async goto() {
    await this.page.goto("/auth/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async waitForNavigation() {
    // Wait for navigation away from login page (to any page that doesn't contain /auth/)
    await this.page.waitForURL((url) => !url.pathname.includes("/auth/"), { timeout: 30000 });
  }

  async getErrorText() {
    return await this.errorMessage.textContent();
  }
}
