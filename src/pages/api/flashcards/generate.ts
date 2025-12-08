/**
 * POST /api/flashcards/generate
 *
 * Generates ephemeral flashcard suggestions from user-provided text using AI (LLM via OpenRouter).
 *
 * Flow:
 * 1. Validate authentication (handled by middleware)
 * 2. Validate request body (text: 1000-10000 chars)
 * 3. Call FlashcardGenerationService to generate flashcards
 * 4. Log generation to database for analytics
 * 5. Return flashcard suggestions (not saved to DB yet)
 *
 * Security:
 * - Requires authentication (JWT via Supabase)
 * - Input validation via Zod
 * - OpenRouter API key never exposed to client
 * - 30s timeout to prevent hanging requests
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { FlashcardGenerationService } from "../../../lib/services/flashcard-generation.service";
import { LLMServiceError } from "../../../lib/errors";
import type { GenerateFlashcardsCommand, GenerateFlashcardsResponseDTO, ErrorResponseDTO } from "../../../types";

// Disable pre-rendering for API route (SSR only)
export const prerender = false;

/**
 * Zod schema for request validation
 * Enforces text length constraints and non-whitespace content
 */
const GenerateFlashcardsSchema = z.object({
  text: z
    .string()
    .min(1000, "Text must be at least 1000 characters")
    .max(10000, "Text cannot exceed 10000 characters")
    .refine((val) => val.trim().length >= 1000, "Text must contain at least 1000 non-whitespace characters"),
});

/**
 * POST handler for flashcard generation
 *
 * @returns 200 OK with GenerateFlashcardsResponseDTO
 * @returns 400 Bad Request on validation failure
 * @returns 401 Unauthorized if not authenticated (handled by middleware)
 * @returns 503 Service Unavailable on LLM service error
 * @returns 500 Internal Server Error on unexpected errors
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Authentication check (double-check after middleware)
    const user = locals.user;
    if (!user) {
      const errorResponse: ErrorResponseDTO = {
        error: "Authentication required",
        message: "Please log in to continue",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const errorResponse: ErrorResponseDTO = {
        error: "Invalid JSON",
        message: "Request body must be valid JSON",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Validate with Zod schema
    const validationResult = GenerateFlashcardsSchema.safeParse(body);

    if (!validationResult.success) {
      const errorResponse: ErrorResponseDTO = {
        error: "Validation failed",
        details: validationResult.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const command: GenerateFlashcardsCommand = validationResult.data;

    // 4. Initialize FlashcardGenerationService
    const apiKey = import.meta.env.OPENROUTER_API_KEY;
    const model = import.meta.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";

    if (!apiKey) {
      // eslint-disable-next-line no-console
      console.error("OPENROUTER_API_KEY not configured");
      const errorResponse: ErrorResponseDTO = {
        error: "Service configuration error",
        message: "AI generation service is not properly configured",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const service = new FlashcardGenerationService(locals.supabase, apiKey, model);

    // 5. Call generation service
    const result: GenerateFlashcardsResponseDTO = await service.generate(command.text, user.id);

    // 6. Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // 7. Handle LLM service errors (timeout, API error, parse error)
    if (error instanceof LLMServiceError) {
      // eslint-disable-next-line no-console
      console.error("[LLM_SERVICE_ERROR]", {
        timestamp: new Date().toISOString(),
        userId: locals.user?.id,
        type: error.type,
        message: error.message,
        statusCode: error.statusCode,
      });

      const errorResponse: ErrorResponseDTO = {
        error: "AI service temporarily unavailable",
        message: error.message,
        retryable: error.retryable,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 8. Handle unexpected errors
    // eslint-disable-next-line no-console
    console.error("[UNEXPECTED_ERROR]", {
      timestamp: new Date().toISOString(),
      userId: locals.user?.id,
      endpoint: "/api/flashcards/generate",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorResponse: ErrorResponseDTO = {
      error: "Internal server error",
      message: "An unexpected error occurred. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
