# Pull Request Workflow - Visual Diagram

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PR Event Triggers                         │
│  (opened, synchronize, reopened) → branches: [main]         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │      Job 1: Linting           │
         │  ─────────────────────────    │
         │  • Checkout code              │
         │  • Setup Node.js 22.20.0      │
         │  • npm ci                     │
         │  • npm run lint               │
         │                               │
         │  Duration: ~1-2 min           │
         └───────────────┬───────────────┘
                         │
                ┌────────┴────────┐
                │  Lint Passed?   │
                └────────┬────────┘
                         │ YES
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌────────────────────┐          ┌────────────────────┐
│ Job 2: Unit Tests  │          │ Job 3: E2E Tests   │
│ ──────────────────│          │ ──────────────────│
│ • Checkout         │          │ • Checkout         │
│ • Setup Node.js    │          │ • Setup Node.js    │
│ • npm ci           │          │ • npm ci           │
│ • test:coverage    │          │ • Install Chromium │
│ • Upload coverage  │          │ • test:e2e         │
│                    │          │ • Upload reports   │
│ Duration: ~2-3 min │          │ • Upload results   │
│                    │          │                    │
│ Environment: -     │          │ Environment:       │
│                    │          │   integration      │
│                    │          │                    │
│ Secrets: -         │          │ Secrets:           │
│                    │          │   SUPABASE_URL     │
│                    │          │   SUPABASE_KEY     │
│                    │          │   OPENROUTER_*     │
│                    │          │                    │
│ Duration: ~2-3 min │          │ Duration: ~3-5 min │
└─────────┬──────────┘          └─────────┬──────────┘
          │                               │
          │    ┌─────────────────────────┘
          │    │
          └────┴────┐
                    │
                    ▼
        ┌───────────────────────┐
        │ All Jobs Complete?    │
        │ (even if failed)      │
        └───────────┬───────────┘
                    │ if: always()
                    ▼
    ┌───────────────────────────────┐
    │  Job 4: Status Comment        │
    │  ─────────────────────────    │
    │  • Checkout                   │
    │  • Download artifacts         │
    │  • Create/update PR comment   │
    │                               │
    │  Permissions:                 │
    │    pull-requests: write       │
    │                               │
    │  Duration: ~10-20 sec         │
    └───────────────┬───────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │   PR Comment Posted   │
        │                       │
        │  ✅ All checks passed │
        │  or                   │
        │  ❌ Some checks failed│
        └───────────────────────┘
```

## Job Dependencies

```
lint
 ├─→ unit-tests (needs: [lint])
 └─→ e2e-tests  (needs: [lint])
      │
      └─→ status-comment (needs: [lint, unit-tests, e2e-tests])
```

## Parallel Execution

```
Time →
0min    1min    2min    3min    4min    5min    6min    7min    8min
│───────│───────│───────│───────│───────│───────│───────│───────│
│                                                                 │
│  Linting                                                        │
│  ████████                                                       │
│          │                                                      │
│          ├─────────────────────────────────────────────────────│
│          │                                                      │
│          │  Unit Tests                                         │
│          │  ██████████████                                     │
│          │                                                      │
│          │  E2E Tests                                          │
│          │  ████████████████████████████                       │
│          │                              │                      │
│          │                              │  Status Comment      │
│          │                              │  ██                  │
│          │                              │                      │
└──────────┴──────────────────────────────┴──────────────────────┘

Total Time: ~5-8 minutes (vs ~10-12 minutes if sequential)
```

## Artifact Flow

```
┌─────────────────┐
│   Unit Tests    │
└────────┬────────┘
         │
         │ Uploads
         ▼
┌─────────────────────────┐
│ Artifact:               │
│ unit-test-coverage/     │
│   • coverage.json       │
│   • lcov.info           │
│   • HTML reports        │
└────────┬────────────────┘
         │
         │ Downloads (in status-comment)
         ▼
┌─────────────────────────┐
│  (Optional: Future use) │
│  Coverage badge/report  │
└─────────────────────────┘

┌─────────────────┐
│   E2E Tests     │
└────────┬────────┘
         │
         │ Uploads
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│ Artifact:        │  │ Artifact:        │
│ playwright-report│  │ e2e-test-results │
│   • index.html   │  │   • results.json │
│   • screenshots  │  │                  │
│   • videos       │  │                  │
│   • traces       │  │                  │
└──────────────────┘  └──────────────────┘
         │                  │
         │ Downloads (in status-comment)
         ▼                  ▼
┌─────────────────────────────┐
│  (Optional: Future use)     │
│  Test results visualization │
└─────────────────────────────┘
```

## Status Comment Logic

```
┌──────────────────────────┐
│ Get job results:         │
│  • lint.result           │
│  • unit-tests.result     │
│  • e2e-tests.result      │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Build status table       │
│  with emojis:            │
│  ✅ success              │
│  ❌ failure              │
│  ⚠️ cancelled            │
│  ⏭️ skipped              │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Check if bot comment     │
│ already exists on PR     │
└────────────┬─────────────┘
             │
        ┌────┴────┐
        │         │
   YES  │         │  NO
        │         │
        ▼         ▼
