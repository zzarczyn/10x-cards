# 10xCards

[![CI/CD Pipeline](https://github.com/zzarczyn/10x-cards/actions/workflows/ci.yml/badge.svg)](https://github.com/zzarczyn/10x-cards/actions/workflows/ci.yml)

10xCards is an AI-powered web application designed to drastically reduce the time required to create educational materials (flashcards). By leveraging Large Language Models (LLMs), it extracts Question-Answer pairs from raw text, allowing users to focus on learning rather than the tedious process of manual data entry.

## Project Description

The primary barrier to adopting spaced repetition learning is the high upfront cost of creating high-quality flashcards. 10xCards solves this by automating the "heavy lifting" of knowledge extraction. Users paste text, and the system generates flashcard candidates which can be reviewed, edited, and saved to a personal collection.

**Key Features (MVP):**
- **AI Generator:** Paste text (1k-10k characters) to automatically generate flashcard proposals.
- **Review Mode:** Verify, edit, accept, or reject AI-generated cards before saving them.
- **Flashcard Management:** A dashboard to view, flip, edit, and delete saved flashcards.
- **Authentication:** Secure email/password login and registration.
- **Manual Creation:** Option to manually add specific flashcards.

## Tech Stack

This project uses a modern, bleeding-edge technology stack:

- **Framework:** [Astro 5](https://astro.build/) (Server-side rendering & Islands architecture)
- **Frontend:** [React 19](https://react.dev/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/) & [Shadcn/ui](https://ui.shadcn.com/)
- **Language:** [TypeScript 5](https://www.typescriptlang.org/)
- **Backend & Auth:** [Supabase](https://supabase.com/) (PostgreSQL, Auth, Row Level Security)
- **AI Provider:** [OpenRouter](https://openrouter.ai/) (LLM Integration)

### Testing Stack

- **Unit & Integration Testing:** [Vitest](https://vitest.dev/) (Test framework)
- **Component Testing:** [React Testing Library](https://testing-library.com/react) (React component testing)
- **E2E Testing:** [Playwright](https://playwright.dev/) (Cross-browser automation)
- **API Mocking:** [MSW](https://mswjs.io/) (Mock Service Worker)
- **Test Data Generation:** [Faker.js](https://fakerjs.dev/) (Realistic test data)

## Getting Started Locally

Follow these instructions to get a local copy of the project up and running.

### Prerequisites

- **Node.js:** Version `22.20.0` or higher (managed via `.nvmrc`).
- **npm** (Node Package Manager).

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/zzarczyn/10x-cards.git
    cd 10x-cards
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the root directory with the following variables:
    
    ```env
    # Supabase Configuration
    SUPABASE_URL=https://your-project.supabase.co
    SUPABASE_KEY=your-anon-public-key-here
    
    # OpenRouter API Configuration
    OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
    OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
    ```
    
    **Where to get these credentials:**
    - **Supabase:** Get `SUPABASE_URL` and `SUPABASE_KEY` from your [Supabase project settings](https://app.supabase.com/project/_/settings/api)
    - **OpenRouter:** Get your API key from [OpenRouter Keys](https://openrouter.ai/keys)
    - **Model:** See available models at [OpenRouter Models](https://openrouter.ai/models)

4.  **Run database migrations:**
    ```bash
    npx supabase db push
    ```

5.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application should now be running at `http://localhost:3000`.

## Available Scripts

| Script | Description |
| :--- | :--- |
| `npm run dev` | Starts the Astro development server with hot module replacement. |
| `npm run build` | Builds the production-ready site to the `./dist/` directory. |
| `npm run preview` | Previews the production build locally. |
| `npm run lint` | Runs ESLint to check for code quality issues. |
| `npm run lint:fix` | Runs ESLint and automatically fixes fixable issues. |
| `npm run format` | Formats code using Prettier. |
| `npm run test` | Runs unit and integration tests with Vitest. |
| `npm run test:ui` | Opens Vitest UI for interactive test running. |
| `npm run test:coverage` | Generates test coverage report. |
| `npm run test:e2e` | Runs end-to-end tests with Playwright. |
| `npm run test:e2e:ui` | Opens Playwright UI for interactive E2E testing. |

## Project Scope

### In Scope (MVP)
- **Authentication:** User accounts via Email/Password.
- **Generator:** Text-to-flashcard extraction via AI.
- **Review System:** Temporary state for vetting AI suggestions.
- **CRUD Operations:** Full management of saved flashcards.
- **Desktop View:** Optimized for desktop browsers.

### Out of Scope (for MVP)
- **Spaced Repetition Algorithm:** No built-in scheduling or "Study Mode" yet.
- **File Imports:** No PDF/DOCX support (text only).
- **Mobile Responsiveness:** Not optimized for mobile devices.
- **Social Features:** No sharing or public profiles.

## Testing

The project uses a comprehensive testing strategy covering unit tests, integration tests, and end-to-end tests.

### Testing Framework

**Unit & Integration Tests** (Vitest + React Testing Library):
- Test individual functions, services, and components in isolation
- Mock external dependencies (API calls, database)
- Fast execution, run on every commit
- Target coverage: 80% for services, 70% for components

**End-to-End Tests** (Playwright):
- Test complete user workflows across the entire application
- Run in real browsers (Chromium)
- Verify integration between frontend, backend, and external services
- Critical for authentication, generator, and CRUD flows

### Quick Start - E2E Tests

**First time setup:**
```bash
# 1. Check if environment is ready
npm run test:e2e:check

# 2. Create .env.test file (copy from example)
cp env.test.example .env.test

# 3. Start dev server (in separate terminal)
npm run dev

# 4. Register test user at http://localhost:4321/auth/register
#    Use credentials from .env.test (test@example.com / testpassword123)

# 5. Run tests!
npm run test:e2e:ui
```

**Quick Test Commands**:
```bash
# Check E2E environment readiness
npm run test:e2e:check

# Run unit tests
npm run test

# Run unit tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run E2E tests (headless)
npm run test:e2e

# Run E2E tests with UI (recommended)
npm run test:e2e:ui

# Run E2E tests with visible browser
npm run test:e2e:headed

# Debug E2E tests step-by-step
npm run test:e2e:debug
```

**Testing Documentation:**
- 🚀 **Quick Start:** See `E2E_QUICK_START.md` for 5-minute setup guide
- 📋 **Detailed Setup:** See `E2E_READINESS_CHECK.md` for complete checklist
- 📚 **E2E Guide:** See `e2e/README.md` for comprehensive E2E testing documentation
- 🔐 **Authentication:** See `e2e/AUTHENTICATION.md` for auth testing strategies
- 📖 **Test Setup:** See `TEST_SETUP.md` for overall testing configuration
- 📝 **Test Plan:** See `.ai/test-plan.md` for detailed testing strategy

### API Endpoint Testing

The project includes comprehensive testing documentation for API endpoints:

#### Flashcard Generation (POST /api/flashcards/generate)
- **Testing Guide:** See `.ai/testing-guide-generate-endpoint.md` for detailed manual testing instructions
- **Test Script:** Run `.ai/test-generate-endpoint.sh <SESSION_TOKEN>` for automated endpoint testing

#### Flashcard Creation (POST /api/flashcards)
- **Test Results:** See `.ai/test-flashcards-endpoint.md` for test case documentation
- **Test Script:** Run `.ai/test-flashcards-endpoint.sh` for automated endpoint testing (requires JWT token and generation_id)

**Quick Test:**

```bash
# 1. Start the dev server
npm run dev

# 2. Get your JWT token (log in via browser, check Authorization header)

# 3. Generate flashcards (to get generation_id)
# Use POST /api/flashcards/generate

# 4. Test flashcard creation
bash .ai/test-flashcards-endpoint.sh
```

### Database Verification

After testing endpoints, verify data in Supabase:

```sql
-- Check recent generations
SELECT * FROM public.generations 
ORDER BY created_at DESC 
LIMIT 5;

-- Check created flashcards
SELECT id, user_id, front, back, source, generation_id, created_at
FROM public.flashcards
ORDER BY created_at DESC
LIMIT 10;

-- Verify flashcard-generation linkage
SELECT f.id, f.front, f.source, f.generation_id, g.card_count
FROM flashcards f
LEFT JOIN generations g ON f.generation_id = g.id
WHERE f.generation_id IS NOT NULL;
```

## CI/CD

The project uses GitHub Actions for continuous integration and deployment verification.

### Workflow: CI/CD Pipeline

**Triggers:**
- ✅ Manual execution (via GitHub Actions UI)
- ✅ Automatic on push to `main`/`master` branch

**Jobs:**
1. **Lint** - Code quality checks with ESLint
2. **Unit Tests** - Vitest test suite
3. **E2E Tests** - Playwright browser tests (Chromium)
4. **Build** - Production build verification

**Setup:** See [`.github/workflows/README.md`](.github/workflows/README.md) for detailed configuration.

**GitHub Secrets Required:**
```env
SUPABASE_URL          # Supabase project URL
SUPABASE_KEY          # Supabase anon/public key
OPENROUTER_API_KEY    # OpenRouter API key
```

Configure secrets in: `Settings` → `Secrets and variables` → `Actions`

## Project Status

🚧 **In Development (MVP Phase)**

The project is currently in the active development phase, focusing on implementing the core AI generation flow and user management systems.

### Implemented Features
- ✅ Database schema (flashcards, generations tables)
- ✅ Authentication middleware (Supabase Auth)
- ✅ POST /api/flashcards/generate endpoint (AI generation)
- ✅ POST /api/flashcards endpoint (Create flashcard)
- ✅ AI flashcard generation service (OpenRouter integration)
- ✅ Flashcard management service (CRUD operations)
- ✅ Comprehensive error handling and validation

### Next Steps
- 🔲 Frontend: Generator UI component
- 🔲 Frontend: Review mode for AI suggestions
- 🔲 GET /api/flashcards endpoint (List flashcards)
- 🔲 GET /api/flashcards/:id endpoint (Get single flashcard)
- 🔲 PUT /api/flashcards/:id endpoint (Update flashcard)
- 🔲 DELETE /api/flashcards/:id endpoint (Delete flashcard)
- 🔲 Dashboard for viewing saved flashcards

## License

[MIT](LICENSE) © 2025 10xCards.
