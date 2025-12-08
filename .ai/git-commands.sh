#!/bin/bash

# ==============================================================================
# Git Commands for Feature: POST /api/flashcards/generate
# ==============================================================================
# This script contains all git commands needed to commit the implementation.
# Review each section before executing.
# ==============================================================================

set -e

echo "🔍 Checking git status..."
git status

echo ""
echo "📋 Files to be committed:"
echo ""
echo "Core Implementation:"
echo "  ✓ src/lib/errors.ts"
echo "  ✓ src/lib/services/flashcard-generation.service.ts"
echo "  ✓ src/pages/api/flashcards/generate.ts"
echo ""
echo "Configuration:"
echo "  ✓ src/env.d.ts"
echo "  ✓ src/db/supabase.client.ts"
echo "  ✓ src/middleware/index.ts"
echo ""
echo "Documentation:"
echo "  ✓ README.md"
echo ""
echo "Testing & Docs (optional):"
echo "  ✓ .ai/testing-guide-generate-endpoint.md"
echo "  ✓ .ai/test-generate-endpoint.sh"
echo "  ✓ .ai/code-review-checklist.md"
echo "  ✓ .ai/implementation-summary.md"
echo "  ✓ .ai/pre-merge-checklist.md"
echo "  ✓ .ai/git-commands.sh"
echo ""

read -p "Continue with commit? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# ==============================================================================
# Option 1: Single Commit (Implementation + Documentation)
# ==============================================================================

echo ""
echo "Option 1: Creating single commit with all changes..."
echo ""

git add src/lib/errors.ts
git add src/lib/services/flashcard-generation.service.ts
git add src/pages/api/flashcards/generate.ts
git add src/env.d.ts
git add src/db/supabase.client.ts
git add src/middleware/index.ts
git add README.md
git add .ai/testing-guide-generate-endpoint.md
git add .ai/test-generate-endpoint.sh
git add .ai/code-review-checklist.md
git add .ai/implementation-summary.md
git add .ai/pre-merge-checklist.md
git add .ai/git-commands.sh

git commit -m "feat: implement POST /api/flashcards/generate endpoint

Implements AI-powered flashcard generation using OpenRouter LLM API.
Users can submit text (1000-10000 chars) and receive flashcard
suggestions (question-answer pairs) for review.

Core Features:
- FlashcardGenerationService with OpenRouter integration
- 30-second timeout protection via AbortController
- Comprehensive input validation using Zod
- Generation analytics logging to database
- Structured error responses (400, 401, 503, 500)

Security:
- Authentication required via Supabase middleware
- API key stored server-side only
- Prompt injection mitigation
- RLS policies ready for production

Technical Details:
- Custom error types (LLMServiceError, ValidationError)
- Type-safe DTOs from src/types.ts
- Service layer pattern for testability
- JSDoc documentation on all methods

Testing:
- 8 test scenarios documented
- Automated test script included
- Manual testing guide created
- Code review checklist prepared

Files Changed:
- New: src/lib/errors.ts (49 lines)
- New: src/lib/services/flashcard-generation.service.ts (301 lines)
- New: src/pages/api/flashcards/generate.ts (171 lines)
- New: .ai/testing-guide-generate-endpoint.md (500+ lines)
- New: .ai/test-generate-endpoint.sh (200+ lines)
- New: .ai/code-review-checklist.md (400+ lines)
- New: .ai/implementation-summary.md (300+ lines)
- New: .ai/pre-merge-checklist.md (250+ lines)
- Modified: src/middleware/index.ts (auth for /api/*)
- Modified: src/env.d.ts (OpenRouter env vars)
- Modified: src/db/supabase.client.ts (export SupabaseClient type)
- Modified: README.md (testing section, env docs)

Refs: US-003"

echo ""
echo "✅ Commit created successfully!"
echo ""
echo "Next steps:"
echo "  1. Review commit: git show"
echo "  2. Push to remote: git push origin feature/flashcard-generation-endpoint"
echo "  3. Create Pull Request"
echo ""

# ==============================================================================
# Note: Alternative approach with separate commits is commented below
# ==============================================================================

# # Commit 1: Core Implementation
# git add src/lib/errors.ts src/lib/services/flashcard-generation.service.ts \
#         src/pages/api/flashcards/generate.ts src/middleware/index.ts \
#         src/env.d.ts src/db/supabase.client.ts README.md
# 
# git commit -m "feat: implement POST /api/flashcards/generate endpoint
# 
# [Same message as above, without documentation files]"
# 
# # Commit 2: Testing & Documentation
# git add .ai/testing-guide-generate-endpoint.md \
#         .ai/test-generate-endpoint.sh \
#         .ai/code-review-checklist.md \
#         .ai/implementation-summary.md \
#         .ai/pre-merge-checklist.md \
#         .ai/git-commands.sh
# 
# git commit -m "docs: add comprehensive testing and documentation
# 
# - Add manual testing guide with 8 test scenarios
# - Add automated test script (bash)
# - Add code review checklist (100+ items)
# - Add implementation summary with metrics
# - Add pre-merge verification checklist
# - Add git commands helper script"

