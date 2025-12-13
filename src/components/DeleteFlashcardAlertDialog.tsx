import { useState } from "react";
import { Button } from "./ui/button";
import type { FlashcardDTO } from "../types";

interface DeleteFlashcardAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcard: FlashcardDTO | null;
  onConfirm: (id: string) => Promise<void>;
}

export function DeleteFlashcardAlertDialog({
  open,
  onOpenChange,
  flashcard,
  onConfirm,
}: DeleteFlashcardAlertDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!open || !flashcard) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(flashcard.id);
      onOpenChange(false);
    } catch {
      // Error handling is done in parent via Toast, but we reset state here
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        data-testid="delete-flashcard-dialog"
        className="bg-background rounded-lg shadow-lg w-full max-w-md border overflow-hidden animate-in zoom-in-95 duration-200"
        role="alertdialog"
        aria-modal="true"
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-2">Czy na pewno chcesz usunąć tę fiszkę?</h2>
          <p className="text-muted-foreground mb-6">
            Tej operacji nie można cofnąć. Fiszka zostanie trwale usunięta z Twojej bazy wiedzy.
          </p>

          <div className="bg-muted/50 p-3 rounded mb-6 text-sm italic">
            &ldquo;{flashcard.front.substring(0, 100)}
            {flashcard.front.length > 100 ? "..." : ""}&rdquo;
          </div>

          <div className="flex justify-end gap-2">
            <Button
              data-testid="delete-flashcard-cancel-btn"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
            >
              Anuluj
            </Button>
            <Button
              data-testid="delete-flashcard-confirm-btn"
              variant="destructive"
              onClick={handleConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Usuwanie..." : "Usuń"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
