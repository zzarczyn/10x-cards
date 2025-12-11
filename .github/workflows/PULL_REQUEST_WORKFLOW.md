# Pull Request Workflow Documentation

## Overview

The `pull-request.yml` workflow automatically runs quality checks on every pull request to the `main` branch. It ensures code quality, test coverage, and provides automated feedback directly in the PR.

## Workflow Structure

```
┌─────────────┐
│   Linting   │
└──────┬──────┘
       │
       ├──────────────────┐
       │                  │
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│ Unit Tests  │    │  E2E Tests  │
└──────┬──────┘    └──────┬──────┘
       │                  │
       └────────┬─────────┘
                │
                ▼
        ┌───────────────┐
        │Status Comment │
        └───────────────┘
```

## Jobs

### 1. Linting (`lint`)
**Purpose:** Validates code quality and style consistency.

**Steps:**
- Checkout code
- Setup Node.js (version from `.nvmrc`: 22.20.0)
- Install dependencies with `npm ci`
- Run ESLint

**Runs on:** `ubuntu-latest`

---

### 2. Unit Tests (`unit-tests`)
**Purpose:** Runs unit and integration tests with coverage collection.

**Dependencies:** Requires `lint` to pass first.

**Steps:**
- Checkout code
- Setup Node.js
- Install dependencies
- Run tests with coverage: `npm run test:coverage -- --run`
- Upload coverage artifacts (retained for 7 days)

**Runs on:** `ubuntu-latest`

**Artifacts:**
- `unit-test-coverage` - Coverage reports from Vitest

---

### 3. E2E Tests (`e2e-tests`)
**Purpose:** Runs end-to-end tests using Playwright in Chromium.

**Dependencies:** Requires `lint` to pass first (runs in parallel with `unit-tests`).

**Environment:** `integration` (configured in GitHub repository settings)

**Required Secrets:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon/public key
- `OPENROUTER_API_KEY` - OpenRouter API key for AI generation
- `OPENROUTER_MODEL` - AI model to use (e.g., `anthropic/claude-3.5-sonnet`)

**Steps:**
- Checkout code
- Setup Node.js
- Install dependencies
- Install Playwright Chromium browser with dependencies
- Run E2E tests: `npm run test:e2e`
- Upload Playwright HTML report (retained for 7 days)
- Upload test results JSON (retained for 7 days)

**Runs on:** `ubuntu-latest`

**Artifacts:**
- `playwright-report` - HTML report with screenshots/videos on failure
- `e2e-test-results` - Test results in JSON format

**Browser Configuration:**
According to `playwright.config.ts`, only Chromium (Desktop Chrome) is tested, following project guidelines.

---

### 4. Status Comment (`status-comment`)
**Purpose:** Posts/updates a summary comment on the PR with all check results.

**Dependencies:** Runs after ALL previous jobs complete (even if they fail).

**Condition:** Always runs (`if: always()`), but only when previous jobs have completed.

**Permissions Required:**
- `pull-requests: write` - To create/update PR comments

**Steps:**
- Checkout code
- Download unit test coverage artifact (optional)
- Download E2E test results artifact (optional)
- Create/update PR comment with status table

**Comment Format:**
```markdown
## Pull Request Checks Status

| Check | Status |
|-------|--------|
| Linting | ✅ success |
| Unit Tests | ✅ success |
| E2E Tests | ✅ success |

### Overall Result: ✅ All checks passed!

🎉 This PR is ready for review!

---
*Workflow run: [#123](link-to-workflow)*
```

**Status Emojis:**
- ✅ `success` - Check passed
- ❌ `failure` - Check failed
- ⚠️ `cancelled` - Check was cancelled
- ⏭️ `skipped` - Check was skipped
- ❓ `unknown` - Unknown status

**Runs on:** `ubuntu-latest`

---

## Trigger Conditions

The workflow triggers on:
- **Pull Request Events:**
  - `opened` - When a new PR is created
  - `synchronize` - When new commits are pushed to the PR
  - `reopened` - When a closed PR is reopened

**Target Branch:** `main` only

---

## GitHub Actions Versions

All actions use the latest stable major versions (as of December 2025):

