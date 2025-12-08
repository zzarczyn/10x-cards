/**
 * Flashcard Generation Service
 *
 * Responsible for generating flashcards from text using OpenRouter API (LLM).
 * Handles API communication, prompt engineering, response parsing, and logging to database.
 */

import { LLMServiceError } from "../errors";
import type { GenerateFlashcardsResponseDTO, GeneratedFlashcardDTO } from "../../types";
import type { SupabaseClient } from "../../db/supabase.client";

/**
 * Internal type for LLM flashcard structure
 */
interface LLMFlashcard {
  front: string;
  back: string;
}

/**
 * OpenRouter API response structure
 */
interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  model: string;
}

/**
 * Service class for AI-powered flashcard generation
 */
export class FlashcardGenerationService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeout: number = 30000; // 30 seconds

  constructor(
    private supabase: SupabaseClient,
    apiKey: string,
    model: string
  ) {
    if (!apiKey) {
      throw new Error("OpenRouter API key is required");
    }
    this.apiKey = apiKey;
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
   * Calls OpenRouter API with timeout handling
   *
   * @param text - Text to analyze for flashcard generation
   * @returns Array of generated flashcards
   * @throws {LLMServiceError} On timeout, API error, or network failure
   */
  private async callLLMAPI(text: string): Promise<GeneratedFlashcardDTO[]> {
    const prompt = this.buildPrompt(text);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://10xcards.app",
          "X-Title": "10xCards",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new LLMServiceError(
          `OpenRouter API error: ${response.status} ${response.statusText}`,
          "api_error",
          response.status,
          response.status === 429 || response.status >= 500
        );
      }

      const data: OpenRouterResponse = await response.json();

      return this.parseFlashcards(data);
    } catch (error) {
      // Handle timeout
      if (error instanceof Error && error.name === "AbortError") {
        throw new LLMServiceError("AI generation timed out after 30 seconds", "timeout", undefined, true);
      }

      // Re-throw LLMServiceError
      if (error instanceof LLMServiceError) {
        throw error;
      }

      // Handle network errors
      throw new LLMServiceError(
        `Network error: ${error instanceof Error ? error.message : String(error)}`,
        "network_error",
        undefined,
        true
      );
    }
  }

  /**
   * Builds the prompt for LLM to generate flashcards
   * Uses structured prompt engineering for consistent, high-quality output
   *
   * @param text - User's input text to analyze
   * @returns Formatted prompt string
   */
  private buildPrompt(text: string): string {
    // Escape text to prevent prompt injection
    const escapedText = text.replace(/[\\`]/g, "\\$&");

    return `You are an expert educational assistant that creates high-quality flashcards for learning.

Your task is to analyze the following text and generate flashcards (question-answer pairs) that help learners understand and memorize the key concepts.

Guidelines:
- Create 3-10 flashcards depending on content richness
- Questions should be clear and specific
- Answers should be concise but complete (1-3 sentences)
- Cover the most important concepts, facts, and relationships
- Use simple language appropriate for learners

Text to analyze:
"""
${escapedText}
"""

Respond ONLY with a valid JSON array of flashcards in this exact format:
[
  {
    "front": "Question or prompt",
    "back": "Answer or explanation"
  }
]

JSON response:`;
  }

  /**
   * Parses LLM response and extracts validated flashcards
   *
   * @param response - Raw OpenRouter API response
   * @returns Array of validated flashcard DTOs
   * @throws {LLMServiceError} On parse failure or invalid structure
   */
  private parseFlashcards(response: OpenRouterResponse): GeneratedFlashcardDTO[] {
    try {
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error("Empty response from LLM");
      }

      // Extract JSON array from response (may be surrounded by text)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in LLM response");
      }

      const flashcards: LLMFlashcard[] = JSON.parse(jsonMatch[0]);

      // Validate array structure
      if (!Array.isArray(flashcards) || flashcards.length === 0) {
        throw new Error("Invalid flashcards array");
      }

      // Validate and sanitize each flashcard
      const validatedFlashcards = flashcards.map((card, index) => {
        if (!card.front || !card.back) {
          throw new Error(`Flashcard ${index} missing front or back`);
        }

        if (typeof card.front !== "string" || typeof card.back !== "string") {
          throw new Error(`Flashcard ${index} has invalid types`);
        }

        // Trim and validate length
        const front = card.front.trim();
        const back = card.back.trim();

        if (front.length === 0 || back.length === 0) {
          throw new Error(`Flashcard ${index} has empty content`);
        }

        // Truncate if necessary (with warning)
        if (front.length > 200) {
          // eslint-disable-next-line no-console
          console.warn(`Flashcard ${index} front truncated (> 200 chars)`);
        }

        if (back.length > 500) {
          // eslint-disable-next-line no-console
          console.warn(`Flashcard ${index} back truncated (> 500 chars)`);
        }

        return {
          front: front.slice(0, 200),
          back: back.slice(0, 500),
        };
      });

      return validatedFlashcards;
    } catch (error) {
      throw new LLMServiceError(
        `Failed to parse LLM response: ${error instanceof Error ? error.message : String(error)}`,
        "parse_error",
        undefined,
        false // Parse errors are not retryable
      );
    }
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