┌──────────┐  ┌──────────┐
│ Update   │  │ Create   │
│ existing │  │ new      │
│ comment  │  │ comment  │
└──────────┘  └──────────┘
```

## Environment & Secrets Flow

```
┌─────────────────────────────────────────┐
│  GitHub Repository Settings             │
│  ────────────────────────────────────   │
│                                          │
│  Secrets (Actions):                     │
│    • SUPABASE_URL                       │
│    • SUPABASE_KEY                       │
│    • OPENROUTER_API_KEY                 │
│    • OPENROUTER_MODEL                   │
│                                          │
└────────────────┬────────────────────────┘
                 │
                 │ Referenced by
                 ▼
┌─────────────────────────────────────────┐
│  Environment: integration               │
│  ────────────────────────────────────   │
│                                          │
│  Inherits repository secrets            │
│  (or can override with env-specific)    │
│                                          │
└────────────────┬────────────────────────┘
                 │
                 │ Used in
                 ▼
┌─────────────────────────────────────────┐
│  Job: e2e-tests                         │
│  ────────────────────────────────────   │
│                                          │
│  env:                                   │
│    SUPABASE_URL: ${{ secrets.* }}       │
│    SUPABASE_KEY: ${{ secrets.* }}       │
│    OPENROUTER_API_KEY: ${{ secrets.* }} │
│    OPENROUTER_MODEL: ${{ secrets.* }}   │
│                                          │
└────────────────┬────────────────────────┘
                 │
                 │ Passed to
                 ▼
┌─────────────────────────────────────────┐
│  Playwright Tests                       │
│  ────────────────────────────────────   │
│                                          │
│  Access via process.env.*               │
│  Used in Supabase client & API calls    │
│                                          │
└─────────────────────────────────────────┘
```

## Browser Testing Strategy

```
┌────────────────────────────────────────┐
│  playwright.config.ts                  │
│  ──────────────────────────────────    │
│                                         │
│  projects: [                           │
│    {                                   │
│      name: "chromium",                 │
│      use: { ...devices["Desktop Chrome"] }│
│    }                                   │
│  ]                                     │
│                                         │
└────────────────┬───────────────────────┘
                 │
                 │ Enforced in workflow
                 ▼
┌────────────────────────────────────────┐
│  Workflow: e2e-tests                   │
│  ──────────────────────────────────    │
│                                         │
│  npx playwright install                │
│    --with-deps chromium                │
│                                         │
│  (Only Chromium installed)             │
│                                         │
└────────────────┬───────────────────────┘
                 │
                 │ Results in
                 ▼
┌────────────────────────────────────────┐
│  Benefits:                             │
│  • Faster installation (~1-2 min)     │
│  • Lower disk usage (~200MB vs 1GB)   │
│  • Faster test execution               │
│  • Sufficient for MVP testing          │
│                                         │
│  Trade-off:                            │
│  • No cross-browser testing            │
│  • (Can add Firefox/Safari later)      │
└────────────────────────────────────────┘
```

## Error Handling

```
┌──────────────────┐
│  Any Job Fails   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Artifacts still uploaded        │
│  (if: always() condition)        │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Status comment still runs       │
│  (needs + if: always())          │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  PR shows:                       │
│  ❌ Some checks failed           │
│  ⚠️ Please fix before merging   │
└──────────────────────────────────┘
```

## Caching Strategy

```
┌─────────────────────────────────┐
│  First Run (No Cache)           │
│  ─────────────────────────────  │
│                                  │
│  npm ci: ~2-3 minutes           │
│  (Downloads all dependencies)   │
│                                  │
└────────────┬────────────────────┘
             │
             │ Cache saved
             ▼
┌─────────────────────────────────┐
│  Cache Key:                     │
│  ${{ runner.os }}-node-         │
│  ${{ hashFiles('**/package-     │
│  lock.json') }}                 │
└────────────┬────────────────────┘
             │
             │ Cache restored
             ▼
┌─────────────────────────────────┐
│  Subsequent Runs (Cache Hit)    │
│  ─────────────────────────────  │
│                                  │
│  npm ci: ~30-60 seconds         │
│  (Only verifies dependencies)   │
│                                  │
└─────────────────────────────────┘

Savings: ~1.5-2 minutes per job × 3 jobs = ~4.5-6 minutes total
```

## Retention Policy

```
┌────────────────────────────────────┐
│  Artifacts                         │
│  ────────────────────────────────  │
│                                     │
│  • unit-test-coverage              │
│  • playwright-report               │
│  • e2e-test-results                │
│                                     │
│  Retention: 7 days                 │
│                                     │
└────────────┬───────────────────────┘
             │
             │ After 7 days
             ▼
┌────────────────────────────────────┐
│  Automatic Cleanup                 │
│  ────────────────────────────────  │
│                                     │
│  Artifacts deleted to save storage │
│  Workflow logs remain (90 days)    │
│                                     │
└────────────────────────────────────┘

Why 7 days?
• Sufficient for debugging recent PRs
• Balances storage costs
• Aligns with typical PR review cycle
```

---

**Legend:**
- `████` = Job execution time
- `→` = Sequential dependency
- `├─→` = Parallel execution
- `▼` = Flow direction
- `✅` = Success
- `❌` = Failure
- `⚠️` = Warning/Cancelled
- `⏭️` = Skipped

---

**Last Updated:** December 11, 2025

