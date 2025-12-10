# API Endpoint Implementation Plan: GET /api/flashcards

## 1. Przegląd punktu końcowego

### Cel
Endpoint służy do pobierania paginowanej listy fiszek należących do zalogowanego użytkownika. Jest to główny endpoint umożliwiający przeglądanie wszystkich zapisanych fiszek w aplikacji 10xCards.

### Kluczowe charakterystyki
- **Metoda HTTP**: GET
- **Ścieżka**: `/api/flashcards`
- **Uwierzytelnienie**: Wymagane (sprawdzane przez middleware Astro)
- **Paginacja**: Offset-based (limit + offset)
- **Sortowanie**: `created_at DESC` (najnowsze fiszki na początku)
- **Performance**: Wykorzystuje dedykowany indeks `idx_flashcards_user_created`

### Zgodność z User Stories
- **US-001**: Zapewnia izolację danych użytkownika (RLS + user_id filter)
- **US-003**: Umożliwia przeglądanie zapisanych fiszek (Review Section)

---

## 2. Szczegóły żądania

### HTTP Method
```
GET /api/flashcards
```

### Query Parameters

| Parametr | Typ | Wymagany | Domyślnie | Walidacja | Opis |
|----------|-----|----------|-----------|-----------|------|
| `limit` | integer | Nie | 20 | min: 1, max: 100 | Liczba fiszek na stronę |
| `offset` | integer | Nie | 0 | min: 0 | Liczba pominiętych fiszek |

### Przykładowe żądania

**Podstawowe (domyślna paginacja):**
```
GET /api/flashcards
```
Równoważne: `GET /api/flashcards?limit=20&offset=0`

**Druga strona (20 elementów na stronę):**
```
GET /api/flashcards?limit=20&offset=20
```

**Maksymalny rozmiar strony:**
```
GET /api/flashcards?limit=100&offset=0
```

### Headers
```
Cookie: sb-<project>-auth-token=<JWT_TOKEN>
```
(Zarządzane automatycznie przez Supabase client z `locals.supabase`)

---

## 3. Wykorzystywane typy

### Typy już zdefiniowane w `src/types.ts`

#### `FlashcardsListResponseDTO`
```typescript
export interface FlashcardsListResponseDTO {
  flashcards: FlashcardDTO[];
  pagination: PaginationDTO;
}
```

#### `FlashcardDTO`
```typescript
export type FlashcardDTO = FlashcardEntity;

// FlashcardEntity zawiera:
// - id: string (UUID)
// - user_id: string (UUID)
// - front: string (1-200 chars)
// - back: string (1-500 chars)
// - source: "manual" | "ai-full" | "ai-edited"
// - generation_id: string | null (UUID)
// - created_at: string (ISO 8601 timestamp)
// - updated_at: string (ISO 8601 timestamp)
```

#### `PaginationDTO`
```typescript
export interface PaginationDTO {
  total: number;        // Całkowita liczba fiszek użytkownika
  limit: number;        // Użyty limit (z query lub domyślny)
  offset: number;       // Użyty offset (z query lub domyślny)
  has_more: boolean;    // Czy są kolejne strony (offset + limit < total)
}
```

#### `ErrorResponseDTO`
```typescript
export interface ErrorResponseDTO {
  error: string;                      // Krótki tytuł błędu
  message?: string;                   // Szczegółowy opis
  details?: ValidationErrorDetail[];  // Błędy walidacji pól
  retryable?: boolean;                // Czy można retry (dla 500)
}
```

### Schemat walidacji Zod (do stworzenia)

```typescript
const GetFlashcardsQuerySchema = z.object({
  limit: z.coerce
    .number({ invalid_type_error: "Limit must be a number" })
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit must be between 1 and 100")
    .default(20),
  offset: z.coerce
    .number({ invalid_type_error: "Offset must be a number" })
    .int("Offset must be an integer")
    .min(0, "Offset must be a non-negative integer")
    .default(0),
});
```

**Uwagi:**
- `.coerce.number()` automatycznie konwertuje string z URL query params na number
- `.default()` stosuje wartość domyślną gdy parametr nie jest podany
- Zod zwróci błąd jeśli wartość nie jest konwertowalna na liczbę

