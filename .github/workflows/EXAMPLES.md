# CI/CD Examples & Common Scenarios

## Scenario 1: Feature Development

**Sytuacja:** Pracujesz nad nową funkcją w branch `feature/generator-ui`

### Workflow

```bash
# 1. Utwórz branch
git checkout -b feature/generator-ui

# 2. Pracuj nad kodem
# ... edytuj pliki ...

# 3. Przed commitem - sprawdź lokalnie
npm run lint
npm run test -- --run

# 4. Commit
git add .
git commit -m "feat: Add generator UI component"

# 5. Push do feature branch
git push origin feature/generator-ui

# 6. Otwórz Pull Request na GitHub
# CI/CD NIE uruchomi się (trigger tylko na main/master)

# 7. Po merge do main - CI/CD uruchomi się automatycznie
```

**Zalecenie:** Rozważ dodanie trigger na PR:
```yaml
on:
  pull_request:
    branches: [main, master]
```

---

## Scenario 2: Hotfix Production

**Sytuacja:** Krytyczny bug w produkcji, potrzebujesz szybkiego fix

### Workflow

```bash
# 1. Utwórz hotfix branch z main
git checkout main
git pull
git checkout -b hotfix/auth-error

# 2. Napraw bug
# ... edytuj pliki ...

# 3. Quick check lokalnie (skip E2E dla szybkości)
npm run lint
npm run test -- --run
npm run build

# 4. Commit i push
git add .
git commit -m "fix: Resolve authentication error"
git push origin hotfix/auth-error

# 5. Merge do main (fast-forward)
git checkout main
git merge hotfix/auth-error
git push origin main

# 6. CI/CD uruchomi się automatycznie
# 7. Monitoruj Actions tab - upewnij się że wszystko przeszło
```

**Czas:** ~2-3 minuty (lokalnie) + ~8-13 minut (CI)

---

## Scenario 3: Debugging Failed CI

**Sytuacja:** Push do main, ale CI/CD failuje

### Workflow

```bash
# 1. Sprawdź Actions tab na GitHub
# Kliknij na failed workflow → Zobacz który job failował

# 2. Pobierz logi
# Kliknij na failed job → Rozwiń failed step → Zobacz error

# 3. Reprodukuj lokalnie
# Jeśli failował "Lint":
npm run lint

# Jeśli failował "Unit Tests":
npm run test -- --run

# Jeśli failował "E2E Tests":
npm run test:e2e

# Jeśli failował "Build":
npm run build

# 4. Napraw błąd lokalnie

# 5. Commit fix
git add .
git commit -m "fix: Resolve CI linting errors"
git push origin main

# 6. CI/CD uruchomi się ponownie
```

**Pro Tip:** Użyj `git commit --amend` jeśli chcesz poprawić poprzedni commit:
```bash
git add .
git commit --amend --no-edit
git push origin main --force-with-lease
```

---

## Scenario 4: Manual Workflow Trigger

**Sytuacja:** Chcesz uruchomić CI/CD bez push (np. po zmianie secrets)

### Workflow

```bash
# 1. Przejdź do GitHub → Actions tab

# 2. Wybierz "CI/CD Pipeline" z listy workflows

# 3. Kliknij "Run workflow" (prawy górny róg)

# 4. Wybierz branch (domyślnie main)

# 5. Kliknij zielony przycisk "Run workflow"

# 6. Odśwież stronę - zobaczysz nowy workflow run
```

**Use Cases:**
- ✅ Sprawdzenie czy secrets działają
- ✅ Re-run po flaky test failure
- ✅ Weryfikacja po zmianie konfiguracji GitHub

---

## Scenario 5: Adding New Test

**Sytuacja:** Dodajesz nowy test i chcesz upewnić się że działa w CI

### Workflow

```bash
# 1. Utwórz test lokalnie
# src/lib/services/new-feature.test.ts

# 2. Uruchom lokalnie
npm run test -- src/lib/services/new-feature.test.ts

# 3. Sprawdź czy przechodzi
npm run test -- --run

# 4. Commit i push
git add .
git commit -m "test: Add tests for new feature"
git push origin main

# 5. Monitoruj CI/CD - sprawdź czy nowy test przeszedł
# Actions → CI/CD Pipeline → Unit Tests job → Zobacz logi
```

**Zalecenie:** Dodaj test coverage check:
```bash
npm run test:coverage
# Sprawdź czy coverage nie spadło poniżej 80%
```

---

## Scenario 6: Updating Dependencies

**Sytuacja:** Aktualizujesz npm packages (np. security update)

### Workflow

```bash
# 1. Zaktualizuj package
npm update <package-name>

# Lub dla major update:
npm install <package-name>@latest

# 2. Sprawdź czy wszystko działa lokalnie
npm run lint
npm run test -- --run
npm run test:e2e
npm run build

# 3. Commit package.json i package-lock.json
git add package.json package-lock.json
git commit -m "chore: Update dependencies"
git push origin main

# 4. CI/CD uruchomi się i zweryfikuje kompatybilność
```

**Uwaga:** CI używa `npm ci` (nie `npm install`), więc `package-lock.json` musi być zaktualizowany!

---

