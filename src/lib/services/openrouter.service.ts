/**
 * OpenRouter Service
 *
 * Service class for interacting with OpenRouter API to generate structured
 * content using LLM models. Provides type-safe completions with Zod validation
 * and comprehensive error handling.
 */

import type { z } from "zod";
import { ConfigurationError, OpenRouterAPIError, RefusalError, ParsingError, ModelValidationError } from "../errors";
import type {
  OpenRouterConfig,
  Message,
  CompletionOptions,
  CompletionRequest,
  CompletionResponse,
  OpenRouterAPIErrorResponse,
} from "./openrouter.types";

/**
 * Default configuration values
 */
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 2000;
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * OpenRouter API Service
 *
 * Handles communication with OpenRouter API, including:
 * - Structured JSON responses with schema validation
 * - Automatic retries for transient errors
 * - Type-safe completions using Zod schemas
 * - Comprehensive error handling
 */
export class OpenRouterService {
  private readonly config: Required<OpenRouterConfig>;
  private readonly apiUrl = "https://openrouter.ai/api/v1/chat/completions";
  private readonly timeout: number = DEFAULT_TIMEOUT_MS;

  /**
   * Creates a new OpenRouter service instance
   *
   * @param config - Service configuration
   * @throws {ConfigurationError} If API key is missing or invalid
   */
  constructor(config: OpenRouterConfig) {
    // Validate required configuration
    if (!config.apiKey || config.apiKey.trim() === "") {
      throw new ConfigurationError("OpenRouter API key is required");
    }

    if (!config.siteUrl || config.siteUrl.trim() === "") {
      throw new ConfigurationError("Site URL is required for OpenRouter integration");
    }

    if (!config.siteName || config.siteName.trim() === "") {
      throw new ConfigurationError("Site name is required for OpenRouter integration");
    }

    // Set defaults
    this.config = {
      apiKey: config.apiKey,
      siteUrl: config.siteUrl,
      siteName: config.siteName,
      defaultModel: config.defaultModel || "openai/gpt-oss-20b",
    };
  }

  /**
   * Generate a completion with structured JSON output
   *
   * @param options - Completion options including messages, schema, and model config
   * @returns Parsed and validated response matching the provided schema
   * @throws {OpenRouterAPIError} On API errors
   * @throws {RefusalError} When model refuses to generate content
   * @throws {ParsingError} When response cannot be parsed as JSON
   * @throws {ModelValidationError} When response doesn't match schema
   */
  async complete<T>(options: CompletionOptions<T>): Promise<T> {
    // Build request payload
    const request: CompletionRequest = {
      model: options.model || this.config.defaultModel,
      messages: options.messages,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      response_format: {
        type: "json_schema",
        json_schema: options.jsonSchema,
      },
    };

    // Execute request with retry logic
    const response = await this.executeWithRetry(request);

    // Parse and validate response
    const parsedData = await this.parseResponse(response);
    const validatedData = this.validateResponse(parsedData, options.schema);

    return validatedData;
  }

  /**
   * Execute API request with automatic retry for transient errors
   *
   * @param request - Completion request
   * @param attempt - Current attempt number (for recursion)
   * @returns API response
   */
  private async executeWithRetry(request: CompletionRequest, attempt = 1): Promise<CompletionResponse> {
    try {
      return await this.executeRequest(request);
    } catch (error) {
      // Check if error is retryable
      const isRetryable = error instanceof OpenRouterAPIError && error.retryable && attempt < MAX_RETRIES;

      if (isRetryable) {
        // Calculate exponential backoff delay
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        await this.sleep(delay);
        return this.executeWithRetry(request, attempt + 1);
      }

      // Re-throw non-retryable errors
      throw error;
    }
  }