---

## 4. Szczegóły odpowiedzi

### Sukces: 200 OK

**Content-Type**: `application/json`

**Body**:
```json
{
  "flashcards": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "user_id": "987fcdeb-51a2-43f8-9c3d-1234567890ab",
      "front": "What is the capital of France?",
      "back": "Paris",
      "source": "manual",
      "generation_id": null,
      "created_at": "2025-12-10T10:30:00.000Z",
      "updated_at": "2025-12-10T10:30:00.000Z"
    },
    {
      "id": "234e5678-e89b-12d3-a456-426614174001",
      "user_id": "987fcdeb-51a2-43f8-9c3d-1234567890ab",
      "front": "What is React?",
      "back": "A JavaScript library for building user interfaces",
      "source": "ai-full",
      "generation_id": "456e7890-e89b-12d3-a456-426614174002",
      "created_at": "2025-12-10T09:15:00.000Z",
      "updated_at": "2025-12-10T09:15:00.000Z"
    }
  ],
  "pagination": {
    "total": 47,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

**Przypadek pustej listy** (użytkownik nie ma fiszek):
```json
{
  "flashcards": [],
  "pagination": {
    "total": 0,
    "limit": 20,
    "offset": 0,
    "has_more": false
  }
}
```

### Błąd: 400 Bad Request

**Scenariusz 1**: Nieprawidłowy limit
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "limit",
      "message": "Limit must be between 1 and 100"
    }
  ]
}
```

**Scenariusz 2**: Nieprawidłowy offset
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "offset",
      "message": "Offset must be a non-negative integer"
    }
  ]
}
```

**Scenariusz 3**: Nieprawidłowy format (nie-numeryczne wartości)
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "limit",
      "message": "Limit must be a number"
    }
  ]
}
```

### Błąd: 401 Unauthorized

```json
{
  "error": "Authentication required",
  "message": "Please log in to continue"
}
```

### Błąd: 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred. Please try again later.",
  "retryable": true
}
```

---

## 5. Przepływ danych

### Architektura warstw
```
Client Request
    ↓
Astro Middleware (authentication check)
    ↓
GET Handler (src/pages/api/flashcards/index.ts)
    ├─→ Validate query params (Zod)
    ├─→ Extract user ID from locals.user
    └─→ Call FlashcardService.getFlashcards()
            ↓
        FlashcardService (src/lib/services/flashcard.service.ts)
            ├─→ Query flashcards (SELECT with pagination)
            ├─→ Query total count (SELECT COUNT)
            └─→ Return { flashcards, total }
                    ↓
                Supabase Client (with RLS)
                    ↓
                PostgreSQL Database
                    └─→ idx_flashcards_user_created index
    ↓
Construct FlashcardsListResponseDTO
    ↓
Return 200 OK with JSON
```

### Szczegółowy przepływ danych

#### 1. **Walidacja uwierzytelnienia**
```typescript
const user = locals.user;
if (!user) {
  return 401 Unauthorized
}
```
- Middleware Astro powinien już to sprawdzić
- Double-check dla pewności (defense in depth)

#### 2. **Parsowanie i walidacja query params**
```typescript
const url = new URL(request.url);
const params = {
  limit: url.searchParams.get('limit'),
  offset: url.searchParams.get('offset')
};

const validationResult = GetFlashcardsQuerySchema.safeParse(params);
if (!validationResult.success) {
  return 400 Bad Request with details
}
```

#### 3. **Wywołanie serwisu**
```typescript
const flashcardService = new FlashcardService(locals.supabase);
const result = await flashcardService.getFlashcards(
  user.id,
  validationResult.data.limit,
  validationResult.data.offset
);
```

#### 4. **Query bazy danych** (w serwisie)

**Query 1: Pobieranie fiszek**
```sql
SELECT 
  id, user_id, front, back, source, generation_id, created_at, updated_at
