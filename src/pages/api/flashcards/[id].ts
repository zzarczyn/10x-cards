/**
 * API Endpoint: /api/flashcards/:id
 *
 * Handles operations on individual flashcards by ID
 * - PATCH: Partially update flashcard (front and/or back)
 * - DELETE: Remove flashcard permanently
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { FlashcardService } from "../../../lib/services/flashcard.service";
import { NotFoundError } from "../../../lib/errors";
import type { ErrorResponseDTO, UpdateFlashcardCommand } from "../../../types";

// Disable prerendering (API route)
export const prerender = false;

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Validation schema for URL parameter
 * Ensures flashcard ID is a valid UUID
 */
const FlashcardIdParams = z.object({
  id: z.string().uuid({ message: "Invalid flashcard ID format" }),
});

/**
 * Validation schema for PATCH Request Body
 * Allows partial updates with at least one field required
 */
const UpdateFlashcardBodySchema = z
  .object({
    front: z
      .string()
      .max(200, "Front side cannot exceed 200 characters")
      .refine((val) => val.trim().length > 0, {
        message: "Front side cannot be empty or contain only whitespace",
      })
      .optional(),
    back: z
      .string()
      .max(500, "Back side cannot exceed 500 characters")
      .refine((val) => val.trim().length > 0, {
        message: "Back side cannot be empty or contain only whitespace",
      })
      .optional(),
  })
  .refine((data) => data.front !== undefined || data.back !== undefined, {
    message: "At least one field (front or back) must be provided",
  });

// ============================================================================
// PATCH Handler - Partial Update Flashcard
// ============================================================================

/**
 * PATCH /api/flashcards/:id
 *
 * Partially updates a flashcard (front and/or back fields only)
 * Source and generation_id are immutable and cannot be changed
 *
 * @returns 200 OK with full updated flashcard object
 * @returns 400 Bad Request on validation errors
 * @returns 401 Unauthorized if not authenticated
 * @returns 404 Not Found if flashcard doesn't exist or doesn't belong to user
 * @returns 500 Internal Server Error on unexpected errors
 */
export const PATCH: APIRoute = async (context) => {
  try {
    // Step 1: Validate URL parameter
    const { id } = FlashcardIdParams.parse({ id: context.params.id });

    // Step 2: Check authentication
    if (!context.locals.user) {
      const errorResponse: ErrorResponseDTO = {
        error: "Unauthorized",
        message: "Authentication required",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 3: Parse and validate request body
    const body = await context.request.json();
    const command = UpdateFlashcardBodySchema.parse(body) as UpdateFlashcardCommand;

    // Step 4: Initialize service
    const flashcardService = new FlashcardService(context.locals.supabase);

    // Step 5: Update flashcard
    const updatedFlashcard = await flashcardService.updateFlashcard(id, command, context.locals.user.id);

    // Step 6: Return success (200 OK with full flashcard object)
    return new Response(JSON.stringify(updatedFlashcard), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle validation errors (Zod)
    if (error instanceof z.ZodError) {
      // Check if error is at root level (no fields provided)
      const rootError = error.errors.find((e) => e.path.length === 0);

      if (rootError) {
        const errorResponse: ErrorResponseDTO = {
          error: "Validation failed",
          message: rootError.message,
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Field-level validation errors
      const errorResponse: ErrorResponseDTO = {
        error: "Validation failed",
        details: error.errors.map((e) => ({
          field: String(e.path[0]),
          message: e.message,
        })),
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle not found errors
    if (error instanceof NotFoundError) {
      const errorResponse: ErrorResponseDTO = {
        error: "Flashcard not found",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    // eslint-disable-next-line no-console
    console.error("Failed to update flashcard:", error);
    const errorResponse: ErrorResponseDTO = {
      error: "Internal server error",
      message: "An unexpected error occurred while updating flashcard",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// ============================================================================
// DELETE Handler - Permanently Delete Flashcard
// ============================================================================

/**
 * DELETE /api/flashcards/:id
 *
 * Permanently deletes a flashcard
 *
 * @returns 204 No Content on success
 * @returns 400 Bad Request on validation errors
 * @returns 401 Unauthorized if not authenticated
 * @returns 404 Not Found if flashcard doesn't exist or doesn't belong to user
 * @returns 500 Internal Server Error on unexpected errors
 */
export const DELETE: APIRoute = async (context) => {
  try {
    // Step 1: Validate URL parameter
    const { id } = FlashcardIdParams.parse({ id: context.params.id });

    // Step 2: Check authentication
    if (!context.locals.user) {
      const errorResponse: ErrorResponseDTO = {
        error: "Unauthorized",
        message: "Authentication required",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 3: Initialize service
    const flashcardService = new FlashcardService(context.locals.supabase);

    // Step 4: Delete flashcard
    await flashcardService.deleteFlashcard(id, context.locals.user.id);

    // Step 5: Return success (204 No Content)
    return new Response(null, { status: 204 });
  } catch (error) {
    // Handle validation errors (Zod)
    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponseDTO = {
        error: "Validation failed",
        details: error.errors.map((e) => ({
          field: String(e.path[0]),
          message: e.message,
        })),
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle not found errors
    if (error instanceof NotFoundError) {
      const errorResponse: ErrorResponseDTO = {
        error: "Flashcard not found",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    // eslint-disable-next-line no-console
    console.error("Failed to delete flashcard:", error);
    const errorResponse: ErrorResponseDTO = {
      error: "Internal server error",
      message: "An unexpected error occurred while deleting flashcard",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
