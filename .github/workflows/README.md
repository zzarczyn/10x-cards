# CI/CD Configuration

> 📚 **Documentation Index:** See [INDEX.md](INDEX.md) for complete documentation overview and learning paths.

## Overview

Minimalny setup CI/CD weryfikujący poprawność kodu i możliwość zbudowania wersji produkcyjnej.

## Workflow: `ci.yml`

### Triggery

- **Manual**: Workflow można uruchomić ręcznie z zakładki "Actions" w GitHub
- **Push to main/master**: Automatyczne uruchomienie po każdym push do głównej gałęzi

### Jobs

#### 1. **Lint** (Linting)
- Sprawdza jakość kodu za pomocą ESLint
- Nie wymaga secrets
- Czas wykonania: ~1-2 minuty

#### 2. **Unit Tests** (Testy jednostkowe)
- Uruchamia testy Vitest
- Nie wymaga secrets (używa MSW do mockowania API)
- Czas wykonania: ~2-3 minuty

#### 3. **E2E Tests** (Testy End-to-End)
- Uruchamia testy Playwright na przeglądarce Chromium
- Wymaga secrets: `SUPABASE_URL`, `SUPABASE_KEY`, `OPENROUTER_API_KEY`
- Generuje raport Playwright (dostępny w artifacts przez 7 dni)
- Czas wykonania: ~3-5 minut

#### 4. **Build** (Build produkcyjny)
- Buduje aplikację Astro w wersji produkcyjnej
- Uruchamia się tylko jeśli lint i unit tests przeszły pomyślnie
- Wymaga secrets: `SUPABASE_URL`, `SUPABASE_KEY`, `OPENROUTER_API_KEY`
- Zapisuje build artifacts (dostępne przez 7 dni)
- Czas wykonania: ~2-3 minuty

### Total Time
Całkowity czas wykonania: **~8-13 minut** (jobs uruchamiają się równolegle gdzie to możliwe)

---

## Konfiguracja Secrets

### Wymagane GitHub Secrets

Dodaj następujące secrets w ustawieniach repozytorium:
`Settings` → `Secrets and variables` → `Actions` → `New repository secret`

| Secret Name | Opis | Przykład |
|-------------|------|----------|
| `SUPABASE_URL` | URL projektu Supabase | `https://xxxxx.supabase.co` |
| `SUPABASE_KEY` | Anon/Public key z Supabase | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `OPENROUTER_API_KEY` | Klucz API OpenRouter | `sk-or-v1-xxxxx` |

### Opcjonalne Secrets

| Secret Name | Opis | Domyślna wartość |
|-------------|------|------------------|
| `OPENROUTER_MODEL` | Model AI do generowania fiszek | `anthropic/claude-3.5-sonnet` |

---

## Tech Stack

- **Node.js**: 22.20.0 (z `.nvmrc`)
- **Framework**: Astro 5
- **Testy jednostkowe**: Vitest
- **Testy E2E**: Playwright (Chromium)
- **Linter**: ESLint

---

## Best Practices

### ✅ Zastosowane

- ✅ Używamy `npm ci` zamiast `npm install` (szybsze, deterministyczne)
- ✅ Używamy `node-version-file: '.nvmrc'` zamiast hardcoded version
- ✅ Secrets są definiowane na poziomie job `env:`, nie globalnie
- ✅ Cache npm włączony (`cache: 'npm'`)
- ✅ Artifacts z retention 7 dni (oszczędność miejsca)
- ✅ E2E testy instalują tylko Chromium (`--with-deps chromium`)
- ✅ Raport Playwright upload się zawsze (`if: always()`)
- ✅ Build job ma dependencies (`needs: [lint, unit-tests]`)

### 🔧 Możliwe rozszerzenia (poza MVP)

- Coverage reports (Codecov)
- Notifications (Slack, Discord)
- Deploy job (DigitalOcean, Vercel)
- Matrix testing (multiple browsers, Node versions)
- Caching Playwright browsers
- Dependabot dla security updates

---

## Troubleshooting

### Problem: E2E testy failują z błędem auth

**Rozwiązanie**: Upewnij się, że secrets są poprawnie skonfigurowane i środowisko testowe Supabase ma utworzonego użytkownika testowego.

### Problem: Build failuje z błędem "Missing environment variables"

**Rozwiązanie**: Sprawdź czy wszystkie wymagane secrets są dodane w GitHub Settings.

### Problem: Playwright report jest pusty

**Rozwiązanie**: To normalne jeśli testy przeszły - raport generuje się głównie dla failów. Zmień `if: always()` na `if: failure()` jeśli chcesz upload tylko przy błędach.

---

## Użycie

### Manualne uruchomienie

1. Przejdź do zakładki **Actions** w GitHub
2. Wybierz **CI/CD Pipeline** z listy workflows
3. Kliknij **Run workflow**
4. Wybierz branch (domyślnie main)
5. Kliknij **Run workflow**

### Automatyczne uruchomienie

Workflow uruchamia się automatycznie po każdym:
```bash
git push origin main
# lub
git push origin master
```

---

## Wersje używanych akcji

| Action | Wersja | Status |
|--------|--------|--------|
| `actions/checkout` | v4 | ✅ Latest stable |
| `actions/setup-node` | v4 | ✅ Latest stable |
| `actions/upload-artifact` | v4 | ✅ Latest stable |

Ostatnia aktualizacja: 2025-12-11

