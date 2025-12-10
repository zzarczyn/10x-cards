# API Endpoint Implementation Plan: PATCH /api/flashcards/:id

## 1. Przegląd punktu końcowego

Endpoint służy do **częściowej aktualizacji (partial update) istniejącej fiszki** na podstawie jej identyfikatora UUID. Użytkownik może zaktualizować treść przodu (`front`) i/lub tyłu (`back`) fiszki. Operacja może być wykonana wyłącznie przez właściciela fiszki.

**Kluczowe cechy:**
- Partial update: można zaktualizować tylko `front`, tylko `back`, lub oba pola jednocześnie
- Immutable fields: `source` i `generation_id` nie mogą być zmieniane po utworzeniu
- Wymaga uwierzytelnienia użytkownika
- Weryfikacja własności zasobu (user może edytować tylko własne fiszki)
- Zwraca 200 OK z pełnym obiektem fiszki po aktualizacji
- Database trigger automatycznie aktualizuje timestamp `updated_at`

---

## 2. Szczegóły żądania

### Metoda HTTP
**PATCH**

### Struktura URL
```
PATCH /api/flashcards/:id
```

### Parametry URL
- **Wymagane:**
  - `id` (string) - UUID identyfikujący fiszkę do aktualizacji
    - Format: UUID v4 (np. `550e8400-e29b-41d4-a716-446655440000`)
    - Walidacja: Musi być poprawnym UUID, nie może być pusty

### Request Headers
```
Content-Type: application/json
Cookie: sb-<project-id>-auth-token=<session-token>
```
(Cookie zarządzany automatycznie przez Supabase Auth)

### Request Body

**Struktura JSON (przynajmniej jedno pole wymagane):**

```json
{
  "front": "string",  // Opcjonalne, max 200 chars, nie może być puste/whitespace
  "back": "string"    // Opcjonalne, max 500 chars, nie może być puste/whitespace
}
```

**Przykłady:**

```json
// Aktualizacja tylko przodu
{
  "front": "What is the capital of France?"
}

// Aktualizacja tylko tyłu
{
  "back": "Paris is the capital and largest city of France."
}

// Aktualizacja obu stron
{
  "front": "What is the capital of France?",
  "back": "Paris"
}
```

**Ważne:**
- Przynajmniej jedno pole (`front` lub `back`) musi być obecne w body
- Puste body → 400 Bad Request
- Pola `source` i `generation_id` są immutable (backend je ignoruje, jeśli zostaną wysłane)

---

## 3. Wykorzystywane typy

### 3.1 Typy zdefiniowane w `src/types.ts`

#### UpdateFlashcardCommand
Typ Command używany w Request Body (już istnieje):

```typescript
export type UpdateFlashcardCommand = Pick<TablesUpdate<"flashcards">, "front" | "back">;
```

Rozwinięcie typu:
```typescript
{
  front?: string;  // Opcjonalne
  back?: string;   // Opcjonalne
}
```

#### FlashcardDTO
Typ Response (alias FlashcardEntity):

```typescript
export type FlashcardDTO = FlashcardEntity;
```

Struktura pełnego obiektu:
```typescript
{
  id: string;                    // UUID
  user_id: string;               // UUID
  front: string;                 // max 200 chars
  back: string;                  // max 500 chars
  source: CardSourceType;        // "manual" | "ai-full" | "ai-edited"
  generation_id: string | null;  // UUID lub null
  created_at: string;            // ISO 8601 timestamp
  updated_at: string;            // ISO 8601 timestamp
}
```

#### ErrorResponseDTO
Używany do zwracania błędów:

```typescript
export interface ErrorResponseDTO {
  error: string;
  message?: string;
  details?: ValidationErrorDetail[];
  retryable?: boolean;
}
```

#### ValidationErrorDetail
Szczegóły błędów walidacji dla poszczególnych pól:

```typescript
export interface ValidationErrorDetail {
  field: string;
  message: string;
}
```

### 3.2 Nowe typy do dodania (inline Zod schemas)

Do utworzenia w pliku endpointu:

```typescript
import { z } from "zod";

// Walidacja URL parameter
const UpdateFlashcardParams = z.object({
  id: z.string().uuid({ message: "Invalid flashcard ID format" }),
});

// Walidacja Request Body
const UpdateFlashcardBodySchema = z
  .object({
    front: z
      .string()
      .max(200, "Front side cannot exceed 200 characters")
      .refine((val) => val.trim().length > 0, {
        message: "Front side cannot be empty or contain only whitespace",
      })
      .optional(),
    back: z
      .string()
      .max(500, "Back side cannot exceed 500 characters")
      .refine((val) => val.trim().length > 0, {
        message: "Back side cannot be empty or contain only whitespace",
      })
      .optional(),
  })
  .refine((data) => data.front !== undefined || data.back !== undefined, {
    message: "At least one field (front or back) must be provided",
  });
```

**Uwagi dotyczące walidacji:**
- `.optional()` - pola mogą być nieobecne
- `.refine()` na poziomie obiektu - wymusza obecność przynajmniej jednego pola
- `.refine()` dla string - sprawdza, czy po `.trim()` długość > 0 (eliminuje whitespace)
- `.max()` - zgodne z ograniczeniami bazy danych (VARCHAR(200), VARCHAR(500))

---

## 4. Szczegóły odpowiedzi

