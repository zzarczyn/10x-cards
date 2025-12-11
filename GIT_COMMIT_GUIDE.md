# Git Commit Guide - CI/CD Setup

## Pliki do commit

### Nowe pliki (13)

```bash
# Główny workflow
.github/workflows/ci.yml

# Dokumentacja workflow
.github/workflows/README.md
.github/workflows/ARCHITECTURE.md
.github/workflows/LOCAL_TESTING.md
.github/workflows/EXAMPLES.md
.github/workflows/MAINTENANCE.md
.github/workflows/SUMMARY.md
.github/workflows/INDEX.md
.github/workflows/DIAGRAM.md
.github/workflows/validate.sh

# Dokumentacja główna
CI_CD_SETUP.md
CI_CD_IMPLEMENTATION_SUMMARY.md
CHANGELOG_CI_CD.md
```

### Zmodyfikowane pliki (3)

```bash
README.md                          # Dodano badge + sekcję CI/CD
TESTING_GUIDE.md                   # Dodano notatkę o CI/CD
.github/workflows/test.yml.example # Oznaczono jako deprecated
```

---

## Komendy Git

### Opcja 1: Pojedynczy commit (zalecane)

```bash
# Dodaj wszystkie pliki
git add .github/workflows/ci.yml
git add .github/workflows/README.md
git add .github/workflows/ARCHITECTURE.md
git add .github/workflows/LOCAL_TESTING.md
git add .github/workflows/EXAMPLES.md
git add .github/workflows/MAINTENANCE.md
git add .github/workflows/SUMMARY.md
git add .github/workflows/INDEX.md
git add .github/workflows/DIAGRAM.md
git add .github/workflows/validate.sh
git add .github/workflows/test.yml.example
git add CI_CD_SETUP.md
git add CI_CD_IMPLEMENTATION_SUMMARY.md
git add CHANGELOG_CI_CD.md
git add README.md
git add TESTING_GUIDE.md
git add GIT_COMMIT_GUIDE.md

# Commit
git commit -m "feat: Add CI/CD pipeline with GitHub Actions

- Add ci.yml workflow with 4 jobs (lint, unit tests, e2e tests, build)
- Add comprehensive documentation (9 files, 2,500+ lines)
- Add validation script and examples
- Update README.md with CI/CD section and badge
- Update TESTING_GUIDE.md with CI/CD integration note

Triggers:
- Manual (workflow_dispatch)
- Automatic on push to main/master

Duration: ~8-13 minutes
Compliance: @github-action.mdc, @tech-stack.md

See CI_CD_SETUP.md for quick start guide."

# Push
git push origin main
```

---

### Opcja 2: Wieloetapowy commit

```bash
# Etap 1: Core workflow
git add .github/workflows/ci.yml
git commit -m "feat: Add CI/CD workflow (ci.yml)

- 4 jobs: lint, unit tests, e2e tests, build
- Triggers: manual + push to main/master
- Duration: ~8-13 minutes"

# Etap 2: Dokumentacja
git add .github/workflows/README.md
git add .github/workflows/ARCHITECTURE.md
git add .github/workflows/LOCAL_TESTING.md
git add .github/workflows/EXAMPLES.md
git add .github/workflows/MAINTENANCE.md
git add .github/workflows/SUMMARY.md
git add .github/workflows/INDEX.md
git add .github/workflows/DIAGRAM.md
git commit -m "docs: Add CI/CD documentation

- 8 comprehensive guides
- Examples and scenarios
- Troubleshooting sections
- Visual diagrams"

# Etap 3: Narzędzia i updates
git add .github/workflows/validate.sh
git add CI_CD_SETUP.md
git add CI_CD_IMPLEMENTATION_SUMMARY.md
git add CHANGELOG_CI_CD.md
git add README.md
git add TESTING_GUIDE.md
git add .github/workflows/test.yml.example
git commit -m "chore: Add CI/CD tools and update docs

- Add validation script
- Add quick start guide
- Update README with CI/CD section and badge
- Update TESTING_GUIDE
- Deprecate old test.yml.example"

# Push wszystko
git push origin main
```

---

### Opcja 3: Atomic commits (najbardziej granularne)

```bash
# 1. Workflow
git add .github/workflows/ci.yml
git commit -m "feat: Add CI/CD workflow"

# 2. Main documentation
git add .github/workflows/README.md
git commit -m "docs: Add CI/CD main documentation"

# 3. Architecture
git add .github/workflows/ARCHITECTURE.md
git commit -m "docs: Add CI/CD architecture guide"

# 4. Local testing
git add .github/workflows/LOCAL_TESTING.md
git commit -m "docs: Add local testing guide"

# 5. Examples
git add .github/workflows/EXAMPLES.md
git commit -m "docs: Add CI/CD examples and scenarios"

# 6. Maintenance
git add .github/workflows/MAINTENANCE.md
git commit -m "docs: Add CI/CD maintenance guide"

# 7. Summary
git add .github/workflows/SUMMARY.md
git commit -m "docs: Add CI/CD summary"

# 8. Index
git add .github/workflows/INDEX.md
git commit -m "docs: Add CI/CD documentation index"

# 9. Diagrams
git add .github/workflows/DIAGRAM.md
git commit -m "docs: Add CI/CD workflow diagrams"

# 10. Validation
git add .github/workflows/validate.sh
git commit -m "chore: Add CI/CD validation script"

# 11. Quick start
git add CI_CD_SETUP.md
git commit -m "docs: Add CI/CD quick start guide"

# 12. Implementation summary
git add CI_CD_IMPLEMENTATION_SUMMARY.md
git commit -m "docs: Add CI/CD implementation summary"

# 13. Changelog
git add CHANGELOG_CI_CD.md
git commit -m "docs: Add CI/CD changelog"

# 14. README update
git add README.md
git commit -m "docs: Update README with CI/CD section and badge"

# 15. Testing guide update
git add TESTING_GUIDE.md
git commit -m "docs: Update TESTING_GUIDE with CI/CD note"

# 16. Deprecate old example
git add .github/workflows/test.yml.example
git commit -m "chore: Deprecate test.yml.example"

# Push wszystko
git push origin main
```

