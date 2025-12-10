# API Endpoint Implementation Plan: DELETE /api/flashcards/:id

## 1. Przegląd punktu końcowego

Endpoint służy do **trwałego usuwania pojedynczej fiszki** (hard delete) na podstawie jej identyfikatora UUID. Operacja jest nieodwracalna i może być wykonana wyłącznie przez właściciela fiszki. Frontend powinien implementować dialog potwierdzający przed wywołaniem tego endpointu.

**Kluczowe cechy:**
- Hard delete (brak możliwości odzyskania fiszki w MVP)
- Wymaga uwierzytelnienia użytkownika
- Weryfikacja własności zasobu (user może usunąć tylko własne fiszki)
- Zwraca 204 No Content przy sukcesie (pusta odpowiedź)
- Kaskadowe zachowanie: usunięcie fiszki nie usuwa powiązanej generacji (relacja SET NULL)

---

## 2. Szczegóły żądania

### Metoda HTTP
**DELETE**

### Struktura URL
```
DELETE /api/flashcards/:id
```

### Parametry URL
- **Wymagane:**
  - `id` (string) - UUID identyfikujący fiszkę do usunięcia
    - Format: UUID v4 (np. `550e8400-e29b-41d4-a716-446655440000`)
    - Walidacja: Musi być poprawnym UUID, nie może być pusty

### Request Headers
```
Cookie: sb-<project-id>-auth-token=<session-token>
```
(Zarządzane automatycznie przez Supabase Auth)

### Request Body
**Brak** - endpoint DELETE nie przyjmuje body.

---

## 3. Wykorzystywane typy

### 3.1 Typy wykorzystywane w implementacji

#### ErrorResponseDTO (z `src/types.ts`)
Używany do zwracania błędów walidacji i autoryzacji:

```typescript
export interface ErrorResponseDTO {
  error: string;
  message?: string;
  details?: ValidationErrorDetail[];
  retryable?: boolean;
}
```

#### NotFoundError (z `src/lib/errors.ts`)
Klasa błędu używana w serwisie do sygnalizacji nieznalezienia zasobu:

```typescript
export class NotFoundError extends Error {
  constructor(message: string, public resource: string);
}
```

### 3.2 Nowy typ do dodania (walidacja parametrów)

Do utworzenia w pliku endpointu (inline Zod schema):

```typescript
import { z } from "zod";

const DeleteFlashcardParams = z.object({
  id: z.string().uuid({ message: "Invalid flashcard ID format" }),
});
```

---

## 4. Szczegóły odpowiedzi

### 4.1 Sukces (204 No Content)

**Status Code:** `204 No Content`

**Response Body:** 
```
(empty body)
```

**Response Headers:**
```
Content-Length: 0
```

**Kiedy zwrócić:**
- Fiszka została pomyślnie usunięta z bazy danych
- Fiszka istniała i należała do użytkownika
- Operacja DELETE została potwierdzona przez bazę danych

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

#### 400 Bad Request

**Kiedy zwrócić:**
- Parametr `id` ma nieprawidłowy format (nie jest UUID)
- Parametr `id` jest pusty lub brakuje go w URL

**Response Body:**
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

#### 500 Internal Server Error

**Kiedy zwrócić:**
- Błąd bazy danych (connection timeout, database down)
- Nieoczekiwany błąd serwera (unhandled exception)

