import { useState, useCallback } from "react";
import type {
  GeneratorState,
  FlashcardViewModel,
  GenerateFlashcardsResponseDTO,
  CreateFlashcardCommand,
  ErrorResponseDTO,
} from "../../types";
import { toast } from "./useToast";

/**
 * Custom hook for managing the Generator Tab state and actions
 *
 * Provides state management and API integration for:
 * - AI flashcard generation
 * - Manual flashcard creation
 * - Card editing and saving
 * - Batch operations
 */
export function useGenerator() {
  const [state, setState] = useState<GeneratorState>({
    inputText: "",
    isGenerating: false,
    generationId: null,
    flashcards: [],
    error: null,
  });

  /**
   * Updates the input text and clears any global errors
   */
  const setInputText = useCallback((text: string) => {
    setState((prev) => ({
      ...prev,
      inputText: text,
      error: null,
    }));
  }, []);

  /**
   * Generates a temporary UUID for React list keys
   */
  const generateTempId = () => {
    return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * Generates flashcards from input text using AI
   * Calls POST /api/flashcards/generate
   */
  const generateFlashcards = useCallback(async () => {
    // Validation
    if (state.inputText.length < 1000 || state.inputText.length > 10000) {
      setState((prev) => ({
        ...prev,
        error: "Tekst musi mieć od 1000 do 10000 znaków",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isGenerating: true, error: null }));

    try {
      const response = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: state.inputText }),
      });

      if (!response.ok) {
        const errorData: ErrorResponseDTO = await response.json();
        throw new Error(errorData.message || "Nie udało się wygenerować fiszek");
      }

      const data: GenerateFlashcardsResponseDTO = await response.json();

      // Map API response to FlashcardViewModel
      const viewModels: FlashcardViewModel[] = data.flashcards.map((card) => ({
        id: generateTempId(),
        front: card.front,
        back: card.back,
        status: "draft" as const,
        generationId: data.generation_id,
        source: "ai-full" as const,
      }));

      setState((prev) => ({
        ...prev,
        isGenerating: false,
        generationId: data.generation_id,
        flashcards: viewModels,
      }));

      toast({
        title: "✨ Fiszki wygenerowane!",
        description: `Utworzono ${data.card_count} ${data.card_count === 1 ? "fiszkę" : data.card_count < 5 ? "fiszki" : "fiszek"}. Możesz je teraz edytować i zapisać.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd";

      setState((prev) => ({
        ...prev,
        isGenerating: false,
        error: errorMessage,
      }));

      toast({
        variant: "destructive",
        title: "❌ Błąd generowania",
        description: errorMessage,
      });
    }
  }, [state.inputText]);

  /**
   * Updates a flashcard's content
   * Changes source from 'ai-full' to 'ai-edited' if the card was AI-generated
   */
  const updateCard = useCallback((id: string, field: "front" | "back", value: string) => {
    setState((prev) => ({
      ...prev,
      flashcards: prev.flashcards.map((card) => {
        if (card.id !== id) return card;

        const newSource = card.source === "ai-full" ? "ai-edited" : card.source;

        return {
          ...card,
          [field]: value,
          source: newSource,
        };
      }),
    }));
  }, []);

  /**
   * Saves a single flashcard to the database
   * Calls POST /api/flashcards
   * Removes the card from the list on success (as per US-005)
   */
  const saveCard = useCallback(
    async (id: string) => {
      const card = state.flashcards.find((c) => c.id === id);
      if (!card) return;

      // Validation
      if (!card.front.trim() || card.front.length > 200) {
        setState((prev) => ({
          ...prev,
          flashcards: prev.flashcards.map((c) =>
            c.id === id ? { ...c, status: "error", errorMessage: "Front musi mieć od 1 do 200 znaków" } : c
          ),
        }));
        return;
      }

      if (!card.back.trim() || card.back.length > 500) {
        setState((prev) => ({
          ...prev,
          flashcards: prev.flashcards.map((c) =>
            c.id === id ? { ...c, status: "error", errorMessage: "Back musi mieć od 1 do 500 znaków" } : c
          ),
        }));
        return;
      }

      // Set saving status
      setState((prev) => ({
        ...prev,
        flashcards: prev.flashcards.map((c) => (c.id === id ? { ...c, status: "saving", errorMessage: undefined } : c)),
      }));

      try {
        const command: CreateFlashcardCommand = {
          front: card.front,
          back: card.back,
          source: card.source,
          generation_id: card.generationId,
        };

        const response = await fetch("/api/flashcards", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(command),
        });

        if (!response.ok) {
          const errorData: ErrorResponseDTO = await response.json();
          throw new Error(errorData.message || "Nie udało się zapisać fiszki");
        }

        await response.json();

        // Remove card from list on success (US-005: "usuwa ją z listy propozycji")
        setState((prev) => ({
          ...prev,
          flashcards: prev.flashcards.filter((c) => c.id !== id),
        }));

        toast({
          title: "✅ Fiszka zapisana",
          description: "Fiszka została dodana do bazy wiedzy.",
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Wystąpił błąd";

        setState((prev) => ({
          ...prev,
          flashcards: prev.flashcards.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: "error",
                  errorMessage,
                }
              : c
          ),
        }));

        toast({
          variant: "destructive",
          title: "❌ Błąd zapisu",
          description: errorMessage,
        });
      }
    },
    [state.flashcards]
  );

  /**
   * Removes a flashcard from the list without saving
   */
  const discardCard = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      flashcards: prev.flashcards.filter((c) => c.id !== id),
    }));
  }, []);

  /**
   * Adds a new empty flashcard for manual entry
   */
  const addManualCard = useCallback(() => {
    const newCard: FlashcardViewModel = {
      id: generateTempId(),
      front: "",
      back: "",
      status: "draft",
      generationId: null,
      source: "manual",
    };

    setState((prev) => ({
      ...prev,
      flashcards: [newCard, ...prev.flashcards], // Add at the beginning
    }));
  }, []);

  /**
   * Saves all draft flashcards in sequence
   */
  const saveAll = useCallback(async () => {
    const draftCards = state.flashcards.filter((c) => c.status === "draft");
    const count = draftCards.length;

    if (count === 0) return;

    toast({
      title: "💾 Zapisywanie...",
      description: `Zapisywanie ${count} ${count === 1 ? "fiszki" : count < 5 ? "fiszek" : "fiszek"}...`,
    });

    for (const card of draftCards) {
      await saveCard(card.id);
    }
  }, [state.flashcards, saveCard]);

  /**
   * Clears all flashcards from the list
   */
  const discardAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      flashcards: [],
    }));
  }, []);

  /**
   * Clears the global error message
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    state,
    actions: {
      setInputText,
      generateFlashcards,
      updateCard,
      saveCard,
      discardCard,
      addManualCard,
      saveAll,
      discardAll,
      clearError,
    },
  };
}
