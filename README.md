# 10xCards

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
