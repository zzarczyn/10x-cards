# Plan implementacji widoku Bazy Wiedzy (Knowledge Base)

## 1. Przegląd
Widok "Bazy Wiedzy" (Knowledge Base) to druga zakładka w głównym Dashboardzie aplikacji. Umożliwia użytkownikowi przeglądanie wszystkich **zapisanych** fiszek, nawigację pomiędzy stronami (paginacja) oraz zarządzanie pojedynczymi fiszkami (edycja, usuwanie). Jest to widok kluczowy dla długoterminowego korzystania z aplikacji.

## 2. Routing widoku
*   **Ścieżka:** `/` (Dashboard)
*   **Kontekst:** Komponent renderowany warunkowo wewnątrz `src/components/Dashboard.tsx` jako zawartość drugiej zakładki (`TabsContent`).
*   **Query Params:** Opcjonalnie `?page=X` do sterowania paginacją (zachowanie stanu po odświeżeniu).

## 3. Struktura komponentów
```
Dashboard (istniejący)
└── Tabs (Shadcn)
    └── TabsContent value="knowledge-base"
        └── KnowledgeBaseTab (Smart Component - Container)
            ├── LoadingState (Skeleton Grid)
            ├── EmptyState (gdy brak fiszek)
            ├── FlashcardGrid (Layout)
            │   └── FlashcardItem (Prezentacja + Interakcje)
            │       ├── FlipCard (Animacja 3D)
            │       │   ├── CardFront
            │       │   └── CardBack
            │       └── CardActionsMenu (Dropdown: Edytuj, Usuń)
            ├── PaginationControls (Nawigacja)
            ├── EditFlashcardDialog (Modal edycji)
            └── DeleteFlashcardAlertDialog (Modal potwierdzenia)
```

## 4. Szczegóły komponentów

### `KnowledgeBaseTab` (Container)
*   **Opis:** Główny zarządca stanu dla widoku bazy wiedzy. Odpowiada za pobieranie danych (fetch), obsługę błędów, stan ładowania i przekazywanie danych do komponentów prezentacyjnych.
*   **Główny element:** `div` (kontener sekcji).
*   **Obsługiwane interakcje:** Zmiana strony paginacji, otwarcie modala edycji, otwarcie dialogu usuwania.
*   **Stan:**
    *   `page` (number): Aktualna strona.
    *   `limit` (const): Ilość elementów na stronę (np. 12).
    *   `selectedFlashcard` (FlashcardDTO | null): Fiszka wybrana do edycji/usunięcia.
    *   `isEditOpen` (boolean): Widoczność modala edycji.
    *   `isDeleteOpen` (boolean): Widoczność alertu usuwania.
*   **Hooki:** Custom hook `useFlashcards(page, limit)` (do implementacji).

### `FlashcardGrid`
*   **Opis:** Komponent układu (Layout), wyświetlający fiszki w responsywnej siatce.
*   **Elementy:** `div` z klasami Tailwind Grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
*   **Propsy:**
    *   `flashcards`: Array<FlashcardDTO>
    *   `isLoading`: boolean
    *   `onEdit`: (card: FlashcardDTO) => void
    *   `onDelete`: (card: FlashcardDTO) => void

### `FlashcardItem`
*   **Opis:** Pojedyncza fiszka. Obsługuje efekt odwracania (Flip) i menu akcji.
*   **Elementy:** `Card` (Shadcn), `DropdownMenu` (Shadcn).
*   **Obsługiwane interakcje:**
    *   Kliknięcie w kartę -> Obrót (Flip).
    *   Kliknięcie w "..." -> Otwarcie menu akcji.
*   **Propsy:**
    *   `card`: FlashcardDTO
    *   `onEdit`: () => void
    *   `onDelete`: () => void

### `EditFlashcardDialog`
*   **Opis:** Modal z formularzem do edycji treści fiszki (`front` i `back`).
*   **Elementy:** `Dialog` (Shadcn), `Form` (React Hook Form + Zod), `Textarea`.
*   **Walidacja (Zod):**
    *   `front`: wymagane, max 200 znaków, non-empty.
    *   `back`: wymagane, max 500 znaków, non-empty.
*   **Propsy:**
    *   `open`: boolean
    *   `onOpenChange`: (open: boolean) => void
    *   `flashcard`: FlashcardDTO
    *   `onSubmit`: (data: UpdateFlashcardCommand) => Promise<void>

### `PaginationControls`
*   **Opis:** Komponent nawigacji paginacji.
*   **Elementy:** `Pagination` (Shadcn).
*   **Propsy:**
    *   `currentPage`: number
    *   `totalPages`: number
    *   `onPageChange`: (page: number) => void
    *   `hasNextPage`: boolean
    *   `hasPrevPage`: boolean

## 5. Typy

Należy wykorzystać istniejące typy z `src/types.ts` oraz dodać brakujące definicje propsów.

```typescript
// Wykorzystywane typy z src/types.ts
import type { 
  FlashcardDTO, 
  FlashcardsListResponseDTO, 
  UpdateFlashcardCommand,
  PaginationDTO
} from '@/types';

// ViewModel dla stanu formularza edycji
export interface EditFlashcardFormValues {
  front: string;
  back: string;
}

// Propsy kontenera
export interface KnowledgeBaseTabProps {
  userId?: string; // Opcjonalne, jeśli pobieramy z kontekstu sesji wewnątrz
}
```