**Response Body:**
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred while deleting flashcard"
}
```

---

## 5. Przepływ danych

### 5.1 Diagram sekwencji

```
Client                 API Handler           Middleware          FlashcardService      Supabase
  |                         |                     |                      |                  |
  |--DELETE /api/flashcards/:id----------------->|                      |                  |
  |                         |                     |                      |                  |
  |                         |<----verify session--|                      |                  |
  |                         |                     |---query session----->|                  |
  |                         |                     |<--user data----------|                  |
  |                         |                     |                      |                  |
  |                         |<-locals.user--------|                      |                  |
  |                         |                     |                      |                  |
  |---validate UUID-------->|                     |                      |                  |
  |                         |                     |                      |                  |
  |---call service--------->|                     |                      |                  |
  |                         |--deleteFlashcard(userId, flashcardId)----->|                  |
  |                         |                     |                      |--DELETE query--->|
  |                         |                     |                      |<--result---------|
  |                         |<-void (success)-----|                      |                  |
  |                         |                     |                      |                  |
  |<--204 No Content--------|                     |                      |                  |
  |                         |                     |                      |                  |
```

### 5.2 Szczegółowe kroki

1. **Request Validation:**
   - Endpoint otrzymuje request z parametrem URL `id`
   - Walidacja formatu UUID przy użyciu Zod schema
   - Jeśli walidacja fails → zwróć 400 Bad Request

2. **Authentication Check:**
   - Middleware sprawdza sesję użytkownika (`context.locals.user`)
   - Jeśli brak sesji → zwróć 401 Unauthorized
   - Jeśli sesja istnieje → przekaż `userId` do service

3. **Service Layer - Ownership & Delete:**
   - `FlashcardService.deleteFlashcard(userId, flashcardId)` wykonuje DELETE
   - Query Supabase z filtrami: `WHERE id = flashcardId AND user_id = userId`
   - Supabase zwraca liczbę usuniętych wierszy (0 lub 1)
   - Jeśli 0 wierszy → throw `NotFoundError` (fiszka nie istnieje lub nie należy do usera)
   - Jeśli 1 wiersz → operacja sukces

4. **Response:**
   - Sukces → zwróć 204 No Content (pusta odpowiedź)
   - NotFoundError → zwróć 404 Not Found
   - Unexpected error → zwróć 500 Internal Server Error

### 5.3 Interakcje z bazą danych

**Query wykonywane przez serwis (via Supabase Client):**

```typescript
const { data, error, count } = await this.supabase
  .from("flashcards")
  .delete()
  .eq("id", flashcardId)
  .eq("user_id", userId) // Authorization check
  .select(); // Zwraca usunięte wiersze dla weryfikacji
