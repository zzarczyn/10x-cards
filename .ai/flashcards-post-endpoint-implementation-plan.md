# API Endpoint Implementation Plan: POST /api/flashcards

## 1. Przegląd punktu końcowego

**Endpoint:** `POST /api/flashcards`

**Cel:** Tworzenie pojedynczej fiszki w systemie. Endpoint obsługuje dwa scenariusze:
1. **Utworzenie ręczne** - użytkownik tworzy fiszkę od zera (`source: "manual"`)
2. **Zapisanie z AI** - użytkownik zapisuje/edytuje fiszkę wygenerowaną wcześniej przez AI (`source: "ai-full"` lub `"ai-edited"`)

**Kluczowa funkcjonalność:**
- Walidacja spójności między typem źródła (`source`) a identyfikatorem generacji (`generation_id`)
- Weryfikacja własności generacji (generation_id należy do zalogowanego użytkownika)
- Automatyczne przypisanie `user_id` z kontekstu uwierzytelnionego użytkownika
- Zwracanie pełnego obiektu fiszki z przypisanymi timestampami

---

## 2. Szczegóły żądania

### HTTP Method
`POST`

### URL Structure
```
POST /api/flashcards
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>  # Automatycznie obsługiwane przez Supabase Auth
```

### Request Body Structure

```typescript
{
  front: string;           // 1-200 znaków, nie może być pusty/tylko whitespace
  back: string;            // 1-500 znaków, nie może być pusty/tylko whitespace
  source: "manual" | "ai-full" | "ai-edited";
  generation_id: string | null;  // UUID lub null
}
```

### Parametry Request Body

#### Wymagane:
- **`front`** (string)
  - Treść przodu fiszki (pytanie/prompt)
  - Minimum: 1 znak (po trim)
  - Maximum: 200 znaków
  - Nie może zawierać tylko whitespace
  
- **`back`** (string)
  - Treść tyłu fiszki (odpowiedź/wyjaśnienie)
  - Minimum: 1 znak (po trim)
  - Maximum: 500 znaków
  - Nie może zawierać tylko whitespace
  
- **`source`** (enum)
  - Źródło pochodzenia fiszki
  - Dozwolone wartości: `"manual"`, `"ai-full"`, `"ai-edited"`
  
- **`generation_id`** (string | null)
  - UUID sesji generacji AI (jeśli fiszka pochodzi z AI)
  - Format: UUID v4
  - **Logika walidacji:**
    - Jeśli `source = "manual"` → **MUSI** być `null`
    - Jeśli `source = "ai-full"` lub `"ai-edited"` → **MUSI** być poprawnym UUID
    - Jeśli UUID podany → musi istnieć w tabeli `generations` i należeć do zalogowanego użytkownika

#### Opcjonalne:
Brak (wszystkie pola są wymagane)

### Przykłady Request Body

**Scenariusz 1: Ręczne utworzenie fiszki**
```json
{
  "front": "What is the capital of France?",
  "back": "Paris",
  "source": "manual",
  "generation_id": null
}
```

**Scenariusz 2: Zapisanie fiszki z AI bez edycji**
```json
{
  "front": "Explain the concept of closure in JavaScript",
  "back": "A closure is a function that has access to variables in its outer (enclosing) lexical scope, even after the outer function has returned.",
  "source": "ai-full",
  "generation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Scenariusz 3: Zapisanie fiszki z AI z edycją**
```json
{
  "front": "What is a closure?",
  "back": "A closure is a function that remembers variables from its outer scope, even after that scope has finished executing.",
  "source": "ai-edited",
  "generation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 3. Wykorzystywane typy

### DTOs i Command Models z `src/types.ts`

#### Request (Command Model):
```typescript
// Używany dla parsowania request body
export type CreateFlashcardCommand = Omit<
  TablesInsert<"flashcards">, 
  "user_id" | "id" | "created_at" | "updated_at"
>;

// Struktura:
// {
//   front: string;
//   back: string;
//   source: "manual" | "ai-full" | "ai-edited";
//   generation_id: string | null;
// }
```

#### Response (DTO):
```typescript
// Pełny obiekt fiszki zwracany w odpowiedzi
export type FlashcardDTO = FlashcardEntity;

// Struktura (z database.types.ts):
// {
//   id: string;              // UUID
//   user_id: string;         // UUID
//   front: string;           // VARCHAR(200)
//   back: string;            // VARCHAR(500)
//   source: "manual" | "ai-full" | "ai-edited";
//   generation_id: string | null;  // UUID lub null
//   created_at: string;      // ISO 8601 timestamp
//   updated_at: string;      // ISO 8601 timestamp
// }
```

#### Errors (DTOs):
```typescript
// Standardowa struktura błędu
export interface ErrorResponseDTO {
  error: string;
  message?: string;
  details?: ValidationErrorDetail[];
  retryable?: boolean;
}

// Szczegóły błędów walidacji
export interface ValidationErrorDetail {
  field: string;
  message: string;
}
```

### Typy z `src/db/database.types.ts`

```typescript
// Enum źródła fiszki
export type CardSourceType = "manual" | "ai-full" | "ai-edited";

// Row type dla tabeli flashcards
export type FlashcardEntity = Tables<"flashcards">;

// Insert type dla tabeli flashcards
export type FlashcardInsert = TablesInsert<"flashcards">;
```

---

## 4. Szczegóły odpowiedzi

### Success Response (201 Created)

**Status Code:** `201 Created`

**Headers:**
```http
Content-Type: application/json
```

**Body:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "789e0123-e89b-12d3-a456-426614174999",
  "front": "What is the capital of France?",
  "back": "Paris",
  "source": "manual",
  "generation_id": null,
  "created_at": "2025-12-08T10:30:00.000Z",
  "updated_at": "2025-12-08T10:30:00.000Z"
}
```

### Error Responses

#### 400 Bad Request - Validation Error

**Scenariusz 1: Puste pole**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "front",
      "message": "Front side cannot be empty or whitespace only"
    }
  ]
}
```