## 6. Zarządzanie stanem

### Custom Hook: `useFlashcards`
W celu odseparowania logiki pobierania danych od widoku, należy stworzyć hook w `src/components/hooks/useFlashcards.ts`.

*   **Zadania hooka:**
    *   Przechowywanie stanu `data`, `loading`, `error`.
    *   Funkcja `fetchFlashcards(page, limit)`: Wywołanie `GET /api/flashcards`.
    *   Funkcja `updateFlashcard(id, data)`: Wywołanie `PATCH /api/flashcards/:id` i aktualizacja stanu lokalnego (optimistic update lub re-fetch).
    *   Funkcja `deleteFlashcard(id)`: Wywołanie `DELETE /api/flashcards/:id` i aktualizacja stanu lokalnego.

### React Query (Opcjonalne/Rekomendowane)
Jeśli w projekcie jest już skonfigurowany `@tanstack/react-query`, hook `useFlashcards` powinien go wykorzystywać (useQuery, useMutation). Jeśli nie - używamy `useEffect` + `useState`. **Zakładamy implementację na standardowych hookach Reacta dla MVP, chyba że biblioteka jest w `package.json`.**

## 7. Integracja API

### Pobieranie listy (GET)
*   **Endpoint:** `/api/flashcards`
*   **Params:** `limit` (np. 12), `offset` ((page - 1) * limit)
*   **Response:** `FlashcardsListResponseDTO`

### Edycja (PATCH)
*   **Endpoint:** `/api/flashcards/:id`
*   **Body:** `{ front: string, back: string }`
*   **Response:** Zaktualizowany obiekt `FlashcardDTO`

### Usuwanie (DELETE)
*   **Endpoint:** `/api/flashcards/:id`
*   **Response:** 204 No Content

## 8. Interakcje użytkownika

1.  **Wejście w zakładkę:** Automatyczne pobranie 1. strony wyników. Wyświetlenie szkieletu ładowania.
2.  **Obracanie fiszki:** Kliknięcie w obszar karty (poza przyciskiem menu) powoduje animację obrotu o 180 stopni, odsłaniając rewers.
3.  **Zmiana strony:** Kliknięcie w numer strony lub "Następna" przewija listę do góry i pobiera nowe dane.
4.  **Edycja:**
    *   Kliknięcie ikony menu -> "Edytuj".
    *   Otwiera się modal z wypełnionymi danymi.
    *   Zatwierdzenie wysyła request PATCH.
    *   Po sukcesie modal zamyka się, a fiszka na liście aktualizuje swoją treść.
5.  **Usuwanie:**
    *   Kliknięcie ikony menu -> "Usuń".
    *   Otwiera się Alert Dialog ("Czy na pewno...?").
    *   Potwierdzenie wysyła request DELETE.
    *   Po sukcesie fiszka znika z listy, lista może (opcjonalnie) dociągnąć brakujący element lub po prostu się odświeżyć.

## 9. Warunki i walidacja

*   **Pusta lista:** Jeśli API zwróci pustą tablicę `flashcards` i `total: 0`, wyświetl komponent `EmptyState` z zachętą do przejścia do Generatora.
*   **Formularz edycji:**
    *   Pola nie mogą być puste (trim).
    *   Limity znaków (Front: 200, Back: 500) wymuszane przez atrybut `maxLength` oraz walidację Zod przed wysłaniem.
*   **Loading:** Przycisk "Zapisz" w edycji oraz "Usuń" w alercie muszą pokazywać stan ładowania (`isSubmitting`) i być zablokowane podczas requestu.

## 10. Obsługa błędów

*   **Błąd pobierania:** Wyświetlenie komunikatu błędu w miejscu siatki z przyciskiem "Spróbuj ponownie".
*   **Błąd edycji/usuwania:** Wyświetlenie powiadomienia `toast` (z biblioteki Shadcn/ui) z treścią błędu ("Nie udało się zaktualizować fiszki").
*   **Sesja wygasła (401):** Przekierowanie do `/auth/login` (obsłużone globalnie lub w fetcherze).

## 11. Kroki implementacji

1.  **Przygotowanie Hooka:** Utworzenie `src/components/hooks/useFlashcards.ts` z logiką GET/PATCH/DELETE.
2.  **Podkomponenty UI:**
    *   Stworzenie `FlashcardItem.tsx` (bazując na istniejącym `ReviewCard` lub od zera, jeśli tamten jest specyficzny dla generatora). Zadbaj o obsługę `Flip` (CSS `backface-visibility`).
    *   Stworzenie `PaginationControls.tsx`.
3.  **Dialogi:**
    *   Implementacja `EditFlashcardDialog.tsx`.
    *   Implementacja `DeleteFlashcardAlertDialog.tsx`.
4.  **Główny Komponent:**
    *   Utworzenie `src/components/KnowledgeBaseTab.tsx`.
    *   Złożenie całości: Hook -> Stan -> Renderowanie Gridu/EmptyState.
5.  **Integracja w Dashboardzie:**
    *   Dodanie `KnowledgeBaseTab` do `src/components/Dashboard.tsx` w odpowiednim `TabsContent`.
6.  **Testy Manualne:**
    *   Sprawdzenie paginacji (dodać > 12 fiszek).
    *   Edycja fiszki i weryfikacja zmiany.
    *   Usunięcie fiszki i weryfikacja zniknięcia.
    *   Walidacja formularzy.

