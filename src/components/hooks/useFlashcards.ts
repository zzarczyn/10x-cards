import { useState, useEffect, useCallback } from "react";
import type { FlashcardDTO, FlashcardsListResponseDTO, UpdateFlashcardCommand } from "../../types";

interface UseFlashcardsReturn {
  flashcards: FlashcardDTO[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateFlashcard: (id: string, updates: UpdateFlashcardCommand) => Promise<void>;
  deleteFlashcard: (id: string) => Promise<void>;
}

export function useFlashcards(page = 1, limit = 12): UseFlashcardsReturn {
  const [flashcards, setFlashcards] = useState<FlashcardDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate offset based on page and limit
  const offset = (page - 1) * limit;

  const fetchFlashcards = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/flashcards?limit=${limit}&offset=${offset}`);

      if (response.status === 401) {
        throw new Error("Unauthorized");
      }

      if (!response.ok) {
        throw new Error("Failed to fetch flashcards");
      }

      const data: FlashcardsListResponseDTO = await response.json();
      setFlashcards(data.flashcards);
      setTotal(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    fetchFlashcards();
  }, [fetchFlashcards]);

  const updateFlashcard = async (id: string, updates: UpdateFlashcardCommand) => {
    const response = await fetch(`/api/flashcards/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update flashcard");
    }

    const updatedCard: FlashcardDTO = await response.json();

    // Optimistic update (or rather, local state update after success)
    setFlashcards((prev) => prev.map((card) => (card.id === id ? updatedCard : card)));
  };

  const deleteFlashcard = async (id: string) => {
    const response = await fetch(`/api/flashcards/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete flashcard");
    }

    // Local state update
    setFlashcards((prev) => prev.filter((card) => card.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));

    // If the page becomes empty but we are not on the first page,
    // the consumer (component) might want to change the page,
    // but that logic is better handled in the UI component or by re-fetching.
    // For now, we just remove it from the current view.
  };

  return {
    flashcards,
    total,
    isLoading,
    error,
    refresh: fetchFlashcards,
    updateFlashcard,
    deleteFlashcard,
  };
}
