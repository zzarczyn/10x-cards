import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

interface GeneratorInputSectionProps {
  text: string;
  onTextChange: (text: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

/**
 * Input section for the Generator Tab
 * Allows users to enter text and trigger AI generation
 *
 * Features:
 * - Character counter with validation feedback
 * - Disabled state during generation
 * - Min/max character validation (1000-10000)
 */
export function GeneratorInputSection({ text, onTextChange, onGenerate, isGenerating }: GeneratorInputSectionProps) {
  const charCount = text.length;
  const minChars = 1000;
  const maxChars = 10000;

  const isTooShort = charCount < minChars;
  const isTooLong = charCount > maxChars;
  const isValid = !isTooShort && !isTooLong;
  const isDisabled = !isValid || isGenerating;

  // Calculate progress percentage for visual feedback
  const progress = Math.min((charCount / minChars) * 100, 100);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="generator-input"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Wklej tekst do wygenerowania fiszek
        </label>

        <Textarea
          id="generator-input"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          disabled={isGenerating}
          placeholder="Wklej tutaj tekst, z którego chcesz wygenerować fiszki (minimum 1000 znaków)..."
          className="min-h-[200px] resize-y"
          aria-invalid={!isValid && charCount > 0}
          aria-describedby="char-counter"
        />

        <div className="flex items-center justify-between gap-4">
          <div id="char-counter" className="text-sm text-muted-foreground">
            <span
              className={
                charCount < minChars
                  ? "text-muted-foreground"
                  : charCount > maxChars
                    ? "text-destructive"
                    : "text-green-600 dark:text-green-500"
              }
            >
              {charCount.toLocaleString("pl-PL")}
            </span>
            {" / "}
            <span>{maxChars.toLocaleString("pl-PL")} znaków</span>
          </div>

          {charCount > 0 && (
            <div className="text-sm">
              {isTooShort && (
                <span className="text-muted-foreground">
                  Jeszcze {(minChars - charCount).toLocaleString("pl-PL")} znaków
                </span>
              )}
              {isTooLong && (
                <span className="text-destructive">
                  Za dużo o {(charCount - maxChars).toLocaleString("pl-PL")} znaków
                </span>
              )}
            </div>
          )}
        </div>

        {/* Progress bar for visual feedback */}
        {charCount > 0 && charCount < minChars && (
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Postęp wypełniania minimalnej liczby znaków"
            />
          </div>
        )}
      </div>

      <Button onClick={onGenerate} disabled={isDisabled} className="w-full sm:w-auto" size="lg">
        {isGenerating ? (
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
            Generowanie...
          </>
        ) : (
          "Generuj fiszki"
        )}
      </Button>
    </div>
  );
}
