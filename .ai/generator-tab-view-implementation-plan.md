# Plan implementacji widoku Generator Tab

## 1. Przegląd
Widok "Generator Tab" to kluczowy element Dashboardu aplikacji 10xCards, służący do tworzenia fiszek przy użyciu sztucznej inteligencji. Pozwala użytkownikowi na wprowadzenie tekstu źródłowego, wygenerowanie propozycji pytań i odpowiedzi, ich edycję oraz zapisanie do bazy danych. Widok ten musi obsługiwać stan efemeryczny (niezapisane propozycje) oraz zapewniać płynne przejście między trybem wprowadzania a trybem recenzji.

## 2. Routing widoku
*   **Ścieżka:** `/` (Strona główna dla zalogowanego użytkownika).
*   **Kontekst:** Widok jest renderowany jako pierwsza zakładka (Tab) w komponencie `Dashboard`.
*   **Dostęp:** Wymaga aktywnej sesji użytkownika (chronione przez `AuthGuard` i middleware).

## 3. Struktura komponentów

Widok jest częścią większej struktury `Dashboard`. Z uwagi na wymóg zachowania stanu przy przełączaniu zakładek ("state lifting"), główny stan generatora będzie zarządzany wyżej.

**Hierarchia:**
```
Dashboard (Smart Component / Container)
└── Tabs (Shadcn/ui)
    ├── TabsList
    │   ├── Trigger: Generator
    │   └── Trigger: Baza Wiedzy
    └── TabsContent (value="generator")
        └── GeneratorTab (Layout Component)
            ├── GeneratorInputSection (Formularz)
            │   ├── Textarea (Input)
            │   ├── CharCounter (Licznik)
            │   └── GenerateButton (Akcja)
            └── ReviewSection (Widok wyników - renderowany warunkowo)
                ├── BatchActionsBar (Zapisz wszystkie / Odrzuć wszystkie)
                ├── ReviewList (Lista kart)
                │   └── ReviewCard (Pojedynczy wiersz edycyjny)
                └── ManualAddButton (Dodanie pustego wiersza)
```

## 4. Szczegóły komponentów

### `Dashboard` (Istniejący lub do modyfikacji)
*   **Rola:** Główny kontener stanu. Przechowuje stan generatora, aby nie zniknął po przełączeniu na zakładkę "Baza Wiedzy".
*   **Stan:** `generatorState` (obiekt zawierający tekst, wygenerowane fiszki, generationId).

### `GeneratorTab`
*   **Opis:** Komponent prezentacyjny układający sekcję inputu i recenzji.
*   **Propsy:**
    *   `state`: Obiekt stanu generatora.
    *   `actions`: Obiekt z funkcjami (`setText`, `generate`, `saveCard`, `updateCard`, etc.).

### `GeneratorInputSection`
*   **Opis:** Sekcja wprowadzania tekstu.
*   **Elementy:** `<Textarea>`, `<Button>`, `<Progress>` (opcjonalnie wizualizacja limitu).
*   **Interakcje:**
    *   Wpisanie tekstu -> Aktualizacja stanu, walidacja długości.
    *   Kliknięcie "Generuj" -> Wywołanie API.
*   **Walidacja (Client-side):**
    *   Min: 1000 znaków (Button disabled).
    *   Max: 10000 znaków (Button disabled + komunikat błędu).
*   **Propsy:**
    *   `text`: string
    *   `onTextChange`: (text: string) => void
    *   `isGenerating`: boolean

### `ReviewSection`
*   **Opis:** Kontener dla listy wygenerowanych fiszek. Pojawia się tylko, gdy istnieją propozycje fiszek.
*   **Elementy:** Nagłówek z akcjami masowymi, lista kart.
*   **Interakcje:** Obsługa "Zapisz wszystkie".

### `ReviewCard`
*   **Opis:** Pojedyncza fiszka w trybie edycji.
*   **Elementy:** Dwa pola `<Textarea>` (lub Input) dla Front i Back, przyciski akcji (Save, Delete).
*   **Interakcje:**
    *   Edycja pól -> Aktualizacja lokalnego stanu (ViewModel).
    *   Zapisz -> Wywołanie API `POST /api/flashcards`.
    *   Usuń -> Usunięcie z listy lokalnej.