**Scenariusz 2: Przekroczenie długości**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "back",
      "message": "Back side cannot exceed 500 characters"
    }
  ]
}
```

**Scenariusz 3: Niezgodność source z generation_id**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "generation_id",
      "message": "generation_id must be null for manual cards and required for AI-generated cards"
    }
  ]
}
```

**Scenariusz 4: Nieprawidłowy format JSON**
```json
{
  "error": "Invalid JSON",
  "message": "Request body must be valid JSON"
}
```

#### 401 Unauthorized - Authentication Error

```json
{
  "error": "Authentication required",
  "message": "Please log in to continue"
}
```

**Kiedy wystąpi:**
- Brak tokena JWT w nagłówku Authorization
- Token wygasł
- Token nieprawidłowy

**Uwaga:** Ten błąd jest obsługiwany przez middleware (`src/middleware/index.ts`)

#### 404 Not Found - Generation Not Found

```json
{
  "error": "Generation not found",
  "message": "The specified generation_id does not exist or does not belong to your account"
}
```

**Kiedy wystąpi:**
- Podany `generation_id` nie istnieje w tabeli `generations`
- `generation_id` należy do innego użytkownika (naruszenie własności)

#### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred. Please try again later."
}
```

**Kiedy wystąpi:**
- Błąd połączenia z bazą danych
- Naruszenie constraint w bazie danych (teoretycznie nie powinno wystąpić po walidacji Zod)
- Nieoczekiwane wyjątki

---

## 5. Przepływ danych

### Diagram przepływu

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/flashcards
       │ { front, back, source, generation_id }
       ▼
┌──────────────────────────────────────────────────────────┐
│                     Middleware                           │
│  - Dodaj Supabase client do context.locals              │
│  - Sprawdź uwierzytelnienie (JWT token)                 │
│  - Pobierz user z Supabase Auth                         │
│  - Dodaj user do context.locals.user                    │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼ (jeśli auth OK)
┌──────────────────────────────────────────────────────────┐
│          Endpoint: POST /api/flashcards                  │
│  1. Double-check authentication (locals.user exists)    │
│  2. Parse request.json()                                │
│  3. Validate with Zod schema                            │
│  4. Call FlashcardService.createFlashcard()             │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│         Service: FlashcardService                        │
│  1. Jeśli generation_id !== null:                       │
│     - Sprawdź czy generation istnieje                   │
│     - Sprawdź czy generation.user_id = current user     │
│     - Jeśli nie → throw NotFoundError                   │
│  2. Insert do tabeli flashcards:                        │
│     - front, back, source, generation_id (z request)    │
│     - user_id (z locals.user.id)                        │
│  3. Return inserted row (FlashcardDTO)                  │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│                  Supabase Database                       │
│  - Wykonaj INSERT do public.flashcards                  │
│  - Sprawdź RLS policies (user może tworzyć swoje)       │
│  - Sprawdź CHECK constraints (TRIM(front) > 0, etc.)    │
│  - Automatycznie ustaw id, created_at, updated_at       │
│  - Return nowy rekord                                   │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│           Response do Client                             │
│  Status: 201 Created                                     │
│  Body: FlashcardDTO (pełny obiekt fiszki)               │
└──────────────────────────────────────────────────────────┘
```

### Szczegółowy przepływ krok po kroku

#### Krok 1: Middleware Authentication (automatyczny)
- Middleware (`src/middleware/index.ts`) automatycznie sprawdza uwierzytelnienie dla wszystkich `/api/*` endpoints
- Jeśli brak tokena → zwraca 401 Unauthorized
- Jeśli token OK → dodaje `locals.user` i `locals.supabase` do kontekstu

#### Krok 2: Endpoint - Parse & Validate
```typescript
// 1. Double-check auth (defensive)
if (!locals.user) {
  return 401 Unauthorized
}

// 2. Parse JSON
const body = await request.json()

// 3. Validate with Zod
const validationResult = CreateFlashcardSchema.safeParse(body)
if (!validationResult.success) {
  return 400 Bad Request with details
}
```

#### Krok 3: Service - Validate Generation Ownership
```typescript
// Jeśli generation_id podany
if (command.generation_id !== null) {
  const generation = await supabase
    .from("generations")
    .select("user_id")
    .eq("id", command.generation_id)
    .single()
  
  if (!generation || generation.user_id !== userId) {
    throw NotFoundError
  }
}
```

#### Krok 4: Service - Insert Flashcard
```typescript
const { data, error } = await supabase
  .from("flashcards")
  .insert({
    front: command.front,
    back: command.back,
    source: command.source,
    generation_id: command.generation_id,
    user_id: userId,  // z locals.user.id
  })
  .select()
  .single()

if (error) {
  throw DatabaseError
}

return data as FlashcardDTO
```

#### Krok 5: Return Response
```typescript
return new Response(JSON.stringify(flashcard), {
  status: 201,
  headers: { "Content-Type": "application/json" }
})
```

---

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnienie (Authentication)

**Mechanizm:** Supabase JWT Token (obsługiwane przez middleware)

**Implementacja:**
- Middleware automatycznie sprawdza token JWT dla wszystkich `/api/*` endpoints
- Token jest weryfikowany przez `context.locals.supabase.auth.getUser()`
- Jeśli token nieprawidłowy/wygasł → middleware zwraca 401 przed dotarciem do endpointu