| Action | Version | Status |
|--------|---------|--------|
| `actions/checkout` | v4 | ✅ Active |
| `actions/setup-node` | v4 | ✅ Active |
| `actions/upload-artifact` | v4 | ✅ Active |
| `actions/download-artifact` | v6 | ✅ Active |
| `actions/github-script` | v8 | ✅ Active |

---

## Configuration Requirements

### 1. Repository Secrets

Configure in: **Settings → Secrets and variables → Actions → Secrets**

**Required for E2E Tests:**
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`

### 2. Environment Setup

Configure in: **Settings → Environments → integration**

**Protection Rules (Recommended):**
- ✅ Required reviewers: None (for automated tests)
- ✅ Wait timer: 0 minutes
- ✅ Deployment branches: Selected branches only (main)

**Environment Secrets:**
Use the same secrets as repository secrets, or override with integration-specific values.

### 3. Branch Protection Rules (Recommended)

Configure in: **Settings → Branches → Branch protection rules (main)**

**Suggested Settings:**
- ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - Required checks:
    - `Linting`
    - `Unit Tests`
    - `E2E Tests`
- ✅ Require pull request reviews before merging (1 approval)
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Do not allow bypassing the above settings

---

## Troubleshooting

### Issue: E2E tests fail with "Missing environment variables"
**Solution:** Ensure all required secrets are configured in the `integration` environment.

### Issue: Status comment not posted
**Solution:** 
1. Check that the workflow has `pull-requests: write` permission.
2. Verify that GitHub Actions has permission to create comments in repository settings.

### Issue: Playwright browsers not installing
**Solution:** The workflow uses `npx playwright install --with-deps chromium` which installs system dependencies. If this fails on self-hosted runners, manually install dependencies.

### Issue: Coverage artifacts not uploading
**Solution:** 
1. Verify that `npm run test:coverage` generates a `coverage/` directory.
2. Check Vitest configuration in `vitest.config.ts` for coverage settings.

---

## Local Testing

To test the workflow locally before pushing:

### 1. Install Act (GitHub Actions local runner)
```bash
# Windows (using Chocolatey)
choco install act-cli

# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

### 2. Run the workflow
```bash
# Run all jobs
act pull_request

# Run specific job
act pull_request -j lint
act pull_request -j unit-tests
act pull_request -j e2e-tests
```

**Note:** The `status-comment` job will fail locally as it requires GitHub context.

---

## Maintenance

### Updating Action Versions

Follow the guidelines from `.cursor/rules/github-action.mdc`:

1. Check latest version:
```bash
curl -s https://api.github.com/repos/{owner}/{repo}/releases/latest | grep '"tag_name":' | sed -E 's/.*"v([0-9]+).*/\1/'
```

2. Verify action is not deprecated:
```bash
curl -s https://api.github.com/repos/{owner}/{repo} | grep '"archived":'
```

3. Review README for breaking changes:
```bash
curl -s https://raw.githubusercontent.com/{owner}/{repo}/refs/tags/v{VERSION}/README.md
```

### Monitoring Workflow Performance

- **Average run time:** ~5-8 minutes (depends on test suite size)
- **Parallel execution:** Unit and E2E tests run simultaneously after linting
- **Cost:** Free for public repositories, consumes GitHub Actions minutes for private repos

---

## Best Practices

1. **Keep tests fast:** E2E tests should complete in under 5 minutes.
2. **Use caching:** Node.js setup uses npm cache to speed up dependency installation.
3. **Fail fast:** Linting runs first to catch simple errors before running expensive tests.
4. **Artifact retention:** Set to 7 days to balance storage costs and debugging needs.
5. **Coverage thresholds:** Configure in `vitest.config.ts` to enforce minimum coverage.

---

## Related Files

- **Workflow:** `.github/workflows/pull-request.yml`
- **Playwright Config:** `playwright.config.ts`
- **Vitest Config:** `vitest.config.ts`
- **Package Scripts:** `package.json`
- **Node Version:** `.nvmrc`
- **CI/CD Documentation:** `CI_CD_SETUP.md`

---

**Last Updated:** December 11, 2025
**Maintained by:** 10xCards Team

