# CI/CD Workflow Diagrams

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         TRIGGER EVENT                            │
│                                                                   │
│  • Developer pushes to main/master                               │
│  • Manual trigger via GitHub Actions UI                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GITHUB ACTIONS RUNNER                         │
│                      (ubuntu-latest)                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌──────────────┐                            ┌──────────────┐
│  LINT JOB    │                            │ UNIT TESTS   │
│              │                            │     JOB      │
│ • ESLint     │                            │              │
│ • ~1-2 min   │                            │ • Vitest     │
│              │                            │ • MSW mocks  │
│ ✅ Pass       │                            │ • ~2-3 min   │
│ ❌ Fail       │                            │              │
└──────────────┘                            │ ✅ Pass       │
        │                                   │ ❌ Fail       │
        │                                   └──────────────┘
        │                                           │
        └─────────────────┬─────────────────────────┘
                          │
                          │ (both must pass)
                          ▼
                  ┌──────────────┐
                  │  BUILD JOB   │
                  │              │
                  │ • Astro      │
                  │ • Production │
                  │ • ~2-3 min   │
                  │              │
                  │ ✅ Pass       │
                  │ ❌ Fail       │
                  └──────────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │  ARTIFACTS   │
                  │              │
                  │ • dist/      │
                  │ • 7 days     │
                  └──────────────┘


        ┌─────────────────────────────────────┐
        │    E2E TESTS JOB (Parallel)         │
        │                                     │
        │ • Playwright                        │
        │ • Chromium                          │
        │ • ~3-5 min                          │
        │                                     │
        │ ✅ Pass                              │
        │ ❌ Fail                              │
        └─────────────────────────────────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │  ARTIFACTS   │
                  │              │
                  │ • playwright-│
                  │   report/    │
                  │ • 7 days     │
                  └──────────────┘
```

---

## Detailed Job Flow

### 1. Lint Job

```
┌─────────────────────────────────────────┐
│         LINT JOB START                  │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Step 1: Checkout code                  │
│  actions/checkout@v4                    │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Step 2: Setup Node.js                  │
│  actions/setup-node@v4                  │
│  • Version: 22.20.0 (from .nvmrc)       │
│  • Cache: npm                           │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Step 3: Install dependencies           │
│  npm ci                                 │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Step 4: Run ESLint                     │
│  npm run lint                           │
└─────────────────────────────────────────┘
                 │
                 ▼
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
    ✅ SUCCESS        ❌ FAILURE
        │                 │
        │                 ▼
        │         ┌───────────────┐
        │         │ Job fails     │
        │         │ Build blocked │
        │         └───────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│  Continue to Build (if Unit Tests pass) │
└─────────────────────────────────────────┘
```

---

### 2. Unit Tests Job

```
┌─────────────────────────────────────────┐
│       UNIT TESTS JOB START              │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Step 1: Checkout code                  │
│  actions/checkout@v4                    │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Step 2: Setup Node.js                  │
│  actions/setup-node@v4                  │
│  • Version: 22.20.0 (from .nvmrc)       │
│  • Cache: npm                           │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Step 3: Install dependencies           │
│  npm ci                                 │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Step 4: Run Vitest                     │
│  npm run test -- --run                  │
│  • MSW mocks API calls                  │
│  • No secrets needed                    │
└─────────────────────────────────────────┘
                 │
                 ▼
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
    ✅ SUCCESS        ❌ FAILURE
        │                 │
        │                 ▼
        │         ┌───────────────┐
        │         │ Job fails     │
        │         │ Build blocked │
        │         └───────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│  Continue to Build (if Lint pass)       │
