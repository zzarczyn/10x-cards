/**
 * Flashcard Generation Service
 *
 * Responsible for generating flashcards from text using OpenRouter API (LLM).
 * Handles API communication, prompt engineering, response parsing, and logging to database.
 */

import { z } from "zod";
import { OpenRouterService } from "./openrouter.service";
import type { Message, JsonSchemaDefinition } from "./openrouter.types";
import type { GenerateFlashcardsResponseDTO, GeneratedFlashcardDTO } from "../../types";
import type { SupabaseClient } from "../../db/supabase.client";

/**
 * Zod schema for flashcard generation response
 */
const FlashcardGenerationSchema = z.object({
  flashcards: z.array(
    z.object({
      front: z.string().min(1).max(200),
      back: z.string().min(1).max(500),
    })
  ),
});

/**
 * Type inferred from Zod schema
 */
type FlashcardGenerationResponse = z.infer<typeof FlashcardGenerationSchema>;

/**
 * JSON Schema definition for OpenRouter structured output
 * Must match the Zod schema above
 */
const FLASHCARD_JSON_SCHEMA: JsonSchemaDefinition = {
  name: "flashcard_generation",
  strict: true,
  schema: {
    type: "object",
    properties: {
      flashcards: {
        type: "array",
        items: {
          type: "object",
          properties: {
            front: { type: "string" },
            back: { type: "string" },
          },
          required: ["front", "back"],
          additionalProperties: false,
        },
      },
    },
    required: ["flashcards"],
    additionalProperties: false,
  },
};

/**
 * Service class for AI-powered flashcard generation
 */
export class FlashcardGenerationService {
  private readonly openRouter: OpenRouterService;
  private readonly model: string;

  constructor(
    private supabase: SupabaseClient,
    openRouter: OpenRouterService,
    model: string
  ) {
    this.openRouter = openRouter;
    this.model = model;
  }

  /**
   * Generates flashcards from user-provided text
   *
   * @param text - Source text for generation (1000-10000 characters)
   * @param userId - ID of the authenticated user
   * @returns Generation response with flashcards and metadata
   */
  async generate(text: string, userId: string): Promise<GenerateFlashcardsResponseDTO> {
    const startTime = Date.now();

    // 1. Call LLM API to generate flashcards
    const flashcards = await this.callLLMAPI(text);

    // 2. Calculate metrics
    const durationMs = Date.now() - startTime;
    const cardCount = flashcards.length;

    // 3. Log generation to database for analytics
    const generationId = await this.logGeneration(userId, durationMs, cardCount, this.model);

    // 4. Return response
    return {
      generation_id: generationId,
      flashcards,
      model_name: this.model,
      duration_ms: durationMs,
      card_count: cardCount,
    };
  }

  /**
   * Calls OpenRouter API to generate flashcards
   *
   * @param text - Text to analyze for flashcard generation
   * @returns Array of generated flashcards
   * @throws {OpenRouterAPIError} On API errors
   * @throws {RefusalError} When model refuses to generate content
   * @throws {ParsingError} When response cannot be parsed
   * @throws {ModelValidationError} When response doesn't match schema
   */
  private async callLLMAPI(text: string): Promise<GeneratedFlashcardDTO[]> {
    const prompt = this.buildPrompt(text);

    // Build messages array
    const messages: Message[] = [
      {
        role: "system",
        content:
          "You are an expert educational assistant that creates high-quality flashcards for learning. " +
          "Always respond with valid JSON matching the provided schema.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    // Call OpenRouter with structured output
    const response = await this.openRouter.complete<FlashcardGenerationResponse>({
      messages,
      schema: FlashcardGenerationSchema,
      jsonSchema: FLASHCARD_JSON_SCHEMA,
      model: this.model,
      temperature: 0.7,
      maxTokens: 2000,
    });

    return response.flashcards;
  }

  /**
   * Builds the prompt for LLM to generate flashcards
   * Uses structured prompt engineering for consistent, high-quality output
   *
   * @param text - User's input text to analyze
   * @returns Formatted prompt string
   */
  private buildPrompt(text: string): string {
    // Sanitize text to prevent prompt injection
    const sanitizedText = text.trim().replace(/[\\`]/g, "\\$&");

    return `Analyze the following text and generate flashcards (question-answer pairs) that help learners understand and memorize the key concepts.

Guidelines:
- Create 3-10 flashcards depending on content richness
- Questions (front) should be clear and specific (max 200 characters)
- Answers (back) should be concise but complete (max 500 characters, 1-3 sentences)
- Cover the most important concepts, facts, and relationships
- Use simple language appropriate for learners

Text to analyze:
"""
${sanitizedText}
"""

Generate flashcards as a JSON object with a "flashcards" array.`;
  }

  /**
   * Logs generation to database for analytics tracking
   *
   * @param userId - User who initiated generation
   * @param durationMs - Time taken for generation
   * @param cardCount - Number of cards generated
   * @param modelName - LLM model used
   * @returns UUID of created generation record
   * @throws {Error} On database insert failure
   */
  private async logGeneration(
    userId: string,
    durationMs: number,
    cardCount: number,
    modelName: string
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from("generations")
      .insert({
        user_id: userId,
        duration_ms: durationMs,
        card_count: cardCount,
        model_name: modelName,
      })
      .select("id")
      .single();

    if (error || !data) {
      // eslint-disable-next-line no-console
      console.error("Failed to log generation:", error);
      throw new Error("Failed to save generation log");
    }

    return data.id;
  }
}
