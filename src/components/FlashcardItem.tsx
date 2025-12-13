import { useState } from "react";
import { Edit2, Trash2, Repeat } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import type { FlashcardDTO } from "../types";

interface FlashcardItemProps {
  card: FlashcardDTO;
  index: number;
  onEdit: (card: FlashcardDTO) => void;
  onDelete: (card: FlashcardDTO) => void;
}

export function FlashcardItem({ card, index, onEdit, onDelete }: FlashcardItemProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => setIsFlipped(!isFlipped);

  return (
    <div data-testid={`flashcard-item-${index}`} className="group h-[280px] w-full [perspective:1000px]">
      <div
        className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] cursor-pointer ${
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        }`}
        onClick={handleFlip}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleFlip();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Obróć fiszkę"
      >
        {/* Front Side */}
        <Card className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center [backface-visibility:hidden] shadow-sm border-2 bg-card">
          <div className="flex-1 flex items-center justify-center w-full overflow-y-auto">
            <p data-testid={`flashcard-front-${index}`} className="text-lg font-medium whitespace-pre-wrap">
              {card.front}
            </p>
          </div>
          <div className="mt-4 text-xs text-muted-foreground uppercase tracking-wider font-semibold">Pytanie</div>
        </Card>

        {/* Back Side */}
        <Card className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-sm border-primary/20 bg-muted">
          <div className="flex-1 flex items-center justify-center w-full overflow-y-auto">
            <p data-testid={`flashcard-back-${index}`} className="text-lg whitespace-pre-wrap">
              {card.back}
            </p>
          </div>
          <div className="mt-4 text-xs text-muted-foreground uppercase tracking-wider font-semibold">Odpowiedź</div>
        </Card>
      </div>

      {/* Floating Actions (Always visible, no flip) */}
      <div className="absolute bottom-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          data-testid={`flashcard-flip-btn-${index}`}
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            handleFlip();
          }}
          title="Obróć"
        >
          <Repeat className="h-4 w-4" />
        </Button>
        <Button
          data-testid={`flashcard-edit-btn-${index}`}
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(card);
          }}
          title="Edytuj"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          data-testid={`flashcard-delete-btn-${index}`}
          variant="destructive"
          size="icon"
          className="h-8 w-8 shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card);
          }}
          title="Usuń"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Source Badge */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <span className="text-[10px] px-2 py-1 rounded-full bg-secondary/80 text-secondary-foreground backdrop-blur-sm shadow-sm">
          {card.source === "manual" && "Ręczna"}
          {card.source === "ai-full" && "AI"}
          {card.source === "ai-edited" && "AI (Edytowana)"}
        </span>
      </div>
    </div>
  );
}