### 4.1 Sukces (200 OK)

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "front": "What is the capital of France?",
  "back": "Paris",
  "source": "manual",
  "generation_id": null,
  "created_at": "2025-01-15T10:30:00.000Z",
  "updated_at": "2025-01-15T14:45:00.000Z"
}
```

**Kiedy zwrócić:**
- Fiszka została pomyślnie zaktualizowana w bazie danych
- Fiszka istniała i należała do użytkownika
- Przynajmniej jedno pole zostało zmienione (lub wartość pozostała taka sama)
- Walidacja przeszła pomyślnie

**Uwaga:**
- `updated_at` jest automatycznie aktualizowany przez database trigger, nawet jeśli wartości pól się nie zmieniły
- Response zawsze zwraca **pełny obiekt fiszki**, nie tylko zaktualizowane pola

---

### 4.2 Błędy

#### 401 Unauthorized

**Kiedy zwrócić:**
- Brak sesji użytkownika (użytkownik nie zalogowany)
- Token sesji wygasł lub jest nieprawidłowy

**Response Body:**
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

---

#### 400 Bad Request

**Kiedy zwrócić:**
- Parametr `id` ma nieprawidłowy format (nie jest UUID)
- Request body nie zawiera żadnego pola (`front` ani `back`)
- Pole `front` jest puste, zawiera tylko whitespace, lub > 200 znaków
- Pole `back` jest puste, zawiera tylko whitespace, lub > 500 znaków
- Body nie jest prawidłowym JSON

**Response Body (przykład 1: brak pól):**
```json
{
  "error": "Validation failed",
  "message": "At least one field (front or back) must be provided"
}
```

**Response Body (przykład 2: błędna walidacja pól):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "front",
      "message": "Front side cannot be empty or contain only whitespace"
    },
    {
      "field": "back",
      "message": "Back side cannot exceed 500 characters"
    }
  ]
}
```

**Response Body (przykład 3: nieprawidłowy UUID):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "id",
      "message": "Invalid flashcard ID format"
    }
  ]
}
```

---

#### 404 Not Found

**Kiedy zwrócić:**
- Fiszka o podanym `id` nie istnieje w bazie danych
- Fiszka należy do innego użytkownika (z powodów bezpieczeństwa zwracamy 404 zamiast 403)

**Response Body:**
```json
{
  "error": "Flashcard not found"
}
```

**Security Note:** Zwracamy 404 zamiast 403 Forbidden, aby uniemożliwić enumerację UUID fiszek innych użytkowników (information disclosure prevention).

---

#### 500 Internal Server Error

**Kiedy zwrócić:**
- Błąd bazy danych (connection timeout, database down)
- Nieoczekiwany błąd serwera (unhandled exception)

**Response Body:**
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred while updating flashcard"
}
```

---

## 5. Przepływ danych

### 5.1 Diagram sekwencji

```
Client                 API Handler           Middleware          FlashcardService      Supabase
  |                         |                     |                      |                  |
  |--PATCH /api/flashcards/:id + JSON body----->|                      |                  |
  |                         |                     |                      |                  |
  |                         |<----verify session--|                      |                  |
  |                         |                     |---query session----->|                  |
  |                         |                     |<--user data----------|                  |
  |                         |                     |                      |                  |
  |                         |<-locals.user--------|                      |                  |
  |                         |                     |                      |                  |
  |---validate UUID-------->|                     |                      |                  |
  |---validate JSON body--->|                     |                      |                  |
  |                         |                     |                      |                  |
  |---call service--------->|                     |                      |                  |
  |                         |--updateFlashcard(id, command, userId)----->|                  |
  |                         |                     |                      |--UPDATE query--->|
  |                         |                     |                      |<--updated row----|
  |                         |<-FlashcardDTO-------|                      |                  |
  |                         |                     |                      |                  |
  |<--200 OK + JSON---------|                     |                      |                  |
  |                         |                     |                      |                  |
```

### 5.2 Szczegółowe kroki

1. **Request Parsing:**
   - Endpoint otrzymuje request z parametrem URL `id` i JSON body
   - Parse JSON body (jeśli nieprawidłowy JSON → 400)

2. **Request Validation:**
   - Walidacja formatu UUID przy użyciu Zod schema
   - Walidacja body: przynajmniej jedno pole, długość, whitespace
   - Jeśli walidacja fails → zwróć 400 Bad Request z szczegółami błędów

3. **Authentication Check:**
   - Middleware sprawdza sesję użytkownika (`context.locals.user`)
   - Jeśli brak sesji → zwróć 401 Unauthorized
   - Jeśli sesja istnieje → przekaż `userId` do service

4. **Service Layer - Update:**
   - `FlashcardService.updateFlashcard(flashcardId, command, userId)` wykonuje UPDATE
   - Query Supabase z filtrami: `WHERE id = flashcardId AND user_id = userId`
   - Supabase zwraca zaktualizowany wiersz (lub null jeśli nie znaleziono)
   - Database trigger automatycznie aktualizuje `updated_at`
   - Jeśli null → throw `NotFoundError` (fiszka nie istnieje lub nie należy do usera)
   - Jeśli success → zwróć zaktualizowany obiekt jako `FlashcardDTO`

5. **Response:**
   - Sukces → zwróć 200 OK z pełnym obiektem fiszki (JSON)
   - NotFoundError → zwróć 404 Not Found
   - Unexpected error → zwróć 500 Internal Server Error

### 5.3 Interakcje z bazą danych

**Query wykonywane przez serwis (via Supabase Client):**

```typescript
const { data, error } = await this.supabase
  .from("flashcards")
  .update({
    ...(command.front !== undefined && { front: command.front }),
    ...(command.back !== undefined && { back: command.back }),
  })
  .eq("id", flashcardId)
  .eq("user_id", userId) // Authorization check
  .select()
  .single(); // Returns updated row
```

**Alternatywna implementacja (prostsza):**

```typescript
const updateData: Partial<{ front: string; back: string }> = {};
if (command.front !== undefined) updateData.front = command.front;
if (command.back !== undefined) updateData.back = command.back;

const { data, error } = await this.supabase
  .from("flashcards")
  .update(updateData)
  .eq("id", flashcardId)
  .eq("user_id", userId)
  .select()
  .single();
```

**Zachowanie RLS (Row Level Security):**
- Jeśli RLS jest aktywny, Supabase automatycznie filtruje po `user_id` z tokena JWT
- Dodatkowe `.eq("user_id", userId)` jest redundantne, ale poprawia czytelność i działa jako guard