└─────────────────────────────────────────┘
```

---

### 3. E2E Tests Job (Parallel)

```
┌─────────────────────────────────────────┐
│        E2E TESTS JOB START              │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Step 1: Checkout code                  │
│  actions/checkout@v4                    │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Step 2: Setup Node.js                  │
│  actions/setup-node@v4                  │
│  • Version: 22.20.0 (from .nvmrc)       │
│  • Cache: npm                           │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Step 3: Install dependencies           │
│  npm ci                                 │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Step 4: Install Playwright browsers    │
│  npx playwright install --with-deps     │
│  chromium                               │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Step 5: Run Playwright tests           │
│  npm run test:e2e                       │
│  • Requires secrets:                    │
│    - SUPABASE_URL                       │
│    - SUPABASE_KEY                       │
│    - OPENROUTER_API_KEY                 │
│  • CI=true                              │
└─────────────────────────────────────────┘
                 │
                 ▼
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
    ✅ SUCCESS        ❌ FAILURE
        │                 │
        │                 ▼
        │         ┌───────────────────┐
        │         │ Upload artifacts  │
        │         │ (playwright-      │
        │         │  report/)         │
        │         └───────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│  Step 6: Upload Playwright report       │
│  if: always()                           │
│  actions/upload-artifact@v4             │
│  • Retention: 7 days                    │
└─────────────────────────────────────────┘
```

---

### 4. Build Job (Sequential)

```
┌─────────────────────────────────────────┐
│          BUILD JOB START                │
│   (waits for Lint + Unit Tests)        │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Check: Lint passed?                    │
│  Check: Unit Tests passed?              │
└─────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
    ✅ Both pass      ❌ Any failed
        │                 │
        │                 ▼
        │         ┌───────────────┐
        │         │ Skip build    │
        │         └───────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│  Step 1: Checkout code                  │
│  actions/checkout@v4                    │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Step 2: Setup Node.js                  │
│  actions/setup-node@v4                  │
│  • Version: 22.20.0 (from .nvmrc)       │
│  • Cache: npm                           │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Step 3: Install dependencies           │
│  npm ci                                 │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Step 4: Build production               │
│  npm run build                          │
│  • Requires secrets:                    │
│    - SUPABASE_URL                       │
│    - SUPABASE_KEY                       │
│    - OPENROUTER_API_KEY                 │
└─────────────────────────────────────────┘
                 │
                 ▼
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
    ✅ SUCCESS        ❌ FAILURE
        │                 │
        │                 ▼
        │         ┌───────────────┐
        │         │ Job fails     │
        │         └───────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│  Step 5: Upload build artifacts         │
│  actions/upload-artifact@v4             │
│  • Name: dist                           │
│  • Path: dist/                          │
│  • Retention: 7 days                    │
└─────────────────────────────────────────┘
```

---

## Parallel vs Sequential Execution

```
TIME →

0 min   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
        │    LINT     │  │ UNIT TESTS  │  │  E2E TESTS  │
        │             │  │             │  │             │
2 min   │             │  │             │  │             │
        │             │  │             │  │             │
3 min   └─────────────┘  └─────────────┘  │             │
                                          │             │
5 min                                     └─────────────┘
        
        └──────────┬──────────┘
                   │
                   │ (needs: lint, unit-tests)
                   ▼
                   
5 min   ┌─────────────┐
        │    BUILD    │
        │             │
7 min   │             │
        │             │
8 min   └─────────────┘

TOTAL: ~8 minutes (with parallelization)

