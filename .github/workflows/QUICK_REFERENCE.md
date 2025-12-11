# Pull Request Workflow - Quick Reference

## 🚀 Quick Start

### 1. Configure Secrets (One-time setup)
```
Settings → Secrets and variables → Actions → New repository secret
```

Add these secrets:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
OPENROUTER_API_KEY=sk-or-v1-your-key
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

### 2. Create Environment (One-time setup)
```
Settings → Environments → New environment
```

Name: `integration`
- Inherits repository secrets (no additional config needed)

### 3. Create a PR
```bash
git checkout -b feature/your-feature
# Make changes
git commit -m "feat: your feature"
git push origin feature/your-feature
# Create PR via GitHub UI
```

### 4. Watch the Workflow Run
- Go to PR → "Checks" tab
- See real-time status of all jobs
- Wait for status comment to appear

---

## 📊 Workflow Jobs

| Job | Duration | Runs After | Can Fail? |
|-----|----------|------------|-----------|
| **Linting** | 1-2 min | Immediately | ❌ Blocks all |
| **Unit Tests** | 2-3 min | Linting passes | ⚠️ Doesn't block E2E |
| **E2E Tests** | 3-5 min | Linting passes | ⚠️ Doesn't block Unit |
| **Status Comment** | 10-20 sec | All complete | ✅ Always runs |

**Total Time:** ~5-8 minutes

---

## 🔍 Reading the Status Comment

### ✅ All Passed
```markdown
## Pull Request Checks Status

| Check | Status |
|-------|--------|
| Linting | ✅ success |
| Unit Tests | ✅ success |
| E2E Tests | ✅ success |

### Overall Result: ✅ All checks passed!

🎉 This PR is ready for review!
```
**Action:** PR is ready to merge (after approval)

### ❌ Some Failed
```markdown
## Pull Request Checks Status

| Check | Status |
|-------|--------|
| Linting | ✅ success |
| Unit Tests | ❌ failure |
| E2E Tests | ✅ success |

### Overall Result: ❌ Some checks failed

⚠️ Please fix the failing checks before merging.
```
**Action:** Click workflow link → View logs → Fix issues → Push new commit

---

## 🐛 Common Issues & Fixes

### ❌ "Missing environment variables"
**Problem:** E2E tests can't find `SUPABASE_URL`

**Fix:**
1. Go to Settings → Environments → integration
2. Add secrets or verify they exist
3. Re-run workflow

### ❌ ESLint errors
**Problem:** Linting job fails

**Fix:**
```bash
npm run lint:fix
git add .
git commit -m "fix: linting errors"
git push
```

### ❌ Unit tests fail
**Problem:** Test assertions fail

**Fix:**
```bash
npm run test:watch
# Fix failing tests
git commit -m "fix: unit tests"
git push
```

### ❌ E2E tests fail
**Problem:** Playwright tests timeout or fail

**Fix:**
```bash
npm run test:e2e:ui
# Debug failing tests
git commit -m "fix: e2e tests"
git push
```

### ⚠️ Status comment not posted
**Problem:** No comment appears on PR

**Fix:**
1. Check Settings → Actions → General → Workflow permissions
2. Ensure "Read and write permissions" is enabled
3. Re-run workflow

---

## 📦 Viewing Artifacts

### Unit Test Coverage
1. Go to workflow run → Summary
2. Download `unit-test-coverage` artifact
3. Extract and open `coverage/index.html` in browser

### E2E Test Report
1. Go to workflow run → Summary
2. Download `playwright-report` artifact
3. Extract and open `index.html` in browser
4. View screenshots/videos of failures

### E2E Test Results (JSON)
1. Download `e2e-test-results` artifact
2. Extract `results.json`
3. Use for programmatic analysis

---

## 🔄 Re-running Workflows

### Re-run All Jobs
1. Go to PR → Checks tab
2. Click "Re-run all jobs" (top right)