**Database Trigger:**
- Automatyczna aktualizacja `updated_at` timestamp:
  ```sql
  CREATE TRIGGER update_flashcards_updated_at
  BEFORE UPDATE ON public.flashcards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
  ```
- Developer nie musi ręcznie ustawiać `updated_at` w query

**Immutable fields:**
- Backend **nie akceptuje** `source` ani `generation_id` w command (wykluczone przez typ)
- Jeśli frontend wysyła te pola, są ignorowane przez Zod schema

---

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnianie (Authentication)

**Mechanizm:** Supabase Auth + Astro Middleware

**Implementacja:**
- Middleware (`src/middleware/index.ts`) weryfikuje sesję przy każdym request
- Token JWT przechowywany w cookie `sb-<project-id>-auth-token`
- Token walidowany przez `supabase.auth.getUser()`
- Użytkownik dostępny w `context.locals.user`

**Zabezpieczenia:**
- Brak sesji → błąd 401 przed wykonaniem jakiejkolwiek logiki biznesowej
- Token wygasły → Supabase zwraca błąd, middleware przekierowuje na login

---

### 6.2 Autoryzacja (Authorization)

**Zasada:** Użytkownik może edytować tylko własne fiszki

**Implementacja:**
1. **Service Layer Check:**
   ```typescript
   .eq("user_id", userId) // Explicit ownership filter
   ```

2. **RLS (Row Level Security):**
   - Polityka RLS w Supabase: `user_id = auth.uid()`
   - Automatyczna filtracja po user_id z JWT tokena
   - Nawet przy SQL injection, użytkownik nie uzyska dostępu do cudzych danych

**Handling:**
- Próba edycji cudzej fiszki → 0 wierszy zaktualizowanych → 404 Not Found
- **NIE zwracamy 403 Forbidden**, aby uniemożliwić enumeration attack

---

### 6.3 Input Validation

**UUID Validation:**
```typescript
const UpdateFlashcardParams = z.object({
  id: z.string().uuid({ message: "Invalid flashcard ID format" }),
});
```

**Content Validation:**
```typescript
front: z
  .string()
  .max(200, "Front side cannot exceed 200 characters")
  .refine((val) => val.trim().length > 0, {
    message: "Front side cannot be empty or contain only whitespace",
  })
  .optional()
```

**Ochrona przed:**
- **SQL Injection:** Walidacja UUID + Supabase parametryzacja zapytań
- **XSS (Cross-Site Scripting):** Walidacja długości string + frontend escapuje HTML (React robi to automatycznie)
- **Buffer Overflow:** Limity długości (200/500 chars) zgodne z schema bazy danych
- **Whitespace Injection:** `.refine(val => val.trim().length > 0)` eliminuje puste stringi i whitespace-only

---

### 6.4 Data Integrity

**Immutable Fields Protection:**
- Typ `UpdateFlashcardCommand` **wyklucza** `source` i `generation_id`
- Jeśli frontend przypadkowo wyśle te pola, Zod schema je ignoruje
- Database constraints zapobiegają bezpośredniej modyfikacji immutable fields

**Timestamp Integrity:**
- `created_at` - nie może być zmieniony (brak w `UpdateFlashcardCommand`)
- `updated_at` - zarządzany przez database trigger, nie przez użytkownika

**Consistency:**
- Walidacja whitespace zapewnia, że nie można zapisać fiszki z pustymi polami
- Database constraints (`CHECK (LENGTH(TRIM(front)) > 0)`) jako drugi poziom obrony

---

### 6.5 Rate Limiting (Future Enhancement)

**MVP:** Brak rate limiting (akceptowalne ryzyko dla wewnętrznej aplikacji za loginem)

**Production Considerations:**
- Implementacja rate limiting na poziomie Astro middleware
- Limit: np. 100 UPDATE requests / user / godzinę
- Ochrona przed: Accidental loops, malicious rapid updates

---

### 6.6 CSRF Protection

**Status:** Chroniony przez Same-Site Cookie policy

**Mechanizm:**
- Supabase cookies z flagą `SameSite=Lax` lub `SameSite=Strict`
- Requests cross-origin nie mogą używać credentials (cookies)

---

## 7. Obsługa błędów

### 7.1 Mapa błędów

| Error Type | Status Code | User-Facing Message | Log Level | Retryable |
|------------|-------------|---------------------|-----------|-----------|
| No session (unauthenticated) | 401 | "Authentication required" | INFO | No |
| Invalid UUID format | 400 | "Invalid flashcard ID format" | WARN | No |
| No fields provided | 400 | "At least one field must be provided" | WARN | No |
| Field validation failed | 400 | Field-specific error messages | WARN | No |
| Flashcard not found or not owned | 404 | "Flashcard not found" | INFO | No |
| Database connection error | 500 | "An unexpected error occurred" | ERROR | Yes |
| Unexpected service error | 500 | "An unexpected error occurred" | ERROR | Yes |

---

### 7.2 Error Handling Pattern (API Handler)

