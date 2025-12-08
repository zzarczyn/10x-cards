# API Endpoint Implementation Plan: POST /api/flashcards/generate

## 1. Przegląd punktu końcowego

**Cel:** Wygenerowanie propozycji fiszek z tekstu dostarczonego przez użytkownika za pomocą modelu AI (LLM poprzez OpenRouter API).

**Funkcjonalność:**
- Przyjmuje tekst o długości 1000-10000 znaków jako dane wejściowe
- Wywołuje OpenRouter API z promptem do generowania fiszek
- Zwraca efemeryczne (niezapisane) propozycje fiszek
- Tworzy rekord w tabeli `generations` do celów analitycznych
- Nie zapisuje fiszek do bazy danych (użytkownik zdecyduje później które zachować)

**Kluczowe założenia:**
- Endpoint wymaga uwierzytelnienia (każda generacja przypisana do użytkownika)
- Generacja jest operacją kosztowną (5-15s, max 30s timeout)
- Wynik generacji jest efemeryczny - dane przechowywane są tylko w kliencie
- Log generacji służy do kalkulacji wskaźnika akceptacji AI (Acceptance Rate)

---

## 2. Szczegóły żądania

### Metoda HTTP
**POST**

### Struktura URL
```
POST /api/flashcards/generate
```

### Nagłówki żądania
- `Content-Type: application/json` (wymagane)
- `Authorization: Bearer <JWT_TOKEN>` (zarządzane automatycznie przez Supabase Auth via cookies)

### Request Body
```typescript
{
  "text": string  // 1000-10000 znaków
}
```

### Parametry

#### Wymagane:
| Parametr | Typ | Ograniczenia | Opis |
|----------|-----|--------------|------|
| `text` | string | 1000-10000 znaków | Tekst źródłowy do generowania fiszek |

#### Opcjonalne:
Brak

### Przykładowe żądanie
```json
POST /api/flashcards/generate
Content-Type: application/json

{
  "text": "React is a JavaScript library for building user interfaces. It was developed by Facebook and released in 2013. React uses a component-based architecture where UIs are built from reusable pieces called components. Components can be function components or class components. Function components are simpler and are the modern way of writing React code. React uses a virtual DOM to efficiently update the real DOM. When state changes, React compares the virtual DOM with the real DOM and only updates what changed. This process is called reconciliation. React hooks like useState and useEffect allow function components to have state and side effects. JSX is a syntax extension that allows writing HTML-like code in JavaScript. It gets compiled to React.createElement calls. Props are used to pass data from parent to child components. State is used for data that changes over time within a component. React's one-way data flow makes it easier to understand and debug applications. The React ecosystem includes tools like React Router for routing and Redux for state management. React Native allows building mobile apps using React principles."
}
```

---

## 3. Wykorzystywane typy

### DTOs (z `src/types.ts`)

#### Input Command
```typescript
export interface GenerateFlashcardsCommand {
  text: string;
}
```

#### Output Response
```typescript
export interface GenerateFlashcardsResponseDTO {
  generation_id: string;           // UUID rekordu w tabeli generations
  flashcards: GeneratedFlashcardDTO[];
  model_name: string;               // np. "anthropic/claude-3.5-sonnet"
  duration_ms: number;              // Czas generacji w milisekundach
  card_count: number;               // Liczba wygenerowanych fiszek
}
```

#### Generated Flashcard (ephemeral)
```typescript
export type GeneratedFlashcardDTO = Pick<FlashcardEntity, "front" | "back">;

// Rozwinięte:
// {
//   front: string;  // Pytanie/prompt
//   back: string;   // Odpowiedź/wyjaśnienie
// }
```

#### Error Responses
```typescript
export interface ErrorResponseDTO {
  error: string;
  message?: string;
  details?: ValidationErrorDetail[];
  retryable?: boolean;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
}
```

### Schemat walidacji Zod

Utworzyć w pliku endpointa:

```typescript
import { z } from "zod";

const GenerateFlashcardsSchema = z.object({
  text: z.string()
    .min(1000, "Text must be at least 1000 characters")
    .max(10000, "Text cannot exceed 10000 characters")
    .refine(
      (val) => val.trim().length >= 1000,
      "Text must contain at least 1000 non-whitespace characters"
    )
});
```

---

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "generation_id": "550e8400-e29b-41d4-a716-446655440000",
  "flashcards": [
    {
      "front": "What is React?",
      "back": "A JavaScript library for building user interfaces, developed by Facebook"
    },
    {
      "front": "What are the two types of React components?",
      "back": "Function components and class components"
    },
    {
      "front": "What is the virtual DOM in React?",
      "back": "A lightweight copy of the real DOM that React uses to efficiently update the UI by comparing changes"
    }
  ],
  "model_name": "anthropic/claude-3.5-sonnet",
  "duration_ms": 8750,
  "card_count": 3
}
```

**Pola odpowiedzi:**
- `generation_id`: UUID utworzonego rekordu w `generations` (używane przy zapisie fiszek)
- `flashcards`: Tablica propozycji pytanie-odpowiedź (niezapisane w DB)
- `model_name`: Nazwa użytego modelu LLM
- `duration_ms`: Czas trwania generacji w milisekundach
- `card_count`: Liczba wygenerowanych fiszek

### Błędy

#### 400 Bad Request - Walidacja
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "text",
      "message": "Text must be at least 1000 characters"
    }
  ]
}
```