---

## Zalecenia

### ✅ Opcja 1 (Pojedynczy commit) - ZALECANE

**Zalety:**
- Prosty i szybki
- Łatwy do revert jeśli potrzeba
- Czytelna historia (jeden feature = jeden commit)
- Atomic change (wszystko albo nic)

**Wady:**
- Duży commit (może być trudny do review)

**Kiedy użyć:**
- Jesteś jedynym developerem
- Chcesz szybko dodać feature
- Nie planujesz review przez zespół

---

### ⚠️ Opcja 2 (Wieloetapowy) - DLA ZESPOŁÓW

**Zalety:**
- Łatwiejszy review (mniejsze chunki)
- Logiczne grupowanie zmian
- Lepsze dla code review w PR

**Wady:**
- Więcej commitów
- Trzeba pamiętać o kolejności

**Kiedy użyć:**
- Pracujesz w zespole
- Planujesz Pull Request review
- Chcesz czytelną historię

---

### ❌ Opcja 3 (Atomic) - NIE ZALECANE

**Zalety:**
- Bardzo granularne
- Łatwo znaleźć konkretną zmianę

**Wady:**
- Zbyt wiele commitów (16!)
- Zaśmieca historię
- Czasochłonne

**Kiedy użyć:**
- Prawie nigdy dla tego typu feature
- Może dla bardzo dużych projektów z strict guidelines

---

## Commit Message Guidelines

### Format

```
<type>: <subject>

<body>

<footer>
```

### Types

- `feat:` - Nowa funkcjonalność
- `docs:` - Dokumentacja
- `chore:` - Maintenance, narzędzia
- `fix:` - Bug fix
- `refactor:` - Refactoring
- `test:` - Testy
- `ci:` - CI/CD changes

### Examples

**Good:**
```
feat: Add CI/CD pipeline with GitHub Actions

- Add ci.yml workflow with 4 jobs
- Add comprehensive documentation
- Update README with CI/CD section

Duration: ~8-13 minutes
See CI_CD_SETUP.md for details.
```

**Bad:**
```
add ci/cd
```

---

## Pre-commit Checklist

Przed commit sprawdź:

- [ ] Wszystkie pliki są dodane (`git status`)
- [ ] Nie ma uncommitted changes w innych plikach
- [ ] Commit message jest opisowy
- [ ] Nie commitujesz secrets (.env, keys)
- [ ] Nie commitujesz node_modules
- [ ] Nie commitujesz dist/ (jeśli jest w .gitignore)

---

## Validation przed push

```bash
# Opcjonalnie: Sprawdź workflow lokalnie
bash .github/workflows/validate.sh

# Sprawdź status
git status

# Zobacz co będzie commitowane
git diff --cached

# Sprawdź czy nie ma secrets
git diff --cached | grep -i "secret\|key\|password\|token"
```

---

## Po push

### 1. Monitoruj Actions

```
GitHub → Actions tab
Zobacz czy workflow się uruchomił
```

### 2. Sprawdź status

- ✅ Wszystkie jobs przeszły (zielone checkmarki)
- ✅ Badge w README pokazuje "passing"
- ✅ Artifacts są dostępne

### 3. Jeśli coś failuje

```bash
# Zobacz logi w GitHub Actions
# Napraw problem lokalnie
# Commit fix
git add .
git commit -m "fix: Resolve CI/CD issue"
git push origin main
```

---

## Troubleshooting

### "Nothing to commit"

```bash
# Sprawdź status
git status

# Dodaj pliki jeśli nie są staged
git add <file>
```

### "Uncommitted changes"

```bash
# Zobacz co się zmieniło
git diff

# Dodaj do staging
git add <file>

# Lub discard changes
git checkout -- <file>
```

### "Push rejected"

```bash
# Pull latest changes
git pull origin main

# Resolve conflicts jeśli są
# Commit merge
git push origin main
```

---

## Quick Commands

```bash
# Status
git status

# Diff
git diff
git diff --cached  # staged changes

# Add all
git add .

# Commit
git commit -m "message"

# Push
git push origin main

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1
```

---

## Recommended Flow

```bash
# 1. Validation
bash .github/workflows/validate.sh

# 2. Status check
git status

# 3. Add files
git add .github/workflows/ci.yml
git add .github/workflows/*.md
git add .github/workflows/validate.sh
git add CI_CD_*.md
git add CHANGELOG_CI_CD.md
git add README.md
git add TESTING_GUIDE.md
git add GIT_COMMIT_GUIDE.md

# 4. Verify
git status

# 5. Commit
git commit -m "feat: Add CI/CD pipeline with GitHub Actions

- Add ci.yml workflow with 4 jobs (lint, unit tests, e2e tests, build)
- Add comprehensive documentation (9 files, 2,500+ lines)
- Add validation script and examples
- Update README.md with CI/CD section and badge
- Update TESTING_GUIDE.md with CI/CD integration note

Triggers: manual + push to main/master
Duration: ~8-13 minutes
Compliance: @github-action.mdc, @tech-stack.md

See CI_CD_SETUP.md for quick start guide."

# 6. Push
git push origin main

# 7. Monitor
# GitHub → Actions tab
```

---

**Ready to commit?** Use **Opcja 1** (pojedynczy commit) - it's the simplest and most appropriate for this feature.

---

**Last Updated:** 2025-12-11  
**Version:** 1.0