Without parallelization: ~13 minutes
Savings: ~5 minutes (38%)
```

---

## Secrets Flow

```
┌─────────────────────────────────────────┐
│    GITHUB REPOSITORY SECRETS            │
│                                         │
│  • SUPABASE_URL                         │
│  • SUPABASE_KEY                         │
│  • OPENROUTER_API_KEY                   │
└─────────────────────────────────────────┘
                 │
                 │ (encrypted)
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐  ┌──────────────┐
│  E2E TESTS   │  │    BUILD     │
│              │  │              │
│  env:        │  │  env:        │
│  • SUPABASE_ │  │  • SUPABASE_ │
│    URL       │  │    URL       │
│  • SUPABASE_ │  │  • SUPABASE_ │
│    KEY       │  │    KEY       │
│  • OPENROUTER│  │  • OPENROUTER│
│    _API_KEY  │  │    _API_KEY  │
└──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐
│    LINT      │  │ UNIT TESTS   │
│              │  │              │
│  No secrets  │  │  No secrets  │
│  (not needed)│  │  (MSW mocks) │
└──────────────┘  └──────────────┘
```

---

## Artifacts Flow

```
┌─────────────────────────────────────────┐
│           BUILD JOB                     │
│                                         │
│  npm run build                          │
│  → generates dist/                      │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  actions/upload-artifact@v4             │
│  • name: dist                           │
│  • path: dist/                          │
│  • retention-days: 7                    │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│    GITHUB ARTIFACTS STORAGE             │
│                                         │
│  dist.zip (available for 7 days)        │
└─────────────────────────────────────────┘
                 │
                 ▼
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐  ┌──────────────┐
│   DOWNLOAD   │  │  AUTO-DELETE │
│   (manual)   │  │  (after 7d)  │
└──────────────┘  └──────────────┘


┌─────────────────────────────────────────┐
│         E2E TESTS JOB                   │
│                                         │
│  npm run test:e2e                       │
│  → generates playwright-report/         │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  actions/upload-artifact@v4             │
│  • name: playwright-report              │
│  • path: playwright-report/             │
│  • retention-days: 7                    │
│  • if: always()                         │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│    GITHUB ARTIFACTS STORAGE             │
│                                         │
│  playwright-report.zip (7 days)         │
└─────────────────────────────────────────┘
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────┐
│         JOB EXECUTION                   │
└─────────────────────────────────────────┘
                 │
                 ▼
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
    ✅ SUCCESS        ❌ FAILURE
        │                 │
        │                 ▼
        │         ┌───────────────────┐
        │         │ 1. Job marked as  │
        │         │    failed (red X) │
        │         └───────────────────┘
        │                 │
        │                 ▼
        │         ┌───────────────────┐
        │         │ 2. Dependent jobs │
        │         │    are skipped    │
        │         └───────────────────┘
        │                 │
        │                 ▼
        │         ┌───────────────────┐
        │         │ 3. Email sent to  │
        │         │    committer      │
        │         └───────────────────┘
        │                 │
        │                 ▼
        │         ┌───────────────────┐
        │         │ 4. Badge shows    │
        │         │    "failing"      │
        │         └───────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│  Continue to next jobs                  │
└─────────────────────────────────────────┘
```

---

## Cache Flow

```
┌─────────────────────────────────────────┐
│    FIRST RUN (No cache)                 │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  actions/setup-node@v4                  │
│  cache: 'npm'                           │
│  → Cache miss                           │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  npm ci                                 │
│  → Downloads all packages (~2-3 min)    │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Cache saved                            │
│  Key: node-modules-${{ hashFiles(       │
│       '**/package-lock.json') }}        │
└─────────────────────────────────────────┘


┌─────────────────────────────────────────┐
│    SUBSEQUENT RUNS (Cache hit)          │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  actions/setup-node@v4                  │
│  cache: 'npm'                           │
│  → Cache hit                            │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Restore from cache (~30 seconds)       │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  npm ci                                 │
│  → Skips download (uses cache)          │
│  → Much faster (~30 seconds)            │
└─────────────────────────────────────────┘

SAVINGS: ~2 minutes per job
TOTAL SAVINGS: ~6-8 minutes per workflow
```

---

## Legend

```
┌─────────┐
│  Box    │  = Step or Process
└─────────┘

    │
    ▼         = Flow direction

    ┌──┐
────┤  ├────  = Decision point
    └──┘

✅ SUCCESS    = Successful execution
❌ FAILURE    = Failed execution
⚠️  WARNING   = Warning or optional step
```

---

**Last Updated:** 2025-12-11  
**Version:** 1.0

