import { useState } from "react";
import type { FlashcardViewModel } from "../types";
import { Card, CardContent } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";

interface ReviewCardProps {
  card: FlashcardViewModel;
  onUpdate: (id: string, field: "front" | "back", value: string) => void;
  onSave: (id: string) => Promise<void>;
  onDiscard: (id: string) => void;
}

/**
 * Single flashcard in review/edit mode
 *
 * Features:
 * - Editable front and back fields with validation
 * - Save/Discard actions
 * - Visual feedback for different states (draft, saving, error)
 * - Inline error messages
 */
export function ReviewCard({ card, onUpdate, onSave, onDiscard }: ReviewCardProps) {
  const [localFront, setLocalFront] = useState(card.front);
  const [localBack, setLocalBack] = useState(card.back);

  const isFrontValid = localFront.trim().length > 0 && localFront.length <= 200;
  const isBackValid = localBack.trim().length > 0 && localBack.length <= 500;
  const isValid = isFrontValid && isBackValid;

  const handleFrontChange = (value: string) => {
    setLocalFront(value);
    onUpdate(card.id, "front", value);
  };

  const handleBackChange = (value: string) => {
    setLocalBack(value);
    onUpdate(card.id, "back", value);
  };

  const handleSave = async () => {
    if (!isValid) return;
    await onSave(card.id);
  };

  const isSaving = card.status === "saving";
  const hasError = card.status === "error";

  return (
    <Card className={cn("transition-all", hasError && "border-destructive", isSaving && "opacity-60")}>
      <CardContent className="p-4 space-y-4">
        {/* Front field */}
        <div className="space-y-2">
          <label htmlFor={`front-${card.id}`} className="text-sm font-medium">
            Przód fiszki
            <span className="text-muted-foreground ml-2 font-normal">({localFront.length}/200)</span>
          </label>
          <Textarea
            id={`front-${card.id}`}
            value={localFront}
            onChange={(e) => handleFrontChange(e.target.value)}
            disabled={isSaving}
            placeholder="Pytanie lub pojęcie..."
            className="min-h-[80px] resize-y"
            aria-invalid={!isFrontValid && localFront.length > 0}
            aria-describedby={!isFrontValid ? `front-error-${card.id}` : undefined}
          />
          {!isFrontValid && localFront.length > 0 && (
            <p id={`front-error-${card.id}`} className="text-sm text-destructive">
              {localFront.trim().length === 0 ? "Pole nie może być puste" : "Maksymalnie 200 znaków"}
            </p>
          )}
        </div>

        {/* Back field */}
        <div className="space-y-2">
          <label htmlFor={`back-${card.id}`} className="text-sm font-medium">
            Tył fiszki
            <span className="text-muted-foreground ml-2 font-normal">({localBack.length}/500)</span>
          </label>
          <Textarea
            id={`back-${card.id}`}
            value={localBack}
            onChange={(e) => handleBackChange(e.target.value)}
            disabled={isSaving}
            placeholder="Odpowiedź lub definicja..."
            className="min-h-[100px] resize-y"
            aria-invalid={!isBackValid && localBack.length > 0}
            aria-describedby={!isBackValid ? `back-error-${card.id}` : undefined}
          />
          {!isBackValid && localBack.length > 0 && (
            <p id={`back-error-${card.id}`} className="text-sm text-destructive">
              {localBack.trim().length === 0 ? "Pole nie może być puste" : "Maksymalnie 500 znaków"}
            </p>
          )}
        </div>

        {/* Source badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
            {card.source === "manual" && "✍️ Ręczna"}
            {card.source === "ai-full" && "🤖 AI"}
            {card.source === "ai-edited" && "✏️ AI (edytowana)"}
          </span>
        </div>

        {/* Error message */}
        {hasError && card.errorMessage && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">⚠️ {card.errorMessage}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={!isValid || isSaving} className="flex-1" size="sm">
            {isSaving ? (
              <>
                <svg
                  className="animate-spin size-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Zapisywanie...
              </>
            ) : (
              <>
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
                Zapisz
              </>
            )}
          </Button>

          <Button onClick={() => onDiscard(card.id)} disabled={isSaving} variant="outline" size="sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-4"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                clipRule="evenodd"
              />
            </svg>
            Odrzuć
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function for className concatenation
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
