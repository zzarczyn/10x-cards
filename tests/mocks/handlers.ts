/**
 * MSW Request Handlers
 * Define mock responses for API endpoints
 */

import { http, HttpResponse } from "msw";

export const handlers = [
  // Mock Supabase Auth endpoints
  http.post("http://localhost:54321/auth/v1/signup", () => {
    return HttpResponse.json({
      user: {
        id: "mock-user-id",
        email: "test@example.com",
        created_at: new Date().toISOString(),
      },
      session: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
      },
    });
  }),

  http.post("http://localhost:54321/auth/v1/token", () => {
    return HttpResponse.json({
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      user: {
        id: "mock-user-id",
        email: "test@example.com",
      },
    });
  }),

  // Mock Supabase REST API
  http.get("http://localhost:54321/rest/v1/flashcards", () => {
    return HttpResponse.json([
      {
        id: "1",
        user_id: "mock-user-id",
        question: "What is React?",
        answer: "A JavaScript library for building user interfaces",
        source: "ai-full",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  }),

  // Mock OpenRouter API
  http.post("https://openrouter.ai/api/v1/chat/completions", () => {
    return HttpResponse.json({
      id: "mock-completion-id",
      choices: [
        {
          message: {
            role: "assistant",
            content: JSON.stringify({
              flashcards: [
                {
                  question: "What is TypeScript?",
                  answer: "A typed superset of JavaScript",
                },
              ],
            }),
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    });
  }),
];
