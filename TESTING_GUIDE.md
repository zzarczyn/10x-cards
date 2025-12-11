# Testing Guide - Quick Reference

Szybki przewodnik po testowaniu w projekcie 10xCards.

> **CI/CD Integration:** All tests described in this guide run automatically in GitHub Actions on every push to main/master. See [CI/CD Setup](CI_CD_SETUP.md) for details.

## 🏃 Quick Start

```bash
# Testy jednostkowe
npm run test              # Uruchom raz
npm run test:watch        # Watch mode
npm run test:ui           # UI mode

# Testy E2E
npm run test:e2e          # Uruchom wszystkie
npm run test:e2e:ui       # Interaktywny mode
npm run test:e2e:codegen  # Nagrywanie testów

# Coverage
npm run test:coverage     # Raport pokrycia
```

## 📝 Przykłady testów

### Test funkcji (Vitest)

```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from './utils';

describe('myFunction', () => {
  it('should return expected result', () => {
    expect(myFunction('input')).toBe('expected');
  });
});
```

### Test komponentu (Vitest + RTL)

```typescript
// src/components/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from './MyComponent';

it('should handle user interaction', async () => {
  const user = userEvent.setup();
  render(<MyComponent />);
  
  await user.click(screen.getByRole('button'));
  
  expect(screen.getByText(/success/i)).toBeInTheDocument();
});
```

### Test E2E (Playwright)

```typescript
// e2e/feature.spec.ts
import { test, expect } from '@playwright/test';

test('should complete user flow', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start/i }).click();
  await expect(page).toHaveURL(/\/success/);
});
```

### Test z Page Object

```typescript
// e2e/feature.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test('should login successfully', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password');
  await expect(page).toHaveURL('/dashboard');
});
```

## 🎯 Common Patterns

### Mockowanie funkcji

```typescript
import { vi } from 'vitest';

const mockFn = vi.fn();
mockFn.mockReturnValue(42);

expect(mockFn()).toBe(42);
expect(mockFn).toHaveBeenCalled();
```

### Mockowanie modułu

```typescript
vi.mock('./api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'mocked' }),
}));
```

### Generowanie danych testowych

```typescript
import { generateMockFlashcard } from '../tests/utils/faker-setup';

const flashcard = generateMockFlashcard({
  question: 'Custom question',
});
```

### Mockowanie API w E2E

```typescript
await page.route('**/api/data', (route) => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({ success: true }),
  });
});
```

## 🔍 Debugowanie

### Vitest

```bash
# UI mode - najlepszy do debugowania
npm run test:ui

# Filtrowanie testów
npm run test -- -t "test name"

# Pojedynczy plik
npm run test path/to/file.test.ts
```

### Playwright

```bash
# Debug mode - krok po kroku
npm run test:e2e:debug

# Headed mode - widoczna przeglądarka
npm run test:e2e:headed

# Trace viewer (po nieudanym teście)
npx playwright show-trace test-results/trace.zip
```

## 📊 Matchers

### Vitest / Jest-DOM

```typescript
// Equality
expect(value).toBe(expected);
expect(value).toEqual(expected);

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();

// Numbers
expect(value).toBeGreaterThan(3);
expect(value).toBeLessThanOrEqual(4);

// Strings
expect(text).toMatch(/pattern/);
expect(text).toContain('substring');

// Arrays
expect(arr).toContain(item);
expect(arr).toHaveLength(3);

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toMatchObject({ key: 'value' });

// DOM
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toBeDisabled();
expect(element).toHaveTextContent('text');
```

### Playwright

```typescript
// Page assertions
await expect(page).toHaveURL(/pattern/);
await expect(page).toHaveTitle(/title/);

// Element assertions
await expect(locator).toBeVisible();
await expect(locator).toBeHidden();
await expect(locator).toBeEnabled();
await expect(locator).toBeDisabled();
await expect(locator).toHaveText('text');
await expect(locator).toContainText('partial');
await expect(locator).toHaveAttribute('attr', 'value');
await expect(locator).toHaveCount(5);
```

## 🎨 Locators (Playwright)

```typescript
// Preferowane (accessibility-first)
page.getByRole('button', { name: /submit/i })
page.getByLabel('Email')
page.getByPlaceholder('Enter email')
page.getByText('Welcome')

// Inne
page.getByTestId('submit-btn')
page.locator('.my-class')
page.locator('#my-id')
```

## ⚡ Tips & Tricks

### Vitest

- Używaj `test.only` / `describe.only` do uruchamiania pojedynczych testów
- Używaj `test.skip` / `describe.skip` do pomijania testów
- Watch mode pokazuje tylko zmienione testy
- UI mode pozwala na filtrowanie i debugowanie w przeglądarce

### Playwright

- Code generator to najszybszy sposób na stworzenie testu
- Trace viewer pokazuje każdy krok testu z screenshotami
- Auto-wait eliminuje potrzebę ręcznych opóźnień
- Page Object Model sprawia że testy są łatwiejsze w utrzymaniu

## 📚 Więcej informacji

Pełna dokumentacja: [TEST_SETUP.md](./TEST_SETUP.md)