**Przyczyny:**
- Brak pola `text`
- Tekst za krótki (< 1000 znaków)
- Tekst za długi (> 10000 znaków)
- Tekst składa się tylko z whitespace
- Nieprawidłowy JSON

#### 401 Unauthorized - Brak uwierzytelnienia
```json
{
  "error": "Authentication required",
  "message": "Please log in to continue"
}
```

**Przyczyny:**
- Brak sesji użytkownika
- Nieważny/wygasły JWT token

#### 503 Service Unavailable - Błąd usługi AI
```json
{
  "error": "AI service temporarily unavailable",
  "message": "The AI generation service is experiencing issues. Please try again in a moment.",
  "retryable": true
}
```

**Przyczyny:**
- Timeout OpenRouter API (> 30s)
- Błąd zwrócony przez OpenRouter (rate limit, awaria usługi)
- Błąd połączenia sieciowego
- Nieprawidłowy klucz API (należy logować po stronie serwera)

#### 500 Internal Server Error - Błąd serwera
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred. Please try again later."
}
```

**Przyczyny:**
- Błąd zapisu do bazy danych
- Nieoczekiwany błąd parsowania odpowiedzi LLM
- Nieobsłużony wyjątek aplikacji

---

## 5. Przepływ danych

### Diagram przepływu

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ POST /api/flashcards/generate
       │ { text: "..." }
       │
       ▼
┌─────────────────────────────────────────────────────┐
│  Astro Middleware (src/middleware/index.ts)         │
│  - Walidacja sesji Supabase                         │
│  - Dodanie supabase client do context.locals        │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│  API Route (src/pages/api/flashcards/generate.ts)  │
│  1. Sprawdzenie uwierzytelnienia                    │
│  2. Walidacja request body (Zod)                    │
│  3. Wywołanie FlashcardGenerationService            │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│  FlashcardGenerationService                         │
│  (src/lib/services/flashcard-generation.service.ts)│
│                                                      │
│  1. Zapisanie start timestamp                       │
│  2. Przygotowanie promptu dla LLM                   │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│  OpenRouter API Call                                │
│  - Model: anthropic/claude-3.5-sonnet              │
│  - Timeout: 30s                                     │
│  - Zwraca: JSON z fiszkami                         │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│  FlashcardGenerationService (cd.)                   │
│                                                      │
│  4. Parsowanie odpowiedzi LLM                       │
│  5. Walidacja struktury fiszek                      │
│  6. Kalkulacja duration_ms                          │
│  7. Utworzenie rekordu w tabeli generations        │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│  Supabase Database (public.generations)             │
│  INSERT: {                                          │
│    id: gen_random_uuid(),                           │
│    user_id: auth.uid(),                             │
│    duration_ms: 8750,                               │
│    card_count: 3,                                   │
│    model_name: "anthropic/claude-3.5-sonnet",      │
│    created_at: NOW()                                │
│  }                                                  │
│  RETURNS: generation_id                             │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│  API Route - zwrot odpowiedzi                       │
│  Response 200 OK: {                                 │
│    generation_id,                                   │
│    flashcards: [...],                               │
│    model_name,                                      │
│    duration_ms,                                     │
│    card_count                                       │
│  }                                                  │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   Client    │
│  - Przechowuje generation_id                        │
│  - Wyświetla fiszki w trybie recenzji              │
│  - Użytkownik decyduje które zapisać               │
└─────────────┘
```

### Kluczowe interakcje

1. **Middleware Supabase:**
   - Automatyczna walidacja JWT tokena z cookie
   - Dodanie Supabase client do `context.locals.supabase`

2. **Uwierzytelnienie w endpoincie:**
   ```typescript
   const { data: { user }, error } = await context.locals.supabase.auth.getUser();
   if (error || !user) {
     return new Response(JSON.stringify({ error: "Authentication required" }), {
       status: 401,
       headers: { "Content-Type": "application/json" }
     });
   }
   ```

3. **Wywołanie usługi generacji:**
   - Przekazanie tekstu i user_id
   - Oczekiwanie na odpowiedź (async/await z timeout)
   - Obsługa błędów LLM API

4. **Zapis do bazy danych:**
   - INSERT do `generations` z user_id, duration_ms, card_count, model_name
   - RLS automatycznie przypisuje user_id z `auth.uid()`
   - Zwraca generation_id dla późniejszego linkowania fiszek