**Defensive Programming:**
- Endpoint dodatkowo sprawdza `locals.user` (double-check)
- Zabezpiecza przed potencjalnymi błędami w middleware

### 6.2 Autoryzacja (Authorization)

**User ID Assignment:**
- `user_id` jest **zawsze** pobierany z `locals.user.id` (zaufane źródło)
- **NIGDY** nie ufamy `user_id` z request body
- Supabase RLS policies dodatkowo wymuszają, że użytkownik może tworzyć tylko swoje fiszki

**Generation Ownership Validation:**
```typescript
// Sprawdzenie własności generation_id
if (generation_id !== null) {
  const generation = await supabase
    .from("generations")
    .select("user_id")
    .eq("id", generation_id)
    .single();
  
  // Błąd jeśli generation nie istnieje LUB należy do innego użytkownika
  if (!generation || generation.user_id !== userId) {
    throw NotFoundError; // 404 zamiast 403 (nie ujawniamy istnienia)
  }
}
```

**Dlaczego 404 zamiast 403?**
- Nie ujawniamy użytkownikowi informacji, czy generation_id istnieje
- Zapobiega enumeracji generation_id innych użytkowników

### 6.3 Walidacja danych wejściowych

**Poziomy walidacji:**

1. **Walidacja Zod Schema (Application Layer)**
   ```typescript
   - Typ danych (string, enum)
   - Długość (min/max)
   - Format (UUID)
   - Cross-field validation (source vs generation_id)
   - Whitespace validation (trim + length > 0)
   ```

2. **Walidacja Database Constraints (Database Layer)**
   ```sql
   - CHECK (LENGTH(TRIM(front)) > 0)
   - CHECK (LENGTH(TRIM(back)) > 0)
   - NOT NULL constraints
   - FOREIGN KEY constraints
   ```

**Defense in Depth:** Podwójna walidacja zapobiega bypass'owi na poziomie aplikacji

### 6.4 SQL Injection Prevention

**Mechanizm:** Supabase Client używa parametryzowanych zapytań

**Przykład bezpiecznego zapytania:**
```typescript
// ✅ BEZPIECZNE - Supabase automatycznie parametryzuje wartości
await supabase
  .from("flashcards")
  .insert({ front: userInput })  // userInput jest bezpiecznie escapowany
```

**❌ NIGDY nie rób:**
```typescript
// ❌ NIEBEZPIECZNE - Raw SQL z konkatenacją
await supabase.rpc('raw_query', { 
  query: `INSERT INTO flashcards (front) VALUES ('${userInput}')` 
})
```

### 6.5 Row Level Security (RLS)

**Supabase RLS Policy dla tabeli `flashcards`:**

```sql
-- Policy: Użytkownik może tworzyć tylko swoje fiszki
CREATE POLICY "Users can insert their own flashcards"
ON public.flashcards
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Użytkownik może czytać tylko swoje fiszki
CREATE POLICY "Users can view their own flashcards"
ON public.flashcards
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

**Zalety:**
- Nawet jeśli kod aplikacji ma błąd, baza danych wymusza separację danych
- RLS działa na poziomie PostgreSQL - nie można go obejść z poziomu API

### 6.6 Rate Limiting (Rekomendacja)

**Status:** Nie jest wymagane w MVP, ale warto rozważyć w przyszłości

**Implementacja (przyszłość):**
- Middleware z licznikiem zapytań per user
- Limit: np. 100 fiszek/godzinę per user
- Zapobiega spam'owi i abuse'owi

### 6.7 Input Sanitization

**XSS Prevention:**
- API zwraca tylko JSON (nie renderuje HTML)
- Frontend powinien używać `textContent` zamiast `innerHTML` przy wyświetlaniu
- Supabase automatycznie escapuje wartości w zapytaniach

**Content Validation:**
```typescript
// Trim whitespace na początku i końcu
const trimmedFront = command.front.trim();
const trimmedBack = command.back.trim();

// Odrzuć jeśli po trim jest puste
if (trimmedFront.length === 0 || trimmedBack.length === 0) {
  throw ValidationError;
}
```

---

## 7. Obsługa błędów

### 7.1 Hierarchia błędów

```
Błąd
├── ValidationError (400)      - Nieprawidłowe dane wejściowe
├── AuthenticationError (401)  - Brak/nieprawidłowy token
├── NotFoundError (404)        - Generation nie istnieje/nie należy do usera
└── DatabaseError (500)        - Błędy bazy danych
```

### 7.2 Szczegółowe scenariusze błędów

#### Błąd 400: Bad Request - Validation Errors

**Scenariusz 1: Nieprawidłowy JSON**
```typescript
// Request: { "front": "test", "back": invalid }
try {
  await request.json();
} catch {
  return {
    error: "Invalid JSON",
    message: "Request body must be valid JSON"
  }; // 400
}
```

**Scenariusz 2: Brakujące pole**
```typescript
// Request: { "front": "test" }  // brak back, source, generation_id
{
  "error": "Validation failed",
  "details": [
    { "field": "back", "message": "Back side is required" },
    { "field": "source", "message": "Source is required" },
    { "field": "generation_id", "message": "Generation ID is required" }
  ]
}
```

**Scenariusz 3: Pole za długie**
```typescript
// Request: { "front": "a".repeat(201), ... }
{
  "error": "Validation failed",
  "details": [
    { "field": "front", "message": "Front side cannot exceed 200 characters" }
  ]
}
```

**Scenariusz 4: Pole puste/tylko whitespace**
```typescript
// Request: { "front": "   ", ... }
{
  "error": "Validation failed",
  "details": [
    { "field": "front", "message": "Front side cannot be empty or whitespace only" }
  ]
}
```

**Scenariusz 5: Nieprawidłowy source**
```typescript
// Request: { "source": "invalid", ... }
{
  "error": "Validation failed",
  "details": [
    { "field": "source", "message": "Source must be one of: manual, ai-full, ai-edited" }
  ]
}
```

**Scenariusz 6: Niezgodność source z generation_id**
```typescript
// Request: { "source": "manual", "generation_id": "some-uuid", ... }
{
  "error": "Validation failed",
  "details": [
    { "field": "generation_id", "message": "generation_id must be null for manual cards and required for AI-generated cards" }
  ]
}

