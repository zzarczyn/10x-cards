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
    cd 10xCards
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the root directory based on `.env.example`. You will need credentials for:
    - Supabase (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`)
    - OpenRouter (`OPENROUTER_API_KEY`)

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application should now be running at `http://localhost:4321`.

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

## Project Status

🚧 **In Development (MVP Phase)**

The project is currently in the active development phase, focusing on implementing the core AI generation flow and user management systems.

## License

[MIT](LICENSE) © 2025 10xCards.
