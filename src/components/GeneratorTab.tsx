import type { GeneratorState } from "../types";
import { GeneratorInputSection } from "./GeneratorInputSection";
import { ReviewSection } from "./ReviewSection";

interface GeneratorTabProps {
  state: GeneratorState;
  actions: {
    setInputText: (text: string) => void;
    generateFlashcards: () => Promise<void>;
    updateCard: (id: string, field: "front" | "back", value: string) => void;
    saveCard: (id: string) => Promise<void>;
    discardCard: (id: string) => void;
    addManualCard: () => void;
    saveAll: () => Promise<void>;
    discardAll: () => void;
    clearError: () => void;
  };
}

/**
 * Generator Tab - Main layout component for AI flashcard generation
 *
 * Combines:
 * - GeneratorInputSection (text input and generate button)
 * - ReviewSection (list of generated/manual flashcards)
 *
 * This is a presentational component - all state is managed by parent
 */
export function GeneratorTab({ state, actions }: GeneratorTabProps) {
  return (
    <div className="space-y-8">
      {/* Global error message */}
      {state.error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-5 text-destructive shrink-0 mt-0.5"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">{state.error}</p>
          </div>
          <button
            onClick={actions.clearError}
            className="text-destructive hover:text-destructive/80 transition-colors"
            aria-label="Zamknij komunikat o błędzie"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-5"
              aria-hidden="true"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      )}

      {/* Input section */}
      <GeneratorInputSection
        text={state.inputText}
        onTextChange={actions.setInputText}
        onGenerate={actions.generateFlashcards}
        isGenerating={state.isGenerating}
      />

      {/* Review section (only shown when flashcards exist) */}
      {state.flashcards.length > 0 && (
        <ReviewSection
          flashcards={state.flashcards}
          onUpdateCard={actions.updateCard}
          onSaveCard={actions.saveCard}
          onDiscardCard={actions.discardCard}
          onSaveAll={actions.saveAll}
          onDiscardAll={actions.discardAll}
          onAddManual={actions.addManualCard}
        />
      )}
    </div>
  );
}
