/**
 * Custom error types for 10xCards application
 * These errors provide structured error handling with specific context for different failure scenarios
 */

/**
 * Error class for LLM (Large Language Model) service failures
 * Used for OpenRouter API errors, timeouts, parsing failures, and network issues
 *
 * @property type - Category of error for specific handling
 * @property statusCode - HTTP status code from API (if applicable)
 * @property retryable - Whether the request can be retried
 */
export class LLMServiceError extends Error {
  constructor(
    message: string,
    public type: "timeout" | "api_error" | "parse_error" | "network_error",
    public statusCode?: number,
    public retryable = true
  ) {
    super(message);
    this.name = "LLMServiceError";
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LLMServiceError);
    }
  }
}

/**
 * Error class for input validation failures
 * Used when request data fails Zod schema validation
 *
 * @property details - Array of field-specific validation errors
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public details: { field: string; message: string }[]
  ) {
    super(message);
    this.name = "ValidationError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

/**
 * Error class for resource not found scenarios
 * Used when generation_id doesn't exist or doesn't belong to user
 *
 * @property resource - Type of resource that was not found (e.g., "generation", "flashcard")
 */
export class NotFoundError extends Error {
  constructor(
    message: string,
    public resource: string
  ) {
    super(message);
    this.name = "NotFoundError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotFoundError);
    }
  }
}
