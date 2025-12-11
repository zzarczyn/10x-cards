# CI/CD Maintenance Guide

## Regularne zadania

### Co miesiąc

#### 1. Sprawdź wersje GitHub Actions

```bash
# Sprawdź czy są nowe wersje
# actions/checkout
curl -s https://api.github.com/repos/actions/checkout/releases/latest | grep '"tag_name":'

# actions/setup-node
curl -s https://api.github.com/repos/actions/setup-node/releases/latest | grep '"tag_name":'

# actions/upload-artifact
curl -s https://api.github.com/repos/actions/upload-artifact/releases/latest | grep '"tag_name":'
```

**Jeśli jest nowa major version:**
1. Przeczytaj CHANGELOG akcji
2. Sprawdź breaking changes
3. Zaktualizuj w `ci.yml`
4. Przetestuj workflow

#### 2. Sprawdź zużycie GitHub Actions minutes

```
GitHub → Settings → Billing → Usage this month
```

**Jeśli zbliżasz się do limitu:**
- Rozważ conditional E2E (tylko na main)
- Dodaj cache dla Playwright browsers
- Ogranicz frequency (np. skip na [skip ci])

#### 3. Przejrzyj failed workflows

```
GitHub → Actions → Filter: Failed
```

**Dla każdego failure:**
- Sprawdź czy to flaky test
- Sprawdź czy to problem z secrets
- Sprawdź czy to breaking change w dependencies

---

### Co tydzień

#### 1. Monitoruj artifacts storage

```
GitHub → Actions → Management → Artifacts
```

**Jeśli storage rośnie:**
- Zmniejsz retention (z 7 do 3 dni)
- Usuń stare artifacts manualnie
- Dodaj conditional upload (tylko na failure)

#### 2. Sprawdź workflow duration

```
GitHub → Actions → CI/CD Pipeline → Zobacz średni czas
```

**Jeśli czas rośnie:**
- Sprawdź czy dependencies nie urosły
- Rozważ cache optimization
- Sprawdź czy E2E nie są wolniejsze

---

### Co kwartał

#### 1. Audit secrets

```
GitHub → Settings → Secrets and variables → Actions
```

**Checklist:**
- [ ] Czy wszystkie secrets są używane?
- [ ] Czy secrets są aktualne?
- [ ] Czy nie wyciekły (check logs)?
- [ ] Czy są różne dla staging/prod?

#### 2. Review workflow structure

**Pytania:**
- Czy wszystkie jobs są potrzebne?
- Czy dependencies między jobs są optymalne?
- Czy można coś zrównoleglić?
- Czy można coś usunąć?

#### 3. Update documentation

**Sprawdź czy:**
- README.md jest aktualny
- Secrets list jest kompletna
- Troubleshooting ma nowe przypadki
- Examples odzwierciedlają current workflow

---

## Aktualizacje

### Aktualizacja Node.js

**Krok 1: Zaktualizuj .nvmrc**
```bash
echo "22.21.0" > .nvmrc
```

**Krok 2: Przetestuj lokalnie**
```bash
nvm use
npm ci
npm run test -- --run
npm run test:e2e
npm run build
```

**Krok 3: Commit i push**
```bash
git add .nvmrc
git commit -m "chore: Update Node.js to 22.21.0"
git push origin main
```

**Krok 4: Monitoruj workflow**
- Sprawdź czy wszystkie jobs przeszły

---

### Aktualizacja dependencies

**Krok 1: Update package.json**
```bash
npm update
# lub dla major updates:
npm install <package>@latest
```

**Krok 2: Przetestuj lokalnie**
```bash
npm run lint
npm run test -- --run
npm run test:e2e
npm run build
```

**Krok 3: Commit**
```bash
git add package.json package-lock.json
git commit -m "chore: Update dependencies"
git push origin main
```

**Krok 4: Monitoruj CI**
- Sprawdź czy `npm ci` przeszło
- Sprawdź czy testy przeszły

---

### Dodanie nowego job

**Przykład: Deploy job**

**Krok 1: Dodaj job do ci.yml**
```yaml
deploy:
  name: Deploy to Production
  needs: [build, e2e-tests]
  if: github.ref == 'refs/heads/main'
  runs-on: ubuntu-latest
  environment: production
  env:
    DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
  steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Download build artifacts
      uses: actions/download-artifact@v4
      with:
        name: dist
        path: dist/
    
    - name: Deploy
      run: |
        # Your deployment script
        echo "Deploying to production..."
```

**Krok 2: Dodaj secrets**
```
GitHub → Settings → Secrets → Add DEPLOY_TOKEN
```

**Krok 3: Update documentation**
- README.md - dodaj info o deploy
- ARCHITECTURE.md - zaktualizuj diagram
- EXAMPLES.md - dodaj przykład deployment

**Krok 4: Test**
- Uruchom workflow manualnie
- Sprawdź logi deploy job

---

### Usunięcie job

**Przykład: Usunięcie E2E temporary**

**Krok 1: Zakomentuj w ci.yml**
```yaml
# e2e-tests:
#   name: E2E Tests
#   # ... rest commented
```

**Krok 2: Update dependencies**
```yaml
build:
  needs: [lint, unit-tests]  # Usuń e2e-tests
```

**Krok 3: Commit**
```bash
git add .github/workflows/ci.yml
git commit -m "chore: Temporarily disable E2E tests"
git push origin main
```