---

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnienie i autoryzacja

**Mechanizm:** Supabase Authentication (JWT)

**Implementacja:**
1. Middleware waliduje sesję na każdym żądaniu do `/api/*`
2. Endpoint sprawdza obecność użytkownika:
   ```typescript
   const { data: { user }, error } = await context.locals.supabase.auth.getUser();
   ```
3. Brak użytkownika → zwrot 401 Unauthorized

**Row Level Security (RLS):**
- Tabela `generations` ma włączone RLS
- Policy: Użytkownik może tylko INSERT dla siebie (`auth.uid() = user_id`)
- Policy: Użytkownik może tylko SELECT swoich rekordów
- Automatyczna izolacja danych między użytkownikami

### 6.2 Ochrona klucza API OpenRouter

**Środowisko:**
- Klucz API przechowywany w `.env` jako `OPENROUTER_API_KEY`
- Nigdy nie eksponowany do klienta
- Wywołania API tylko po stronie serwera (Astro SSR endpoint)

**Konfiguracja:**
```typescript
// .env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx

// W service
const apiKey = import.meta.env.OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error("OPENROUTER_API_KEY not configured");
}
```

### 6.3 Walidacja i sanityzacja danych wejściowych

**Walidacja długości:**
- Min: 1000 znaków (zapewnia wystarczający kontekst)
- Max: 10000 znaków (zapobiega nadmiernym kosztom LLM)
- Walidacja non-whitespace: `text.trim().length >= 1000`

**Sanityzacja przed promptem:**
- Escape specjalnych znaków w tekście użytkownika przed wysłaniem do LLM
- Zapobieganie prompt injection attacks
- Użycie parametryzowanych promptów zamiast konkatenacji stringów

### 6.4 Rate limiting (rekomendacja)

**Dla MVP:** Nie implementowane
**Dla produkcji:** Rozważyć:
- 10 generacji na godzinę na użytkownika (kontrola kosztów)
- 100 żądań API na minutę na użytkownika (ochrona przed abuse)

**Implementacja w przyszłości:**
- Redis lub Supabase Edge Functions rate limiting
- Zwrot 429 Too Many Requests z nagłówkiem `Retry-After`

### 6.5 Timeout i resource limits

**Timeout LLM API:**
- 30 sekund maksymalnie
- Zapobiega zawieszonym połączeniom
- Graceful degradation (zwrot 503 z retryable: true)

**Memory limits:**
- Walidacja rozmiaru request body (max 10KB dla tekstu)
- Zapobiega DoS przez duże payloady

---

## 7. Obsługa błędów

### 7.1 Hierarchia obsługi błędów

```typescript
// W API route
try {
  // 1. Walidacja uwierzytelnienia
  const { data: { user }, error: authError } = await context.locals.supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({
      error: "Authentication required",
      message: "Please log in to continue"
    }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  // 2. Parsowanie i walidacja body
  const body = await request.json();
  const validationResult = GenerateFlashcardsSchema.safeParse(body);
  
  if (!validationResult.success) {
    return new Response(JSON.stringify({
      error: "Validation failed",
      details: validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
    }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // 3. Wywołanie service
  const result = await flashcardGenerationService.generate(
    validationResult.data.text,
    user.id
  );

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });

} catch (error) {
  // 4. Obsługa błędów service
  if (error instanceof LLMServiceError) {
    return new Response(JSON.stringify({
      error: "AI service temporarily unavailable",
      message: error.message,
      retryable: true
    }), { status: 503, headers: { "Content-Type": "application/json" } });
  }

  // 5. Nieoczekiwane błędy
  console.error("Unexpected error in generate endpoint:", error);
  return new Response(JSON.stringify({
    error: "Internal server error",
    message: "An unexpected error occurred"
  }), { status: 500, headers: { "Content-Type": "application/json" } });
}
```

### 7.2 Scenariusze błędów

| Błąd | Status | Przyczyna | Akcja klienta |
|------|--------|-----------|---------------|
| Missing text | 400 | Brak pola `text` w body | Poprawić request |
| Text too short | 400 | `text.length < 1000` | Dodać więcej tekstu |
| Text too long | 400 | `text.length > 10000` | Skrócić tekst |
| Whitespace only | 400 | `text.trim().length < 1000` | Dodać treści |
| Invalid JSON | 400 | Błąd parsowania body | Poprawić format JSON |
| No auth session | 401 | Brak/wygasły JWT token | Zalogować się |
| LLM timeout | 503 | OpenRouter nie odpowiedział w 30s | Retry po 5s |
| LLM rate limit | 503 | OpenRouter zwrócił 429 | Retry po 60s (Retry-After) |
| LLM API error | 503 | OpenRouter zwrócił 500 | Retry po 10s |
| Invalid API key | 500 | Błędny OPENROUTER_API_KEY | Skontaktować z supportem |
| DB insert failed | 500 | Błąd zapisu do `generations` | Retry lub support |
| Unexpected error | 500 | Nieobsłużony exception | Retry lub support |