*   **Walidacja:**
    *   Front: 1-200 znaków (wymagane).
    *   Back: 1-500 znaków (wymagane).
*   **Propsy:**
    *   `card`: FlashcardViewModel
    *   `onUpdate`: (id: string, field: 'front' | 'back', value: string) => void
    *   `onSave`: (id: string) => Promise<void>
    *   `onDiscard`: (id: string) => void

## 5. Typy

Należy utworzyć plik `src/types/generator.ui.ts` (lub dodać do `src/types.ts`), aby zdefiniować View Modele.

```typescript
import { FlashcardDTO } from "../types";

// Status pojedynczej fiszki w UI
export type CardUiStatus = 'draft' | 'saving' | 'saved' | 'error';

// ViewModel dla fiszki w generatorze (rozszerza strukturę danych o stan UI)
export interface FlashcardViewModel {
  id: string; // Tymczasowe UUID generowane na frontendzie dla obsługi listy React
  front: string;
  back: string;
  status: CardUiStatus;
  generationId: string | null; // Null dla ręcznie dodanych
  source: "manual" | "ai-full" | "ai-edited";
  errorMessage?: string; // Dla obsługi błędów zapisu
}

// Stan całego generatora
export interface GeneratorState {
  inputText: string;
  isGenerating: boolean;
  generationId: string | null; // ID sesji generacji z API
  flashcards: FlashcardViewModel[];
  error: string | null; // Błąd globalny generatora (np. timeout)
}
```

## 6. Zarządzanie stanem

Zalecane użycie custom hooka `useGenerator` w komponencie `Dashboard` (lub nadrzędnym wrapperze), aby odseparować logikę od widoku.

**`useGenerator` hook:**
*   **State:**
    *   `inputText`: string
    *   `flashcards`: FlashcardViewModel[]
    *   `isGenerating`: boolean
    *   `generationId`: string | null
*   **Actions:**
    *   `generateFlashcards()`: Wywołuje endpoint `/api/flashcards/generate`. Mapuje odpowiedź DTO na `FlashcardViewModel` (dodaje tymczasowe ID, ustawia status 'draft', source 'ai-full').
    *   `updateCard(id, field, value)`: Aktualizuje treść fiszki. Zmienia source na 'ai-edited' jeśli była 'ai-full'.
    *   `saveCard(id)`: Wywołuje endpoint `/api/flashcards`. Po sukcesie zmienia status na 'saved' (i usuwa z listy draftów lub oznacza jako saved - zgodnie z US-005 pkt 2 "usuwa ją z listy propozycji").
    *   `discardCard(id)`: Usuwa fiszkę z tablicy stanu.
    *   `addManualCard()`: Dodaje pustą fiszkę do tablicy (status 'draft', source 'manual', generationId: null).
    *   `saveAll()`: Iteruje po wszystkich kartach statusu 'draft' i wywołuje `saveCard`.

## 7. Integracja API

Wykorzystanie `fetch` lub dedykowanego serwisu frontendowego.

### 1. Generowanie (AI)
*   **Endpoint:** `POST /api/flashcards/generate`
*   **Request:** `{ text: string }`
*   **Response:** `GenerateFlashcardsResponseDTO`
*   **Obsługa:** Przypisanie `generation_id` do stanu. Zmapowanie tablicy `flashcards` na `FlashcardViewModel` (generując `uuid` dla kluczy Reacta).

### 2. Zapisywanie (CRUD)
*   **Endpoint:** `POST /api/flashcards`
*   **Request:** `CreateFlashcardCommand`
    ```typescript
    {
      front: string;
      back: string;
      source: "manual" | "ai-full" | "ai-edited";
      generation_id: string | null;
    }
    ```
*   **Response:** `FlashcardDTO` (201 Created)
*   **Obsługa:** Po sukcesie usunięcie fiszki z listy propozycji (US-005).