```typescript
try {
  // Step 1: Validate URL parameter
  const { id } = UpdateFlashcardParams.parse({ id: context.params.id });

  // Step 2: Check authentication
  if (!context.locals.user) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "Authentication required",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Step 3: Parse and validate request body
  const body = await context.request.json();
  const command = UpdateFlashcardBodySchema.parse(body);

  // Step 4: Call service
  const flashcardService = new FlashcardService(context.locals.supabase);
  const updatedFlashcard = await flashcardService.updateFlashcard(
    id,
    command,
    context.locals.user.id
  );

  // Step 5: Return success
  return new Response(JSON.stringify(updatedFlashcard), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

} catch (error) {
  // Handle validation errors (Zod)
  if (error instanceof z.ZodError) {
    // Check if error is at root level (no fields provided)
    const rootError = error.errors.find((e) => e.path.length === 0);
    
    if (rootError) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          message: rootError.message,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Field-level validation errors
    return new Response(
      JSON.stringify({
        error: "Validation failed",
        details: error.errors.map((e) => ({
          field: String(e.path[0]),
          message: e.message,
        })),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Handle not found errors
  if (error instanceof NotFoundError) {
    return new Response(
      JSON.stringify({ error: "Flashcard not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Handle unexpected errors
  console.error("Failed to update flashcard:", error);
  return new Response(
    JSON.stringify({
      error: "Internal server error",
      message: "An unexpected error occurred while updating flashcard",
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

---

### 7.3 Service Layer Error Handling

```typescript
// In FlashcardService
async updateFlashcard(
  flashcardId: string,
  command: UpdateFlashcardCommand,
  userId: string
): Promise<FlashcardDTO> {
  // Prepare update data (only include provided fields)
  const updateData: Partial<{ front: string; back: string }> = {};
  if (command.front !== undefined) updateData.front = command.front;
  if (command.back !== undefined) updateData.back = command.back;

  // Execute UPDATE query
  const { data, error } = await this.supabase
    .from("flashcards")
    .update(updateData)
    .eq("id", flashcardId)
    .eq("user_id", userId) // Authorization check
    .select()
    .single();

  // Handle database errors
  if (error) {
    console.error("Database error during flashcard update:", error);
    throw new Error("Failed to update flashcard");
  }

  // Handle not found (no rows updated)
  if (!data) {
    throw new NotFoundError(
      "The specified flashcard does not exist or does not belong to your account",
      "flashcard"
    );
  }

  // Success: return updated flashcard
  return data as FlashcardDTO;
}
```

---

## 8. Rozważania dotyczące wydajności

### 8.1 Database Query Performance

**Indexed Columns:**
- `flashcards.id` - PRIMARY KEY (automatyczny B-tree index)
- `flashcards.user_id` - FOREIGN KEY (automatyczny index dla joins)

**Query Complexity:** O(1) - lookup po primary key + filter po indexed user_id

**Expected Latency:** < 50ms (single-row UPDATE + SELECT)

**Optimization Notes:**
- Brak potrzeby dodatkowych indeksów
- UPDATE query jest atomowy (single transaction)
- RLS policy evaluation: O(1) - lookup w JWT tokenie
- `.single()` zamiast `.limit(1)` gwarantuje dokładnie jeden wiersz lub błąd

---

### 8.2 Network & Payload

**Request Size:**
- URL: ~50 bytes
- Headers: ~500 bytes (cookies)
- Body: ~10-700 bytes (JSON z front/back)
- **Total:** < 1.5 KB

**Response Size:**
- Success: ~300-800 bytes (pełny obiekt fiszki JSON)
- Error: ~50-200 bytes

**Bandwidth:** Minimalny wpływ nawet przy dużej liczbie requestów

---

### 8.3 Concurrency

**Scenario:** Użytkownik wielokrotnie klika "Save" (double-click) lub edytuje fiszkę równocześnie w dwóch kartach

**Handling:**
1. Pierwszy request: UPDATE succeeds → 200 OK z wartością A
2. Drugi request: UPDATE succeeds → 200 OK z wartością B
3. **Last Write Wins** - druga wartość zostaje zapisana

**Database Locking:**
- PostgreSQL używa MVCC (Multi-Version Concurrency Control)
- UPDATE po PRIMARY KEY jest atomowy
- Nie wymaga explicit locking (PESSIMISTIC LOCK)

**Frontend Strategy (zalecane):**
- **Debounce** save requests (np. 500ms delay po ostatniej zmianie)
- Disable "Save" button podczas request (prevent double-click)
- Optimistic UI update z rollback w przypadku błędu

---

### 8.4 Validation Performance

**Zod Schema Parsing:**
- Complexity: O(n) gdzie n = długość stringów
- Expected: < 1ms (stringi max 200/500 chars)
- Zod jest highly optimized, nie stanowi bottlenecku

**Whitespace Check (`.trim()`):**
- Complexity: O(n)
- Expected: < 0.1ms dla stringów 200/500 chars

---

### 8.5 Scalability

**Current Load (MVP):**
- 10-100 użytkowników
- ~10-50 UPDATE requests / dzień / użytkownik
- Całkowite: ~1,000-5,000 UPDATE / dzień

**Supabase Free Tier:**
- 500 MB database
- 50,000 monthly requests (bezpieczny margines)

**Bottlenecks:** Brak (endpoint jest standardową operacją CRUD)

**Future Optimization:**
- Caching: Brak potrzeby (każde UPDATE musi iść do DB)
- Connection Pooling: Zarządzane przez Supabase

---

## 9. Etapy wdrożenia

### Krok 1: Rozszerzenie serwisu FlashcardService

**Plik:** `src/lib/services/flashcard.service.ts`

**Zadanie:** Dodaj metodę `updateFlashcard`

**Implementacja:**

```typescript
/**
 * Updates an existing flashcard (partial update)
 *
 * @param flashcardId - UUID of the flashcard to update
 * @param command - Partial update data (front and/or back)
 * @param userId - ID of the authenticated user (from locals.user.id)
 * @returns Updated flashcard with all fields including new updated_at timestamp
 * @throws {NotFoundError} When flashcard doesn't exist or doesn't belong to user
 * @throws {Error} On database update failure
 */