## Scenario 7: Configuring Secrets

**Sytuacja:** Nowy projekt, pierwsze uruchomienie CI/CD

### Workflow

```bash
# 1. Przygotuj credentials lokalnie
# Skopiuj z .env:
cat .env

# 2. Przejdź do GitHub
# Settings → Secrets and variables → Actions

# 3. Dodaj każdy secret osobno
# Kliknij "New repository secret"

# Secret 1:
Name: SUPABASE_URL
Value: https://xxxxx.supabase.co

# Secret 2:
Name: SUPABASE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6...

# Secret 3:
Name: OPENROUTER_API_KEY
Value: sk-or-v1-xxxxx

# 4. Zapisz każdy secret

# 5. Uruchom workflow manualnie (Scenario 4)
# Lub push do main

# 6. Sprawdź czy E2E i Build jobs przeszły
```

**Bezpieczeństwo:**
- ❌ NIE commituj secrets do repo
- ❌ NIE udostępniaj secrets publicznie
- ✅ Używaj różnych secrets dla dev/staging/prod

---

## Scenario 8: Disabling E2E Temporarily

**Sytuacja:** E2E testy są flaky, chcesz je wyłączyć temporary

### Workflow

**Opcja A: Zakomentuj job w workflow**

```yaml
# .github/workflows/ci.yml

jobs:
  lint:
    # ... existing code ...

  unit-tests:
    # ... existing code ...

  # e2e-tests:
  #   name: E2E Tests
  #   runs-on: ubuntu-latest
  #   # ... rest commented out ...

  build:
    # ... existing code ...
```

**Opcja B: Dodaj conditional**

```yaml
e2e-tests:
  name: E2E Tests
  runs-on: ubuntu-latest
  if: false  # Temporarily disabled
  # ... rest of job ...
```

**Opcja C: Skip na specific branch**

```yaml
e2e-tests:
  name: E2E Tests
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'  # Only on main
  # ... rest of job ...
```

---

## Scenario 9: Viewing Artifacts

**Sytuacja:** E2E test failował, chcesz zobaczyć Playwright report

### Workflow

```bash
# 1. Przejdź do GitHub → Actions tab

# 2. Kliknij na failed workflow run

# 3. Scroll down → "Artifacts" section

# 4. Pobierz "playwright-report.zip"

# 5. Rozpakuj lokalnie
unzip playwright-report.zip

# 6. Otwórz w przeglądarce
npx playwright show-report playwright-report/

# 7. Zobacz screenshots i traces failed tests
```

**Artifacts dostępne:**
- `playwright-report/` - E2E test results (7 dni)
- `dist/` - Production build (7 dni)

---

## Scenario 10: Multi-Environment Setup

**Sytuacja:** Chcesz różne secrets dla staging i production

### Workflow

**Krok 1: Utwórz GitHub Environments**

```bash
# Settings → Environments → New environment

# Environment 1: staging
Name: staging
Secrets:
  - SUPABASE_URL (staging URL)
  - SUPABASE_KEY (staging key)
  - OPENROUTER_API_KEY (staging key)

# Environment 2: production
Name: production
Protection rules: Required reviewers (opcjonalnie)
Secrets:
  - SUPABASE_URL (production URL)
  - SUPABASE_KEY (production key)
  - OPENROUTER_API_KEY (production key)
```

**Krok 2: Zaktualizuj workflow**

```yaml
jobs:
  build-staging:
    name: Build (Staging)
    runs-on: ubuntu-latest
    environment: staging  # Use staging secrets
    if: github.ref == 'refs/heads/develop'
    env:
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
      OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
    steps:
      # ... build steps ...

  build-production:
    name: Build (Production)
    runs-on: ubuntu-latest
    environment: production  # Use production secrets
    if: github.ref == 'refs/heads/main'
    env:
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
      OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
    steps:
      # ... build steps ...
```

---

## Common Commands Cheatsheet

```bash
# Linting
npm run lint              # Check for errors
npm run lint:fix          # Auto-fix errors

# Unit Tests
npm run test              # Watch mode
npm run test -- --run     # Single run (CI mode)
npm run test:ui           # UI mode
npm run test:coverage     # With coverage

# E2E Tests
npm run test:e2e          # Run all E2E
npm run test:e2e:ui       # UI mode
npm run test:e2e:headed   # Visible browser
npm run test:e2e:debug    # Debug mode

# Build
npm run build             # Production build
npm run preview           # Preview build

# Full check (before push)
npm run lint && npm run test -- --run && npm run build
```

---

## Troubleshooting Quick Reference

| Error | Solution |
|-------|----------|
| `npm ci` fails | Delete `node_modules` and `package-lock.json`, run `npm install` |
| Playwright browsers missing | Run `npx playwright install chromium` |
| Secrets not working | Check spelling (case-sensitive), check if set in correct environment |
| E2E flaky | Add `await` before assertions, increase timeouts |
| Build fails with env vars | Check if secrets are set in GitHub Settings |
| Lint fails | Run `npm run lint:fix` locally |
| Tests pass locally, fail in CI | Check Node version (use `nvm use`), check `.env` |

---

**Last Updated:** 2025-12-11  
**Version:** 1.0

