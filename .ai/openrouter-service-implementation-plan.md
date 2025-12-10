# Plan Implementacji Serwisu OpenRouter

Ten dokument zawiera szczegółowy plan implementacji serwisu integracji z OpenRouter dla projektu 10xCards. Serwis ten będzie odpowiedzialny za komunikację z modelami LLM w celu generowania treści fiszek w ustrukturyzowanym formacie JSON.

## 1. Opis Usługi

`OpenRouterService` to klasa TypeScript (wrapper) działająca po stronie serwera (Astro endpointy/Server Actions), która abstrahuje komunikację z API OpenRouter.

**Główne cele:**
*   Bezpieczna komunikacja z API (zarządzanie kluczami).
*   Gwarancja zwracania typowanych danych (zgodność z Zod).
*   Obsługa specyficznych nagłówków OpenRouter (Referer, Title).
*   Obsługa trybu `response_format: { type: 'json_schema' }`.
*   Scentralizowana obsługa błędów.

## 2. Opis Konstruktora

Serwis powinien być inicjalizowany z konfiguracją, która pozwala na wstrzyknięcie zmiennych środowiskowych, co ułatwia testowanie i zmianę konfiguracji.

```typescript
constructor(config: OpenRouterConfig)
```

**Interfejs `OpenRouterConfig`:**
*   `apiKey` (string): Klucz API OpenRouter (z `import.meta.env`).
*   `siteUrl` (string): URL aplikacji (dla rankingu OpenRouter).
*   `siteName` (string): Nazwa aplikacji (dla rankingu OpenRouter).
*   `defaultModel` (string, opcjonalnie): Domyślny model (np. `google/gemini-2.0-flash-exp:free`).

## 3. Publiczne Metody i Pola

### `complete<T>(options: CompletionOptions<T>): Promise<T>`

Główna metoda generyczna do wysyłania zapytań.

**Parametry `CompletionOptions<T>`:**
*   `messages`: Tablica obiektów `{ role: 'system' | 'user', content: string }`.
*   `schema`: Schemat Zod (`z.ZodType<T>`) opisujący oczekiwaną strukturę odpowiedzi.
*   `jsonSchema`: Obiekt JSON Schema odpowiadający schematowi Zod (wymagany dla `response_format`).
*   `model` (opcjonalnie): Nadpisanie modelu dla konkretnego zapytania.
*   `temperature` (opcjonalnie): Parametr kreatywności (default: 0.7).

**Zwraca:**
*   `Promise<T>`: Sparsowany i zwalidowany obiekt zgodny z przekazanym schematem Zod.

## 4. Prywatne Metody i Pola

*   `headers`: Getter zwracający nagłówki HTTP (`Authorization`, `HTTP-Referer`, `X-Title`, `Content-Type`).
*   `handleError(error: unknown): never`: Metoda normalizująca błędy (sieciowe, API, parsowania) na wewnętrzne typy błędów aplikacji.
*   `parseResponse(response: Response): Promise<any>`: Metoda wyciągająca JSON z odpowiedzi API, obsługująca ewentualne bloki Markdown (sanityzacja).

## 5. Obsługa Błędów

Serwis powinien definiować i rzucać specyficzne typy błędów, dziedziczące po klasie bazowej `AppError` (lub `Error`).

**Scenariusze błędów:**

1.  **ConfigurationError:** Brak klucza API w zmiennych środowiskowych.
2.  **OpenRouterAPIError:** Błąd zwrócony przez API (status != 200). Zawiera kod statusu i treść błędu od dostawcy.
3.  **RefusalError:** Model odmówił wykonania zadania (safety filters).
4.  **ParsingError:** Odpowiedź modelu nie jest poprawnym JSON-em.
5.  **ValidationError:** Odpowiedź modelu jest JSON-em, ale nie pasuje do schematu Zod (np. brakuje pól).

## 6. Kwestie Bezpieczeństwa

1.  **API Key Leakage:** Serwis musi być używany **tylko po stronie serwera** (w endpointach `.ts` w `src/pages/api` lub w blokach server-side komponentów Astro). Nigdy nie importuj go w komponentach klienckich React (`use client` / `.tsx`).
2.  **Prompt Injection:** Choć trudne do uniknięcia w 100%, użycie `response_format` z `strict: true` znacznie utrudnia modelowi wyjście z roli generatora JSON.
3.  **Input Validation:** Wszystkie dane wejściowe od użytkownika (temat fiszek) muszą być sanityzowane przed wstawieniem do promptu.

## 7. Plan Wdrożenia Krok po Kroku

### Krok 1: Definicja Typów i Błędów
Stwórz plik `src/lib/services/openrouter.types.ts` oraz zaktualizuj `src/lib/errors.ts`.

*   Zdefiniuj interfejsy `Message`, `CompletionRequest`, `CompletionResponse`.
*   Dodaj klasy błędów: `OpenRouterError`, `ModelValidationError`.

### Krok 2: Implementacja Klasy Serwisu
Stwórz plik `src/lib/services/openrouter.service.ts`.

*   Zaimplementuj klasę `OpenRouterService`.
*   Użyj natywnego `fetch` (Astro/Node compatible).
*   Zaimplementuj logikę retry dla błędów 429 (Too Many Requests).

### Krok 3: Implementacja Struktury JSON Schema
W pliku serwisu lub w utilsach, zaimplementuj strukturę wymaganą przez OpenRouter dla `response_format`.

**Wzór implementacji `response_format`:**
```javascript
const payload = {
  model: this.config.defaultModel,
  messages: messages,
  response_format: {
    type: "json_schema",
    json_schema: {
      name: schemaName,
      strict: true,
      schema: jsonSchemaObject // Obiekt zgodny ze standardem JSON Schema
    }
  }
};
```

### Krok 4: Integracja z Generatorem Fiszek
Zmodyfikuj lub stwórz nowy serwis `FlashcardGenerationService` (`src/lib/services/flashcard-generation.service.ts`), który będzie korzystał z `OpenRouterService`.

*   Zdefiniuj schemat Zod dla listy fiszek:
    ```typescript
    const FlashcardSchema = z.object({
      flashcards: z.array(z.object({
        front: z.string(),
        back: z.string()
      }))
    });
    ```
*   Przygotuj odpowiadający mu JSON Schema (ręcznie lub helperem).
*   Wywołaj `openRouterService.complete(...)`.

### Krok 5: Konfiguracja Zmiennych Środowiskowych
Dodaj do pliku `.env`:
```
OPENROUTER_API_KEY=sk-or-v1-...
PUBLIC_APP_URL=http://localhost:4321
PUBLIC_APP_NAME=10xCards
```
Zaktualizuj `src/env.d.ts` jeśli to konieczne.

### Krok 6: Testowanie
Stwórz prosty endpoint testowy (np. `src/pages/api/test-gen.ts`), który wywoła serwis i zwróci wynik na konsolę, aby zweryfikować połączenie i formatowanie.