// LUB: { "source": "ai-full", "generation_id": null, ... }
{
  "error": "Validation failed",
  "details": [
    { "field": "generation_id", "message": "generation_id must be null for manual cards and required for AI-generated cards" }
  ]
}
```

**Scenariusz 7: Nieprawidłowy format UUID**
```typescript
// Request: { "generation_id": "not-a-uuid", ... }
{
  "error": "Validation failed",
  "details": [
    { "field": "generation_id", "message": "Invalid UUID format" }
  ]
}
```

#### Błąd 401: Unauthorized - Authentication Error

**Obsługiwany przez middleware:**
```typescript
// Middleware sprawdza token przed dotarciem do endpointu
{
  "error": "Authentication required",
  "message": "Please log in to continue"
}
```

**Kiedy wystąpi:**
- Brak nagłówka `Authorization`
- Token JWT wygasł
- Token JWT nieprawidłowy/sfałszowany

#### Błąd 404: Not Found - Generation Not Found

```typescript
// Service sprawdza istnienie generation_id
{
  "error": "Generation not found",
  "message": "The specified generation_id does not exist or does not belong to your account"
}
```

**Kiedy wystąpi:**
- `generation_id` nie istnieje w tabeli `generations`
- `generation_id` należy do innego użytkownika (naruszenie własności)

**Uwaga bezpieczeństwa:**
- Używamy 404 zamiast 403, aby nie ujawniać istnienia generation_id
- Komunikat jest celowo niejednoznaczny ("nie istnieje LUB nie należy")

#### Błąd 500: Internal Server Error

```typescript
{
  "error": "Internal server error",
  "message": "An unexpected error occurred. Please try again later."
}
```

**Kiedy wystąpi:**
- Błąd połączenia z Supabase
- Naruszenie constraint w bazie danych (nie powinno się zdarzyć po walidacji)
- Nieoczekiwane wyjątki (programming errors)

**Logging:**
```typescript
console.error("[UNEXPECTED_ERROR]", {
  timestamp: new Date().toISOString(),
  userId: locals.user?.id,
  endpoint: "/api/flashcards",
  error: error instanceof Error ? error.message : String(error),
  stack: error instanceof Error ? error.stack : undefined,
});
```

### 7.3 Error Handling Pattern w kodzie

```typescript
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Auth check
    if (!locals.user) {
      return createErrorResponse(401, "Authentication required", ...);
    }

    // 2. Parse JSON
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(400, "Invalid JSON", ...);
    }

    // 3. Validate with Zod
    const validationResult = CreateFlashcardSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(400, "Validation failed", validationResult.error);
    }

    // 4. Call service
    const service = new FlashcardService(locals.supabase);
    const flashcard = await service.createFlashcard(validationResult.data, locals.user.id);

    // 5. Return success
    return new Response(JSON.stringify(flashcard), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    // Handle known errors
    if (error instanceof NotFoundError) {
      return createErrorResponse(404, "Generation not found", ...);
    }

    // Handle unexpected errors
    console.error("[UNEXPECTED_ERROR]", ...);
    return createErrorResponse(500, "Internal server error", ...);
  }
};
```

### 7.4 Nowy Error Class: NotFoundError

**Lokalizacja:** `src/lib/errors.ts`

```typescript
/**
 * Error class for resource not found scenarios
 * Used when generation_id doesn't exist or doesn't belong to user
 */
export class NotFoundError extends Error {
  constructor(
    message: string,
    public resource: string
  ) {
    super(message);
    this.name = "NotFoundError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotFoundError);
    }
  }
}
```

---

## 8. Rozważania dotyczące wydajności

### 8.1 Potencjalne wąskie gardła

#### 1. Walidacja generation_id (dodatkowe zapytanie do DB)

**Problem:**
- Każde utworzenie fiszki z AI (source = "ai-full" lub "ai-edited") wymaga dodatkowego SELECT do tabeli `generations`
- Może spowolnić request przy dużej liczbie użytkowników

**Wpływ:**
- Dodatkowe ~10-50ms latencji na request (zapytanie SELECT jest szybkie)
- Przy 100 req/s → 100 dodatkowych SELECT/s do tabeli generations

**Mitigacja:**
1. **Indeks na `generations.id`** (już istnieje - PRIMARY KEY)
2. **Cache generation ownership** (przyszłość):
   ```typescript
   // Redis cache: generation_id -> user_id
   const cachedUserId = await redis.get(`gen:${generation_id}`);
   if (cachedUserId === userId) {
     // Skip DB check
   }
   ```

#### 2. INSERT do tabeli flashcards

**Problem:**
- Każdy INSERT wymaga:
  - Sprawdzenia FOREIGN KEY (user_id → auth.users, generation_id → generations)
  - Sprawdzenia CHECK constraints (TRIM(front), TRIM(back))
  - Sprawdzenia RLS policies
  - Aktualizacji indeksów

**Wpływ:**
- ~50-100ms na pojedynczy INSERT (przy dobrze zindeksowanej tabeli)

**Mitigacja:**
- Indeksy są już zapewnione przez PRIMARY KEY i FOREIGN KEY
- RLS policies są wydajne (oparte na index scan)

#### 3. N+1 Problem (nie dotyczy tego endpointu)

**Status:** Nie występuje
- Endpoint tworzy tylko pojedynczą fiszkę
- Jeśli w przyszłości zrobimy batch endpoint (`POST /api/flashcards/batch`), wtedy trzeba uważać

### 8.2 Strategie optymalizacji

#### Optymalizacja 1: Minimalizacja pól w SELECT generation

**Obecnie:**
```typescript
// Pobieramy tylko user_id (nie cały rekord)
const generation = await supabase
  .from("generations")
  .select("user_id")
  .eq("id", generation_id)
  .single();
