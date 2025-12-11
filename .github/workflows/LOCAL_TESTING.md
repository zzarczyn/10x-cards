# Local Testing Guide

Przed wysłaniem kodu do repozytorium, uruchom te same sprawdzenia lokalnie co w CI/CD.

## Quick Check (przed każdym commitem)

```bash
# 1. Linting
npm run lint

# 2. Unit tests
npm run test -- --run

# 3. Build check
npm run build
```

**Czas wykonania:** ~3-5 minut

## Full Check (przed push do main)

```bash
# 1. Linting
npm run lint

# 2. Unit tests with coverage
npm run test:coverage

# 3. E2E tests
npm run test:e2e

# 4. Production build
npm run build

# 5. Preview build
npm run preview
```

**Czas wykonania:** ~8-12 minut

## Skrypt automatyczny

Stwórz plik `scripts/pre-push.sh`:

```bash
#!/bin/bash
set -e

echo "🔍 Running pre-push checks..."

echo "📝 Step 1/4: Linting..."
npm run lint

echo "🧪 Step 2/4: Unit tests..."
npm run test -- --run

echo "🎭 Step 3/4: E2E tests..."
npm run test:e2e

echo "🏗️  Step 4/4: Production build..."
npm run build

echo "✅ All checks passed! Ready to push."
```

Nadaj uprawnienia:
```bash
chmod +x scripts/pre-push.sh
```

Użycie:
```bash
./scripts/pre-push.sh
```

## Git Hook (automatyczne sprawdzanie)

Zainstaluj husky (już w projekcie):

```bash
# Inicjalizacja husky
npx husky install

# Dodaj pre-push hook
npx husky add .husky/pre-push "npm run lint && npm run test -- --run"
```

Teraz przed każdym `git push` automatycznie uruchomią się:
- Linting
- Unit tests

## Symulacja środowiska CI

Uruchom testy w trybie CI (bez watch mode):

```bash
# Ustaw zmienną CI
export CI=true

# Uruchom testy
npm run test -- --run
npm run test:e2e
```

## Sprawdzenie zmiennych środowiskowych

Przed uruchomieniem E2E lokalnie, upewnij się że masz `.env`:

```bash
# Sprawdź czy plik istnieje
test -f .env && echo "✅ .env exists" || echo "❌ .env missing"

# Sprawdź czy zawiera wymagane zmienne
grep -q "SUPABASE_URL" .env && echo "✅ SUPABASE_URL set" || echo "❌ SUPABASE_URL missing"
grep -q "SUPABASE_KEY" .env && echo "✅ SUPABASE_KEY set" || echo "❌ SUPABASE_KEY missing"
grep -q "OPENROUTER_API_KEY" .env && echo "✅ OPENROUTER_API_KEY set" || echo "❌ OPENROUTER_API_KEY missing"
```

## Debugowanie testów

### Unit Tests (Vitest)

```bash
# UI mode (interaktywny)
npm run test:ui

# Watch mode (automatyczne re-run)
npm run test:watch

# Pojedynczy plik
npm run test -- src/lib/utils.test.ts

# Z coverage
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
# UI mode (interaktywny)
npm run test:e2e:ui

# Headed mode (widoczna przeglądarka)
npm run test:e2e:headed

# Debug mode (krok po kroku)
npm run test:e2e:debug

# Pojedynczy test
npx playwright test e2e/auth.spec.ts

# Konkretny test case
npx playwright test -g "should login successfully"
```

## Porównanie: Local vs CI

| Check | Local | CI | Różnica |
|-------|-------|----|------------|
| **Lint** | `npm run lint` | ✅ Identyczne | Brak |
| **Unit Tests** | `npm run test -- --run` | ✅ Identyczne | Brak |
| **E2E Tests** | `npm run test:e2e` | ✅ Identyczne | CI używa `CI=true` |
| **Build** | `npm run build` | ✅ Identyczne | CI używa secrets |
| **Node version** | Twoja lokalna | 22.20.0 (z `.nvmrc`) | Użyj nvm/fnm |
| **Browser** | Wszystkie zainstalowane | Tylko Chromium | CI oszczędza czas |

## Zapewnienie zgodności Node.js

### Użyj nvm (Node Version Manager)

```bash
# Zainstaluj nvm (jeśli nie masz)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Użyj wersji z .nvmrc
nvm use

# Lub zainstaluj jeśli nie masz
nvm install
```

### Użyj fnm (Fast Node Manager)

```bash
# Zainstaluj fnm (jeśli nie masz)
curl -fsSL https://fnm.vercel.app/install | bash

# Użyj wersji z .nvmrc
fnm use

# Lub zainstaluj jeśli nie masz
fnm install
```

## Troubleshooting

### ❌ "Cannot find module" errors

```bash
# Wyczyść cache i reinstaluj
rm -rf node_modules package-lock.json
npm install
```

### ❌ Playwright browsers not installed

```bash
# Zainstaluj przeglądarki
npx playwright install chromium
```

### ❌ Tests pass locally but fail in CI

**Możliwe przyczyny:**
1. Różna wersja Node.js → użyj `nvm use`
2. Brak zmiennych środowiskowych → sprawdź `.env`
3. Flaky tests (timing issues) → dodaj `await` lub zwiększ timeouty
4. Cache issues → wyczyść `node_modules`

### ❌ Build passes locally but fails in CI

**Możliwe przyczyny:**
1. Secrets nie są ustawione w GitHub → sprawdź Settings
2. TypeScript errors ignorowane lokalnie → sprawdź `tsconfig.json`
3. Linter warnings ignorowane → uruchom `npm run lint`

## Best Practices

### ✅ Przed każdym commitem
```bash
npm run lint
npm run test -- --run
```

### ✅ Przed push do main
```bash
npm run lint
npm run test -- --run
npm run test:e2e
npm run build
```

### ✅ Po pull z main
```bash
npm ci  # Reinstaluj zależności
npm run test -- --run  # Sprawdź czy testy przechodzą
```

### ✅ Przed otwarciem PR
```bash
# Full check
npm run lint
npm run test:coverage
npm run test:e2e
npm run build
npm run preview
```

## Skróty klawiszowe (Vitest UI)

| Klawisz | Akcja |
|---------|-------|
| `a` | Run all tests |
| `f` | Run only failed tests |
| `u` | Update snapshots |
| `p` | Filter by filename |
| `t` | Filter by test name |
| `q` | Quit |

## Skróty klawiszowe (Playwright UI)

| Akcja | Opis |
|-------|------|
| Click test | Zobacz szczegóły testu |
| Click step | Zobacz screenshot tego kroku |
| Pick locator | Narzędzie do znajdowania selektorów |
| Time travel | Przewijaj kroki testu |

---

**Pro Tip:** Dodaj alias do `.bashrc` lub `.zshrc`:

```bash
alias pre-push="npm run lint && npm run test -- --run && npm run build"
alias full-check="npm run lint && npm run test:coverage && npm run test:e2e && npm run build"
```

Użycie:
```bash
pre-push  # Quick check
full-check  # Full check
```

---

**Last Updated:** 2025-12-11  
**Version:** 1.0