## 8. Interakcje użytkownika

1.  **Wpisanie tekstu:** Użytkownik wpisuje tekst. Licznik znaków aktualizuje się. Jeśli < 1000 lub > 10000, przycisk "Generuj" jest disabled.
2.  **Generowanie:** Kliknięcie "Generuj". Pokazuje się spinner. Input staje się disabled (lub readonly). Po sukcesie pojawia się lista fiszek poniżej.
3.  **Edycja:** Użytkownik klika w pole "Front" lub "Back" w tabeli. Zmienia treść. Stan `source` zmienia się wewnętrznie na `ai-edited`.
4.  **Zapis pojedyńczy:** Kliknięcie "Zapisz" (ikona dyskietki/ticka). Spinner na przycisku. Po sukcesie wiersz znika (animacja fade-out) lub zamienia się w komunikat sukcesu.
5.  **Dodawanie ręczne:** Kliknięcie "Dodaj fiszkę". Nowy wiersz pojawia się na górze/dole listy. Source ustawione na `manual`.

## 9. Warunki i walidacja

Walidacja realizowana przy użyciu **Zod** (dla spójności z backendem) lub prostej logiki warunkowej w komponencie.

*   **Generator Input:**
    *   `text.length >= 1000`: Blokuje submit. Komunikat: "Wpisz co najmniej 1000 znaków".
    *   `text.length <= 10000`: Blokuje submit. Komunikat: "Tekst zbyt długi (max 10000)".
*   **Flashcard Form (ReviewCard):**
    *   `front`: Wymagane, max 200 znaków. Jeśli puste -> czerwona ramka inputu, disable przycisku Zapisz.
    *   `back`: Wymagane, max 500 znaków. Jeśli puste -> czerwona ramka, disable przycisku Zapisz.

## 10. Obsługa błędów

*   **Błąd generacji (503/500):** Wyświetlenie `Toast` (Shadcn) z komunikatem błędu. Przycisk "Generuj" pozostaje aktywny do ponowienia.
*   **Błąd zapisu fiszki:**
    *   Zmiana statusu wiersza na `error`.
    *   Wyświetlenie dymka/tooltipa z treścią błędu przy wierszu.
    *   Nie usuwanie wiersza z listy.
*   **Błąd walidacji:** Inline validation messages (pod inputami) z wykorzystaniem komponentów formularzy Shadcn.

## 11. Kroki implementacji

1.  **Przygotowanie Typów:** Utworzenie `FlashcardViewModel` i `GeneratorState` w `src/types.ts`.
2.  **Logika Biznesowa (Hook):** Implementacja `useGenerator` w `src/hooks/useGenerator.ts`.
    *   Obsługa inputu.
    *   Mock-up funkcji generującej (do testów UI bez zużycia tokenów).
    *   Logika dodawania/usuwania/aktualizacji fiszek w stanie.
3.  **UI Komponentu Inputu:** Stworzenie `GeneratorInputSection` z licznikiem i walidacją.
4.  **UI Karty Recenzji:** Stworzenie `ReviewCard` wykorzystującego komponenty Shadcn (`Card`, `Input`, `Textarea`, `Button`). Obsługa walidacji długości pól.
5.  **UI Listy Recenzji:** Stworzenie `ReviewSection` renderującego listę kart.
6.  **Integracja w Dashboardzie:** Osadzenie komponentów w strukturze Tabs w `Dashboard.tsx`. Podpięcie stanu z hooka.
7.  **Integracja API Generacji:** Podpięcie prawdziwego endpointu `POST /api/flashcards/generate` w hooku.
8.  **Integracja API Zapisu:** Podpięcie endpointu `POST /api/flashcards`.
9.  **Dopracowanie UX:** Dodanie loaderów, toastów (powiadomień), blokady przycisków podczas requestów.
10. **Testy Manualne:** Weryfikacja scenariuszy: za krótki tekst, błąd API, zapisanie z edycją, dodanie manualne.