```

**Zachowanie RLS (Row Level Security):**
- Jeśli RLS jest aktywny, Supabase automatycznie filtruje po `user_id` z tokena JWT
- Dodatkowe `.eq("user_id", userId)` jest redundantne, ale poprawia czytelność i działa jako guard

**Kaskadowe skutki:**
- Usunięcie fiszki **NIE usuwa** powiązanej generacji (foreign key: `ON DELETE SET NULL`)
- Generacja pozostaje w tabeli `generations` dla celów analitycznych

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

**Zasada:** Użytkownik może usunąć tylko własne fiszki

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
- Próba usunięcia cudzej fiszki → 0 wierszy usuniętych → 404 Not Found
- **NIE zwracamy 403 Forbidden**, aby uniemożliwić enumeration attack

---

### 6.3 Input Validation

**UUID Validation:**
```typescript
const DeleteFlashcardParams = z.object({
  id: z.string().uuid({ message: "Invalid flashcard ID format" }),
});
```

**Ochrona przed:**
- SQL Injection: Walidacja UUID + Supabase parametryzacja zapytań
- Path Traversal: UUID nie może zawierać znaków `../` lub innych szkodliwych ścieżek
- Invalid Input: Non-UUID strings odrzucane w warstwie walidacji

---

### 6.4 Rate Limiting (Future Enhancement)

**MVP:** Brak rate limiting (akceptowalne ryzyko dla wewnętrznej aplikacji za loginem)

**Production Considerations:**
- Implementacja rate limiting na poziomie Astro middleware
- Limit: np. 100 DELETE requests / user / godzinę
- Ochrona przed: Accidental loops, malicious bulk deletion

---

### 6.5 CSRF Protection

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
| Flashcard not found or not owned | 404 | "Flashcard not found" | INFO | No |
| Database connection error | 500 | "An unexpected error occurred" | ERROR | Yes |
| Unexpected service error | 500 | "An unexpected error occurred" | ERROR | Yes |

---

### 7.2 Error Handling Pattern

```typescript
try {
  // Validate params
  const { id } = DeleteFlashcardParams.parse({ id: context.params.id });

  // Check authentication
  if (!context.locals.user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized", message: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Call service
  await flashcardService.deleteFlashcard(id, context.locals.user.id);

  // Success
  return new Response(null, { status: 204 });

} catch (error) {
  // Validation errors (Zod)
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({
        error: "Validation failed",
        details: error.errors.map(e => ({ field: e.path[0], message: e.message })),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Not found errors
  if (error instanceof NotFoundError) {
    return new Response(
      JSON.stringify({ error: "Flashcard not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Unexpected errors
  console.error("Failed to delete flashcard:", error);
  return new Response(
    JSON.stringify({
      error: "Internal server error",
      message: "An unexpected error occurred while deleting flashcard",
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

---

### 7.3 Service Layer Error Handling

```typescript
// In FlashcardService
async deleteFlashcard(flashcardId: string, userId: string): Promise<void> {
  const { data, error, count } = await this.supabase
    .from("flashcards")
    .delete()
    .eq("id", flashcardId)
    .eq("user_id", userId)
    .select();

  // Database error
  if (error) {
    console.error("Database error during flashcard deletion:", error);
    throw new Error("Failed to delete flashcard");
  }

  // Not found (0 rows deleted)
  if (!data || data.length === 0) {
    throw new NotFoundError(
      "The specified flashcard does not exist or does not belong to your account",
      "flashcard"
    );
  }

  // Success (1 row deleted) - implicit return void
}
```

---

## 8. Rozważania dotyczące wydajności

### 8.1 Database Query Performance

**Indexed Columns:**
- `flashcards.id` - PRIMARY KEY (automatyczny B-tree index)
- `flashcards.user_id` - FOREIGN KEY (automatyczny index dla joins)

**Query Complexity:** O(1) - lookup po primary key + filter po indexed user_id

**Expected Latency:** < 50ms (single-row DELETE)

**Optimization Notes:**
- Brak potrzeby dodatkowych indeksów
- DELETE query jest atomowy (single transaction)
- RLS policy evaluation: O(1) - lookup w JWT tokenie

---

### 8.2 Network & Payload

**Request Size:** Minimalny (tylko URL parameter)

**Response Size:** 
- Sukces: 0 bytes (204 No Content)
- Błąd: ~50-100 bytes (JSON error)

**Bandwidth:** Znikomy wpływ nawet przy dużej liczbie requestów

---

### 8.3 Concurrency

**Scenario:** Użytkownik wielokrotnie klika "Delete" (double-click)

**Handling:**
1. Pierwszy request: DELETE succeeds → 204
2. Drugi request: Fiszka już nie istnieje → 404 Not Found
3. Frontend powinien **disable button po pierwszym kliku** (UI responsibility)

**Database Locking:** Nie jest wymagany (DELETE po PRIMARY KEY jest atomowy)

---

### 8.4 Scalability

**Current Load (MVP):** 
- 10-100 użytkowników
- ~10-50 DELETE requests / dzień / użytkownik
- Całkowite: ~1,000-5,000 DELETE / dzień

**Supabase Free Tier:** 
- 500 MB database
- 50,000 monthly requests (bezpieczny margines)

**Bottlenecks:** Brak (endpoint jest jednym z najprostszych operacji)

---

## 9. Etapy wdrożenia

### Krok 1: Rozszerzenie serwisu FlashcardService

**Plik:** `src/lib/services/flashcard.service.ts`

**Zadanie:** Dodaj metodę `deleteFlashcard`

**Implementacja:**

```typescript
/**
 * Deletes a flashcard permanently (hard delete)
 *
 * @param flashcardId - UUID of the flashcard to delete
 * @param userId - ID of the authenticated user (from locals.user.id)
 * @throws {NotFoundError} When flashcard doesn't exist or doesn't belong to user
 * @throws {Error} On database deletion failure
 */
async deleteFlashcard(flashcardId: string, userId: string): Promise<void> {
  // Delete flashcard with ownership check
  const { data, error } = await this.supabase
    .from("flashcards")
    .delete()
    .eq("id", flashcardId)
    .eq("user_id", userId) // Authorization: only owner can delete
    .select(); // Returns deleted rows for verification

  // Handle database errors
  if (error) {
    console.error("Database error during flashcard deletion:", error);
    throw new Error("Failed to delete flashcard");
  }

  // Handle not found (0 rows deleted)
  if (!data || data.length === 0) {
    throw new NotFoundError(
      "The specified flashcard does not exist or does not belong to your account",
      "flashcard"
    );
  }

  // Success: 1 row deleted (implicit void return)
}
```

**Testy jednostkowe (opcjonalne w MVP, zalecane później):**
- Test: Usunięcie własnej fiszki → sukces
- Test: Usunięcie cudzej fiszki → NotFoundError
- Test: Usunięcie nieistniejącej fiszki → NotFoundError
- Test: Database error → Error thrown

---

### Krok 2: Utworzenie API endpoint handler

**Plik:** `src/pages/api/flashcards/[id].ts` (dynamic route)

**Zadanie:** Utwórz handler dla DELETE method

**Struktura pliku:**

```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import { FlashcardService } from "../../../lib/services/flashcard.service";
import { NotFoundError } from "../../../lib/errors";
import type { ErrorResponseDTO } from "../../../types";

// Disable prerendering (API route)
export const prerender = false;

// Validation schema for URL parameter
const DeleteFlashcardParams = z.object({
  id: z.string().uuid({ message: "Invalid flashcard ID format" }),
});

/**
 * DELETE /api/flashcards/:id
 * Permanently deletes a flashcard
 */
export const DELETE: APIRoute = async (context) => {
  try {
    // Step 1: Validate URL parameter
    const { id } = DeleteFlashcardParams.parse({ id: context.params.id });

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

    // Step 3: Initialize service
    const flashcardService = new FlashcardService(context.locals.supabase);

    // Step 4: Delete flashcard
    await flashcardService.deleteFlashcard(id, context.locals.user.id);

    // Step 5: Return success (204 No Content)
    return new Response(null, { status: 204 });

  } catch (error) {
    // Handle validation errors (Zod)
    if (error instanceof z.ZodError) {
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
    console.error("Failed to delete flashcard:", error);
    const errorResponse: ErrorResponseDTO = {
      error: "Internal server error",
      message: "An unexpected error occurred while deleting flashcard",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

---

### Krok 3: Testowanie endpoint przez API client

**Narzędzie:** Thunder Client / Postman / curl

**Test Case 1: Sukces (204 No Content)**

```bash
DELETE http://localhost:4321/api/flashcards/550e8400-e29b-41d4-a716-446655440000
Cookie: sb-xxx-auth-token=<valid-session-token>

Expected Response:
Status: 204 No Content
Body: (empty)
```

**Test Case 2: Unauthorized (401)**

```bash
DELETE http://localhost:4321/api/flashcards/550e8400-e29b-41d4-a716-446655440000
# No Cookie header

Expected Response:
Status: 401 Unauthorized
Body: { "error": "Unauthorized", "message": "Authentication required" }
```

**Test Case 3: Not Found (404)**

```bash
DELETE http://localhost:4321/api/flashcards/00000000-0000-0000-0000-000000000000
Cookie: sb-xxx-auth-token=<valid-session-token>

Expected Response:
Status: 404 Not Found
Body: { "error": "Flashcard not found" }
```

**Test Case 4: Invalid UUID (400)**

```bash
DELETE http://localhost:4321/api/flashcards/invalid-uuid-format
Cookie: sb-xxx-auth-token=<valid-session-token>

Expected Response:
Status: 400 Bad Request
Body: {
  "error": "Validation failed",
  "details": [{ "field": "id", "message": "Invalid flashcard ID format" }]
}
```

---

### Krok 4: Integracja z frontendem (React)

**Lokalizacja:** Component z listą fiszek lub szczegółami pojedynczej fiszki

**Przykładowa funkcja delete:**

```typescript
const handleDeleteFlashcard = async (flashcardId: string) => {
  // Confirmation dialog (REQUIRED per specification)
  const confirmed = window.confirm(
    "Are you sure you want to delete this flashcard? This action cannot be undone."
  );
  
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/flashcards/${flashcardId}`, {
      method: "DELETE",
      credentials: "include", // Include cookies (auth token)
    });

    if (response.status === 204) {
      // Success: Remove flashcard from UI
      console.log("Flashcard deleted successfully");
      // Update state to remove deleted card
      setFlashcards((prev) => prev.filter((card) => card.id !== flashcardId));
      return;
    }

    if (response.status === 404) {
      alert("Flashcard not found or already deleted");
      return;
    }

    if (response.status === 401) {
      alert("Session expired. Please log in again.");
      window.location.href = "/auth/login";
      return;
    }

    // Unexpected error
    alert("Failed to delete flashcard. Please try again.");
  } catch (error) {
    console.error("Error deleting flashcard:", error);
    alert("Network error. Please check your connection.");
  }
};
```

**UI Considerations:**
- Przycisk "Delete" powinien być disabled podczas wykonywania request (prevent double-click)
- Wyświetl loading spinner podczas operacji
- Po sukcesie: Usuń fiszkę z listy lub przekieruj użytkownika
- Toast notification: "Flashcard deleted successfully"

---

### Krok 5: Walidacja bezpieczeństwa

**Manual Security Testing:**

1. **Test: Próba usunięcia cudzej fiszki**
   - User A tworzy fiszkę (ID: `aaa-111`)
   - User B próbuje: `DELETE /api/flashcards/aaa-111`
   - **Expected:** 404 Not Found (nie 403, aby uniknąć information disclosure)

2. **Test: Próba usunięcia bez logowania**
   - Wyloguj się
   - Wywołaj: `DELETE /api/flashcards/<any-id>`
   - **Expected:** 401 Unauthorized

3. **Test: SQL Injection attempt**
   - Wywołaj: `DELETE /api/flashcards/<uuid>'; DROP TABLE flashcards;--`
   - **Expected:** 400 Bad Request (UUID validation fails)

4. **Test: UUID enumeration**
   - Sprawdź losowe UUID: `DELETE /api/flashcards/<random-uuid>`
   - **Expected:** 404 Not Found (brak informacji, czy UUID istnieje)

---

### Krok 6: Weryfikacja RLS (Row Level Security)

**Jeśli używasz Supabase RLS:**

**Sprawdź politykę DELETE w Supabase Dashboard:**

```sql
-- Policy name: "Users can delete own flashcards"
CREATE POLICY "Users can delete own flashcards"
ON public.flashcards
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

**Test RLS:**
- Spróbuj wykonać DELETE bezpośrednio w SQL Editor z innym `user_id`
- RLS powinien zablokować operację (0 rows affected)

---

### Krok 7: Monitoring i Logi (Production)

**Co logować:**
- Każde wywołanie DELETE endpoint (userId, flashcardId, timestamp)
- Błędy 404 (potential enumeration attacks)
- Błędy 500 (database issues)

**Przykładowa implementacja logowania:**

```typescript
// Before delete
console.log(`DELETE request: user=${userId}, flashcard=${flashcardId}`);

// After delete (in catch block)
if (error instanceof NotFoundError) {
  console.warn(`404 Not Found: user=${userId}, flashcard=${flashcardId}`);
}
```

**Production Tools:**
- Supabase Logs (Dashboard → Logs)
- Application Performance Monitoring (APM) - np. Sentry, LogRocket
- Custom analytics tracking dla metryk usunięć

---

### Krok 8: Dokumentacja dla zespołu

**Dodaj dokumentację do:**

1. **API Documentation (jeśli istnieje):**
   - Endpoint URL, method, parameters
   - Request/response examples
   - Error codes

2. **Codebase Comments:**
   - JSDoc w serwisie (już uwzględniony w Krok 1)
   - Komentarze w endpoint handler (już uwzględniony w Krok 2)

3. **Team Wiki / Notion:**
   - User flow: Jak użytkownik usuwa fiszkę
   - Security considerations: RLS, ownership checks
   - Frontend integration guide (Krok 4)

---

## 10. Checklist wdrożenia

- [ ] **Krok 1:** Dodano metodę `deleteFlashcard` do `FlashcardService`
- [ ] **Krok 2:** Utworzono endpoint handler `src/pages/api/flashcards/[id].ts`
- [ ] **Krok 3:** Przetestowano endpoint przez API client (wszystkie 4 test cases)
- [ ] **Krok 4:** Zintegrowano DELETE w komponencie frontend (z confirmation dialog)
- [ ] **Krok 5:** Przeprowadzono manual security testing
- [ ] **Krok 6:** Zweryfikowano RLS policies w Supabase
- [ ] **Krok 7:** Dodano logowanie błędów (console.error)
- [ ] **Krok 8:** Zaktualizowano dokumentację API

---

## 11. Potencjalne rozszerzenia (poza MVP)

### 11.1 Soft Delete
Zamiast hard delete, ustaw flagę `deleted_at`:
- Wymaga migracji: `ALTER TABLE flashcards ADD COLUMN deleted_at TIMESTAMPTZ NULL`
- Query zmienia się na: `UPDATE flashcards SET deleted_at = NOW() WHERE ...`
- Umożliwia "Undo" deletion w UI (przywracanie fiszek)

### 11.2 Bulk Delete
Endpoint: `DELETE /api/flashcards/bulk` z body: `{ "ids": ["uuid1", "uuid2"] }`
- Transakcja usuwająca wiele fiszek jednocześnie
- Użyteczne dla "Select All → Delete" w UI

### 11.3 Audit Log
Tabela `audit_logs` przechowująca historię usunięć:
- Kolumny: `user_id`, `action` ("delete"), `resource_type` ("flashcard"), `resource_id`, `timestamp`
- Umożliwia compliance tracking i recovery

---

## 12. Znane ograniczenia MVP

1. **Brak soft delete:** Usunięcie jest nieodwracalne (akceptowalne w MVP)
2. **Brak rate limiting:** Teoretycznie możliwy abuse (niskie ryzyko dla aplikacji za loginem)
3. **Brak bulk delete:** Użytkownik musi usuwać fiszki pojedynczo (akceptowalne dla małej liczby fiszek)
4. **Brak audit log:** Brak historii usunięć do celów compliance (nie jest wymagane w MVP)

---

## 13. Podsumowanie

Endpoint `DELETE /api/flashcards/:id` to **prosta operacja CRUD** z naciskiem na bezpieczeństwo (authentication, authorization, ownership verification). Implementacja wymaga:

1. **Service layer:** Metoda `deleteFlashcard` w `FlashcardService`
2. **API handler:** Dynamic route `[id].ts` z validacją UUID
3. **Frontend:** Confirmation dialog + fetch request + UI update
4. **Security:** RLS policies + explicit ownership check + 404 instead of 403

**Szacowany czas implementacji:** 2-4 godziny (z testowaniem)

**Ryzyko:** Niskie (endpoint bazuje na istniejącej infrastrukturze FlashcardService + Supabase Auth)

