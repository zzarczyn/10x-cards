import type { FlashcardViewModel } from "../types";
import { ReviewCard } from "./ReviewCard";
import { Button } from "./ui/button";

interface ReviewSectionProps {
  flashcards: FlashcardViewModel[];
  onUpdateCard: (id: string, field: "front" | "back", value: string) => void;
  onSaveCard: (id: string) => Promise<void>;
  onDiscardCard: (id: string) => void;
  onSaveAll: () => Promise<void>;
  onDiscardAll: () => void;
  onAddManual: () => void;
}

/**
 * Review section displaying list of generated/manual flashcards
 *
 * Features:
 * - Batch actions (Save All / Discard All)
 * - List of ReviewCard components
 * - Add manual flashcard button
 * - Empty state when no flashcards
 */
export function ReviewSection({
  flashcards,
  onUpdateCard,
  onSaveCard,
  onDiscardCard,
  onSaveAll,
  onDiscardAll,
  onAddManual,
}: ReviewSectionProps) {
  const draftCount = flashcards.filter((c) => c.status === "draft").length;
  const hasDrafts = draftCount > 0;

  if (flashcards.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with batch actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Wygenerowane fiszki</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {flashcards.length} {flashcards.length === 1 ? "fiszka" : flashcards.length < 5 ? "fiszki" : "fiszek"}
            {hasDrafts && <span className="ml-1">({draftCount} do zapisania)</span>}
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={onAddManual} variant="outline" size="sm" className="flex-1 sm:flex-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-4"
              aria-hidden="true"
            >
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Dodaj fiszkę
          </Button>

          {hasDrafts && (
            <>
              <Button onClick={onDiscardAll} variant="outline" size="sm" className="flex-1 sm:flex-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-4"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
                Odrzuć wszystkie
              </Button>

              <Button onClick={onSaveAll} size="sm" className="flex-1 sm:flex-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-4"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                Zapisz wszystkie ({draftCount})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Flashcards list */}
      <div className="space-y-4">
        {flashcards.map((card) => (
          <ReviewCard key={card.id} card={card} onUpdate={onUpdateCard} onSave={onSaveCard} onDiscard={onDiscardCard} />
        ))}
      </div>

      {/* Bottom add button for convenience */}
      {flashcards.length > 3 && (
        <div className="flex justify-center pt-2">
          <Button onClick={onAddManual} variant="outline" size="sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-4"
              aria-hidden="true"
            >
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Dodaj kolejną fiszkę
          </Button>
        </div>
      )}
    </div>
  );
}
