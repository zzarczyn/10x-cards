# CI/CD Setup - Quick Start Guide

## Co zostało skonfigurowane?

✅ Minimalny workflow GitHub Actions (`.github/workflows/ci.yml`)  
✅ Dokumentacja workflow (`.github/workflows/README.md`)  
✅ Aktualizacja głównego README z sekcją CI/CD  
✅ Oznaczenie starego przykładu jako deprecated  

## Jak uruchomić?

### Krok 1: Skonfiguruj GitHub Secrets

Przejdź do swojego repozytorium na GitHub:

1. `Settings` → `Secrets and variables` → `Actions`
2. Kliknij `New repository secret`
3. Dodaj następujące secrets:

| Nazwa | Wartość | Gdzie znaleźć |
|-------|---------|---------------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | [Supabase Dashboard](https://app.supabase.com/project/_/settings/api) → Project URL |
| `SUPABASE_KEY` | `eyJhbGciOiJIUzI1...` | [Supabase Dashboard](https://app.supabase.com/project/_/settings/api) → `anon` `public` key |
| `OPENROUTER_API_KEY` | `sk-or-v1-xxxxx` | [OpenRouter Keys](https://openrouter.ai/keys) |

### Krok 2: Push zmian do głównej gałęzi

```bash
# Dodaj nowe pliki
git add .github/workflows/ci.yml
git add .github/workflows/README.md
git add README.md
git add CI_CD_SETUP.md

# Commit
git commit -m "feat: Add CI/CD pipeline with GitHub Actions"

# Push do main/master
git push origin main  # lub master
```

### Krok 3: Sprawdź wyniki

1. Przejdź do zakładki **Actions** w GitHub
2. Zobaczysz uruchomiony workflow **CI/CD Pipeline**
3. Kliknij na workflow aby zobaczyć szczegóły

**Oczekiwany rezultat:**
- ✅ Lint - przechodzi (sprawdza jakość kodu)
- ✅ Unit Tests - przechodzi (testy jednostkowe)
- ⚠️ E2E Tests - może failować jeśli środowisko testowe nie jest gotowe
- ✅ Build - przechodzi (build produkcyjny)

## Troubleshooting

### ❌ E2E Tests failują

**Przyczyna:** Brak skonfigurowanego środowiska testowego w Supabase lub brak użytkownika testowego.

**Rozwiązanie (opcja A - wyłącz E2E temporary):**
Zakomentuj job `e2e-tests` w `.github/workflows/ci.yml` do czasu skonfigurowania środowiska testowego.

**Rozwiązanie (opcja B - skonfiguruj środowisko):**
1. Utwórz dedykowany projekt Supabase dla testów (np. `10xcards-test`)
2. Zastosuj migracje: `npx supabase db push`
3. Utwórz użytkownika testowego (email/hasło)
4. Zaktualizuj secrets `SUPABASE_URL` i `SUPABASE_KEY` na testowe

### ❌ Build failuje z "Missing environment variables"

**Przyczyna:** Secrets nie są poprawnie skonfigurowane.

**Rozwiązanie:**
1. Sprawdź czy wszystkie 3 secrets są dodane w GitHub Settings
2. Sprawdź czy nazwy są dokładnie takie jak w dokumentacji (wielkość liter ma znaczenie)
3. Sprawdź czy secrets nie mają spacji na początku/końcu

### ❌ "npm ci" failuje

**Przyczyna:** Nieaktualna wersja Node.js lub problem z lock file.

**Rozwiązanie:**
Workflow używa Node.js 22.20.0 z `.nvmrc` - sprawdź czy plik `.nvmrc` istnieje i zawiera `22.20.0`.

## Manualne uruchomienie

Możesz uruchomić workflow ręcznie:

1. Przejdź do zakładki **Actions**
2. Wybierz **CI/CD Pipeline** z listy
3. Kliknij **Run workflow**
4. Wybierz branch (domyślnie `main`)
5. Kliknij zielony przycisk **Run workflow**

## Następne kroki (opcjonalne)

### 1. Dodaj badge do README

Dodaj na początku `README.md`:

```markdown
[![CI/CD Pipeline](https://github.com/TWOJ-USERNAME/10xCards/actions/workflows/ci.yml/badge.svg)](https://github.com/TWOJ-USERNAME/10xCards/actions/workflows/ci.yml)
```

Zamień `TWOJ-USERNAME` na swoją nazwę użytkownika GitHub.

### 2. Rozszerz o deployment

Po przejściu testów możesz dodać job `deploy` który automatycznie wdroży aplikację na:
- DigitalOcean App Platform
- Vercel
- Netlify
- AWS

### 3. Dodaj coverage reporting

Możesz zintegrować [Codecov](https://codecov.io/) lub [Coveralls](https://coveralls.io/) aby śledzić pokrycie kodu testami.

### 4. Dodaj notifications

Możesz dodać powiadomienia na:
- Slack
- Discord
- Email

## Dokumentacja

- **Główna dokumentacja workflow:** [.github/workflows/README.md](.github/workflows/README.md)
- **Workflow file:** [.github/workflows/ci.yml](.github/workflows/ci.yml)
- **GitHub Actions Docs:** https://docs.github.com/en/actions

## Podsumowanie

✅ Minimalny CI/CD setup jest gotowy  
✅ Workflow testuje, lintuje i buduje kod automatycznie  
✅ Możliwość manualnego uruchomienia  
✅ Zgodność z najlepszymi praktykami GitHub Actions  

**Total time:** ~8-13 minut na pełny run wszystkich jobs.

---

**Autor:** AI CI/CD Specialist  
**Data:** 2025-12-11  
**Wersja:** 1.0