### Re-run Failed Jobs Only
1. Go to workflow run
2. Click "Re-run failed jobs"

### Re-run Single Job
1. Go to workflow run
2. Click on failed job
3. Click "Re-run job"

---

## 🎯 Workflow Triggers

The workflow runs automatically when:
- ✅ New PR is opened
- ✅ New commits are pushed to PR
- ✅ Closed PR is reopened

The workflow does NOT run when:
- ❌ PR is merged (use `ci.yml` for that)
- ❌ PR is closed without merging
- ❌ Comments are added to PR
- ❌ Labels are added to PR

---

## 📝 Package Scripts Used

| Script | Command | Used In |
|--------|---------|---------|
| `npm run lint` | `eslint .` | Linting job |
| `npm run test:coverage` | `vitest --coverage` | Unit Tests job |
| `npm run test:e2e` | `playwright test` | E2E Tests job |

---

## 🔐 Security Notes

### What's Safe to Share
- ✅ `SUPABASE_URL` (public URL)
- ✅ `SUPABASE_KEY` (anon/public key, RLS protected)
- ✅ Workflow logs (no secrets exposed)

### What's Secret
- ❌ `OPENROUTER_API_KEY` (costs money if leaked)
- ❌ `SUPABASE_SERVICE_KEY` (not used in this workflow)

### How Secrets Are Protected
- Secrets are encrypted in GitHub
- Never printed in logs (shown as `***`)
- Only accessible to workflow jobs
- Not accessible to forks (security feature)

---

## 📊 Performance Tips

### Speed Up Workflow
1. **Fix linting first** - Fails fast, saves time
2. **Keep tests focused** - Remove slow/flaky tests
3. **Use test.skip()** - Temporarily disable slow tests
4. **Optimize imports** - Reduce bundle size

### Reduce Costs (Private Repos)
1. **Limit parallel workers** - Already set to 1 in CI
2. **Reduce retries** - Already set to 2 in CI
3. **Clean up old artifacts** - Auto-deleted after 7 days
4. **Use caching** - Already enabled for npm

---

## 🛠️ Advanced Usage

### Skip Workflow for Specific Commits
```bash
git commit -m "docs: update README [skip ci]"
```
**Note:** This skips ALL workflows, not just pull-request.yml

### Debug Workflow Locally
```bash
# Install act
brew install act  # macOS
choco install act-cli  # Windows

# Run workflow
act pull_request

# Run specific job
act pull_request -j lint
```

### View Workflow YAML
```bash
cat .github/workflows/pull-request.yml
```

---

## 📚 Related Documentation

- **Full Documentation:** `.github/workflows/PULL_REQUEST_WORKFLOW.md`
- **Visual Diagrams:** `.github/workflows/WORKFLOW_DIAGRAM.md`
- **Implementation Summary:** `PULL_REQUEST_WORKFLOW_SUMMARY.md`
- **CI/CD Setup:** `CI_CD_SETUP.md`
- **Testing Guide:** `TESTING_GUIDE.md`

---

## 🆘 Getting Help

### Workflow Issues
1. Check workflow logs in GitHub Actions tab
2. Review this quick reference
3. Read full documentation (link above)
4. Check GitHub Actions status: https://www.githubstatus.com/

### Test Issues
1. Run tests locally: `npm run test` or `npm run test:e2e`
2. Check test documentation: `TEST_SETUP.md`
3. Review Playwright docs: https://playwright.dev/

### Configuration Issues
1. Verify secrets are set correctly
2. Check environment configuration
3. Review repository settings

---

## ✅ Checklist for New Contributors

Before creating your first PR:
- [ ] Read this quick reference
- [ ] Verify you can run tests locally
- [ ] Understand the workflow structure
- [ ] Know how to read status comments
- [ ] Know how to re-run failed jobs

---

**Last Updated:** December 11, 2025
**Workflow File:** `.github/workflows/pull-request.yml`
**Status:** ✅ Production Ready

