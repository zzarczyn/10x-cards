/**
 * Flashcard Service
 *
 * Responsible for CRUD operations on flashcards.
 * Handles validation, ownership checks, and database interactions.
 */

import { NotFoundError } from "../errors";
import type { CreateFlashcardCommand, FlashcardDTO, UpdateFlashcardCommand } from "../../types";
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
  async createFlashcard(command: CreateFlashcardCommand, userId: string): Promise<FlashcardDTO> {
    // Step 1: Validate generation ownership if generation_id provided
    if (command.generation_id != null) {
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
   * Updates an existing flashcard (partial update)
   *
   * @param flashcardId - UUID of the flashcard to update
   * @param command - Partial update data (front and/or back)
   * @param userId - ID of the authenticated user (from locals.user.id)
   * @returns Updated flashcard with all fields including new updated_at timestamp
   * @throws {NotFoundError} When flashcard doesn't exist or doesn't belong to user
   * @throws {Error} On database update failure
   *
   * Security note: Returns 404 instead of 403 to prevent flashcard_id enumeration
   */
  async updateFlashcard(flashcardId: string, command: UpdateFlashcardCommand, userId: string): Promise<FlashcardDTO> {
    // Step 1: Prepare update data (only include provided fields)
    const updateData: Partial<{ front: string; back: string }> = {};
    if (command.front !== undefined) {
      updateData.front = command.front;
    }
    if (command.back !== undefined) {
      updateData.back = command.back;
    }

    // Step 2: Execute UPDATE query with ownership check
    const { data, error } = await this.supabase
      .from("flashcards")
      .update(updateData)
      .eq("id", flashcardId)
      .eq("user_id", userId) // Authorization: only owner can update
      .select()
      .single(); // Returns updated row or null

    // Step 3: Handle database errors
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Database error during flashcard update:", error);
      throw new Error("Failed to update flashcard");
    }

    // Step 4: Handle not found (no rows updated)
    if (!data) {
      throw new NotFoundError("The specified flashcard does not exist or does not belong to your account", "flashcard");
    }

    // Step 5: Return updated flashcard
    return data as FlashcardDTO;
  }

  /**
   * Deletes a flashcard permanently (hard delete)
   *
   * @param flashcardId - UUID of the flashcard to delete
   * @param userId - ID of the authenticated user (from locals.user.id)
   * @throws {NotFoundError} When flashcard doesn't exist or doesn't belong to user
   * @throws {Error} On database deletion failure
   *
   * Security note: Returns 404 instead of 403 to prevent flashcard_id enumeration
   */
  async deleteFlashcard(flashcardId: string, userId: string): Promise<void> {
    // Delete flashcard with ownership check
    const { data, error } = await this.supabase
      .from("flashcards")
      .delete()
      .eq("id", flashcardId)
      .eq("user_id", userId) // Authorization: only owner can delete
      .select(); // Returns deleted rows for verification

    // Handle database errors
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Database error during flashcard deletion:", error);
      throw new Error("Failed to delete flashcard");
    }

    // Handle not found (0 rows deleted)
    if (!data || data.length === 0) {
      throw new NotFoundError("The specified flashcard does not exist or does not belong to your account", "flashcard");
    }

    // Success: 1 row deleted (implicit void return)
  }

  /**
   * Retrieves paginated list of user's flashcards
   *
   * Executes two queries in parallel for optimal performance:
   * 1. Flashcards data query (with pagination)
   * 2. Total count query (for pagination metadata)
   *
   * Uses idx_flashcards_user_created index for efficient sorting by created_at DESC
   *
   * @param userId - ID of authenticated user
   * @param limit - Number of items per page (1-100)
   * @param offset - Number of items to skip (>= 0)
   * @returns Object with flashcards array and total count
   * @throws {Error} On database query failure
   */
  async getFlashcards(
    userId: string,
    limit: number,
    offset: number
  ): Promise<{ flashcards: FlashcardDTO[]; total: number }> {
    // Execute queries in parallel for better performance
    const [flashcardsResult, countResult] = await Promise.all([
      this.supabase
        .from("flashcards")
        .select()
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1),

      this.supabase.from("flashcards").select("*", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    // Handle flashcards query error
    if (flashcardsResult.error) {
      // eslint-disable-next-line no-console
      console.error("Failed to fetch flashcards:", flashcardsResult.error);
      throw new Error("Failed to fetch flashcards");
    }

    // Handle count query error
    if (countResult.error || countResult.count === null) {
      // eslint-disable-next-line no-console
      console.error("Failed to count flashcards:", countResult.error);
      throw new Error("Failed to count flashcards");
    }

    return {
      flashcards: flashcardsResult.data as FlashcardDTO[],
      total: countResult.count,
    };
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
  private async validateGenerationOwnership(generationId: string, userId: string): Promise<void> {
    const { data, error } = await this.supabase.from("generations").select("user_id").eq("id", generationId).single();

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
