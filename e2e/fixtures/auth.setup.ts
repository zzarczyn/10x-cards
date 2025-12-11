/**
 * Playwright Auth Setup
 * Reusable authentication fixtures
 */

/* eslint-disable react-hooks/rules-of-hooks */
// Playwright uses 'use' as a parameter name in fixtures (not a React hook)

import { test as base, type Page } from "@playwright/test";
import { faker } from "@faker-js/faker";

interface AuthenticatedPageFixture {
  authenticatedPage: Page;
}

// Extend basic test with authenticated user fixture
export const test = base.extend<AuthenticatedPageFixture>({
  // Playwright fixtures use 'use' keyword (not React hook)
  authenticatedPage: async ({ page }, use) => {
    // Perform authentication steps
    await page.goto("/auth/login");

    // TODO: Add actual authentication logic
    // For now, this is a placeholder

    await use(page);

    // Cleanup if needed
  },
});

export { expect } from "@playwright/test";

/**
 * Generate test user credentials
 */
export function generateTestUser() {
  return {
    email: faker.internet.email(),
    password: faker.internet.password({ length: 12, memorable: true }),
  };
}