```

**Alternatywa (gorsza):**
```typescript
// ❌ Nie róbmy tego - pobiera wszystkie kolumny
const generation = await supabase
  .from("generations")
  .select("*")
  .eq("id", generation_id)
  .single();
```

**Oszczędność:** Mniejszy transfer danych z DB (~50 bytes vs ~200 bytes per row)

#### Optymalizacja 2: Connection Pooling

**Status:** Zapewnione przez Supabase automatycznie
- Supabase zarządza connection poolem (PgBouncer)
- Nie trzeba ręcznie zarządzać połączeniami

#### Optymalizacja 3: Async Operations (już używamy)

**Wszystkie operacje DB są async:**
```typescript
// ✅ DOBRE - używamy async/await
const generation = await supabase.from("generations")...
const flashcard = await supabase.from("flashcards").insert(...)...

// ❌ ZŁE - synchroniczne blokowanie (nie jest możliwe w Supabase)
```

### 8.3 Metryki wydajności (szacunki)

**Typowy request flow:**

| Krok | Operacja | Szacowany czas |
|------|----------|----------------|
| 1 | Middleware - auth check | ~20ms |
| 2 | Parse JSON | ~5ms |
| 3 | Zod validation | ~2ms |
| 4 | SELECT generations (jeśli AI) | ~15ms |
| 5 | INSERT flashcards | ~50ms |
| **Total** | | **~92ms** |

**Best case (manual flashcard, bez generation check):**
- ~77ms (bez kroku 4)

**Worst case (AI flashcard + slow DB):**
- ~150ms (przy większym obciążeniu)

### 8.4 Limity skalowalności

**Supabase Free Tier:**
- 500MB bazy danych
- 2GB bandwidth/miesiąc
- Nieograniczona liczba zapytań API

**Szacunki:**
- 1 fiszka ≈ ~200 bytes (po kompresji PostgreSQL)
- 500MB ÷ 200 bytes ≈ **2.5M fiszek** w darmowym planie
- Dla 1000 aktywnych użytkowników = **2500 fiszek/user** (bardzo hojne dla MVP)

### 8.5 Monitoring i Alerting (rekomendacja na przyszłość)

**Metryki do śledzenia:**
1. **Request latency** (p50, p95, p99)
2. **Error rate** (% requests z 5xx)
3. **Database query time** (per-query metrics)
4. **RLS policy execution time**

**Narzędzia:**
- Supabase Dashboard (built-in metrics)
- Application logs (console.error z timestamps)

---

## 9. Etapy wdrożenia

### Faza 1: Przygotowanie - Nowe typy błędów

**Cel:** Dodać nowy error class dla Not Found scenarios

**Plik:** `src/lib/errors.ts`

**Zadania:**
1. Dodaj klasę `NotFoundError`:
   ```typescript
   export class NotFoundError extends Error {
     constructor(
       message: string,
       public resource: string
     ) {
       super(message);
       this.name = "NotFoundError";
       if (Error.captureStackTrace) {
         Error.captureStackTrace(this, NotFoundError);
       }
     }
   }
   ```

2. Eksportuj w pliku errors.ts:
   ```typescript
   export { LLMServiceError, ValidationError, NotFoundError };
   ```

**Weryfikacja:**
- Linter nie zgłasza błędów
- TypeScript compilation passes

---

### Faza 2: Service Layer - FlashcardService

**Cel:** Utworzyć service do zarządzania operacjami CRUD na fiszkach

**Plik:** `src/lib/services/flashcard.service.ts` (nowy plik)

**Zadania:**

1. **Zaimportuj typy i dependencies:**
   ```typescript
   import type { SupabaseClient } from "../../db/supabase.client";
   import type { CreateFlashcardCommand, FlashcardDTO } from "../../types";
   import { NotFoundError } from "../errors";
   ```

2. **Utwórz klasę FlashcardService:**
   ```typescript
   export class FlashcardService {
     constructor(private supabase: SupabaseClient) {}
   }
   ```

3. **Implementuj metodę `createFlashcard`:**
   ```typescript
   async createFlashcard(
     command: CreateFlashcardCommand,
     userId: string
   ): Promise<FlashcardDTO> {
     // Krok 1: Waliduj generation_id jeśli podany
     if (command.generation_id !== null) {
       await this.validateGenerationOwnership(command.generation_id, userId);
     }

     // Krok 2: Insert do bazy
     const { data, error } = await this.supabase
       .from("flashcards")
       .insert({
         front: command.front,
         back: command.back,
         source: command.source,
         generation_id: command.generation_id,
         user_id: userId,
       })
       .select()
       .single();

     // Krok 3: Handle errors
     if (error || !data) {
       console.error("Failed to create flashcard:", error);
       throw new Error("Failed to create flashcard");
     }

     return data as FlashcardDTO;
   }
   ```

4. **Implementuj prywatną metodę `validateGenerationOwnership`:**
   ```typescript
   private async validateGenerationOwnership(
     generationId: string,
     userId: string
   ): Promise<void> {
     const { data, error } = await this.supabase
       .from("generations")
       .select("user_id")
       .eq("id", generationId)
       .single();

     // Generation nie istnieje lub błąd DB
     if (error || !data) {
       throw new NotFoundError(
         "The specified generation_id does not exist or does not belong to your account",
         "generation"
       );
     }

     // Generation należy do innego użytkownika
     if (data.user_id !== userId) {
       throw new NotFoundError(
         "The specified generation_id does not exist or does not belong to your account",
         "generation"
       );
     }
   }
   ```

**Weryfikacja:**
- TypeScript compilation passes
- ESLint passes
- Service może być zaimportowany w endpoint

---

### Faza 3: Zod Schema - Walidacja request

**Cel:** Utworzyć Zod schema dla walidacji CreateFlashcardCommand

**Plik:** `src/pages/api/flashcards/index.ts` (w sekcji przed handlerem)

**Zadania:**

1. **Zaimportuj Zod:**
   ```typescript
   import { z } from "zod";
   ```

2. **Utwórz schema:**
   ```typescript
   const CreateFlashcardSchema = z
     .object({
       front: z
         .string()
         .min(1, "Front side is required")
         .max(200, "Front side cannot exceed 200 characters")
         .refine(
           (val) => val.trim().length > 0,
           "Front side cannot be empty or whitespace only"
         ),
       back: z
         .string()
         .min(1, "Back side is required")
         .max(500, "Back side cannot exceed 500 characters")
         .refine(
           (val) => val.trim().length > 0,
           "Back side cannot be empty or whitespace only"
         ),
       source: z.enum(["manual", "ai-full", "ai-edited"], {
         errorMap: () => ({
           message: "Source must be one of: manual, ai-full, ai-edited",
         }),
       }),
       generation_id: z.string().uuid().nullable(),
     })
     .refine(
       (data) => {
         // Logika: manual → null, ai-* → UUID required
         if (data.source === "manual" && data.generation_id !== null) {
           return false;
         }
         if (
           (data.source === "ai-full" || data.source === "ai-edited") &&
           data.generation_id === null
         ) {
           return false;
         }
         return true;
       },
       {
         message:
           "generation_id must be null for manual cards and required for AI-generated cards",
         path: ["generation_id"],
       }
     );
   ```

**Weryfikacja:**
- Schema kompiluje się bez błędów
- TypeScript infers prawidłowy typ z `validationResult.data`

---

### Faza 4: API Endpoint - POST Handler

**Cel:** Utworzyć endpoint handler dla POST /api/flashcards

**Plik:** `src/pages/api/flashcards/index.ts` (nowy plik)

**Zadania:**

1. **Utwórz plik z importami:**
   ```typescript
   import type { APIRoute } from "astro";
   import { z } from "zod";
   import { FlashcardService } from "../../../lib/services/flashcard.service";
   import { NotFoundError } from "../../../lib/errors";
   import type {
     CreateFlashcardCommand,
     FlashcardDTO,
     ErrorResponseDTO,
   } from "../../../types";

   export const prerender = false;
   ```

2. **Dodaj Zod schema** (z Fazy 3)

3. **Implementuj POST handler:**
   ```typescript
   export const POST: APIRoute = async ({ request, locals }) => {
     try {
       // 1. Authentication check (double-check)
       const user = locals.user;
       if (!user) {
         const errorResponse: ErrorResponseDTO = {
           error: "Authentication required",
           message: "Please log in to continue",
         };
         return new Response(JSON.stringify(errorResponse), {
           status: 401,
           headers: { "Content-Type": "application/json" },
         });
       }

       // 2. Parse request body
       let body: unknown;
       try {
         body = await request.json();
       } catch {
         const errorResponse: ErrorResponseDTO = {
           error: "Invalid JSON",
           message: "Request body must be valid JSON",
         };
         return new Response(JSON.stringify(errorResponse), {
           status: 400,
           headers: { "Content-Type": "application/json" },
         });
       }

       // 3. Validate with Zod schema
       const validationResult = CreateFlashcardSchema.safeParse(body);

       if (!validationResult.success) {
         const errorResponse: ErrorResponseDTO = {
           error: "Validation failed",
           details: validationResult.error.errors.map((err) => ({
             field: err.path.join("."),
             message: err.message,
           })),
         };
         return new Response(JSON.stringify(errorResponse), {
           status: 400,
           headers: { "Content-Type": "application/json" },
         });
       }

       const command: CreateFlashcardCommand = validationResult.data;

       // 4. Initialize FlashcardService
       const service = new FlashcardService(locals.supabase);

       // 5. Create flashcard
       const flashcard: FlashcardDTO = await service.createFlashcard(
         command,
         user.id
       );

       // 6. Return success response (201 Created)
       return new Response(JSON.stringify(flashcard), {
         status: 201,
         headers: { "Content-Type": "application/json" },
       });
     } catch (error) {
       // 7. Handle NotFoundError (generation_id not found)
       if (error instanceof NotFoundError) {
         console.error("[NOT_FOUND]", {
           timestamp: new Date().toISOString(),
           userId: locals.user?.id,
           resource: error.resource,
           message: error.message,
         });

         const errorResponse: ErrorResponseDTO = {
           error: "Generation not found",
           message: error.message,
         };

         return new Response(JSON.stringify(errorResponse), {
           status: 404,
           headers: { "Content-Type": "application/json" },
         });
       }

       // 8. Handle unexpected errors
       console.error("[UNEXPECTED_ERROR]", {
         timestamp: new Date().toISOString(),
         userId: locals.user?.id,
         endpoint: "/api/flashcards",
         error: error instanceof Error ? error.message : String(error),
         stack: error instanceof Error ? error.stack : undefined,
       });

       const errorResponse: ErrorResponseDTO = {
         error: "Internal server error",
         message: "An unexpected error occurred. Please try again later.",
       };

       return new Response(JSON.stringify(errorResponse), {
         status: 500,
         headers: { "Content-Type": "application/json" },
       });
     }
   };
   ```

**Weryfikacja:**
- Plik kompiluje się bez błędów
- ESLint passes
- TypeScript types są prawidłowe

---

### Faza 5: Testowanie manualne

**Cel:** Przetestować wszystkie scenariusze endpointu

**Przygotowanie:**
1. Uruchom dev server: `npm run dev`
2. Zaloguj się do Supabase (uzyskaj JWT token)
3. Utwórz generation (POST /api/flashcards/generate) - zapisz generation_id

**Test Cases:**

#### Test 1: Ręczne utworzenie fiszki (manual)

**Request:**
```bash
curl -X POST http://localhost:4321/api/flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "front": "What is the capital of France?",
    "back": "Paris",
    "source": "manual",
    "generation_id": null
  }'
