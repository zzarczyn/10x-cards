/**
 * Type definitions for OpenRouter API integration
 * 
 * This file contains all interfaces and types used for communication
 * with OpenRouter API, including request/response structures and configuration.
 */

import type { z } from 'zod';

/**
 * OpenRouter service configuration
 */
export interface OpenRouterConfig {
  /** OpenRouter API key */
  apiKey: string;
  /** Application URL (for OpenRouter ranking) */
  siteUrl: string;
  /** Application name (for OpenRouter ranking) */
  siteName: string;
  /** Default model to use if not specified in request */
  defaultModel?: string;
}

/**
 * Message role in chat conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Single message in the chat completion request
 */
export interface Message {
  role: MessageRole;
  content: string;
}

/**
 * JSON Schema definition for response format
 */
export interface JsonSchemaDefinition {
  /** Schema name/identifier */
  name: string;
  /** Whether to strictly enforce schema */
  strict: boolean;
  /** JSON Schema object */
  schema: Record<string, unknown>;
}

/**
 * Response format configuration for structured outputs
 */
export interface ResponseFormat {
  type: 'json_schema';
  json_schema: JsonSchemaDefinition;
}

/**
 * Options for completion request
 */
export interface CompletionOptions<T> {
  /** Array of messages forming the conversation */
  messages: Message[];
  /** Zod schema for response validation */
  schema: z.ZodType<T>;
  /** JSON Schema object matching the Zod schema */
  jsonSchema: JsonSchemaDefinition;
  /** Model to use (overrides default) */
  model?: string;
  /** Temperature for response generation (0.0 - 2.0) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
}

/**
 * OpenRouter API request body structure
 */
export interface CompletionRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  response_format?: ResponseFormat;
}

/**
 * OpenRouter API response structure
 */
export interface CompletionResponse {
  id: string;
  model: string;
  created: number;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      refusal?: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenRouter API error response structure
 */
export interface OpenRouterAPIErrorResponse {
  error: {
    message: string;
    type?: string;
    code?: string;
  };
}