FROM flashcards
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```
- RLS automatycznie doda dodatkowy WHERE user_id = auth.uid()
- Index `idx_flashcards_user_created` przyspieszy query

**Query 2: Liczenie total**
```sql
SELECT COUNT(*) as total
FROM flashcards
WHERE user_id = $1;
```
- Można zoptymalizować wykonując oba queries równolegle (Promise.all)

#### 5. **Konstrukcja odpowiedzi**
```typescript
const response: FlashcardsListResponseDTO = {
  flashcards: result.flashcards,
  pagination: {
    total: result.total,
    limit: validationResult.data.limit,
    offset: validationResult.data.offset,
    has_more: (validationResult.data.offset + validationResult.data.limit) < result.total
  }
};

return new Response(JSON.stringify(response), {
  status: 200,
  headers: { "Content-Type": "application/json" }
});
```

---

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnienie i Autoryzacja

#### Sprawdzenie sesji
```typescript
const user = locals.user;
if (!user) {
  return 401 Unauthorized
}
```
- Middleware Astro (`src/middleware/index.ts`) powinien już ustawić `locals.user`
- Endpoint wykonuje double-check jako dodatkowa warstwa ochrony

#### Row Level Security (RLS)
- Supabase RLS policies zapewniają, że użytkownik widzi tylko swoje fiszki
- Nawet jeśli zostanie przekazany błędny `user_id`, RLS zablokuje dostęp
- **Policy (już istnieje w migrations):**
  ```sql
  CREATE POLICY "Users can read own flashcards"
    ON flashcards FOR SELECT
    USING (auth.uid() = user_id);
  ```

### 6.2 Walidacja danych wejściowych

#### Query Parameters Injection Prevention
- Używanie Zod zapewnia type-safe parsing
- Supabase client używa prepared statements (parametryzowane queries)
- **Zagrożenie**: SQL injection - **Mitygacja**: Supabase automatycznie escapuje parametry

#### Limit DOS Attack
```typescript
.max(100, "Limit must be between 1 and 100")
```
- Maksymalny limit 100 zapobiega pobieraniu nadmiernej ilości danych
- Chroni przed przeciążeniem serwera i bazy danych

### 6.3 Bezpieczeństwo danych użytkownika

#### User ID Isolation
```typescript
await flashcardService.getFlashcards(user.id, limit, offset);
```
- `user.id` zawsze pobierane z sesji (nie z request params)
- Użytkownik nie może podać arbitrary user_id

#### No Enumeration of Other Users' Data
- Endpoint zwraca 200 OK z pustą listą, nie 404
- Uniemożliwia sprawdzenie czy inny użytkownik ma fiszki

### 6.4 HTTPS/TLS
- Wymagane w produkcji (DigitalOcean App Platform)
- JWT tokens w cookies są bezpiecznie przesyłane

---

## 7. Obsługa błędów

### 7.1 Tabela błędów

| Kod | Scenariusz | Error Title | Message | Logowanie |
|-----|------------|-------------|---------|-----------|
| 400 | `limit < 1` | "Validation failed" | "Limit must be at least 1" | Console warning |
| 400 | `limit > 100` | "Validation failed" | "Limit must be between 1 and 100" | Console warning |
| 400 | `offset < 0` | "Validation failed" | "Offset must be a non-negative integer" | Console warning |
| 400 | Nieprawidłowy format (string zamiast number) | "Validation failed" | "Limit must be a number" | Console warning |
| 401 | Brak `locals.user` | "Authentication required" | "Please log in to continue" | Console warning (z IP) |
| 500 | Błąd Supabase query | "Internal server error" | "An unexpected error occurred. Please try again later." | **Console error** (full stack trace) |
| 500 | Nieoczekiwany wyjątek | "Internal server error" | "An unexpected error occurred. Please try again later." | **Console error** (full stack trace) |

### 7.2 Struktura Error Handling w kodzie

```typescript
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Auth check
    const user = locals.user;
    if (!user) {
      // Log attempt without user
      console.warn("[AUTH_MISSING]", {
        timestamp: new Date().toISOString(),
        endpoint: "/api/flashcards",
        ip: request.headers.get("x-forwarded-for") || "unknown"
      });
      
      return new Response(JSON.stringify({
        error: "Authentication required",
        message: "Please log in to continue"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Validate query params
    const url = new URL(request.url);
    const validationResult = GetFlashcardsQuerySchema.safeParse({
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset')
    });

    if (!validationResult.success) {
      console.warn("[VALIDATION_ERROR]", {
        timestamp: new Date().toISOString(),
        userId: user.id,
        errors: validationResult.error.errors
      });

      return new Response(JSON.stringify({
        error: "Validation failed",
        details: validationResult.error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message
        }))
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3. Call service
    const service = new FlashcardService(locals.supabase);
    const result = await service.getFlashcards(
      user.id,
      validationResult.data.limit,
      validationResult.data.offset
    );

    // 4. Success response
    const response: FlashcardsListResponseDTO = {
      flashcards: result.flashcards,
      pagination: {
        total: result.total,
        limit: validationResult.data.limit,
        offset: validationResult.data.offset,
        has_more: (validationResult.data.offset + validationResult.data.limit) < result.total
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    // 5. Unexpected errors
    console.error("[UNEXPECTED_ERROR]", {
      timestamp: new Date().toISOString(),
      userId: locals.user?.id,
      endpoint: "/api/flashcards",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return new Response(JSON.stringify({
      error: "Internal server error",
      message: "An unexpected error occurred. Please try again later.",
      retryable: true
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
```

### 7.3 Error Logging Format

**Development:**
```typescript
console.error("[UNEXPECTED_ERROR]", {
  timestamp: "2025-12-10T10:30:00.000Z",
  userId: "987fcdeb-51a2-43f8-9c3d-1234567890ab",
  endpoint: "/api/flashcards",
  error: "Connection timeout",
  stack: "Error: Connection timeout\n    at ..."
});
```

**Production** (future: structured logging do external service):
- Można podłączyć Sentry, LogRocket, lub CloudWatch
- Format JSON dla łatwego parsowania

---

## 8. Rozważania dotyczące wydajności

### 8.1 Optymalizacje bazy danych

#### Istniejące indeksy
```sql
CREATE INDEX idx_flashcards_user_created 
  ON flashcards(user_id, created_at DESC);
```
- **Composite index** idealny dla tego query
- Pokrywa WHERE user_id = $1 ORDER BY created_at DESC
- PostgreSQL użyje Index Scan zamiast Sequential Scan

#### Query Explain Plan (przykładowy)
```
Index Scan using idx_flashcards_user_created on flashcards
  Filter: (user_id = '987fcdeb-...')
  Rows: 20  Width: 150
  Cost: 0.42..8.45
```

### 8.2 Równoległe wykonanie queries

**Optymalizacja w serwisie:**
```typescript
async getFlashcards(userId: string, limit: number, offset: number) {
  // Execute both queries in parallel
  const [flashcardsResult, countResult] = await Promise.all([
    this.supabase
      .from("flashcards")
      .select()
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1),
    
    this.supabase
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
  ]);

  // Handle errors...
  return {
    flashcards: flashcardsResult.data,
    total: countResult.count
  };
}
```
- `Promise.all` wykonuje oba queries równocześnie
- Redukuje latency o ~50% (1 round-trip zamiast 2)

### 8.3 Limity paginacji

#### Default: 20 items
- Balans między UX a performance
- Typowy rozmiar strony dla aplikacji typu flashcards

#### Max: 100 items
- Zapobiega nadmiernemu obciążeniu
- Dla większych zbiorów: kolejne requesty

#### Offset pagination limitations
- Dla bardzo dużych offsetów (np. offset=10000) performance spada
- **Rozwiązanie przyszłe**: Cursor-based pagination (używając created_at + id)
- **MVP**: Offset wystarczy (realnie użytkownicy mają < 1000 fiszek)

### 8.4 Caching (opcjonalne dla MVP)

**Future optimization:**
```typescript
// Redis cache dla user's total count
const cacheKey = `user:${userId}:flashcards:count`;
let total = await redis.get(cacheKey);

if (total === null) {
  total = await this.countFlashcards(userId);
  await redis.set(cacheKey, total, { ex: 60 }); // 60s TTL
}
```
- Dla MVP: **nie implementujemy** (premature optimization)
- Rozważyć jeśli avg response time > 200ms

### 8.5 Response Size Optimization

**Przykładowy rozmiar:**
- 1 flashcard: ~300 bytes (JSON)
- 20 flashcards: ~6 KB
- 100 flashcards: ~30 KB
- With gzip: ~70% reduction

**Astro automatic compression:**
- DigitalOcean App Platform automatycznie aplikuje gzip/brotli
- Nie wymaga dodatkowej konfiguracji

### 8.6 Expected Performance Metrics

| Metryka | Target | Uwagi |
|---------|--------|-------|
| Response time (p50) | < 100ms | With index |
| Response time (p95) | < 200ms | Even with large datasets |
| Response time (p99) | < 500ms | Network latency included |
| Throughput | > 100 req/s | Single DigitalOcean Droplet |
| Database connections | < 10 active | Supabase pooling |

---

## 9. Etapy wdrożenia

### Krok 1: Rozszerzenie FlashcardService
**Plik**: `src/lib/services/flashcard.service.ts`

**Zadania:**
1. Dodać metodę `getFlashcards(userId: string, limit: number, offset: number)`
2. Zaimplementować query do pobierania fiszek z paginacją:
   ```typescript
   const { data, error } = await this.supabase
     .from("flashcards")
     .select()
     .eq("user_id", userId)
     .order("created_at", { ascending: false })
     .range(offset, offset + limit - 1);
   ```
3. Zaimplementować query do liczenia total:
   ```typescript
   const { count, error: countError } = await this.supabase
     .from("flashcards")
     .select("*", { count: "exact", head: true })
     .eq("user_id", userId);
   ```
4. Wykonać oba queries równolegle używając `Promise.all()`
5. Obsłużyć błędy bazy danych i rzucić standardowy `Error`
6. Zwrócić `{ flashcards: FlashcardDTO[], total: number }`

**Przykładowa implementacja:**
```typescript
/**
 * Retrieves paginated list of user's flashcards
 *
 * @param userId - ID of authenticated user
 * @param limit - Number of items per page (1-100)
 * @param offset - Number of items to skip (>= 0)
 * @returns Object with flashcards array and total count
 * @throws {Error} On database query failure
 */
async getFlashcards(
  userId: string,
  limit: number,
  offset: number
): Promise<{ flashcards: FlashcardDTO[]; total: number }> {
  // Execute queries in parallel for better performance
  const [flashcardsResult, countResult] = await Promise.all([
    this.supabase
      .from("flashcards")
      .select()
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1),
    
    this.supabase
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
  ]);

  // Handle flashcards query error
  if (flashcardsResult.error) {
    console.error("Failed to fetch flashcards:", flashcardsResult.error);
    throw new Error("Failed to fetch flashcards");
  }

  // Handle count query error
  if (countResult.error || countResult.count === null) {
    console.error("Failed to count flashcards:", countResult.error);
    throw new Error("Failed to count flashcards");
  }

  return {
    flashcards: flashcardsResult.data as FlashcardDTO[],
    total: countResult.count
  };
}
```

**Testy jednostkowe (opcjonalne dla MVP):**
- Mock Supabase client
- Test sukcesu z danymi
- Test sukcesu z pustą listą
- Test błędu bazy danych

---

### Krok 2: Stworzenie Zod Schema dla Query Parameters
**Plik**: `src/pages/api/flashcards/index.ts` (na początku pliku)

**Zadania:**
1. Zaimportować Zod: `import { z } from "zod";`
2. Stworzyć schema walidujące query params:

```typescript
/**
 * Zod schema for GET /api/flashcards query parameters
 *
 * Validates:
 * - limit: integer 1-100 (default: 20)
 * - offset: non-negative integer (default: 0)
 */
const GetFlashcardsQuerySchema = z.object({
  limit: z.coerce
    .number({ invalid_type_error: "Limit must be a number" })
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit must be between 1 and 100")
    .default(20),
  offset: z.coerce
    .number({ invalid_type_error: "Offset must be a number" })
    .int("Offset must be an integer")
    .min(0, "Offset must be a non-negative integer")
    .default(0),
});
```

**Uwagi:**
- `.coerce.number()` konwertuje string z URL na number
- Custom error messages są user-friendly
- Wartości domyślne zgodne ze specyfikacją

---

### Krok 3: Implementacja GET Handler
**Plik**: `src/pages/api/flashcards/index.ts`

**Zadania:**
1. Dodać `export const prerender = false;` na początku pliku
2. Zaimportować niezbędne typy:
   ```typescript
   import type { APIRoute } from "astro";
   import type { 
     FlashcardsListResponseDTO, 
     ErrorResponseDTO 
   } from "../../../types";
   import { FlashcardService } from "../../../lib/services/flashcard.service";
   ```
3. Zaimplementować handler GET:

```typescript
/**
 * GET handler - Retrieve paginated flashcards
 *
 * Query params: limit (optional, 1-100, default 20), offset (optional, >=0, default 0)
 * Response: 200 OK with FlashcardsListResponseDTO
 * Errors: 400 (validation), 401 (auth), 500 (server error)
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Authentication check
    const user = locals.user;
    if (!user) {
      console.warn("[AUTH_MISSING]", {
        timestamp: new Date().toISOString(),
        endpoint: "/api/flashcards",
        ip: request.headers.get("x-forwarded-for") || "unknown"
      });

      const errorResponse: ErrorResponseDTO = {
        error: "Authentication required",
        message: "Please log in to continue"
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = {
      limit: url.searchParams.get("limit"),
      offset: url.searchParams.get("offset")
    };

    const validationResult = GetFlashcardsQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      console.warn("[VALIDATION_ERROR]", {
        timestamp: new Date().toISOString(),
        userId: user.id,
        params: queryParams,
        errors: validationResult.error.errors
      });

      const errorResponse: ErrorResponseDTO = {
        error: "Validation failed",
        details: validationResult.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message
        }))
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { limit, offset } = validationResult.data;

    // 3. Initialize FlashcardService
    const service = new FlashcardService(locals.supabase);

    // 4. Fetch flashcards
    const result = await service.getFlashcards(user.id, limit, offset);

    // 5. Construct response
    const response: FlashcardsListResponseDTO = {
      flashcards: result.flashcards,
      pagination: {
        total: result.total,
        limit: limit,
        offset: offset,
        has_more: offset + limit < result.total
      }
    };

    // 6. Return success response
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    // 7. Handle unexpected errors
    console.error("[UNEXPECTED_ERROR]", {
      timestamp: new Date().toISOString(),
      userId: locals.user?.id,
      endpoint: "/api/flashcards",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    const errorResponse: ErrorResponseDTO = {
      error: "Internal server error",
      message: "An unexpected error occurred. Please try again later.",
      retryable: true
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
```

---

### Krok 4: Aktualizacja middleware (jeśli potrzebne)
**Plik**: `src/middleware/index.ts`

**Zadania:**
1. Sprawdzić, czy middleware ustawia `locals.user` dla zalogowanych użytkowników
2. Upewnić się, że endpoint `/api/flashcards` nie jest wyłączony z auth check
3. Jeśli middleware nie istnieje lub nie obsługuje auth, zaimplementować:

```typescript
import type { MiddlewareHandler } from "astro";

export const onRequest: MiddlewareHandler = async ({ locals, request }, next) => {
  // Get Supabase session
  const { data: { session } } = await locals.supabase.auth.getSession();
  
  // Set user in locals if session exists
  if (session?.user) {
    locals.user = {
      id: session.user.id,
      email: session.user.email || ""
    };
  }

  return next();
};
```

---

### Krok 5: Testowanie lokalne
**Narzędzia**: Insomnia/Postman/curl

**Test Case 1: Podstawowe wywołanie (zalogowany użytkownik)**
```bash
curl -X GET "http://localhost:4321/api/flashcards" \
  -H "Cookie: sb-<project>-auth-token=<JWT_TOKEN>"
```
**Expected**: 200 OK z listą fiszek

**Test Case 2: Custom pagination**
```bash
curl -X GET "http://localhost:4321/api/flashcards?limit=10&offset=5" \
  -H "Cookie: sb-<project>-auth-token=<JWT_TOKEN>"
```
**Expected**: 200 OK z 10 elementami, offset=5

**Test Case 3: Empty flashcards**
```bash
# Użytkownik bez fiszek
curl -X GET "http://localhost:4321/api/flashcards" \
  -H "Cookie: sb-<project>-auth-token=<JWT_TOKEN_NEW_USER>"
```
**Expected**: 200 OK z pustą tablicą

**Test Case 4: Invalid limit (> 100)**
```bash
curl -X GET "http://localhost:4321/api/flashcards?limit=150"
```
**Expected**: 400 Bad Request

**Test Case 5: Invalid offset (< 0)**
```bash
curl -X GET "http://localhost:4321/api/flashcards?offset=-5"
```
**Expected**: 400 Bad Request

**Test Case 6: Non-numeric parameters**
```bash
curl -X GET "http://localhost:4321/api/flashcards?limit=abc&offset=xyz"
```
**Expected**: 400 Bad Request

**Test Case 7: Unauthorized (no cookie)**
```bash
curl -X GET "http://localhost:4321/api/flashcards"
```
**Expected**: 401 Unauthorized

---

### Krok 6: Weryfikacja RLS w Supabase
**Narzędzia**: Supabase Dashboard → SQL Editor

**Query 1: Sprawdzenie policies**
```sql
SELECT 
  schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'flashcards';
```
**Expected**: Policy "Users can read own flashcards" z qual zawierającym `(auth.uid() = user_id)`

**Query 2: Test izolacji danych (jako użytkownik A)**
```sql
-- Set context to user A
SET request.jwt.claims = '{"sub": "user-a-uuid"}';

SELECT COUNT(*) FROM flashcards;
-- Should return only user A's flashcards

-- Try to access user B's flashcard directly
SELECT * FROM flashcards WHERE user_id = 'user-b-uuid';
-- Should return 0 rows (RLS blocks access)
```

---

### Krok 7: Code Review Checklist
**Przed mergem do main:**

- [ ] FlashcardService.getFlashcards() zwraca poprawny typ
- [ ] Zod schema waliduje wszystkie edge cases
- [ ] GET handler obsługuje wszystkie kody statusu (200, 400, 401, 500)
- [ ] Error responses używają ErrorResponseDTO
- [ ] Pagination metadata jest poprawnie obliczana (`has_more`)
- [ ] Query używa indeksu `idx_flashcards_user_created`
- [ ] RLS policies są aktywne w Supabase
- [ ] Logging zawiera timestamp i userId
- [ ] Nie ma hard-coded values (używa constants/config)
- [ ] TypeScript nie ma błędów (`npm run build`)
- [ ] ESLint nie ma błędów (`npm run lint`)
- [ ] Wszystkie testy manualne przeszły pomyślnie

---

### Krok 8: Dokumentacja i Deployment
**Zadania:**

1. **Aktualizacja API documentation** (jeśli istnieje):
   - Dodać endpoint do listy dostępnych endpoints
   - Przykłady request/response
   - Error codes

2. **Environment variables check**:
   ```bash
   # .env (local)
   PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=<anon_key>
   
   # DigitalOcean App Platform (production)
   # Upewnić się, że zmienne są ustawione
   ```

3. **Deploy do staging**:
   ```bash
   git checkout -b feature/get-flashcards
   git add .
   git commit -m "feat: implement GET /api/flashcards endpoint"
   git push origin feature/get-flashcards
   # Create PR → Merge → Auto-deploy via GitHub Actions
   ```

4. **Smoke test na staging**:
   ```bash
   curl -X GET "https://staging.10xcards.app/api/flashcards" \
     -H "Cookie: sb-<project>-auth-token=<JWT_TOKEN>"
   ```

5. **Deploy do production**:
   - Po zatwierdzeniu smoke testów
   - Merge do `main` branch
   - Monitor logs w DigitalOcean App Platform

---

### Krok 9: Monitoring i Performance Tracking
**Po deploymencie do production:**

1. **Sprawdzenie response time**:
   - Używając DigitalOcean Insights lub narzędzia APM
   - Target: p95 < 200ms

2. **Sprawdzenie error rate**:
   - Monitor 5xx errors (powinno być < 0.1%)
   - Monitor 4xx errors (walidacja, auth issues)

3. **Database query performance**:
   - Supabase Dashboard → SQL Query Performance
   - Upewnić się, że query używa index (nie seq scan)

4. **Setup alertów** (opcjonalne):
   - Error rate > 1% → Slack notification
   - Response time p95 > 500ms → Alert
   - Database connection pool saturation → Alert

---

## 10. Checklisty finalne

### Pre-deployment Checklist
- [ ] Kod przeszedł code review
- [ ] Wszystkie testy manualne wykonane
- [ ] TypeScript build bez błędów
- [ ] ESLint bez błędów i warnings
- [ ] RLS policies zweryfikowane w Supabase
- [ ] Environment variables ustawione na staging
- [ ] Dokumentacja API zaktualizowana

### Post-deployment Checklist
- [ ] Smoke test na staging przeszedł pomyślnie
- [ ] Response time < 200ms (p95)
- [ ] Error rate < 0.1%
- [ ] Monitoring i alerty skonfigurowane
- [ ] Komunikat w zespole o wdrożeniu nowej funkcji

---

## 11. Potencjalne problemy i rozwiązania

### Problem 1: Powolne queries przy dużych offsetach
**Symptom**: Response time > 500ms dla offset > 1000

**Rozwiązanie**:
1. Krótkoterminowe: Zwiększyć max limit do 100 (już zrobione)
2. Długoterminowe: Implementować cursor-based pagination:
   ```typescript
   // Instead of offset, use last seen created_at + id
   WHERE (created_at, id) < (last_created_at, last_id)
   ORDER BY created_at DESC, id DESC
   LIMIT 20
   ```

### Problem 2: Nieaktualne total count przez cache
**Symptom**: `pagination.total` nie odpowiada rzeczywistej liczbie fiszek

**Rozwiązanie**:
1. Dla MVP: Nie cachować total (zawsze fresh z DB)
2. Przyszłość: Cache z TTL 60s + invalidacja przy POST/DELETE

### Problem 3: RLS performance overhead
**Symptom**: Queries wolniejsze niż bez RLS

**Rozwiązanie**:
- RLS w Supabase jest zoptymalizowane (używa indexes)
- Overhead zwykle < 5ms
- Jeśli problem: Rozważyć service role key (tylko w backend, nie w browser)

### Problem 4: Race condition przy równoczesnych requests
**Symptom**: Różne total counts w równoczesnych requestach

**Rozwiązanie**:
- To jest akceptowalne (eventual consistency)
- User tworzy fiszkę → total zwiększy się w następnym request
- Nie wymaga transaction (read-only endpoint)

---

## 12. Zgodność z User Stories

### US-001: Bezpieczne logowanie i izolacja danych
✅ **Spełnione**:
- Endpoint wymaga uwierzytelnienia (401 dla niezalogowanych)
- RLS zapewnia izolację danych (user_id filter)
- `locals.user` zawsze pobierane z sesji, nie z request params

### US-003: Przeglądanie fiszek (Review Section)
✅ **Spełnione**:
- Endpoint dostarcza paginowaną listę fiszek
- Sortowanie od najnowszych (created_at DESC)
- Pagination metadata pozwala na budowę UI (total pages, has_more)

---

## 13. Metryki sukcesu

### Funkcjonalne
- [ ] Endpoint zwraca poprawne dane dla zalogowanego użytkownika
- [ ] Pusta lista dla nowego użytkownika (nie 404)
- [ ] Paginacja działa poprawnie (has_more, offset, limit)
- [ ] Walidacja query params działa zgodnie ze specyfikacją
- [ ] RLS blokuje dostęp do fiszek innych użytkowników

### Niefunkcjonalne
- [ ] Response time p95 < 200ms
- [ ] Error rate < 0.1%
- [ ] Throughput > 100 req/s (single instance)
- [ ] Database query używa indeksu (nie seq scan)

### Bezpieczeństwo
- [ ] Brak SQL injection vulnerabilities
- [ ] Brak data leakage między użytkownikami
- [ ] Proper authentication checks
- [ ] Limit DOS attack (max 100 per request)

---

**Koniec planu implementacji**

