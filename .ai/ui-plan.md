# Architektura UI dla 10xCards

## 1. Przegląd struktury UI

Interfejs użytkownika aplikacji **10xCards** został zaprojektowany jako nowoczesna aplikacja jednostronicowa (SPA) osadzona w architekturze Astro.

Aplikacja opiera się na jednym głównym punkcie wejścia (`/`), gdzie `AuthGuard` decyduje o wyświetleniu kontekstu autoryzacji lub głównego Dashboardu. Dashboard wykorzystuje nawigację opartą na zakładkach (Tabs), co pozwala na zachowanie stanu pracy w Generatorze podczas przeglądania Bazy Wiedzy.

Całość oparta jest na systemie komponentów **Shadcn/ui** oraz stylizacji **Tailwind CSS**, zapewniając spójny i dostępny wygląd.

## 2. Lista widoków

### 2.1. Landing / Auth View
*   **Ścieżka:** `/` (gdy brak sesji)
*   **Główny cel:** Umożliwienie użytkownikowi zalogowania się lub założenia konta.
*   **Kluczowe informacje:** Formularz logowania (Email/Hasło), przycisk do Rejestracji, komunikaty błędów walidacji.
*   **Kluczowe komponenty:** `AuthForm`, `AuthGuard`.
*   **UX/Bezpieczeństwo:**
    *   Pełnoekranowy loader podczas weryfikacji sesji (uniknięcie mignięcia formularza).
    *   Jasne komunikaty błędów (np. "Nieprawidłowe hasło").
    *   Blokada dostępu do reszty aplikacji.

### 2.2. Dashboard
*   **Ścieżka:** `/` (gdy sesja aktywna)
*   **Główny cel:** Główny kontener aplikacji, zapewniający nawigację i kontekst użytkownika.
*   **Kluczowe informacje:** Header, Avatar użytkownika w Menu, Główny obszar roboczy (Tabs).
*   **Kluczowe komponenty:** `Header`, `UserMenu`, `Tabs` (Generator | Baza Wiedzy).
*   **UX:**
    *   Sticky Header.
    *   Zachowanie stanu (state lifting) dla Generatora w nadrzędnym komponencie.

### 2.3. Generator Tab (Zakładka Tworzenia)
*   **Ścieżka:** `/` (Tab 1 - Domyślny)
*   **Główny cel:** Przekształcanie tekstu w fiszki, weryfikacja i zapisywanie.
*   **Kluczowe informacje:**
    *   Pole tekstowe (Input) z licznikiem znaków.
    *   Tabela wyników (Front/Back) z opcją edycji.
    *   Statusy wierszy (Zapisano / Do zapisu).
*   **Kluczowe komponenty:** `GeneratorInput`, `ReviewTable`, `BatchActionsBar`.
*   **UX/Dostępność:**
    *   Wskaźnik postępu (Spinner) podczas generowania.
    *   Blokada przycisku "Generuj" przy niespełnionych limitach (1k-10k znaków).
    *   Natychmiastowa walidacja pól tabeli (max 200/500 znaków).

### 2.4. Knowledge Base Tab (Zakładka Bazy Wiedzy)
*   **Ścieżka:** `/` (Tab 2 - Query params dla paginacji np. `?page=1`)
*   **Główny cel:** Przeglądanie, nauka i zarządzanie zapisanymi fiszkami.
*   **Kluczowe informacje:** Siatka (Grid) fiszek, Paginacja, Stan pusty (Empty State).
*   **Kluczowe komponenty:** `FlashcardGrid`, `FlipCard`, `PaginationControls`, `EditFlashcardDialog`.
*   **UX:**
    *   Animacja "Flip" 3D po kliknięciu w kartę.
    *   Automatyczne odświeżanie danych (React Query) po wejściu w zakładkę.
    *   Skeleton Loading podczas pobierania danych.

## 3. Mapa podróży użytkownika (User Journey)

### Scenariusz Główny: Od tekstu do bazy wiedzy