async updateFlashcard(
  flashcardId: string,
  command: UpdateFlashcardCommand,
  userId: string
): Promise<FlashcardDTO> {
  // Step 1: Prepare update data (only include provided fields)
  const updateData: Partial<{ front: string; back: string }> = {};
  if (command.front !== undefined) {
    updateData.front = command.front;
  }
  if (command.back !== undefined) {
    updateData.back = command.back;
  }

  // Step 2: Execute UPDATE query with ownership check
  const { data, error } = await this.supabase
    .from("flashcards")
    .update(updateData)
    .eq("id", flashcardId)
    .eq("user_id", userId) // Authorization: only owner can update
    .select()
    .single(); // Returns updated row or null

  // Step 3: Handle database errors
  if (error) {
    console.error("Database error during flashcard update:", error);
    throw new Error("Failed to update flashcard");
  }

  // Step 4: Handle not found (no rows updated)
  if (!data) {
    throw new NotFoundError(
      "The specified flashcard does not exist or does not belong to your account",
      "flashcard"
    );
  }

  // Step 5: Return updated flashcard
  return data as FlashcardDTO;
}
```

**Umiejscowienie w klasie:**
- Dodaj metodę po `createFlashcard`, przed `validateGenerationOwnership`

**Testy jednostkowe (opcjonalne w MVP, zalecane później):**
- Test: Aktualizacja tylko `front` → sukces, `back` bez zmian
- Test: Aktualizacja tylko `back` → sukces, `front` bez zmian
- Test: Aktualizacja obu pól → sukces
- Test: Aktualizacja cudzej fiszki → NotFoundError
- Test: Aktualizacja nieistniejącej fiszki → NotFoundError
- Test: Database error → Error thrown
- Test: `updated_at` timestamp jest nowszy niż przed aktualizacją

---

### Krok 2: Utworzenie/rozszerzenie API endpoint handler

**Plik:** `src/pages/api/flashcards/[id].ts` (dynamic route)

**Zadanie:** Dodaj handler dla PATCH method (jeśli plik już istnieje z DELETE, dodaj PATCH obok)

**Struktura pliku:**

```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import { FlashcardService } from "../../../lib/services/flashcard.service";
import { NotFoundError } from "../../../lib/errors";
import type { ErrorResponseDTO, UpdateFlashcardCommand } from "../../../types";

// Disable prerendering (API route)
export const prerender = false;

// Validation schema for URL parameter
const UpdateFlashcardParams = z.object({
  id: z.string().uuid({ message: "Invalid flashcard ID format" }),
});

// Validation schema for Request Body
const UpdateFlashcardBodySchema = z
  .object({
    front: z
      .string()
      .max(200, "Front side cannot exceed 200 characters")
      .refine((val) => val.trim().length > 0, {
        message: "Front side cannot be empty or contain only whitespace",
      })
      .optional(),
    back: z
      .string()
      .max(500, "Back side cannot exceed 500 characters")
      .refine((val) => val.trim().length > 0, {
        message: "Back side cannot be empty or contain only whitespace",
      })
      .optional(),
  })
  .refine((data) => data.front !== undefined || data.back !== undefined, {
    message: "At least one field (front or back) must be provided",
  });

/**
 * PATCH /api/flashcards/:id
 * Partially updates a flashcard
 */
