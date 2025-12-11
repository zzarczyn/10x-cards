/**
 * Unit tests for useGenerator hook
 *
 * Tests cover:
 * - Input validation (TC-GEN-002, TC-GEN-003)
 * - AI generation flow (TC-GEN-001)
 * - Card editing and source tracking (TC-REV-001)
 * - Card saving with validation (TC-REV-002, TC-REV-003)
 * - Batch operations (saveAll, discardAll)
 * - Manual card creation
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useGenerator } from "./useGenerator";
import type { GenerateFlashcardsResponseDTO, ErrorResponseDTO } from "../../types";

// Mock toast notifications
vi.mock("./useToast", () => ({
  toast: vi.fn(),
}));

import { toast } from "./useToast";

describe("useGenerator", () => {
  // Setup and teardown
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Mock fetch globally
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("initialization", () => {
    it("should initialize with empty state", () => {
      // Arrange & Act
      const { result } = renderHook(() => useGenerator());

      // Assert
      expect(result.current.state).toEqual({
        inputText: "",
        isGenerating: false,
        generationId: null,
        flashcards: [],
        error: null,
      });
    });

    it("should provide all expected actions", () => {
      // Arrange & Act
      const { result } = renderHook(() => useGenerator());

      // Assert
      expect(result.current.actions).toHaveProperty("setInputText");
      expect(result.current.actions).toHaveProperty("generateFlashcards");
      expect(result.current.actions).toHaveProperty("updateCard");
      expect(result.current.actions).toHaveProperty("saveCard");
      expect(result.current.actions).toHaveProperty("discardCard");
      expect(result.current.actions).toHaveProperty("addManualCard");
      expect(result.current.actions).toHaveProperty("saveAll");
      expect(result.current.actions).toHaveProperty("discardAll");
      expect(result.current.actions).toHaveProperty("clearError");
    });
  });

  // ============================================================================
  // INPUT TEXT MANAGEMENT
  // ============================================================================

  describe("setInputText", () => {
    it("should update input text", () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());
      const testText = "This is a test input";

      // Act
      act(() => {
        result.current.actions.setInputText(testText);
      });

      // Assert
      expect(result.current.state.inputText).toBe(testText);
    });

    it("should clear error when setting new input text", () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      // Set an error first
      act(() => {
        result.current.actions.generateFlashcards();
      });
      expect(result.current.state.error).toBeTruthy();

      // Act - set new text
      act(() => {
        result.current.actions.setInputText("New text");
      });

      // Assert
      expect(result.current.state.error).toBeNull();
    });

    it("should handle empty string", () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.setInputText("Some text");
      });

      // Act
      act(() => {
        result.current.actions.setInputText("");
      });

      // Assert
      expect(result.current.state.inputText).toBe("");
    });
  });

  // ============================================================================
  // INPUT VALIDATION (TC-GEN-002, TC-GEN-003)
  // ============================================================================

  describe("generateFlashcards - validation", () => {
    it("should reject text shorter than 1000 characters (TC-GEN-002)", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());
      const shortText = "a".repeat(999); // 999 characters

      act(() => {
        result.current.actions.setInputText(shortText);
      });

      // Act
      await act(async () => {
        await result.current.actions.generateFlashcards();
      });

      // Assert
      expect(result.current.state.error).toBe("Tekst musi mieć od 1000 do 10000 znaków");
      expect(result.current.state.isGenerating).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should accept text with exactly 1000 characters (boundary)", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());
      const exactText = "a".repeat(1000); // Exactly 1000 characters

      const mockResponse: GenerateFlashcardsResponseDTO = {
        generation_id: "gen-123",
        flashcards: [{ front: "Q1", back: "A1" }],
        model_name: "test-model",
        duration_ms: 1000,
        card_count: 1,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      act(() => {
        result.current.actions.setInputText(exactText);
      });

      // Act
      await act(async () => {
        await result.current.actions.generateFlashcards();
      });

      // Assert
      expect(result.current.state.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should reject text longer than 10000 characters (TC-GEN-003)", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());
      const longText = "a".repeat(10001); // 10001 characters

      act(() => {
        result.current.actions.setInputText(longText);
      });

      // Act
      await act(async () => {
        await result.current.actions.generateFlashcards();
      });

      // Assert
      expect(result.current.state.error).toBe("Tekst musi mieć od 1000 do 10000 znaków");
      expect(result.current.state.isGenerating).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should accept text with exactly 10000 characters (boundary)", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());
      const exactText = "a".repeat(10000); // Exactly 10000 characters

      const mockResponse: GenerateFlashcardsResponseDTO = {
        generation_id: "gen-123",
        flashcards: [{ front: "Q1", back: "A1" }],
        model_name: "test-model",
        duration_ms: 1000,
        card_count: 1,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      act(() => {
        result.current.actions.setInputText(exactText);
      });

      // Act
      await act(async () => {
        await result.current.actions.generateFlashcards();
      });

      // Assert
      expect(result.current.state.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should reject text with exactly 500 characters", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());
      const text = "a".repeat(500);

      act(() => {
        result.current.actions.setInputText(text);
      });

      // Act
      await act(async () => {
        await result.current.actions.generateFlashcards();
      });

      // Assert
      expect(result.current.state.error).toBe("Tekst musi mieć od 1000 do 10000 znaków");
    });

    it("should reject empty text", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      // Act
      await act(async () => {
        await result.current.actions.generateFlashcards();
      });

      // Assert
      expect(result.current.state.error).toBe("Tekst musi mieć od 1000 do 10000 znaków");
    });
  });

  // ============================================================================
  // AI GENERATION FLOW (TC-GEN-001)
  // ============================================================================

  describe("generateFlashcards - successful generation", () => {
    it("should generate flashcards successfully (TC-GEN-001)", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());
      const validText = "a".repeat(5000);

      const mockResponse: GenerateFlashcardsResponseDTO = {
        generation_id: "gen-abc-123",
        flashcards: [
          { front: "Question 1", back: "Answer 1" },
          { front: "Question 2", back: "Answer 2" },
          { front: "Question 3", back: "Answer 3" },
        ],
        model_name: "openai/gpt-4",
        duration_ms: 2500,
        card_count: 3,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      act(() => {
        result.current.actions.setInputText(validText);
      });

      // Act
      await act(async () => {
        await result.current.actions.generateFlashcards();
      });

      // Assert - API call
      expect(global.fetch).toHaveBeenCalledWith("/api/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: validText }),
      });

      // Assert - state
      expect(result.current.state.isGenerating).toBe(false);
      expect(result.current.state.generationId).toBe("gen-abc-123");
      expect(result.current.state.flashcards).toHaveLength(3);
      expect(result.current.state.error).toBeNull();

      // Assert - flashcard view models
      const cards = result.current.state.flashcards;
      expect(cards[0]).toMatchObject({
        front: "Question 1",
        back: "Answer 1",
        status: "draft",
        generationId: "gen-abc-123",
        source: "ai-full",
      });
      expect(cards[0].id).toMatch(/^temp-\d+-[a-z0-9]+$/);

      // Assert - toast notification
      expect(toast).toHaveBeenCalledWith({
        title: "✨ Fiszki wygenerowane!",
        description: "Utworzono 3 fiszki. Możesz je teraz edytować i zapisać.",
      });
    });

    it("should set isGenerating to true during generation", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());
      const validText = "a".repeat(5000);

      let resolveFetch: ((value: Response) => void) | undefined;
      const fetchPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(fetchPromise);

      act(() => {
        result.current.actions.setInputText(validText);
      });

      // Act - start generation
      act(() => {
        result.current.actions.generateFlashcards();
      });

      // Assert - should be generating
      await waitFor(() => {
        expect(result.current.state.isGenerating).toBe(true);
      });

      // Complete the fetch
      act(() => {
        resolveFetch?.({
          ok: true,
          json: async () => ({
            generation_id: "gen-123",
            flashcards: [{ front: "Q", back: "A" }],
            model_name: "test",
            duration_ms: 1000,
            card_count: 1,
          }),
        } as Response);
      });

      // Assert - should finish generating
      await waitFor(() => {
        expect(result.current.state.isGenerating).toBe(false);
      });
    });

    it("should handle single flashcard generation", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());
      const validText = "a".repeat(5000);

      const mockResponse: GenerateFlashcardsResponseDTO = {
        generation_id: "gen-123",
        flashcards: [{ front: "Solo Question", back: "Solo Answer" }],
        model_name: "test-model",
        duration_ms: 1000,
        card_count: 1,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      act(() => {
        result.current.actions.setInputText(validText);
      });

      // Act
      await act(async () => {
        await result.current.actions.generateFlashcards();
      });

      // Assert
      expect(result.current.state.flashcards).toHaveLength(1);
      expect(toast).toHaveBeenCalledWith({
        title: "✨ Fiszki wygenerowane!",
        description: "Utworzono 1 fiszkę. Możesz je teraz edytować i zapisać.",
      });
    });

    it("should handle maximum flashcard generation (10 cards)", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());
      const validText = "a".repeat(5000);

      const mockFlashcards = Array.from({ length: 10 }, (_, i) => ({
        front: `Question ${i + 1}`,
        back: `Answer ${i + 1}`,
      }));

      const mockResponse: GenerateFlashcardsResponseDTO = {
        generation_id: "gen-123",
        flashcards: mockFlashcards,
        model_name: "test-model",
        duration_ms: 3000,
        card_count: 10,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      act(() => {
        result.current.actions.setInputText(validText);
      });

      // Act
      await act(async () => {
        await result.current.actions.generateFlashcards();
      });

      // Assert
      expect(result.current.state.flashcards).toHaveLength(10);
      expect(toast).toHaveBeenCalledWith({
        title: "✨ Fiszki wygenerowane!",
        description: "Utworzono 10 fiszek. Możesz je teraz edytować i zapisać.",
      });
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe("generateFlashcards - error handling", () => {
    it("should handle API error response", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());
      const validText = "a".repeat(5000);

      const errorResponse: ErrorResponseDTO = {
        error: "internal_error",
        message: "AI service temporarily unavailable",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => errorResponse,
      } as Response);

      act(() => {
        result.current.actions.setInputText(validText);
      });

      // Act
      await act(async () => {
        await result.current.actions.generateFlashcards();
      });

      // Assert
      expect(result.current.state.isGenerating).toBe(false);
      expect(result.current.state.error).toBe("AI service temporarily unavailable");
      expect(result.current.state.flashcards).toHaveLength(0);

      expect(toast).toHaveBeenCalledWith({
        variant: "destructive",
        title: "❌ Błąd generowania",
        description: "AI service temporarily unavailable",
      });
    });

    it("should handle network error", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());
      const validText = "a".repeat(5000);

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network connection failed"));

      act(() => {
        result.current.actions.setInputText(validText);
      });

      // Act
      await act(async () => {
        await result.current.actions.generateFlashcards();
      });

      // Assert
      expect(result.current.state.isGenerating).toBe(false);
      expect(result.current.state.error).toBe("Network connection failed");
      expect(toast).toHaveBeenCalledWith({
        variant: "destructive",
        title: "❌ Błąd generowania",
        description: "Network connection failed",
      });
    });

    it("should handle API error without message", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());
      const validText = "a".repeat(5000);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      act(() => {
        result.current.actions.setInputText(validText);
      });

      // Act
      await act(async () => {
        await result.current.actions.generateFlashcards();
      });

      // Assert
      expect(result.current.state.error).toBe("Nie udało się wygenerować fiszek");
    });

    it("should handle non-Error exceptions", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());
      const validText = "a".repeat(5000);

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce("Unknown error");

      act(() => {
        result.current.actions.setInputText(validText);
      });

      // Act
      await act(async () => {
        await result.current.actions.generateFlashcards();
      });

      // Assert
      expect(result.current.state.error).toBe("Wystąpił nieoczekiwany błąd");
    });
  });

  // ============================================================================
  // CARD EDITING (TC-REV-001)
  // ============================================================================

  describe("updateCard", () => {
    it("should update front field correctly", () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      const cardId = result.current.state.flashcards[0].id;

      // Act
      act(() => {
        result.current.actions.updateCard(cardId, "front", "Updated Question");
      });

      // Assert
      expect(result.current.state.flashcards[0].front).toBe("Updated Question");
    });

    it("should update back field correctly", () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      const cardId = result.current.state.flashcards[0].id;

      // Act
      act(() => {
        result.current.actions.updateCard(cardId, "back", "Updated Answer");
      });

      // Assert
      expect(result.current.state.flashcards[0].back).toBe("Updated Answer");
    });

    it("should change source from 'ai-full' to 'ai-edited' when AI card is edited (TC-REV-001)", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());
      const validText = "a".repeat(5000);

      const mockResponse: GenerateFlashcardsResponseDTO = {
        generation_id: "gen-123",
        flashcards: [{ front: "Original", back: "Answer" }],
        model_name: "test",
        duration_ms: 1000,
        card_count: 1,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      act(() => {
        result.current.actions.setInputText(validText);
      });

      await act(async () => {
        await result.current.actions.generateFlashcards();
      });

      const cardId = result.current.state.flashcards[0].id;
      expect(result.current.state.flashcards[0].source).toBe("ai-full");

      // Act
      act(() => {
        result.current.actions.updateCard(cardId, "front", "Edited Question");
      });

      // Assert
      expect(result.current.state.flashcards[0].source).toBe("ai-edited");
    });

    it("should keep source as 'ai-edited' on subsequent edits", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());
      const validText = "a".repeat(5000);

      const mockResponse: GenerateFlashcardsResponseDTO = {
        generation_id: "gen-123",
        flashcards: [{ front: "Original", back: "Answer" }],
        model_name: "test",
        duration_ms: 1000,
        card_count: 1,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      act(() => {
        result.current.actions.setInputText(validText);
      });

      await act(async () => {
        await result.current.actions.generateFlashcards();
      });

      const cardId = result.current.state.flashcards[0].id;

      // First edit
      act(() => {
        result.current.actions.updateCard(cardId, "front", "First Edit");
      });

      // Act - second edit
      act(() => {
        result.current.actions.updateCard(cardId, "front", "Second Edit");
      });

      // Assert
      expect(result.current.state.flashcards[0].source).toBe("ai-edited");
    });

    it("should not change source when manual card is edited", () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      const cardId = result.current.state.flashcards[0].id;
      expect(result.current.state.flashcards[0].source).toBe("manual");

      // Act
      act(() => {
        result.current.actions.updateCard(cardId, "front", "Manual Edit");
      });

      // Assert
      expect(result.current.state.flashcards[0].source).toBe("manual");
    });

    it("should not update other cards in the list", () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
        result.current.actions.addManualCard();
        result.current.actions.addManualCard();
      });

      const cardIds = result.current.state.flashcards.map((c) => c.id);

      // Act - update second card
      act(() => {
        result.current.actions.updateCard(cardIds[1], "front", "Updated");
      });

      // Assert
      expect(result.current.state.flashcards[0].front).toBe("");
      expect(result.current.state.flashcards[1].front).toBe("Updated");
      expect(result.current.state.flashcards[2].front).toBe("");
    });

    it("should handle updating non-existent card gracefully", () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      // Act - try to update non-existent card
      act(() => {
        result.current.actions.updateCard("non-existent-id", "front", "Test");
      });

      // Assert - should not throw, state should remain unchanged
      expect(result.current.state.flashcards).toHaveLength(1);
      expect(result.current.state.flashcards[0].front).toBe("");
    });
  });

  // ============================================================================
  // CARD SAVING WITH VALIDATION (TC-REV-002, TC-REV-003)
  // ============================================================================

  describe("saveCard - validation", () => {
    it("should reject empty front field (TC-REV-002)", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      const cardId = result.current.state.flashcards[0].id;

      act(() => {
        result.current.actions.updateCard(cardId, "back", "Valid answer");
      });

      // Act
      await act(async () => {
        await result.current.actions.saveCard(cardId);
      });

      // Assert
      expect(result.current.state.flashcards[0].status).toBe("error");
      expect(result.current.state.flashcards[0].errorMessage).toBe("Front musi mieć od 1 do 200 znaków");
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should reject front field with only whitespace", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      const cardId = result.current.state.flashcards[0].id;

      act(() => {
        result.current.actions.updateCard(cardId, "front", "   ");
        result.current.actions.updateCard(cardId, "back", "Valid answer");
      });

      // Act
      await act(async () => {
        await result.current.actions.saveCard(cardId);
      });

      // Assert
      expect(result.current.state.flashcards[0].status).toBe("error");
      expect(result.current.state.flashcards[0].errorMessage).toBe("Front musi mieć od 1 do 200 znaków");
    });

    it("should reject front field longer than 200 characters (TC-REV-003)", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      const cardId = result.current.state.flashcards[0].id;
      const longFront = "a".repeat(201);

      act(() => {
        result.current.actions.updateCard(cardId, "front", longFront);
        result.current.actions.updateCard(cardId, "back", "Valid answer");
      });

      // Act
      await act(async () => {
        await result.current.actions.saveCard(cardId);
      });

      // Assert
      expect(result.current.state.flashcards[0].status).toBe("error");
      expect(result.current.state.flashcards[0].errorMessage).toBe("Front musi mieć od 1 do 200 znaków");
    });

    it("should accept front field with exactly 200 characters (boundary)", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      const cardId = result.current.state.flashcards[0].id;
      const exactFront = "a".repeat(200);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "card-123" }),
      } as Response);

      act(() => {
        result.current.actions.updateCard(cardId, "front", exactFront);
        result.current.actions.updateCard(cardId, "back", "Valid answer");
      });

      // Act
      await act(async () => {
        await result.current.actions.saveCard(cardId);
      });

      // Assert
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.current.state.flashcards).toHaveLength(0); // Card removed after save
    });

    it("should reject empty back field", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      const cardId = result.current.state.flashcards[0].id;

      act(() => {
        result.current.actions.updateCard(cardId, "front", "Valid question");
      });

      // Act
      await act(async () => {
        await result.current.actions.saveCard(cardId);
      });

      // Assert
      expect(result.current.state.flashcards[0].status).toBe("error");
      expect(result.current.state.flashcards[0].errorMessage).toBe("Back musi mieć od 1 do 500 znaków");
    });

    it("should reject back field with only whitespace", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      const cardId = result.current.state.flashcards[0].id;

      act(() => {
        result.current.actions.updateCard(cardId, "front", "Valid question");
        result.current.actions.updateCard(cardId, "back", "   ");
      });

      // Act
      await act(async () => {
        await result.current.actions.saveCard(cardId);
      });

      // Assert
      expect(result.current.state.flashcards[0].status).toBe("error");
    });

    it("should reject back field longer than 500 characters", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      const cardId = result.current.state.flashcards[0].id;
      const longBack = "a".repeat(501);

      act(() => {
        result.current.actions.updateCard(cardId, "front", "Valid question");
        result.current.actions.updateCard(cardId, "back", longBack);
      });

      // Act
      await act(async () => {
        await result.current.actions.saveCard(cardId);
      });

      // Assert
      expect(result.current.state.flashcards[0].status).toBe("error");
      expect(result.current.state.flashcards[0].errorMessage).toBe("Back musi mieć od 1 do 500 znaków");
    });

    it("should accept back field with exactly 500 characters (boundary)", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      const cardId = result.current.state.flashcards[0].id;
      const exactBack = "a".repeat(500);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "card-123" }),
      } as Response);

      act(() => {
        result.current.actions.updateCard(cardId, "front", "Valid question");
        result.current.actions.updateCard(cardId, "back", exactBack);
      });

      // Act
      await act(async () => {
        await result.current.actions.saveCard(cardId);
      });

      // Assert
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should clear previous error when retrying save", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      const cardId = result.current.state.flashcards[0].id;

      // First attempt - invalid
      await act(async () => {
        await result.current.actions.saveCard(cardId);
      });

      expect(result.current.state.flashcards[0].status).toBe("error");

      // Fix the card
      act(() => {
        result.current.actions.updateCard(cardId, "front", "Valid question");
        result.current.actions.updateCard(cardId, "back", "Valid answer");
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "card-123" }),
      } as Response);

      // Act - second attempt
      await act(async () => {
        await result.current.actions.saveCard(cardId);
      });

      // Assert - should succeed this time
      expect(toast).toHaveBeenCalledWith({
        title: "✅ Fiszka zapisana",
        description: "Fiszka została dodana do bazy wiedzy.",
      });
    });
  });

  describe("saveCard - successful save", () => {
    it("should save valid flashcard and remove from list", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      const cardId = result.current.state.flashcards[0].id;

      act(() => {
        result.current.actions.updateCard(cardId, "front", "Test Question");
        result.current.actions.updateCard(cardId, "back", "Test Answer");
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "card-123",
          front: "Test Question",
          back: "Test Answer",
          source: "manual",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      } as Response);

      // Act
      await act(async () => {
        await result.current.actions.saveCard(cardId);
      });

      // Assert
      expect(global.fetch).toHaveBeenCalledWith("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front: "Test Question",
          back: "Test Answer",
          source: "manual",
          generation_id: null,
        }),
      });

      expect(result.current.state.flashcards).toHaveLength(0);
      expect(toast).toHaveBeenCalledWith({
        title: "✅ Fiszka zapisana",
        description: "Fiszka została dodana do bazy wiedzy.",
      });
    });

    it("should set status to 'saving' during save operation", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      const cardId = result.current.state.flashcards[0].id;

      act(() => {
        result.current.actions.updateCard(cardId, "front", "Question");
        result.current.actions.updateCard(cardId, "back", "Answer");
      });

      let resolveFetch: ((value: Response) => void) | undefined;
      const fetchPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(fetchPromise);

      // Act - start save
      act(() => {
        result.current.actions.saveCard(cardId);
      });

      // Assert - should be in saving state
      await waitFor(() => {
        expect(result.current.state.flashcards[0]?.status).toBe("saving");
      });

      // Complete the save
      act(() => {
        resolveFetch?.({
          ok: true,
          json: async () => ({ id: "card-123" }),
        } as Response);
      });

      await waitFor(() => {
        expect(result.current.state.flashcards).toHaveLength(0);
      });
    });

    it("should save AI-generated card with generation_id", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());
      const validText = "a".repeat(5000);

      const mockResponse: GenerateFlashcardsResponseDTO = {
        generation_id: "gen-abc-123",
        flashcards: [{ front: "AI Question", back: "AI Answer" }],
        model_name: "test",
        duration_ms: 1000,
        card_count: 1,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      act(() => {
        result.current.actions.setInputText(validText);
      });

      await act(async () => {
        await result.current.actions.generateFlashcards();
      });

      const cardId = result.current.state.flashcards[0].id;

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "card-123" }),
      } as Response);

      // Act
      await act(async () => {
        await result.current.actions.saveCard(cardId);
      });

      // Assert
      expect(global.fetch).toHaveBeenCalledWith("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front: "AI Question",
          back: "AI Answer",
          source: "ai-full",
          generation_id: "gen-abc-123",
        }),
      });
    });

    it("should handle save error from API", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      const cardId = result.current.state.flashcards[0].id;

      act(() => {
        result.current.actions.updateCard(cardId, "front", "Question");
        result.current.actions.updateCard(cardId, "back", "Answer");
      });

      const errorResponse: ErrorResponseDTO = {
        error: "database_error",
        message: "Failed to save flashcard",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => errorResponse,
      } as Response);

      // Act
      await act(async () => {
        await result.current.actions.saveCard(cardId);
      });

      // Assert
      expect(result.current.state.flashcards[0].status).toBe("error");
      expect(result.current.state.flashcards[0].errorMessage).toBe("Failed to save flashcard");
      expect(result.current.state.flashcards).toHaveLength(1); // Card still in list

      expect(toast).toHaveBeenCalledWith({
        variant: "destructive",
        title: "❌ Błąd zapisu",
        description: "Failed to save flashcard",
      });
    });

    it("should handle save API error without message", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      const cardId = result.current.state.flashcards[0].id;

      act(() => {
        result.current.actions.updateCard(cardId, "front", "Question");
        result.current.actions.updateCard(cardId, "back", "Answer");
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      // Act
      await act(async () => {
        await result.current.actions.saveCard(cardId);
      });

      // Assert
      expect(result.current.state.flashcards[0].errorMessage).toBe("Nie udało się zapisać fiszki");
    });

    it("should handle network error during save", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      const cardId = result.current.state.flashcards[0].id;

      act(() => {
        result.current.actions.updateCard(cardId, "front", "Question");
        result.current.actions.updateCard(cardId, "back", "Answer");
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network error"));

      // Act
      await act(async () => {
        await result.current.actions.saveCard(cardId);
      });

      // Assert
      expect(result.current.state.flashcards[0].status).toBe("error");
      expect(result.current.state.flashcards[0].errorMessage).toBe("Network error");
    });

    it("should handle non-existent card save gracefully", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      // Act - try to save non-existent card
      await act(async () => {
        await result.current.actions.saveCard("non-existent-id");
      });

      // Assert - should not throw or crash
      expect(result.current.state.flashcards).toHaveLength(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // DISCARD OPERATIONS
  // ============================================================================

  describe("discardCard", () => {
    it("should remove card from list without saving", () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
        result.current.actions.addManualCard();
      });

      const cardIds = result.current.state.flashcards.map((c) => c.id);

      // Act
      act(() => {
        result.current.actions.discardCard(cardIds[0]);
      });

      // Assert
      expect(result.current.state.flashcards).toHaveLength(1);
      expect(result.current.state.flashcards[0].id).toBe(cardIds[1]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should handle discarding non-existent card gracefully", () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      // Act
      act(() => {
        result.current.actions.discardCard("non-existent-id");
      });

      // Assert
      expect(result.current.state.flashcards).toHaveLength(1);
    });
  });

  describe("discardAll", () => {
    it("should remove all cards from list", () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
        result.current.actions.addManualCard();
        result.current.actions.addManualCard();
      });

      expect(result.current.state.flashcards).toHaveLength(3);

      // Act
      act(() => {
        result.current.actions.discardAll();
      });

      // Assert
      expect(result.current.state.flashcards).toHaveLength(0);
    });

    it("should handle discarding when list is already empty", () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      // Act
      act(() => {
        result.current.actions.discardAll();
      });

      // Assert
      expect(result.current.state.flashcards).toHaveLength(0);
    });
  });

  // ============================================================================
  // MANUAL CARD CREATION
  // ============================================================================

  describe("addManualCard", () => {
    it("should add new empty card with correct defaults", () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      // Act
      act(() => {
        result.current.actions.addManualCard();
      });

      // Assert
      expect(result.current.state.flashcards).toHaveLength(1);

      const card = result.current.state.flashcards[0];
      expect(card.front).toBe("");
      expect(card.back).toBe("");
      expect(card.status).toBe("draft");
      expect(card.generationId).toBeNull();
      expect(card.source).toBe("manual");
      expect(card.id).toMatch(/^temp-\d+-[a-z0-9]+$/);
    });

    it("should add new cards at the beginning of the list", () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      const firstCardId = result.current.state.flashcards[0].id;

      // Act
      act(() => {
        result.current.actions.addManualCard();
      });

      // Assert
      expect(result.current.state.flashcards).toHaveLength(2);
      expect(result.current.state.flashcards[1].id).toBe(firstCardId);
    });

    it("should generate unique IDs for each card", () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      // Act
      act(() => {
        result.current.actions.addManualCard();
        result.current.actions.addManualCard();
        result.current.actions.addManualCard();
      });

      // Assert
      const ids = result.current.state.flashcards.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });
  });

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  describe("saveAll", () => {
    it("should save all draft cards in sequence", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
        result.current.actions.addManualCard();
        result.current.actions.addManualCard();
      });

      const cardIds = result.current.state.flashcards.map((c) => c.id);

      // Set valid data for all cards
      act(() => {
        cardIds.forEach((id, index) => {
          result.current.actions.updateCard(id, "front", `Question ${index + 1}`);
          result.current.actions.updateCard(id, "back", `Answer ${index + 1}`);
        });
      });

      // Mock successful saves
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ id: "card-123" }),
      } as Response);

      // Act
      await act(async () => {
        await result.current.actions.saveAll();
      });

      // Assert
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(result.current.state.flashcards).toHaveLength(0);

      // Should show initial toast
      expect(toast).toHaveBeenCalledWith({
        title: "💾 Zapisywanie...",
        description: "Zapisywanie 3 fiszek...",
      });
    });

    it("should not call API when there are no draft cards", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      // Act
      await act(async () => {
        await result.current.actions.saveAll();
      });

      // Assert
      expect(global.fetch).not.toHaveBeenCalled();
      expect(toast).not.toHaveBeenCalled();
    });

    it("should skip cards with error status", async () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
        result.current.actions.addManualCard();
      });

      const cardIds = result.current.state.flashcards.map((c) => c.id);

      // Set valid data only for first card
      act(() => {
        result.current.actions.updateCard(cardIds[0], "front", "Valid Question");
        result.current.actions.updateCard(cardIds[0], "back", "Valid Answer");
        // Second card left empty (will fail validation)
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ id: "card-123" }),
      } as Response);

      // Act
      await act(async () => {
        await result.current.actions.saveAll();
      });

      // Assert - only valid card should be saved
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.current.state.flashcards).toHaveLength(1);
      expect(result.current.state.flashcards[0].status).toBe("error");
    });

    it("should show correct plural forms in toast", async () => {
      // Arrange - 1 card
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.actions.addManualCard();
      });

      const cardId = result.current.state.flashcards[0].id;

      act(() => {
        result.current.actions.updateCard(cardId, "front", "Question");
        result.current.actions.updateCard(cardId, "back", "Answer");
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ id: "card-123" }),
      } as Response);

      // Act
      await act(async () => {
        await result.current.actions.saveAll();
      });

      // Assert
      expect(toast).toHaveBeenCalledWith({
        title: "💾 Zapisywanie...",
        description: "Zapisywanie 1 fiszki...",
      });
    });
  });

  // ============================================================================
  // ERROR CLEARING
  // ============================================================================

  describe("clearError", () => {
    it("should clear global error", () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      // Trigger an error
      act(() => {
        result.current.actions.generateFlashcards();
      });

      expect(result.current.state.error).toBeTruthy();

      // Act
      act(() => {
        result.current.actions.clearError();
      });

      // Assert
      expect(result.current.state.error).toBeNull();
    });

    it("should handle clearing when there is no error", () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      // Act
      act(() => {
        result.current.actions.clearError();
      });

      // Assert
      expect(result.current.state.error).toBeNull();
    });
  });

  // ============================================================================
  // TEMP ID GENERATION
  // ============================================================================

  describe("temporary ID generation", () => {
    it("should generate IDs with correct format", () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());

      // Act
      act(() => {
        result.current.actions.addManualCard();
      });

      // Assert
      const id = result.current.state.flashcards[0].id;
      expect(id).toMatch(/^temp-\d+-[a-z0-9]+$/);
    });

    it("should generate different IDs on each call", () => {
      // Arrange
      const { result } = renderHook(() => useGenerator());
      const ids: string[] = [];

      // Act - generate multiple cards quickly
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.actions.addManualCard();
        }
      });

      // Collect IDs
      ids.push(...result.current.state.flashcards.map((c) => c.id));

      // Assert - all IDs should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });
  });
});
