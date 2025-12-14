# Test Setup Documentation

Kompletna dokumentacja środowiska testowego dla projektu 10xCards.

## 📋 Spis treści

- [Przegląd](#przegląd)
- [Stack testowy](#stack-testowy)
- [Struktura projektu](#struktura-projektu)
- [Konfiguracja](#konfiguracja)
- [Uruchamianie testów](#uruchamianie-testów)
- [Pisanie testów](#pisanie-testów)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🎯 Przegląd

Projekt wykorzystuje dwa główne narzędzia testowe:

- **Vitest** - testy jednostkowe i integracyjne,
- **Playwright** - testy end-to-end (E2E),

## 🛠 Stack testowy

### Testy jednostkowe i integracyjne

- **Vitest** (v4.x) - framework testowy
- **@testing-library/react** - testowanie komponentów React
- **@testing-library/user-event** - symulacja interakcji użytkownika
- **@testing-library/jest-dom** - dodatkowe matchers dla DOM
- **MSW** (Mock Service Worker) - mockowanie API
- **@faker-js/faker** - generowanie danych testowych

### Testy E2E

- **Playwright** (v1.x) - framework E2E
- Chromium (Desktop Chrome) - zgodnie z wytycznymi projektu

## 📁 Struktura projektu

```
10xCards/
├── tests/                          # Testy jednostkowe i integracyjne
│   ├── setup/
│   │   └── vitest.setup.ts        # Globalna konfiguracja Vitest
│   ├── mocks/
│   │   ├── msw-server.ts          # Serwer MSW
│   │   └── handlers.ts            # Handlery API dla MSW
│   ├── utils/
│   │   ├── test-helpers.tsx       # Pomocnicze funkcje testowe
│   │   └── faker-setup.ts         # Generatory danych testowych
│   └── example.test.ts            # Przykładowy test
│
├── e2e/                            # Testy E2E
│   ├── fixtures/
│   │   └── auth.setup.ts          # Fixture autoryzacji
│   ├── pages/                     # Page Object Model
│   │   ├── LoginPage.ts
│   │   └── DashboardPage.ts
│   ├── auth.spec.ts               # Testy autoryzacji
│   ├── dashboard.spec.ts          # Testy dashboardu
│   └── example.spec.ts            # Przykładowe testy
│
├── src/                            # Kod źródłowy
│   ├── **/*.test.ts               # Testy jednostkowe obok kodu
│   └── **/*.test.tsx
│
├── vitest.config.ts               # Konfiguracja Vitest
├── playwright.config.ts           # Konfiguracja Playwright
└── TEST_SETUP.md                  # Ten plik
```

## ⚙️ Konfiguracja

### Vitest

Konfiguracja znajduje się w `vitest.config.ts`:

- **Environment**: jsdom (dla testów komponentów React)
- **Coverage**: v8 provider, threshold 70%
- **Setup files**: `tests/setup/vitest.setup.ts`
- **Path aliases**: `@/*` mapowany na `./src/*`

### Playwright

Konfiguracja znajduje się w `playwright.config.ts`:

- **Browser**: Chromium only (zgodnie z guidelines)
- **Parallel execution**: włączona
- **Base URL**: http://localhost:4321
- **Trace**: on-first-retry
- **Screenshots & Videos**: tylko przy błędach

### MSW (Mock Service Worker)

Konfiguracja mockowania API:

- `tests/mocks/msw-server.ts` - setup serwera
- `tests/mocks/handlers.ts` - definicje mock responses
- Automatyczne uruchamianie w `vitest.setup.ts`

## 🚀 Uruchamianie testów

### Testy jednostkowe (Vitest)

```bash
# Uruchom wszystkie testy jednostkowe
npm run test

# Watch mode (automatyczne uruchamianie przy zmianach)
npm run test:watch

# UI mode (interfejs webowy)
npm run test:ui

# Coverage report
npm run test:coverage
```

### Testy E2E (Playwright)

```bash
# Uruchom wszystkie testy E2E
npm run test:e2e

# UI mode (interaktywny debugger)
npm run test:e2e:ui

# Headed mode (widoczna przeglądarka)
npm run test:e2e:headed

# Debug mode (krok po kroku)
npm run test:e2e:debug

# Code generator (nagrywanie testów)
npm run test:e2e:codegen
```

### Uruchom wszystkie testy

```bash
npm run test:all
```

## ✍️ Pisanie testów

### Testy jednostkowe z Vitest

#### Struktura testu

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('MyComponent', () => {
  beforeEach(() => {
    // Setup przed każdym testem
  });

  it('should do something', () => {
    // Arrange (przygotowanie)
    const input = 'test';
    
    // Act (akcja)
    const result = myFunction(input);
    
    // Assert (sprawdzenie)
    expect(result).toBe('expected');
  });
});
```

#### Testowanie komponentów React

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from './MyComponent';

it('should handle click', async () => {
  const user = userEvent.setup();
  render(<MyComponent />);
  
  const button = screen.getByRole('button', { name: /click me/i });
  await user.click(button);
  
  expect(screen.getByText(/clicked/i)).toBeInTheDocument();
});
```

#### Mockowanie z vi

```typescript
import { vi } from 'vitest';

// Mock funkcji
const mockFn = vi.fn();
mockFn.mockReturnValue(42);

// Spy na metodzie
const spy = vi.spyOn(obj, 'method');

// Mock modułu
vi.mock('./module', () => ({
  exportedFunction: vi.fn(),
}));
```

#### Używanie Faker dla danych testowych

```typescript
import { generateMockFlashcard, generateMockUser } from '../tests/utils/faker-setup';

it('should create flashcard', () => {
  const flashcard = generateMockFlashcard({
    question: 'Custom question'
  });
  
  expect(flashcard).toHaveProperty('id');
  expect(flashcard.question).toBe('Custom question');
});
```

### Testy E2E z Playwright

#### Page Object Model

```typescript
// e2e/pages/MyPage.ts
import { Page, Locator } from '@playwright/test';

export class MyPage {
  readonly page: Page;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.submitButton = page.getByRole('button', { name: /submit/i });
  }

  async goto() {
    await this.page.goto('/my-page');
  }

  async submit() {
    await this.submitButton.click();
  }
}
```

#### Pisanie testów E2E

```typescript
import { test, expect } from '@playwright/test';
import { MyPage } from './pages/MyPage';

test('should submit form', async ({ page }) => {
  const myPage = new MyPage(page);
  await myPage.goto();
  
  await myPage.submit();
  
  await expect(page).toHaveURL(/\/success/);
});
```

#### Mockowanie API w Playwright

```typescript
test('should handle API response', async ({ page }) => {
  await page.route('**/api/data', (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({ data: 'mocked' }),
    });
  });
  
  await page.goto('/');
  // Testy z mockowanym API
});
```

## 📖 Best Practices

### Vitest

1. **Używaj vi object dla mocków** - `vi.fn()`, `vi.spyOn()`, `vi.mock()`
2. **Setup files dla globalnej konfiguracji** - DRY principle
3. **Inline snapshots** - `toMatchInlineSnapshot()` dla czytelności
4. **Watch mode podczas developmentu** - natychmiastowy feedback
5. **Arrange-Act-Assert** - czytelna struktura testów
6. **Strict TypeScript** - type safety w testach

### Playwright

1. **Chromium only** - zgodnie z guidelines projektu
2. **Page Object Model** - separacja logiki testów od implementacji
3. **Resilient locators** - `getByRole`, `getByLabel` zamiast selektorów CSS
4. **Hooks dla setup/teardown** - `beforeEach`, `afterEach`
5. **Parallelizacja** - szybsze wykonanie testów
6. **Trace viewer** - debugowanie nieudanych testów

### Ogólne

1. **Test isolation** - każdy test niezależny
2. **Descriptive names** - nazwa testu = dokumentacja
3. **Single responsibility** - jeden test = jedna funkcjonalność
4. **Avoid test interdependence** - testy nie zależą od kolejności
5. **Mock external dependencies** - kontrolowane środowisko testowe
6. **Keep tests fast** - szybki feedback loop

## 🔧 Troubleshooting

### Vitest

**Problem**: Błąd importu modułów

```bash
# Sprawdź konfigurację path aliases w vitest.config.ts
resolve: {
  alias: {
    '@': resolve(__dirname, './src'),
  },
}
```

**Problem**: Komponenty React nie renderują się

```bash
# Upewnij się, że używasz środowiska jsdom
test: {
  environment: 'jsdom',
}
```

**Problem**: MSW nie przechwytuje requestów

```bash
# Sprawdź czy serwer MSW jest uruchomiony w setup file
# tests/setup/vitest.setup.ts
```

### Playwright

**Problem**: Timeout podczas testów

```bash
# Zwiększ timeout w playwright.config.ts
use: {
  actionTimeout: 10000,
}
```

**Problem**: Browser nie uruchamia się

```bash
# Zainstaluj ponownie przeglądarki
npx playwright install chromium
```

**Problem**: Testy przechodzą lokalnie, ale nie w CI

```bash
# Sprawdź konfigurację CI w playwright.config.ts
retries: process.env.CI ? 2 : 0,
```

## 📊 Coverage Reports

### Generowanie raportów coverage

```bash
npm run test:coverage
```

Raport zostanie wygenerowany w katalogu `coverage/`:

- `coverage/index.html` - raport HTML
- `coverage/lcov.info` - format LCOV dla CI/CD

### Thresholdy coverage

Zgodnie z `test-plan.md`:

- **Services**: 80%
- **Components**: 70%
- **Overall**: 70%

## 🎓 Dodatkowe zasoby

### Dokumentacja

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Faker.js Documentation](https://fakerjs.dev/)

### Guidelines projektu

- `.cursor/rules/vitest-unit-testing.mdc` - wytyczne Vitest
- `.cursor/rules/playwright-e2e-testing.mdc` - wytyczne Playwright
- `.ai/tech-stack.md` - analiza stacku testowego
- `.ai/test-plan.md` - pełny plan testów

## 🚦 Status przygotowania środowiska

- ✅ Instalacja zależności
- ✅ Konfiguracja Vitest
- ✅ Konfiguracja Playwright
- ✅ Struktura katalogów
- ✅ Setup files
- ✅ MSW configuration
- ✅ Faker setup
- ✅ Page Object Models
- ✅ Przykładowe testy
- ✅ Skrypty npm
- ✅ .gitignore dla artefaktów testowych

**Środowisko testowe jest gotowe do użycia! 🎉**