**Krok 4: Document**
- Dodaj komentarz w ci.yml dlaczego disabled
- Update README.md

---

## Troubleshooting

### Workflow nie uruchamia się

**Możliwe przyczyny:**
1. Syntax error w YAML
2. Branch nie jest main/master
3. Actions disabled w repo settings

**Debug:**
```bash
# Sprawdź syntax
npx js-yaml .github/workflows/ci.yml

# Sprawdź branch
git branch

# Sprawdź settings
# GitHub → Settings → Actions → Allow all actions
```

---

### Job failuje z "Resource not accessible"

**Przyczyna:** Brak uprawnień GITHUB_TOKEN

**Rozwiązanie:**
```
GitHub → Settings → Actions → General
→ Workflow permissions → Read and write permissions
```

---

### Secrets nie działają

**Debug checklist:**
- [ ] Czy secret jest dodany w Settings?
- [ ] Czy nazwa jest dokładnie taka sama? (case-sensitive)
- [ ] Czy job ma `env:` z tym secretem?
- [ ] Czy nie ma spacji na początku/końcu?

**Test:**
```yaml
- name: Debug secrets
  run: |
    echo "SUPABASE_URL length: ${#SUPABASE_URL}"
    echo "First 10 chars: ${SUPABASE_URL:0:10}"
```

---

### Artifacts nie są dostępne

**Możliwe przyczyny:**
1. Job failował przed upload
2. Retention period expired (7 dni)
3. Path jest niepoprawny

**Rozwiązanie:**
```yaml
- name: Upload artifacts
  if: always()  # Upload nawet jeśli job failował
  uses: actions/upload-artifact@v4
  with:
    name: my-artifact
    path: path/to/artifact/
    if-no-files-found: warn  # Warn zamiast error
```

---

### Cache nie działa

**Debug:**
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version-file: '.nvmrc'
    cache: 'npm'
    cache-dependency-path: '**/package-lock.json'  # Explicit path
```

**Sprawdź:**
- Czy package-lock.json istnieje?
- Czy jest w root directory?
- Czy nie jest w .gitignore?

---

## Optimization

### Przyspiesz workflow

#### 1. Cache Playwright browsers

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      playwright-${{ runner.os }}-

- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium
```

**Savings:** ~1-2 minutes

---

#### 2. Conditional E2E

```yaml
e2e-tests:
  if: github.ref == 'refs/heads/main' || contains(github.event.head_commit.message, '[e2e]')
```

**Savings:** Skip E2E on feature branches

---

#### 3. Parallel matrix

```yaml
test:
  strategy:
    matrix:
      node-version: [20, 22]
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
```

**Trade-off:** 2x minutes, better coverage

---

### Zmniejsz koszty

#### 1. Shorter retention

```yaml
- name: Upload artifacts
  uses: actions/upload-artifact@v4
  with:
    retention-days: 3  # Zamiast 7
```

---

#### 2. Conditional artifacts

```yaml
- name: Upload Playwright report
  if: failure()  # Tylko na failure
  uses: actions/upload-artifact@v4
```

---

#### 3. Skip CI

```bash
git commit -m "docs: Update README [skip ci]"
```

Workflow nie uruchomi się.

---

## Monitoring

### Metryki do śledzenia

1. **Success Rate**
   - Target: >95%
   - Sprawdź: Actions → Workflows → Success rate

2. **Duration**
   - Target: <15 minutes
   - Sprawdź: Actions → Workflow runs → Duration

3. **Minutes Usage**
   - Target: <80% of limit
   - Sprawdź: Settings → Billing → Usage

4. **Artifacts Storage**
   - Target: <500 MB
   - Sprawdź: Actions → Management → Artifacts

### Alerts

**Setup GitHub notifications:**
```
Settings → Notifications → Actions
→ ✅ Failed workflows
→ ✅ Workflow run failures
```

**Setup Slack/Discord (optional):**
```yaml
- name: Notify on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "CI/CD failed on ${{ github.ref }}"
      }
```

---

## Security

### Best Practices

1. **Rotate secrets regularnie**
   - Co 90 dni dla production
   - Po każdym incydencie bezpieczeństwa

2. **Use environments dla production**
   ```yaml
   deploy:
     environment: production  # Wymaga approval
   ```

3. **Minimal permissions**
   ```yaml
   permissions:
     contents: read
     actions: read
   ```

4. **Audit logs**
   ```
   Settings → Security → Audit log
   ```

### Security Checklist

- [ ] Secrets są encrypted
- [ ] Secrets nie są w logs
- [ ] Permissions są minimalne
- [ ] Environments mają protection rules
- [ ] Audit log jest monitorowany
- [ ] Dependencies są aktualne (Dependabot)

---

## Backup & Recovery

### Backup workflow

```bash
# Backup ci.yml
cp .github/workflows/ci.yml .github/workflows/ci.yml.backup

# Commit backup
git add .github/workflows/ci.yml.backup
git commit -m "chore: Backup CI workflow"
```

### Recovery

```bash
# Restore z backup
cp .github/workflows/ci.yml.backup .github/workflows/ci.yml

# Lub restore z git history
git checkout HEAD~1 -- .github/workflows/ci.yml
```

---

## Kontakt

**Issues:** GitHub Issues  
**Docs:** `.github/workflows/README.md`  
**Support:** Zobacz dokumentację projektu

---

**Last Updated:** 2025-12-11  
**Version:** 1.0  
**Maintainer:** CI/CD Team