```

**Oczekiwany wynik:**
- Status: 201 Created
- Body: Pełny obiekt FlashcardDTO z id, timestamps, user_id

#### Test 2: Zapisanie fiszki z AI bez edycji (ai-full)

**Request:**
```bash
curl -X POST http://localhost:4321/api/flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "front": "Explain closures in JavaScript",
    "back": "A closure is...",
    "source": "ai-full",
    "generation_id": "<VALID_GENERATION_ID>"
  }'
```

**Oczekiwany wynik:**
- Status: 201 Created
- Body: Pełny obiekt z generation_id ustawionym

#### Test 3: Zapisanie fiszki z AI z edycją (ai-edited)

**Request:** (jak Test 2, ale `"source": "ai-edited"`)

**Oczekiwany wynik:**
- Status: 201 Created

#### Test 4: Błąd walidacji - puste pole

**Request:**
```bash
curl -X POST http://localhost:4321/api/flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "front": "   ",
    "back": "Answer",
    "source": "manual",
    "generation_id": null
  }'
```

**Oczekiwany wynik:**
- Status: 400 Bad Request
- Body: Error z details dla pola "front"

#### Test 5: Błąd walidacji - za długie pole

**Request:**
```bash
curl -X POST http://localhost:4321/api/flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "front": "'$(printf 'a%.0s' {1..201})'",
    "back": "Answer",
    "source": "manual",
    "generation_id": null
  }'
