import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import type { FlashcardDTO, UpdateFlashcardCommand } from "../types";

interface EditFlashcardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcard: FlashcardDTO | null;
  onSubmit: (id: string, data: UpdateFlashcardCommand) => Promise<void>;
}

export function EditFlashcardDialog({
  open,
  onOpenChange,
  flashcard,
  onSubmit,
}: EditFlashcardDialogProps) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (flashcard) {
      setFront(flashcard.front);
      setBack(flashcard.back);
      setError(null);
    }
  }, [flashcard, open]);

  if (!open || !flashcard) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!front.trim()) {
      setError("Przód fiszki nie może być pusty");
      return;
    }
    if (!back.trim()) {
      setError("Tył fiszki nie może być pusty");
      return;
    }
    if (front.length > 200) {
      setError("Przód fiszki: maks. 200 znaków");
      return;
    }
    if (back.length > 500) {
      setError("Tył fiszki: maks. 500 znaków");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(flashcard.id, { front, back });
      onOpenChange(false);
    } catch (err) {
      setError("Nie udało się zaktualizować fiszki");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-background rounded-lg shadow-lg w-full max-w-md border overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Edytuj fiszkę</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="edit-front" className="text-sm font-medium">
                Przód (Pytanie)
              </label>
              <Textarea
                id="edit-front"
                value={front}
                onChange={(e) => setFront(e.target.value)}
                maxLength={200}
                disabled={isSubmitting}
                className="resize-none"
              />
              <div className="text-xs text-muted-foreground text-right">
                {front.length}/200
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-back" className="text-sm font-medium">
                Tył (Odpowiedź)
              </label>
              <Textarea
                id="edit-back"
                value={back}
                onChange={(e) => setBack(e.target.value)}
                maxLength={500}
                disabled={isSubmitting}
                className="resize-none min-h-[100px]"
              />
              <div className="text-xs text-muted-foreground text-right">
                {back.length}/500
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Zapisywanie..." : "Zapisz zmiany"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

