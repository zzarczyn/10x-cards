/**
 * POST /api/flashcards - Create a single flashcard
 *
 * Creates a flashcard either manually or from AI generation.
 * Validates generation ownership for AI-sourced cards.
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { FlashcardService } from "../../../lib/services/flashcard.service";
import { NotFoundError } from "../../../lib/errors";
import type { CreateFlashcardCommand, FlashcardDTO, ErrorResponseDTO } from "../../../types";

export const prerender = false;

/**
 * Zod schema for CreateFlashcardCommand validation
 *
 * Validates:
 * - Front/back content (length, whitespace)
 * - Source type (manual, ai-full, ai-edited)
 * - Cross-field consistency (source vs generation_id)
 */
const CreateFlashcardSchema = z
  .object({
    front: z
      .string()
      .min(1, "Front side is required")
      .max(200, "Front side cannot exceed 200 characters")
      .refine((val) => val.trim().length > 0, "Front side cannot be empty or whitespace only"),
    back: z
      .string()
      .min(1, "Back side is required")
      .max(500, "Back side cannot exceed 500 characters")
      .refine((val) => val.trim().length > 0, "Back side cannot be empty or whitespace only"),
    source: z.enum(["manual", "ai-full", "ai-edited"], {
      errorMap: () => ({
        message: "Source must be one of: manual, ai-full, ai-edited",
      }),
    }),
    generation_id: z.string().uuid("Invalid UUID format").nullable(),
  })
  .refine(
    (data) => {
      // Logic: manual → null, ai-* → UUID required
      if (data.source === "manual" && data.generation_id !== null) {
        return false;
      }
      if ((data.source === "ai-full" || data.source === "ai-edited") && data.generation_id === null) {
        return false;
      }
      return true;
    },
    {
      message: "generation_id must be null for manual cards and required for AI-generated cards",
      path: ["generation_id"],
    }
  );

/**
 * POST handler - Create flashcard
 *
 * Request body: CreateFlashcardCommand
 * Response: 201 Created with FlashcardDTO
 * Errors: 400 (validation), 401 (auth), 404 (generation not found), 500 (server error)
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Authentication check (double-check, middleware should handle this)
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
    const validationResult = CreateFlashcardSchema.safeParse(body);

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

    const command: CreateFlashcardCommand = validationResult.data;

    // 4. Initialize FlashcardService
    const service = new FlashcardService(locals.supabase);

    // 5. Create flashcard
    const flashcard: FlashcardDTO = await service.createFlashcard(command, user.id);

    // 6. Return success response (201 Created)
    return new Response(JSON.stringify(flashcard), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // 7. Handle NotFoundError (generation_id not found)
    if (error instanceof NotFoundError) {
      // eslint-disable-next-line no-console
      console.error("[NOT_FOUND]", {
        timestamp: new Date().toISOString(),
        userId: locals.user?.id,
        resource: error.resource,
        message: error.message,
      });

      const errorResponse: ErrorResponseDTO = {
        error: "Generation not found",
        message: error.message,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 8. Handle unexpected errors
    // eslint-disable-next-line no-console
    console.error("[UNEXPECTED_ERROR]", {
      timestamp: new Date().toISOString(),
      userId: locals.user?.id,
      endpoint: "/api/flashcards",
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