### 7.3 Logowanie błędów

**Po stronie serwera:**

```typescript
// Error logging strategy
if (error instanceof LLMServiceError) {
  console.error("[LLM_SERVICE_ERROR]", {
    timestamp: new Date().toISOString(),
    userId: user.id,
    errorType: error.type, // 'timeout' | 'api_error' | 'parse_error'
    message: error.message,
    statusCode: error.statusCode
  });
}

// For unexpected errors
console.error("[UNEXPECTED_ERROR]", {
  timestamp: new Date().toISOString(),
  userId: user.id,
  endpoint: "/api/flashcards/generate",
  error: error.message,
  stack: error.stack
});
```

**Monitoring (przyszłość):**
- Integracja z Sentry/LogRocket dla error tracking
- Agregacja błędów LLM API dla analizy dostępności
- Alerting dla wysokiej częstotliwości 503/500

---

## 8. Rozważania dotyczące wydajności

### 8.1 Wąskie gardła

**1. Czas odpowiedzi LLM API (5-15s)**
- **Problem:** Długi czas oczekiwania użytkownika
- **Mitigacja:** 
  - UI pokazuje loader z postępem ("Generating flashcards...")
  - Komunikat: "This usually takes 5-15 seconds"
  - Możliwość anulowania żądania (future: AbortController)

**2. Koszt wywołań LLM**
- **Problem:** Każda generacja kosztuje (tokeny input/output)
- **Mitigacja:**
  - Walidacja min 1000 znaków zapewnia sensowny kontekst
  - Walidacja max 10000 znaków ogranicza koszty
  - Rate limiting w przyszłości (10 gen/h)

**3. Timeout 30s może być za krótki dla dużych tekstów**
- **Problem:** Generacja > 8000 znaków może przekroczyć 30s
- **Mitigacja:**
  - Dokumentować w UI optymalną długość (2000-5000 znaków)
  - Monitoring czasu generacji dla różnych długości
  - Możliwe dostosowanie timeoutu w przyszłości

### 8.2 Optymalizacje

**1. Prompt engineering**
- Zwięzły, precyzyjny prompt minimalizuje tokeny output
- Strukturyzowany format JSON dla przewidywalnej odpowiedzi
- Przykład w prompcie zwiększa jakość bez nadmiernych tokenów

**2. Database insert optimization**
- Single INSERT dla rekordu `generations` (lekka operacja)
- Brak JOINów w tym endpoincie
- Index nie wymagany (primary key UUID wystarczy)

**3. Response size**
- Średnio 3-10 fiszek na generację
- Każda fiszka: ~50-200 znaków (front + back)
- Całkowita odpowiedź: < 5KB (minimalne obciążenie sieci)

### 8.3 Cache strategy (przyszłość, nie dla MVP)

**Potencjalna optymalizacja:**
- Cache odpowiedzi LLM dla identycznych tekstów
- Key: `hash(text + model_name)`
- TTL: 7 dni
- Storage: Redis
- **Korzyść:** Oszczędność kosztów dla powtarzających się tekstów (np. materiały edukacyjne)

**Nie implementować w MVP:**
- Dodatkowa złożoność
- Mało prawdopodobne powtórzenia tekstów
- Premature optimization

### 8.4 Monitoring wydajności

**Metryki do śledzenia:**
- `generation_duration_ms` (z tabeli `generations`)
- `llm_api_response_time` (czas netto wywołania OpenRouter)
- `endpoint_total_time` (czas całkowity endpoint)
- `success_rate` (% udanych generacji)

**Dashboard (przyszłość):**
- Średni czas generacji
- Percentyl 95 czasu odpowiedzi
- Histogram długości tekstów vs czas generacji
- Rate error types (timeout, API error, validation)

---

## 9. Etapy wdrożenia

### Krok 1: Konfiguracja środowiska i typów

**Cel:** Przygotowanie infrastruktury i definicji typów

**Zadania:**
1. Dodać zmienną środowiskową w `.env`:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-your-key-here
   OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
   ```

2. Zaktualizować `src/env.d.ts` z nowymi zmiennymi:
   ```typescript
   interface ImportMetaEnv {
     readonly SUPABASE_URL: string;
     readonly SUPABASE_KEY: string;
     readonly OPENROUTER_API_KEY: string;
     readonly OPENROUTER_MODEL: string;
   }
   ```

3. Zainstalować zależności:
   ```bash
   npm install zod
   ```

4. Zweryfikować, że typy w `src/types.ts` są już zdefiniowane:
   - `GenerateFlashcardsCommand` ✓
   - `GenerateFlashcardsResponseDTO` ✓
   - `GeneratedFlashcardDTO` ✓
   - `ErrorResponseDTO` ✓

**Walidacja:** `npm run build` przechodzi bez błędów TypeScript

---

### Krok 2: Utworzenie custom error types

**Cel:** Zdefiniowanie specjalizowanych klas błędów dla obsługi errorów

**Lokalizacja:** `src/lib/errors.ts` (nowy plik)

**Implementacja:**
```typescript
// src/lib/errors.ts

