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

/**
 * Error class for OpenRouter service configuration issues
 * Used when required configuration (e.g., API key) is missing or invalid
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConfigurationError);
    }
  }
}

/**
 * Error class for OpenRouter API errors
 * Used when the API returns an error response
 *
 * @property statusCode - HTTP status code from API
 * @property apiMessage - Original error message from API
 * @property retryable - Whether the request can be retried
 */
export class OpenRouterAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public apiMessage?: string,
    public retryable = false
  ) {
    super(message);
    this.name = "OpenRouterAPIError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenRouterAPIError);
    }
  }
}

/**
 * Error class for model refusal scenarios
 * Used when the model refuses to generate content (e.g., safety filters)
 *
 * @property refusalMessage - The refusal message from the model
 */
export class RefusalError extends Error {
  constructor(
    message: string,
    public refusalMessage?: string
  ) {
    super(message);
    this.name = "RefusalError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RefusalError);
    }
  }
}

/**
 * Error class for JSON parsing failures
 * Used when model response cannot be parsed as valid JSON
 *
 * @property rawContent - The raw content that failed to parse
 */
export class ParsingError extends Error {
  constructor(
    message: string,
    public rawContent?: string
  ) {
    super(message);
    this.name = "ParsingError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ParsingError);
    }
  }
}

/**
 * Error class for model validation failures
 * Used when response structure doesn't match expected Zod schema
 *
 * @property validationDetails - Detailed validation error information
 */
export class ModelValidationError extends Error {
  constructor(
    message: string,
    public validationDetails?: unknown
  ) {
    super(message);
    this.name = "ModelValidationError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ModelValidationError);
    }
  }
}
