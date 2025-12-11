/**
 * Vitest Setup File
 * Global configuration for unit and integration tests
 */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, afterAll, vi } from "vitest";
import { server } from "../mocks/msw-server";

// Extend Vitest matchers with Testing Library matchers
// This allows us to use matchers like toBeInTheDocument()

// Setup MSW for API mocking
beforeAll(() => {
  // Start MSW server before all tests
  server.listen({ onUnhandledRequest: "warn" });
});

afterEach(() => {
  // Clean up React Testing Library after each test
  cleanup();

  // Reset MSW handlers after each test
  server.resetHandlers();

  // Clear all mocks after each test
  vi.clearAllMocks();
});

afterAll(() => {
  // Close MSW server after all tests
  server.close();
});

// Mock environment variables
vi.stubEnv("PUBLIC_SUPABASE_URL", "http://localhost:54321");
vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
vi.stubEnv("OPENROUTER_API_KEY", "test-openrouter-key");

// Mock window.matchMedia (used by some UI components)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: readonly number[] = [];
  disconnect = vi.fn();
  observe = vi.fn();
  takeRecords = vi.fn(() => []);
  unobserve = vi.fn();
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