  /**
   * Execute a single API request
   *
   * @param request - Completion request
   * @returns API response
   * @throws {OpenRouterAPIError} On API errors or network failures
   */
  private async executeRequest(request: CompletionRequest): Promise<CompletionResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Parse successful response
      const data: CompletionResponse = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (error instanceof Error && error.name === "AbortError") {
        throw new OpenRouterAPIError(
          `Request timed out after ${this.timeout / 1000} seconds`,
          408,
          "Request timeout",
          true
        );
      }

      // Re-throw OpenRouter errors
      if (error instanceof OpenRouterAPIError) {
        throw error;
      }

      // Handle network errors
      throw new OpenRouterAPIError(
        `Network error: ${error instanceof Error ? error.message : String(error)}`,
        0,
        undefined,
        true
      );
    }
  }

  /**
   * Handle error responses from the API
   *
   * @param response - Error response from API
   * @throws {OpenRouterAPIError} Always throws with appropriate error details
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    const statusCode = response.status;
    let errorMessage = response.statusText;
    let apiMessage: string | undefined;

    try {
      const errorData: OpenRouterAPIErrorResponse = await response.json();
      apiMessage = errorData.error?.message || errorMessage;
      errorMessage = `OpenRouter API error: ${apiMessage}`;
    } catch {
      // If JSON parsing fails, use status text
      errorMessage = `OpenRouter API error: ${statusCode} ${errorMessage}`;
    }

    // Determine if error is retryable
    const retryable = statusCode === 429 || statusCode >= 500;

    throw new OpenRouterAPIError(errorMessage, statusCode, apiMessage, retryable);
  }

  /**
   * Parse and extract JSON content from API response
   *
   * @param response - API response
   * @returns Parsed JSON data
   * @throws {RefusalError} When model refuses to generate content
   * @throws {ParsingError} When response cannot be parsed as JSON
   */
  private async parseResponse(response: CompletionResponse): Promise<unknown> {
    const choice = response.choices[0];

    if (!choice) {
      throw new ParsingError("No completion choices in API response");
    }

    // Check for refusal
    if (choice.message.refusal) {
      throw new RefusalError("Model refused to generate content", choice.message.refusal);
    }

    const content = choice.message.content;

    if (!content || content.trim() === "") {
      throw new ParsingError("Empty content in API response");
    }

    try {
      // Try to parse content as JSON
      // Some models may wrap JSON in markdown code blocks
      const sanitizedContent = this.sanitizeJsonContent(content);
      return JSON.parse(sanitizedContent);
    } catch (error) {
      throw new ParsingError(
        `Failed to parse response as JSON: ${error instanceof Error ? error.message : String(error)}`,
        content
      );
    }
  }

  /**
   * Sanitize JSON content by removing markdown code blocks
   *
   * @param content - Raw content from API
   * @returns Sanitized JSON string
   */
  private sanitizeJsonContent(content: string): string {
    // Remove markdown code blocks (```json ... ``` or ``` ... ```)
    let sanitized = content.trim();

    // Match code blocks with optional language identifier
    const codeBlockMatch = sanitized.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
    if (codeBlockMatch) {
      sanitized = codeBlockMatch[1].trim();
    }

    return sanitized;
  }

  /**
   * Validate parsed response against Zod schema
   *
   * @param data - Parsed JSON data
   * @param schema - Zod schema to validate against
   * @returns Validated and typed data
   * @throws {ModelValidationError} When data doesn't match schema
   */
  private validateResponse<T>(data: unknown, schema: z.ZodType<T>): T {
    try {
      return schema.parse(data);
    } catch (error) {
      throw new ModelValidationError("Response does not match expected schema", error);
    }
  }

  /**
   * Get HTTP headers for API requests
   */
  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": this.config.siteUrl,
      "X-Title": this.config.siteName,
    };
  }

  /**
   * Sleep utility for retry delays
   *
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a simple message object
   *
   * @param role - Message role
   * @param content - Message content
   * @returns Message object
   */
  static createMessage(role: Message["role"], content: string): Message {
    return { role, content };
  }
}
