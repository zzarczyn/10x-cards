/**
 * DTO and Command Model Types for 10xCards API
 *
 * This file contains all Data Transfer Objects (DTOs) and Command Models
 * used for API request/response serialization. All types are derived from
 * database entity types to ensure type safety across the stack.
 */

import type { Tables, TablesInsert, TablesUpdate, Enums } from "./db/database.types";

// ============================================================================
// Entity Types (Re-exported from database types for convenience)
// ============================================================================

/**
 * Flashcard entity - represents a single flashcard in the database
 */
export type FlashcardEntity = Tables<"flashcards">;

/**
 * Generation entity - represents an AI generation session log
 */
export type GenerationEntity = Tables<"generations">;

/**
 * Card source type enum - indicates the origin of a flashcard
 */
export type CardSourceType = Enums<"card_source_type">;

// ============================================================================
// Flashcard Generation (AI) - POST /api/flashcards/generate
// ============================================================================

/**
 * Command to generate flashcards from text using AI
 *
 * @property text - Source text for generation (1000-10000 characters)
 */
export interface GenerateFlashcardsCommand {
  text: string;
}

/**
 * Single AI-generated flashcard suggestion (ephemeral, not yet saved to DB)
 * Derived from flashcard entity but only contains content fields
 */
export type GeneratedFlashcardDTO = Pick<FlashcardEntity, "front" | "back">;

/**
 * Response from flashcard generation endpoint
 * Contains generation metadata and ephemeral flashcard suggestions
 *
 * @property generation_id - UUID of created generation log (for linking saved cards)
 * @property flashcards - Array of AI-generated suggestions (not saved yet)
 * @property model_name - Name of LLM model used (e.g., "anthropic/claude-3.5-sonnet")
 * @property duration_ms - Time taken for generation in milliseconds
 * @property card_count - Number of flashcards generated
 */
export interface GenerateFlashcardsResponseDTO {
  generation_id: string;
  flashcards: GeneratedFlashcardDTO[];
  model_name: string;
  duration_ms: number;
  card_count: number;
}

// ============================================================================
// Flashcard CRUD Operations
// ============================================================================

/**
 * DTO representing a full flashcard object (used in responses)
 * Directly maps to database Row type
 */
export type FlashcardDTO = FlashcardEntity;

/**
 * Command to create a single flashcard
 * Derived from Insert type but excludes server-managed fields (id, user_id, timestamps)
 *
 * @property front - Question/prompt side (1-200 chars)
 * @property back - Answer/explanation side (1-500 chars)
 * @property source - Origin: "manual" | "ai-full" | "ai-edited"
 * @property generation_id - UUID of generation log (null for manual cards)
 */
export type CreateFlashcardCommand = Omit<TablesInsert<"flashcards">, "user_id" | "id" | "created_at" | "updated_at">;

/**
 * Command to create multiple flashcards in a single transaction
 *
 * @property flashcards - Array of flashcard creation commands (max 50 items)
 */
export interface CreateFlashcardsBatchCommand {
  flashcards: CreateFlashcardCommand[];
}

/**
 * Response from batch flashcard creation
 *
 * @property created - Array of created flashcard objects
 * @property count - Number of flashcards created
 */
export interface CreateFlashcardsBatchResponseDTO {
  created: FlashcardDTO[];
  count: number;
}

/**
 * Command to update an existing flashcard (partial update)
 * Only front and back fields can be updated (source/generation_id are immutable)
 *
 * @property front - Updated question/prompt (optional)
 * @property back - Updated answer/explanation (optional)
 */
export type UpdateFlashcardCommand = Pick<TablesUpdate<"flashcards">, "front" | "back">;

/**
 * Pagination metadata for list responses
 *
 * @property total - Total number of items across all pages
 * @property limit - Number of items per page
 * @property offset - Number of items skipped
 * @property has_more - Whether more results exist beyond current page
 */
export interface PaginationDTO {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/**
 * Response from flashcards list endpoint (GET /api/flashcards)
 * Returns paginated list of user's flashcards, sorted by created_at DESC
 *
 * @property flashcards - Array of flashcard objects for current page
 * @property pagination - Pagination metadata
 */
export interface FlashcardsListResponseDTO {
  flashcards: FlashcardDTO[];
  pagination: PaginationDTO;
}

// ============================================================================
// Analytics - GET /api/analytics/metrics
// ============================================================================

/**
 * Analytics metrics for tracking product success goals
 *
 * @property ai_usage_ratio - Percentage of flashcards from AI (target: >= 0.75)
 *                            Formula: (ai-full + ai-edited) / total_flashcards
 * @property acceptance_rate - Percentage of AI suggestions saved (target: >= 0.75)
 *                             Formula: total_flashcards_with_generation_id / total_generated_suggestions
 * @property total_flashcards - Total number of saved flashcards
 * @property ai_flashcards - Number of AI-originated flashcards (ai-full + ai-edited)
 * @property manual_flashcards - Number of manually created flashcards
 * @property total_generations - Number of AI generation sessions
 * @property total_generated_suggestions - Sum of card_count from all generations
 */
export interface AnalyticsMetricsDTO {
  ai_usage_ratio: number;
  acceptance_rate: number;
  total_flashcards: number;
  ai_flashcards: number;
  manual_flashcards: number;
  total_generations: number;
  total_generated_suggestions: number;
}

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Standard error response structure for validation errors
 *
 * @property field - Name of the field that failed validation
 * @property message - Human-readable error message for the field
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * Standard error response structure for all API errors
 *
 * @property error - Brief error title
 * @property message - Human-readable explanation (optional)
 * @property details - Array of field-specific validation errors (optional)
 * @property retryable - Whether the request can be retried (optional, for service errors)
 */
export interface ErrorResponseDTO {
  error: string;
  message?: string;
  details?: ValidationErrorDetail[];
  retryable?: boolean;
}