```

**Oczekiwany wynik:**
- Status: 400 Bad Request
- Body: Error "Front side cannot exceed 200 characters"

#### Test 6: Błąd walidacji - niezgodność source z generation_id

**Request:**
```bash
curl -X POST http://localhost:4321/api/flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "front": "Question",
    "back": "Answer",
    "source": "manual",
    "generation_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Oczekiwany wynik:**
- Status: 400 Bad Request
- Body: Error "generation_id must be null for manual cards..."

#### Test 7: Błąd 404 - nieistniejący generation_id

**Request:**
```bash
curl -X POST http://localhost:4321/api/flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "front": "Question",
    "back": "Answer",
    "source": "ai-full",
    "generation_id": "00000000-0000-0000-0000-000000000000"
  }'
```

**Oczekiwany wynik:**
- Status: 404 Not Found
- Body: Error "Generation not found"

#### Test 8: Błąd 401 - brak tokena

**Request:**
```bash
curl -X POST http://localhost:4321/api/flashcards \
  -H "Content-Type: application/json" \
  -d '{
    "front": "Question",
    "back": "Answer",
    "source": "manual",
    "generation_id": null
  }'
```

**Oczekiwany wynik:**
- Status: 401 Unauthorized
- Body: Error "Authentication required"

**Dokumentacja testów:**
- Zapisz wyniki w pliku `.ai/test-flashcards-endpoint.md`
- Dla każdego testu zanotuj: Request, Response Status, Response Body

---

### Faza 6: Weryfikacja bazy danych

**Cel:** Upewnić się, że dane są prawidłowo zapisane w bazie

**Zadania:**

1. **Sprawdź Supabase Dashboard:**
   - Przejdź do Table Editor → flashcards
   - Zweryfikuj, że utworzone fiszki mają:
     - Poprawny `user_id` (równy zalogowanemu użytkownikowi)
     - Poprawny `source`
     - Poprawny `generation_id` (null dla manual, UUID dla AI)
     - Timestampy `created_at` i `updated_at` są ustawione

2. **Sprawdź RLS:**
   - Zaloguj się jako inny użytkownik (użytkownik B)
   - Spróbuj pobrać fiszkę użytkownika A (GET /api/flashcards/:id)
   - Oczekiwany wynik: 404 lub brak fiszki (RLS blokuje dostęp)

3. **Sprawdź foreign key constraint:**
   - W Supabase SQL Editor wykonaj:
     ```sql
     SELECT f.id, f.generation_id, g.id as gen_id
     FROM flashcards f
     LEFT JOIN generations g ON f.generation_id = g.id
     WHERE f.generation_id IS NOT NULL;
     ```
   - Zweryfikuj, że wszystkie fiszki z generation_id mają matching rekord w generations

---

### Faza 7: Linting i Type Checking

**Cel:** Upewnić się, że kod jest zgodny ze standardami projektu

**Zadania:**

1. **Run ESLint:**
   ```bash
   npm run lint
   ```
   - Fix any linting errors
   - Common issues:
     - Unused variables
     - console.log (should be console.error for errors)
     - Missing return types

2. **Run TypeScript Check:**
   ```bash
   npm run build
   ```
   - Fix any type errors
   - Common issues:
     - Missing types for variables
     - Incorrect return types
     - Type mismatches