export const PATCH: APIRoute = async (context) => {
  try {
    // Step 1: Validate URL parameter
    const { id } = UpdateFlashcardParams.parse({ id: context.params.id });

    // Step 2: Check authentication
    if (!context.locals.user) {
      const errorResponse: ErrorResponseDTO = {
        error: "Unauthorized",
        message: "Authentication required",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 3: Parse and validate request body
    const body = await context.request.json();
    const command = UpdateFlashcardBodySchema.parse(body) as UpdateFlashcardCommand;

    // Step 4: Initialize service
    const flashcardService = new FlashcardService(context.locals.supabase);

    // Step 5: Update flashcard
    const updatedFlashcard = await flashcardService.updateFlashcard(
      id,
      command,
      context.locals.user.id
    );

    // Step 6: Return success (200 OK with full flashcard object)
    return new Response(JSON.stringify(updatedFlashcard), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    // Handle validation errors (Zod)
    if (error instanceof z.ZodError) {
      // Check if error is at root level (no fields provided)
      const rootError = error.errors.find((e) => e.path.length === 0);

      if (rootError) {
        const errorResponse: ErrorResponseDTO = {
          error: "Validation failed",
          message: rootError.message,
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Field-level validation errors
      const errorResponse: ErrorResponseDTO = {
        error: "Validation failed",
        details: error.errors.map((e) => ({
          field: String(e.path[0]),
          message: e.message,
        })),
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle not found errors
    if (error instanceof NotFoundError) {
      const errorResponse: ErrorResponseDTO = {
        error: "Flashcard not found",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    console.error("Failed to update flashcard:", error);
    const errorResponse: ErrorResponseDTO = {
      error: "Internal server error",
      message: "An unexpected error occurred while updating flashcard",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

**Uwagi:**
- Jeśli plik `[id].ts` już istnieje (np. z DELETE method), dodaj `export const PATCH` obok
- Schemas (Params, BodySchema) mogą być współdzielone między metodami (przenieś na górę pliku)

---

### Krok 3: Testowanie endpoint przez API client

**Narzędzie:** Thunder Client / Postman / curl

**Test Case 1: Sukces - Aktualizacja tylko przodu (200 OK)**

```bash
PATCH http://localhost:4321/api/flashcards/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
Cookie: sb-xxx-auth-token=<valid-session-token>

{
  "front": "What is the capital of Germany?"
}

Expected Response:
Status: 200 OK
Body: {
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "front": "What is the capital of Germany?",
  "back": "Paris",  // unchanged
  "source": "manual",
  "generation_id": null,
  "created_at": "2025-01-15T10:30:00.000Z",
  "updated_at": "2025-01-15T14:45:00.000Z"  // updated
}
```

**Test Case 2: Sukces - Aktualizacja tylko tyłu (200 OK)**

```bash
PATCH http://localhost:4321/api/flashcards/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
Cookie: sb-xxx-auth-token=<valid-session-token>

{
  "back": "Berlin is the capital and largest city of Germany."
}

Expected Response:
Status: 200 OK
Body: { ... "back": "Berlin is the...", ... }
```

**Test Case 3: Sukces - Aktualizacja obu pól (200 OK)**

```bash
PATCH http://localhost:4321/api/flashcards/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
Cookie: sb-xxx-auth-token=<valid-session-token>

{
  "front": "Capital of Germany?",
  "back": "Berlin"
}

Expected Response:
Status: 200 OK
Body: { ... "front": "Capital of Germany?", "back": "Berlin", ... }
```

**Test Case 4: Unauthorized (401)**

```bash
PATCH http://localhost:4321/api/flashcards/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
# No Cookie header

{
  "front": "New front"
}

Expected Response:
Status: 401 Unauthorized
Body: { "error": "Unauthorized", "message": "Authentication required" }
```

**Test Case 5: Not Found (404)**

```bash
PATCH http://localhost:4321/api/flashcards/00000000-0000-0000-0000-000000000000
Content-Type: application/json
Cookie: sb-xxx-auth-token=<valid-session-token>

{
  "front": "New front"
}

Expected Response:
Status: 404 Not Found
Body: { "error": "Flashcard not found" }
```

**Test Case 6: Invalid UUID (400)**

```bash
PATCH http://localhost:4321/api/flashcards/invalid-uuid
Content-Type: application/json
Cookie: sb-xxx-auth-token=<valid-session-token>

{
  "front": "New front"
}

Expected Response:
Status: 400 Bad Request
Body: {
  "error": "Validation failed",
  "details": [{ "field": "id", "message": "Invalid flashcard ID format" }]
}
```

**Test Case 7: Brak pól w body (400)**

```bash
PATCH http://localhost:4321/api/flashcards/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
Cookie: sb-xxx-auth-token=<valid-session-token>

{}

Expected Response:
Status: 400 Bad Request
Body: {
  "error": "Validation failed",
  "message": "At least one field (front or back) must be provided"
}
```

**Test Case 8: Front puste/whitespace (400)**

```bash
PATCH http://localhost:4321/api/flashcards/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
Cookie: sb-xxx-auth-token=<valid-session-token>

{
  "front": "   "
}

Expected Response:
Status: 400 Bad Request
Body: {
  "error": "Validation failed",
  "details": [{
    "field": "front",
    "message": "Front side cannot be empty or contain only whitespace"
  }]
}
```

**Test Case 9: Front za długie (400)**

```bash
PATCH http://localhost:4321/api/flashcards/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
Cookie: sb-xxx-auth-token=<valid-session-token>

{
  "front": "[string o długości 201+ znaków]"
}

Expected Response:
Status: 400 Bad Request
Body: {
  "error": "Validation failed",
  "details": [{
    "field": "front",
    "message": "Front side cannot exceed 200 characters"
  }]
}
```

---

### Krok 4: Integracja z frontendem (React)

**Lokalizacja:** Component z listą fiszek, szczegółami pojedynczej fiszki, lub modalem edycji

**Przykładowa funkcja update:**

```typescript
const handleUpdateFlashcard = async (
  flashcardId: string,
  updates: { front?: string; back?: string }
) => {
  // Validation: at least one field must be provided
  if (!updates.front && !updates.back) {
    alert("Please provide at least one field to update");
    return;
  }

  try {
    const response = await fetch(`/api/flashcards/${flashcardId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Include cookies (auth token)
      body: JSON.stringify(updates),
    });

    if (response.ok) {
      // Success: Get updated flashcard from response
      const updatedFlashcard = await response.json();
      console.log("Flashcard updated successfully:", updatedFlashcard);
      
      // Update state with new flashcard data
      setFlashcards((prev) =>
        prev.map((card) =>
          card.id === flashcardId ? updatedFlashcard : card
        )
      );
      
      // Show success toast
      toast.success("Flashcard updated successfully!");
      return;
    }

    // Handle error responses
    const errorData = await response.json();

    if (response.status === 400) {
      // Validation error
      if (errorData.details) {
        // Field-level errors
        const errorMessages = errorData.details
          .map((d: any) => `${d.field}: ${d.message}`)
          .join("\n");
        alert(`Validation failed:\n${errorMessages}`);
      } else {
        // Root-level error (no fields provided)
        alert(errorData.message || "Validation failed");
      }
      return;
    }

    if (response.status === 404) {
      alert("Flashcard not found or already deleted");
      // Remove from UI
      setFlashcards((prev) => prev.filter((card) => card.id !== flashcardId));
      return;
    }

    if (response.status === 401) {
      alert("Session expired. Please log in again.");
      window.location.href = "/auth/login";
      return;
    }

    // Unexpected error
    alert("Failed to update flashcard. Please try again.");
  } catch (error) {
    console.error("Error updating flashcard:", error);
    alert("Network error. Please check your connection.");
  }
};
```

**UI Considerations:**
- **Przycisk "Save"** powinien być disabled podczas wykonywania request (prevent double-click)
- **Loading state:** Wyświetl spinner na przycisku podczas operacji
- **Optimistic update:** Opcjonalnie zaktualizuj UI przed wysłaniem request, z rollback w przypadku błędu
- **Debounce:** Dla auto-save (np. 500ms po ostatniej zmianie)
- **Validation feedback:** Wyświetl błędy walidacji inline pod polami formularza
- **Toast notification:** "Flashcard updated successfully" po sukcesie

**Przykładowy Edit Modal:**

```typescript
const EditFlashcardModal = ({ flashcard, onClose, onUpdate }) => {
  const [front, setFront] = useState(flashcard.front);
  const [back, setBack] = useState(flashcard.back);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const updates: { front?: string; back?: string } = {};
    if (front !== flashcard.front) updates.front = front;
    if (back !== flashcard.back) updates.back = back;

    if (Object.keys(updates).length === 0) {
      alert("No changes detected");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/flashcards/${flashcard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedFlashcard = await response.json();
        onUpdate(updatedFlashcard);
        onClose();
        toast.success("Flashcard updated!");
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Failed to update flashcard");
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Front:
        <textarea
          value={front}
          onChange={(e) => setFront(e.target.value)}
          maxLength={200}
          required
        />
      </label>
      <label>
        Back:
        <textarea
          value={back}
          onChange={(e) => setBack(e.target.value)}
          maxLength={500}
          required
        />
      </label>
      <button type="submit" disabled={isSaving}>
        {isSaving ? "Saving..." : "Save Changes"}
      </button>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
    </form>
  );
};
```

---

### Krok 5: Walidacja bezpieczeństwa

**Manual Security Testing:**

1. **Test: Próba edycji cudzej fiszki**
   - User A tworzy fiszkę (ID: `aaa-111`)
   - User B próbuje: `PATCH /api/flashcards/aaa-111` z nową treścią
   - **Expected:** 404 Not Found (nie 403, aby uniknąć information disclosure)

2. **Test: Próba edycji bez logowania**
   - Wyloguj się
   - Wywołaj: `PATCH /api/flashcards/<any-id>` z body
   - **Expected:** 401 Unauthorized

3. **Test: SQL Injection attempt**
   - Wywołaj: `PATCH /api/flashcards/<uuid>'; DROP TABLE flashcards;--`
   - **Expected:** 400 Bad Request (UUID validation fails)

4. **Test: XSS attempt w treści**
   - Wywołaj: `PATCH /api/flashcards/<uuid>` z body:
     ```json
     { "front": "<script>alert('XSS')</script>" }
     ```
   - **Expected:** 200 OK (treść zapisana), ale frontend (React) automatycznie escapuje HTML przy renderowaniu

5. **Test: UUID enumeration**
   - Sprawdź losowe UUID: `PATCH /api/flashcards/<random-uuid>` z body
   - **Expected:** 404 Not Found (brak informacji, czy UUID istnieje)

6. **Test: Próba zmiany immutable fields**
   - Wywołaj: `PATCH /api/flashcards/<uuid>` z body:
     ```json
     {
       "front": "New front",
       "source": "manual",
       "generation_id": "some-uuid"
     }
     ```
   - **Expected:** 200 OK, ale `source` i `generation_id` pozostają bez zmian (ignorowane przez Zod schema)

7. **Test: Buffer overflow (długie stringi)**
   - Wywołaj: `PATCH /api/flashcards/<uuid>` z body:
     ```json
     { "front": "[string o długości 10,000 znaków]" }
     ```
   - **Expected:** 400 Bad Request (validation error)

8. **Test: Whitespace injection**
   - Wywołaj: `PATCH /api/flashcards/<uuid>` z body:
     ```json
     { "front": "       ", "back": "\n\n\n" }
     ```
   - **Expected:** 400 Bad Request (whitespace-only validation fails)

---

### Krok 6: Weryfikacja RLS (Row Level Security)

**Jeśli używasz Supabase RLS:**

**Sprawdź politykę UPDATE w Supabase Dashboard:**

```sql
-- Policy name: "Users can update own flashcards"
CREATE POLICY "Users can update own flashcards"
ON public.flashcards
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

**Test RLS:**
- Spróbuj wykonać UPDATE bezpośrednio w SQL Editor z innym `user_id`
- RLS powinien zablokować operację (0 rows affected)

**Weryfikacja triggerów:**

```sql
-- Sprawdź, czy trigger dla updated_at istnieje
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'flashcards'
  AND trigger_name LIKE '%updated_at%';

-- Jeśli nie istnieje, utwórz:
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_flashcards_updated_at
BEFORE UPDATE ON public.flashcards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

### Krok 7: Monitoring i Logi (Production)

**Co logować:**
- Każde wywołanie PATCH endpoint (userId, flashcardId, changed fields, timestamp)
- Błędy 404 (potential enumeration attacks)
- Błędy 400 (validation failures - może wskazywać na problemy z frontendem)
- Błędy 500 (database issues, critical)

**Przykładowa implementacja logowania:**

```typescript
// Before update (in API handler)
console.log(`PATCH request: user=${context.locals.user.id}, flashcard=${id}, fields=${Object.keys(command).join(',')}`);

// After update (in service)
console.log(`Flashcard updated: id=${flashcardId}, userId=${userId}, updated_fields=${Object.keys(updateData).join(',')}`);

// In error handlers
if (error instanceof NotFoundError) {
  console.warn(`404 Not Found: user=${userId}, flashcard=${flashcardId}`);
}

if (error instanceof z.ZodError) {
  console.warn(`Validation failed: user=${userId}, errors=${JSON.stringify(error.errors)}`);
}
```

**Production Tools:**
- Supabase Logs (Dashboard → Logs)
- Application Performance Monitoring (APM) - np. Sentry, LogRocket
- Custom analytics tracking dla metryk edycji fiszek
- Error tracking dla 500 errors (alert on critical failures)

---

### Krok 8: Dokumentacja dla zespołu

**Dodaj dokumentację do:**

1. **API Documentation (jeśli istnieje):**
   - Endpoint URL, method, parameters
   - Request/response examples
   - Error codes
   - Immutable fields explanation

2. **Codebase Comments:**
   - JSDoc w serwisie (już uwzględniony w Krok 1)
   - Komentarze w endpoint handler (już uwzględniony w Krok 2)

3. **Team Wiki / Notion:**
   - User flow: Jak użytkownik edytuje fiszkę
   - Security considerations: RLS, ownership checks, immutable fields
   - Frontend integration guide (Krok 4)
   - Validation rules summary

4. **Update types.ts comments (jeśli potrzebne):**
   - Dodaj przykład użycia `UpdateFlashcardCommand`
   - Wyjaśnij, dlaczego `source` i `generation_id` są wykluczone

---

## 10. Checklist wdrożenia

- [ ] **Krok 1:** Dodano metodę `updateFlashcard` do `FlashcardService`
- [ ] **Krok 2:** Utworzono/rozszerzono endpoint handler `src/pages/api/flashcards/[id].ts`
- [ ] **Krok 3:** Przetestowano endpoint przez API client (wszystkie 9 test cases)
- [ ] **Krok 4:** Zintegrowano PATCH w komponencie frontend (edit modal lub inline edit)
- [ ] **Krok 5:** Przeprowadzono manual security testing (8 testów)
- [ ] **Krok 6:** Zweryfikowano RLS policies i database triggers w Supabase
- [ ] **Krok 7:** Dodano logowanie błędów i operacji (console.log/warn/error)
- [ ] **Krok 8:** Zaktualizowano dokumentację API
- [ ] **Bonus:** Zaimplementowano debounce dla auto-save (jeśli dotyczy)
- [ ] **Bonus:** Dodano testy jednostkowe dla serwisu (opcjonalne w MVP)

---

## 11. Potencjalne rozszerzenia (poza MVP)

### 11.1 Auto-save z Debounce
Zamiast przycisku "Save", automatycznie zapisuj zmiany po 500ms bezczynności:
- Użyj `useDebounce` hook w React
- Wyświetl indicator "Saving..." / "Saved" w UI
- Implementuj retry logic w przypadku błędu sieci

### 11.2 Optimistic Updates
Zaktualizuj UI natychmiast, przed wysłaniem request:
- Zmień wartość w stanie lokalnym
- Wyślij PATCH request w tle
- W przypadku błędu: rollback do poprzedniej wartości + wyświetl error toast

### 11.3 Change History / Audit Log
Tabela `flashcard_changes` przechowująca historię edycji:
- Kolumny: `flashcard_id`, `user_id`, `changed_fields`, `old_values`, `new_values`, `timestamp`
- Umożliwia "View history" w UI
- Umożliwia revert do poprzedniej wersji

### 11.4 Bulk Update
Endpoint: `PATCH /api/flashcards/bulk` z body: `{ "ids": [...], "updates": {...} }`
- Transakcja aktualizująca wiele fiszek jednocześnie
- Użyteczne dla "Select All → Change source" w UI

### 11.5 Partial Response (Field Selection)
Parametr query: `?fields=front,back,updated_at`
- Zwraca tylko wybrane pola zamiast pełnego obiektu
- Zmniejsza payload dla slow connections

### 11.6 Conditional Updates (Optimistic Concurrency Control)
Header: `If-Match: <etag>` lub `If-Unmodified-Since: <date>`
- Zapobiega nadpisywaniu zmian z innej sesji/urządzenia
- Zwraca 412 Precondition Failed jeśli fiszka została zmieniona w międzyczasie

---

## 12. Znane ograniczenia MVP

1. **Brak change history:** Nie można zobaczyć poprzednich wersji fiszki (akceptowalne w MVP)
2. **Brak optimistic concurrency control:** Last Write Wins - zmiana z ostatniego request zostaje zapisana (akceptowalne dla single-user editing)
3. **Brak rate limiting:** Teoretycznie możliwy abuse (niskie ryzyko dla aplikacji za loginem)
4. **Brak auto-save:** Użytkownik musi kliknąć "Save" (można dodać później)
5. **Brak bulk update:** Użytkownik musi edytować fiszki pojedynczo (akceptowalne dla małej liczby fiszek)

---

## 13. Różnice między PATCH a PUT

**Dlaczego PATCH, a nie PUT?**

| Aspekt | PATCH | PUT |
|--------|-------|-----|
| Semantyka | Partial update (tylko zmienione pola) | Full replacement (wszystkie pola) |
| Body | Tylko `front` lub `back` | Wymagane `front`, `back`, `source`, `generation_id` |
| Idempotentność | Tak (wielokrotne PATCH z tymi samymi danymi daje ten sam rezultat) | Tak |
| Use case | Edycja pojedynczych pól | Pełne zastąpienie obiektu |
| Bezpieczeństwo | Lepsze (nie można przypadkowo wyzerować pól) | Ryzyko (brak pola = NULL?) |

**Przykład:**

```typescript
// PATCH - tylko zmienione pole
PATCH /api/flashcards/123
{ "front": "New front" }
// Result: front updated, back unchanged

// PUT - wymagane wszystkie pola
PUT /api/flashcards/123
{
  "front": "New front",
  "back": "Original back",
  "source": "manual",
  "generation_id": null
}
// Result: full replacement
```

Dla tego endpointu **PATCH jest właściwym wyborem**, ponieważ:
1. Użytkownik często edytuje tylko jedną stronę fiszki
2. Nie chcemy wymagać wysyłania immutable fields (`source`, `generation_id`)
3. Minimalizujemy payload (mniej danych = szybszy transfer)

---

## 14. Podsumowanie

Endpoint `PATCH /api/flashcards/:id` to **standardowa operacja CRUD z partial update** z naciskiem na:
- **Flexibility:** Możliwość aktualizacji tylko wybranych pól
- **Security:** Authentication, authorization, ownership verification, immutable fields protection
- **Validation:** Strict input validation (długość, whitespace, UUID format)
- **Data Integrity:** Database triggers, constraints, RLS policies

**Implementacja wymaga:**
1. **Service layer:** Metoda `updateFlashcard` w `FlashcardService`
2. **API handler:** Dynamic route `[id].ts` z PATCH method i Zod validation
3. **Frontend:** Edit form/modal + fetch request + optimistic/pessimistic UI update
4. **Security:** RLS policies + explicit ownership check + 404 instead of 403

**Szacowany czas implementacji:** 3-5 godzin (z testowaniem i integracją frontend)

**Ryzyko:** Niskie (endpoint bazuje na istniejącej infrastrukturze FlashcardService + Supabase Auth)

**Priority:** Średni (nice-to-have dla MVP, critical dla user experience w długoterminowym użytkowaniu)