/**
 * Błąd usługi LLM (OpenRouter)
 * Używany dla błędów timeout, API errors, parse errors
 */
export class LLMServiceError extends Error {
  constructor(
    message: string,
    public type: 'timeout' | 'api_error' | 'parse_error' | 'network_error',
    public statusCode?: number,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'LLMServiceError';
  }
}

/**
 * Błąd walidacji danych wejściowych
 * Używany dla błędów Zod validation
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public details: { field: string; message: string }[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

**Walidacja:** Import w innych plikach działa poprawnie

---

### Krok 3: Implementacja FlashcardGenerationService

**Cel:** Utworzenie serwisu odpowiedzialnego za generację fiszek przez LLM

**Lokalizacja:** `src/lib/services/flashcard-generation.service.ts` (nowy plik)

**Struktura serwisu:**

```typescript
// src/lib/services/flashcard-generation.service.ts

import { LLMServiceError } from "../errors";
import type { 
  GenerateFlashcardsResponseDTO, 
  GeneratedFlashcardDTO 
} from "../../types";
import type { SupabaseClient } from "../db/supabase.client";

interface LLMFlashcard {
  front: string;
  back: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  model: string;
}

export class FlashcardGenerationService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeout: number = 30000; // 30 seconds

  constructor(
    private supabase: SupabaseClient,
    apiKey: string,
    model: string
  ) {
    if (!apiKey) {
      throw new Error("OpenRouter API key is required");
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Generuje fiszki z tekstu użytkownika
   */
  async generate(
    text: string,
    userId: string
  ): Promise<GenerateFlashcardsResponseDTO> {
    const startTime = Date.now();

    // 1. Wywołanie LLM API
    const flashcards = await this.callLLMAPI(text);

    // 2. Kalkulacja metryk
    const durationMs = Date.now() - startTime;
    const cardCount = flashcards.length;

    // 3. Zapis do tabeli generations
    const generationId = await this.logGeneration(
      userId,
      durationMs,
      cardCount,
      this.model
    );

    // 4. Zwrot odpowiedzi
    return {
      generation_id: generationId,
      flashcards,
      model_name: this.model,
      duration_ms: durationMs,
      card_count: cardCount
    };
  }

  /**
   * Wywołuje OpenRouter API z timeout
   */
  private async callLLMAPI(text: string): Promise<GeneratedFlashcardDTO[]> {
    const prompt = this.buildPrompt(text);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://10xcards.app", // Opcjonalne
          "X-Title": "10xCards"
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new LLMServiceError(
          `OpenRouter API error: ${response.status} ${response.statusText}`,
          'api_error',
          response.status,
          response.status === 429 || response.status >= 500
        );
      }

      const data: OpenRouterResponse = await response.json();
      
      return this.parseFlashcards(data);

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new LLMServiceError(
          "AI generation timed out after 30 seconds",
          'timeout',
          undefined,
          true
        );
      }

      if (error instanceof LLMServiceError) {
        throw error;
      }

      throw new LLMServiceError(
        `Network error: ${error.message}`,
        'network_error',
        undefined,
        true
      );
    }
  }

  /**
   * Buduje prompt dla LLM
   */
  private buildPrompt(text: string): string {
    return `You are an expert educational assistant that creates high-quality flashcards for learning.

Your task is to analyze the following text and generate flashcards (question-answer pairs) that help learners understand and memorize the key concepts.

Guidelines:
- Create 3-10 flashcards depending on content richness
- Questions should be clear and specific
- Answers should be concise but complete (1-3 sentences)
- Cover the most important concepts, facts, and relationships
- Use simple language appropriate for learners

Text to analyze:
"""
${text}
"""

Respond ONLY with a valid JSON array of flashcards in this exact format:
[
  {
    "front": "Question or prompt",
    "back": "Answer or explanation"
  }
]

JSON response:`;
  }

  /**
   * Parsuje odpowiedź LLM do tablicy fiszek
   */
  private parseFlashcards(response: OpenRouterResponse): GeneratedFlashcardDTO[] {
    try {
      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error("Empty response from LLM");
      }

      // Ekstrakcja JSON z odpowiedzi (może być otoczony tekstem)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in LLM response");
      }

      const flashcards: LLMFlashcard[] = JSON.parse(jsonMatch[0]);

      // Walidacja struktury
      if (!Array.isArray(flashcards) || flashcards.length === 0) {
        throw new Error("Invalid flashcards array");
      }

      // Walidacja każdej fiszki
      const validatedFlashcards = flashcards.map((card, index) => {
        if (!card.front || !card.back) {
          throw new Error(`Flashcard ${index} missing front or back`);
        }

        if (typeof card.front !== 'string' || typeof card.back !== 'string') {
          throw new Error(`Flashcard ${index} has invalid types`);
        }

        // Trim i walidacja długości
        const front = card.front.trim();
        const back = card.back.trim();

        if (front.length === 0 || back.length === 0) {
          throw new Error(`Flashcard ${index} has empty content`);
        }

        if (front.length > 200) {
          console.warn(`Flashcard ${index} front truncated (> 200 chars)`);
        }

        if (back.length > 500) {
          console.warn(`Flashcard ${index} back truncated (> 500 chars)`);
        }

        return {
          front: front.slice(0, 200),
          back: back.slice(0, 500)
        };
      });

      return validatedFlashcards;

    } catch (error) {
      throw new LLMServiceError(
        `Failed to parse LLM response: ${error.message}`,
        'parse_error',
        undefined,
        false // Parse errors are not retryable
      );
    }
  }

  /**
   * Zapisuje log generacji do bazy danych
   */
  private async logGeneration(
    userId: string,
    durationMs: number,
    cardCount: number,
    modelName: string
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from("generations")
      .insert({
        user_id: userId,
        duration_ms: durationMs,
        card_count: cardCount,
        model_name: modelName
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Failed to log generation:", error);
      throw new Error("Failed to save generation log");
    }

    return data.id;
  }
}
```

**Walidacja:** 
- TypeScript kompiluje bez błędów
- Service używa typów z `src/types.ts`
- Wszystkie metody mają odpowiednią obsługę błędów

---

### Krok 4: Aktualizacja middleware (authentication check)

**Cel:** Upewnić się, że middleware sprawdza uwierzytelnienie dla endpointów `/api/*`

**Lokalizacja:** `src/middleware/index.ts`

**Obecna implementacja:**
Middleware obecnie tylko dodaje Supabase client do context. Trzeba dodać walidację sesji.

**Zaktualizowana implementacja:**

```typescript
import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client.ts";

export const onRequest = defineMiddleware(async (context, next) => {
  // Dodaj Supabase client do context
  context.locals.supabase = supabaseClient;

  // Dla endpointów API, sprawdź uwierzytelnienie
  if (context.url.pathname.startsWith('/api/')) {
    const { data: { user }, error } = await context.locals.supabase.auth.getUser();
    
    if (error || !user) {
      return new Response(
        JSON.stringify({
          error: "Authentication required",
          message: "Please log in to continue"
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Dodaj user do context dla łatwego dostępu w endpointach
    context.locals.user = user;
  }

  return next();
});
```

**Zaktualizować typ `App.Locals`** w `src/env.d.ts`:

```typescript
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  readonly OPENROUTER_MODEL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    supabase: import('./db/supabase.client').SupabaseClient;
    user?: import('@supabase/supabase-js').User;
  }
}
```

**Walidacja:**
- Middleware blokuje nieuwierzytelnione żądania do `/api/*`
- `context.locals.user` dostępny w endpointach

---

### Krok 5: Implementacja API endpoint

**Cel:** Utworzenie endpointa `/api/flashcards/generate`

**Lokalizacja:** `src/pages/api/flashcards/generate.ts` (nowy plik)

**Implementacja:**

```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import { FlashcardGenerationService } from "../../../lib/services/flashcard-generation.service";
import { LLMServiceError } from "../../../lib/errors";
import type { 
  GenerateFlashcardsCommand,
  GenerateFlashcardsResponseDTO,
  ErrorResponseDTO 
} from "../../../types";

// Wyłącz pre-rendering dla API route
export const prerender = false;

// Schemat walidacji Zod
const GenerateFlashcardsSchema = z.object({
  text: z.string()
    .min(1000, "Text must be at least 1000 characters")
    .max(10000, "Text cannot exceed 10000 characters")
    .refine(
      (val) => val.trim().length >= 1000,
      "Text must contain at least 1000 non-whitespace characters"
    )
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Uwierzytelnienie (sprawdzone przez middleware, ale double-check)
    const user = locals.user;
    if (!user) {
      const errorResponse: ErrorResponseDTO = {
        error: "Authentication required",
        message: "Please log in to continue"
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Parsowanie request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      const errorResponse: ErrorResponseDTO = {
        error: "Invalid JSON",
        message: "Request body must be valid JSON"
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3. Walidacja Zod
    const validationResult = GenerateFlashcardsSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errorResponse: ErrorResponseDTO = {
        error: "Validation failed",
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const command: GenerateFlashcardsCommand = validationResult.data;

    // 4. Inicjalizacja service
    const apiKey = import.meta.env.OPENROUTER_API_KEY;
    const model = import.meta.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";

    if (!apiKey) {
      console.error("OPENROUTER_API_KEY not configured");
      const errorResponse: ErrorResponseDTO = {
        error: "Service configuration error",
        message: "AI generation service is not properly configured"
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const service = new FlashcardGenerationService(
      locals.supabase,
      apiKey,
      model
    );

    // 5. Wywołanie generacji
    const result: GenerateFlashcardsResponseDTO = await service.generate(
      command.text,
      user.id
    );

    // 6. Zwrot sukcesu
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    // 7. Obsługa błędów service
    if (error instanceof LLMServiceError) {
      console.error("[LLM_SERVICE_ERROR]", {
        timestamp: new Date().toISOString(),
        userId: locals.user?.id,
        type: error.type,
        message: error.message,
        statusCode: error.statusCode
      });

      const errorResponse: ErrorResponseDTO = {
        error: "AI service temporarily unavailable",
        message: error.message,
        retryable: error.retryable
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 503,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 8. Nieoczekiwane błędy
    console.error("[UNEXPECTED_ERROR]", {
      timestamp: new Date().toISOString(),
      userId: locals.user?.id,
      endpoint: "/api/flashcards/generate",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    const errorResponse: ErrorResponseDTO = {
      error: "Internal server error",
      message: "An unexpected error occurred. Please try again later."
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
```

**Walidacja:**
- Endpoint zwraca 405 dla metod innych niż POST
- TypeScript kompiluje bez błędów
- Wszystkie ścieżki kodu zwracają Response

---

### Krok 6: Eksport typu SupabaseClient

**Cel:** Zapewnić, że `SupabaseClient` jest eksportowany dla użycia w service

**Lokalizacja:** `src/db/supabase.client.ts`

**Zaktualizowana implementacja:**

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Eksport typu dla użycia w innych plikach
export type SupabaseClient = typeof supabaseClient;
```

**Walidacja:**
- Import `import type { SupabaseClient }` działa w service

---

### Krok 7: Testowanie manualne

**Cel:** Zweryfikować działanie endpointa w różnych scenariuszach

**Przygotowanie:**
1. Uruchomić Supabase lokalnie: `npx supabase start`
2. Uruchomić dev server: `npm run dev`
3. Zalogować się jako użytkownik testowy

**Test 1: Udana generacja**
```bash
curl -X POST http://localhost:4321/api/flashcards/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "React is a JavaScript library for building user interfaces. It was developed by Facebook and released in 2013. React uses a component-based architecture where UIs are built from reusable pieces called components. Components can be function components or class components. Function components are simpler and are the modern way of writing React code. React uses a virtual DOM to efficiently update the real DOM. When state changes, React compares the virtual DOM with the real DOM and only updates what changed. This process is called reconciliation. React hooks like useState and useEffect allow function components to have state and side effects. JSX is a syntax extension that allows writing HTML-like code in JavaScript. It gets compiled to React.createElement calls. Props are used to pass data from parent to child components. State is used for data that changes over time within a component."
  }'
```

**Oczekiwany wynik:**
- Status: 200 OK
- Body zawiera: `generation_id`, `flashcards` (array), `model_name`, `duration_ms`, `card_count`
- Rekord w tabeli `generations` utworzony

**Test 2: Tekst za krótki**
```bash
curl -X POST http://localhost:4321/api/flashcards/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Too short"}'
```

**Oczekiwany wynik:**
- Status: 400 Bad Request
- Body zawiera: `error: "Validation failed"`, `details` z field "text"

**Test 3: Brak uwierzytelnienia**
```bash
curl -X POST http://localhost:4321/api/flashcards/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "..."}'
  # (bez cookies sesyjnych)
```

**Oczekiwany wynik:**
- Status: 401 Unauthorized
- Body zawiera: `error: "Authentication required"`

**Test 4: Nieprawidłowy JSON**
```bash
curl -X POST http://localhost:4321/api/flashcards/generate \
  -H "Content-Type: application/json" \
  -d 'invalid json'
```

**Oczekiwany wynik:**
- Status: 400 Bad Request
- Body zawiera: `error: "Invalid JSON"`

---

### Krok 8: Weryfikacja bazy danych

**Cel:** Upewnić się, że rekordy w `generations` są prawidłowo zapisywane

**Zapytania SQL do weryfikacji:**

```sql
-- Sprawdź najnowszą generację
SELECT * FROM public.generations
ORDER BY created_at DESC
LIMIT 1;

-- Weryfikacja pól
-- id: UUID (nie NULL)
-- user_id: UUID (z auth.users)
-- duration_ms: INTEGER (> 0)
-- card_count: INTEGER (> 0)
-- model_name: VARCHAR (np. "anthropic/claude-3.5-sonnet")
-- created_at: TIMESTAMPTZ (NOW())

-- Sprawdź czy user_id odpowiada zalogowanemu użytkownikowi
SELECT g.*, u.email
FROM public.generations g
JOIN auth.users u ON u.id = g.user_id
ORDER BY g.created_at DESC
LIMIT 5;
```

**Oczekiwany wynik:**
- Każde wywołanie endpointa tworzy dokładnie 1 rekord w `generations`
- `user_id` odpowiada zalogowanemu użytkownikowi
- `duration_ms` jest realistyczny (5000-30000 ms)
- `card_count` odpowiada liczbie zwróconych fiszek
- `model_name` jest prawidłowy

---

### Krok 9: Obsługa błędów linting (opcjonalne)

**Cel:** Naprawić ewentualne błędy ESLint/TypeScript

**Sprawdzenie:**
```bash
npm run build
npx eslint src/pages/api/flashcards/generate.ts
npx eslint src/lib/services/flashcard-generation.service.ts
```

**Typowe problemy:**
- Brakujące typy dla error objects
- Unused variables
- Missing return types

**Naprawa:**
- Dodać `@ts-expect-error` dla known issues
- Zaktualizować eslint config jeśli potrzeba
- Refaktoryzować kod dla zgodności z linterem

---

### Krok 10: Dokumentacja i code review

**Cel:** Przygotować kod do review i merge

**Checklist:**
- [ ] Wszystkie funkcje mają JSDoc comments
- [ ] Error handling jest kompleksowy
- [ ] Typy TypeScript są prawidłowe
- [ ] Kod jest zgodny z coding guidelines z `.cursor/rules/`
- [ ] Tests manualne przeszły pomyślnie
- [ ] Baza danych jest w prawidłowym stanie
- [ ] Environment variables są udokumentowane w README
- [ ] Nie ma wrażliwych danych w kodzie (API keys, secrets)

**Git commit:**
```bash
git add src/pages/api/flashcards/generate.ts
git add src/lib/services/flashcard-generation.service.ts
git add src/lib/errors.ts
git add src/middleware/index.ts
git add src/env.d.ts
git add src/db/supabase.client.ts

git commit -m "feat: implement POST /api/flashcards/generate endpoint

- Add FlashcardGenerationService for LLM integration
- Implement OpenRouter API calls with timeout handling
- Add comprehensive error handling (400, 401, 503, 500)
- Create generation logs in database for analytics
- Add Zod validation for input text (1000-10000 chars)
- Update middleware for authentication checking
- Add custom error types (LLMServiceError, ValidationError)

Refs: #ISSUE_NUMBER"
```

---

## 10. Notatki implementacyjne

### 10.1 Kluczowe decyzje architektoniczne

1. **Service Layer Pattern:**
   - Logika biznesowa wydzielona do `FlashcardGenerationService`
   - Endpoint jest cienką warstwą (validation + orchestration)
   - Łatwe testowanie service w izolacji

2. **Error Hierarchy:**
   - Custom error types (`LLMServiceError`) dla specyficznych przypadków
   - Graceful degradation (503 z retryable: true)
   - Logging na poziomie aplikacji (nie w bazie)

3. **Timeout Handling:**
   - AbortController dla kontroli timeoutu
   - 30s jako maksymalny czas oczekiwania
   - Możliwość dostosowania w przyszłości

4. **Prompt Engineering:**
   - Strukturalizowany prompt z jasnyymi guidelines
   - JSON-only output dla przewidywalności
   - Możliwość iteracji bez zmian w kodzie

### 10.2 Znane ograniczenia MVP

1. **Brak rate limiting:**
   - Użytkownik może wykonać nieograniczoną liczbę generacji
   - Może prowadzić do wysokich kosztów LLM
   - Do rozważenia w przyszłości

2. **Brak cache:**
   - Każde wywołanie to nowe zapytanie do LLM
   - Potencjalna optymalizacja dla przyszłości

3. **Statyczny model:**
   - Model LLM zdefiniowany w .env
   - Brak możliwości wyboru przez użytkownika (świadomy design)

4. **Brak progressu:**
   - Endpoint nie wysyła streaming updates
   - Użytkownik czeka 5-15s bez feedback (oprócz loadera)

### 10.3 Przyszłe ulepszenia (poza MVP)

1. **Streaming responses:**
   - Server-Sent Events dla real-time progress
   - Pokazywanie fiszek w miarę generowania

2. **Retry logic:**
   - Automatyczny retry dla transient errors
   - Exponential backoff

3. **A/B testing modeli:**
   - Porównanie różnych modeli LLM
   - Tracking quality per model

4. **Advanced prompt engineering:**
   - Personalizacja stylu fiszek (beginner vs advanced)
   - Wybór liczby fiszek przez użytkownika
   - Multi-language support

5. **Monitoring i alerting:**
   - Integracja z Sentry
   - Dashboard z metrykami LLM
   - Alerting dla wysokiego error rate

---

**Plan przygotowany:** 2025-12-07  
**Status:** Gotowy do implementacji  
**Estimated effort:** ~4-6 godzin (dla doświadczonego developera)

