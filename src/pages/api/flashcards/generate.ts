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
import { OpenRouterService } from "../../../lib/services/openrouter.service";
import {
  ConfigurationError,
  OpenRouterAPIError,
  RefusalError,
  ParsingError,
  ModelValidationError,
} from "../../../lib/errors";
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

    // 4. Initialize OpenRouter and FlashcardGenerationService
    const apiKey = import.meta.env.OPENROUTER_API_KEY;
    const model = import.meta.env.OPENROUTER_MODEL || "openai/gpt-oss-20b";
    const appUrl = import.meta.env.PUBLIC_APP_URL || "https://10xcards.app";
    const appName = import.meta.env.PUBLIC_APP_NAME || "10xCards";

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

    // Initialize OpenRouter service
    const openRouter = new OpenRouterService({
      apiKey,
      siteUrl: appUrl,
      siteName: appName,
      defaultModel: model,
    });

    // Initialize generation service with OpenRouter
    const service = new FlashcardGenerationService(locals.supabase, openRouter, model);

    // 5. Call generation service
    const result: GenerateFlashcardsResponseDTO = await service.generate(command.text, user.id);

    // 6. Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // 7. Handle OpenRouter API errors
    if (error instanceof OpenRouterAPIError) {
      // eslint-disable-next-line no-console
      console.error("[OPENROUTER_API_ERROR]", {
        timestamp: new Date().toISOString(),
        userId: locals.user?.id,
        statusCode: error.statusCode,
        message: error.message,
        apiMessage: error.apiMessage,
        retryable: error.retryable,
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

    // 8. Handle model refusal (safety filters)
    if (error instanceof RefusalError) {
      // eslint-disable-next-line no-console
      console.warn("[MODEL_REFUSAL]", {
        timestamp: new Date().toISOString(),
        userId: locals.user?.id,
        message: error.message,
        refusalMessage: error.refusalMessage,
      });

      const errorResponse: ErrorResponseDTO = {
        error: "Content not allowed",
        message: "The AI model could not process this content. Please try different text.",
        retryable: false,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 9. Handle parsing errors
    if (error instanceof ParsingError) {
      // eslint-disable-next-line no-console
      console.error("[PARSING_ERROR]", {
        timestamp: new Date().toISOString(),
        userId: locals.user?.id,
        message: error.message,
      });

      const errorResponse: ErrorResponseDTO = {
        error: "AI response parsing failed",
        message: "The AI generated an invalid response. Please try again.",
        retryable: true,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 10. Handle validation errors
    if (error instanceof ModelValidationError) {
      // eslint-disable-next-line no-console
      console.error("[MODEL_VALIDATION_ERROR]", {
        timestamp: new Date().toISOString(),
        userId: locals.user?.id,
        message: error.message,
        validationDetails: error.validationDetails,
      });

      const errorResponse: ErrorResponseDTO = {
        error: "AI response validation failed",
        message: "The AI response did not match expected format. Please try again.",
        retryable: true,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 11. Handle configuration errors
    if (error instanceof ConfigurationError) {
      // eslint-disable-next-line no-console
      console.error("[CONFIGURATION_ERROR]", {
        timestamp: new Date().toISOString(),
        message: error.message,
      });

      const errorResponse: ErrorResponseDTO = {
        error: "Service configuration error",
        message: "AI generation service is not properly configured",
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 12. Handle unexpected errors
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
