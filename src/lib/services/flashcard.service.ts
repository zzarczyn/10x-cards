/**
 * Flashcard Service
 *
 * Responsible for CRUD operations on flashcards.
 * Handles validation, ownership checks, and database interactions.
 */

import { NotFoundError } from "../errors";
import type { CreateFlashcardCommand, FlashcardDTO } from "../../types";
import type { SupabaseClient } from "../../db/supabase.client";

/**
 * Service class for flashcard management
 */
export class FlashcardService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Creates a new flashcard
   *
   * @param command - Flashcard creation data (front, back, source, generation_id)
   * @param userId - ID of the authenticated user (from locals.user.id)
   * @returns Created flashcard with all fields including timestamps
   * @throws {NotFoundError} When generation_id doesn't exist or doesn't belong to user
   * @throws {Error} On database insert failure
   */
  async createFlashcard(
    command: CreateFlashcardCommand,
    userId: string
  ): Promise<FlashcardDTO> {
    // Step 1: Validate generation ownership if generation_id provided
    if (command.generation_id !== null) {
      await this.validateGenerationOwnership(command.generation_id, userId);
    }

    // Step 2: Insert flashcard to database
    const { data, error } = await this.supabase
      .from("flashcards")
      .insert({
        front: command.front,
        back: command.back,
        source: command.source,
        generation_id: command.generation_id,
        user_id: userId,
      })
      .select()
      .single();

    // Step 3: Handle database errors
    if (error || !data) {
      // eslint-disable-next-line no-console
      console.error("Failed to create flashcard:", error);
      throw new Error("Failed to create flashcard");
    }

    return data as FlashcardDTO;
  }

  /**
   * Validates that generation exists and belongs to the user
   *
   * @param generationId - UUID of generation to validate
   * @param userId - ID of the user who should own the generation
   * @throws {NotFoundError} When generation doesn't exist or belongs to different user
   *
   * Security note: Returns 404 instead of 403 to prevent generation_id enumeration
   */
  private async validateGenerationOwnership(
    generationId: string,
    userId: string
  ): Promise<void> {
    const { data, error } = await this.supabase
      .from("generations")
      .select("user_id")
      .eq("id", generationId)
      .single();

    // Generation doesn't exist or database error
    if (error || !data) {
      throw new NotFoundError(
        "The specified generation_id does not exist or does not belong to your account",
        "generation"
      );
    }

    // Generation belongs to different user
    if (data.user_id !== userId) {
      throw new NotFoundError(
        "The specified generation_id does not exist or does not belong to your account",
        "generation"
      );
    }
  }
}