1.  **Inicjacja:** Użytkownik wchodzi na stronę. System automatycznie loguje go (trwała sesja) i pokazuje **Dashboard**.
2.  **Input:** Użytkownik znajduje się w zakładce **Generator**. Wkleja artykuł do pola tekstowego. Licznik zmienia kolor na zielony (>1000 znaków).
3.  **Generowanie:** Klika "Generuj Fiszki". System blokuje interfejs i pokazuje spinner.
4.  **Recenzja (Review Mode):**
    *   Pojawia się tabela z propozycjami.
    *   Użytkownik może poprawić tekst w wierszu (w części front i back)(edycja in-place).
    *   Użytkownik może usunąć cały wiersz (ikona kosza).
    *   Użytkownik dodaje ręcznie specyficzną fiszkę przyciskiem "Dodaj wiersz" pod tabelą.
5.  **Zapis:**
    *   Użytkownik klika "Zapisz" przy wierszu -> Ikona zmienia się na "Tick", wiersz staje się read-only.
    *   Użytkownik klika "Zapisz wszystkie" -> System wysyła batch request dla pozostałych niezapisanych wierszy.
6.  **Weryfikacja:**
    *   Użytkownik przełącza zakładkę na **Baza Wiedzy**.
    *   Widzi nowo dodane fiszki na górze siatki.
    *   Klika w kartę, aby zobaczyć rewers (odpowiedź).
    *   Zauważa błąd -> Klika ikone ołówka -> Poprawia w modalu -> Zapisuje.

## 4. Układ i struktura nawigacji

### Globalna Nawigacja
Aplikacja posiada płaską strukturę nawigacji osadzoną w nagłówku (Header):
*   **Logo:** Lewy górny róg (resetuje widok do domyślnego).
*   **User Menu:** Prawy górny róg. Dropdown zawierający:
    *   Przycisk "Wyloguj".

### Nawigacja Kontekstowa (Tabs)
Główny obszar roboczy podzielony jest na dwie karty, przełączane za pomocą komponentu `Tabs` (Shadcn/ui):
1.  **Generator (AI Studio):** Domyślny widok. Stan (tekst inputu, lista wyników) jest zachowywany w pamięci nadrzędnej (Context/Lifted State), dzięki czemu przełączanie zakładek nie powoduje utraty niezapisanej pracy.
2.  **Baza Wiedzy (Library):** Widok z parametrami URL (np. `?page=2`). Zmiana strony paginacji aktualizuje URL, co pozwala na odświeżenie strony bez utraty kontekstu nawigacji.

## 5. Kluczowe komponenty

### Komponenty Współdzielone
*   **AuthGuard:** Wrapper logiczny sprawdzający stan sesji Supabase przed renderowaniem dzieci.
*   **Toaster:** Globalny system powiadomień (sukcesy, błędy API) w prawym dolnym rogu.

### Komponenty Generatora
*   **GeneratorForm:** Formularz z `Textarea`, walidacją Zod (min/max length) i feedbackiem wizualnym (Progress bar dla limitu znaków).
*   **ReviewTable:** Zaawansowana tabela (React Table) obsługująca:
    *   Inputy edycyjne dla Front/Back.
    *   Status wiersza.
    *   Aktualizacje UI przy zapisie.
*   **ManualAddButton:** Przycisk dodający pusty wiersz na koniec tabeli.

### Komponenty Bazy Wiedzy
*   **FlashcardGrid:** Kontener CSS Grid.
*   **FlipCard:** Karta z efektem 3D CSS `transform: rotateY(180deg)`.
    *   **Front:** Pytanie + Ikony akcji (Edytuj, Usuń) widoczne po najechaniu (hover).
    *   **Back:** Odpowiedź (scrollowalna przy długim tekście).
*   **DeleteAlert:** Modal (Dialog) wymagający potwierdzenia przed usunięciem zapisanej fiszki.
*   **EditDialog:** Formularz w modalu do edycji treści zapisanej fiszki (API PATCH).