3. **Read Lints (Cursor):**
   - Użyj narzędzia `read_lints` dla zmodyfikowanych plików
   - Fix all diagnostics

**Weryfikacja:**
- `npm run lint` passes bez błędów
- `npm run build` passes bez błędów
- `read_lints` nie zgłasza błędów dla nowych plików

---

### Faza 8: Code Review Checklist

**Cel:** Przejrzeć kod przed mergem do main

**Plik:** `.ai/code-review-checklist.md` (użyj istniejącego jako template)

**Sekcje do sprawdzenia:**

✅ **Type Safety:**
- [ ] Wszystkie funkcje mają return types
- [ ] Używamy `CreateFlashcardCommand` zamiast `any`
- [ ] ErrorResponseDTO jest używany konsekwentnie

✅ **Error Handling:**
- [ ] Wszystkie try-catch bloki są obecne
- [ ] NotFoundError jest prawidłowo obsługiwany
- [ ] Console.error zawiera kontekst (timestamp, userId)

✅ **Security:**
- [ ] user_id pochodzi z `locals.user.id` (nie z request body)
- [ ] generation_id jest walidowany pod kątem własności
- [ ] Używamy parametryzowanych zapytań (Supabase client)

✅ **Validation:**
- [ ] Zod schema pokrywa wszystkie pola
- [ ] Cross-field validation (source vs generation_id) działa
- [ ] Whitespace validation jest obecna

✅ **Database:**
- [ ] RLS policies są włączone dla tabeli flashcards
- [ ] Foreign key constraints są ustawione
- [ ] Indeksy są utworzone (automatycznie przez PK/FK)

✅ **Testing:**
- [ ] Wszystkie test cases z Fazy 5 przechodzą
- [ ] Edge cases są przetestowane (empty strings, max lengths)

✅ **Documentation:**
- [ ] Komentarze JSDoc dla kluczowych funkcji
- [ ] Plik implementation plan jest aktualny

---

### Faza 9: Dokumentacja

**Cel:** Zaktualizować dokumentację projektu

**Zadania:**

1. **Aktualizuj README.md:**
   - Dodaj POST /api/flashcards do sekcji API Endpoints
   - Przykład użycia w sekcji "Usage"

2. **Utwórz plik API Documentation:**
   - Plik: `.ai/api-endpoints.md` (jeśli nie istnieje)
   - Sekcje:
     - Endpoint overview
     - Request/Response examples
     - Error codes
     - Authentication requirements

3. **Aktualizuj .ai/implementation-summary.md:**
   - Dodaj POST /api/flashcards do listy zaimplementowanych endpoints
   - Status: ✅ Completed

**Weryfikacja:**
- Dokumentacja jest czytelna i kompletna
- Przykłady request/response są prawidłowe

---

### Faza 10: Deployment Readiness

**Cel:** Upewnić się, że endpoint jest gotowy do produkcji

**Zadania:**

1. **Environment Variables:**
   - Zweryfikuj, że wszystkie wymagane zmienne są ustawione:
     - SUPABASE_URL
     - SUPABASE_KEY
   - (Nie ma dodatkowych zmiennych specyficznych dla tego endpointu)

2. **Build Test:**
   ```bash
   npm run build
   ```
   - Zweryfikuj, że build przechodzi bez błędów
   - Sprawdź output w `dist/` directory

3. **Preview Deployment (opcjonalne):**
   ```bash
   npm run preview
   ```
   - Przetestuj endpoint na preview server
   - Zweryfikuj, że wszystko działa jak w dev

**Weryfikacja:**
- Build passes
- Preview deployment działa poprawnie
- Environment variables są skonfigurowane

---

## 10. Podsumowanie i Checklist Końcowy

### Pliki do utworzenia:
- [x] `src/lib/services/flashcard.service.ts` (nowy serwis)
- [x] `src/pages/api/flashcards/index.ts` (nowy endpoint)
- [x] Aktualizacja `src/lib/errors.ts` (dodanie NotFoundError)

### Pliki do zaktualizowania:
- [ ] `README.md` (dokumentacja API)
- [ ] `.ai/implementation-summary.md` (status implementacji)

### Testy do wykonania:
- [ ] Wszystkie 8 test cases z Fazy 5
- [ ] Weryfikacja RLS w bazie danych
- [ ] Linting i type checking

### Deployment Checklist:
- [ ] Build passes (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] Manual tests completed
- [ ] Documentation updated
- [ ] Code review completed

---

## 11. Kontekst dla przyszłych endpoints

**Wzorzec do wykorzystania w kolejnych implementacjach:**

1. **Service Pattern:**
   - Endpoint → Service → Database
   - Separacja logiki biznesowej od warstwy HTTP

2. **Error Handling Pattern:**
   - Custom error classes (NotFoundError, ValidationError)
   - Centralized error logging
   - Consistent ErrorResponseDTO structure

3. **Validation Pattern:**
   - Zod schema dla request validation
   - Cross-field validation w `.refine()`
   - Defensive programming (double-check auth)

4. **Security Pattern:**
   - user_id z `locals.user.id` (trusted source)
   - Ownership validation dla linked resources
   - RLS policies jako ostatnia linia obrony

**Kolejne endpoints do implementacji (w kolejności):**
1. `GET /api/flashcards` - Lista fiszek (paginacja)
2. `GET /api/flashcards/:id` - Pojedyncza fiszka
3. `PUT /api/flashcards/:id` - Aktualizacja fiszki
4. `DELETE /api/flashcards/:id` - Usunięcie fiszki
5. `POST /api/flashcards/batch` - Batch creation (opcjonalny)

---

**Koniec planu implementacji**

Dokument utworzony: 2025-12-08
Wersja: 1.0
Status: Ready for implementation

