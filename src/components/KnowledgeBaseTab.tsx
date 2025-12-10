import { useState } from "react";
import { useFlashcards } from "./hooks/useFlashcards";
import { FlashcardItem } from "./FlashcardItem";
import { PaginationControls } from "./PaginationControls";
import { EditFlashcardDialog } from "./EditFlashcardDialog";
import { DeleteFlashcardAlertDialog } from "./DeleteFlashcardAlertDialog";
import { useToast } from "./hooks/useToast";
import { Button } from "./ui/button";
import type { FlashcardDTO, UpdateFlashcardCommand } from "../types";

export function KnowledgeBaseTab() {
  const [page, setPage] = useState(1);
  const limit = 12;
  const { flashcards, total, isLoading, error, refresh, updateFlashcard, deleteFlashcard } = useFlashcards(page, limit);
  const { toast } = useToast();

  const [editingCard, setEditingCard] = useState<FlashcardDTO | null>(null);
  const [deletingCard, setDeletingCard] = useState<FlashcardDTO | null>(null);

  const totalPages = Math.ceil(total / limit);

  const handleEdit = (card: FlashcardDTO) => setEditingCard(card);
  const handleDelete = (card: FlashcardDTO) => setDeletingCard(card);

  const onUpdateSubmit = async (id: string, data: UpdateFlashcardCommand) => {
    try {
      await updateFlashcard(id, data);
      toast({
        title: "Sukces",
        description: "Fiszka została zaktualizowana.",
      });
    } catch (err) {
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować fiszki.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const onDeleteConfirm = async (id: string) => {
    try {
      await deleteFlashcard(id);
      toast({
        title: "Sukces",
        description: "Fiszka została usunięta.",
      });
    } catch (err) {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć fiszki.",
        variant: "destructive",
      });
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-[280px] bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => refresh()}>Spróbuj ponownie</Button>
      </div>
    );
  }

  if (!isLoading && flashcards.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed rounded-lg">
        <div className="mx-auto size-12 bg-muted rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 text-muted-foreground">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">Brak zapisanych fiszek</h3>
        <p className="text-muted-foreground mb-6">Użyj generatora, aby stworzyć swoją pierwszą kolekcję.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {flashcards.map((card) => (
          <FlashcardItem
            key={card.id}
            card={card}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        hasNextPage={page < totalPages}
        hasPrevPage={page > 1}
      />

      <EditFlashcardDialog
        open={!!editingCard}
        onOpenChange={(open) => !open && setEditingCard(null)}
        flashcard={editingCard}
        onSubmit={onUpdateSubmit}
      />

      <DeleteFlashcardAlertDialog
        open={!!deletingCard}
        onOpenChange={(open) => !open && setDeletingCard(null)}
        flashcard={deletingCard}
        onConfirm={onDeleteConfirm}
      />
    </div>
  );
}

