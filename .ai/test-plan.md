# Plan Testów - 10xCards MVP

## 1. Wprowadzenie i Cele Testowania

### 1.1 Cel Dokumentu
Niniejszy dokument definiuje kompleksową strategię testowania aplikacji 10xCards w fazie MVP. Plan obejmuje wszystkie aspekty aplikacji - od testów jednostkowych, przez testy integracyjne, aż po testy bezpieczeństwa i wydajnościowe.

### 1.2 Cel Testowania
Głównym celem testowania jest zapewnienie, że aplikacja 10xCards:
- **Spełnia wszystkie wymagania funkcjonalne** określone w PRD
- **Działa stabilnie** w środowisku produkcyjnym z nowoczesnym stackiem technologicznym (Astro 5, React 19, Tailwind 4)
- **Zapewnia bezpieczeństwo danych użytkowników** poprzez RLS policies i autentykację
- **Integruje się poprawnie** z zewnętrznymi usługami (Supabase, OpenRouter)
- **Zapewnia wysoką jakość kodu** w kontekście bleeding-edge technologii

### 1.3 Cel Biznesowy
Testy mają zweryfikować osiągnięcie kluczowych metryk sukcesu MVP:
- ✓ **75% fiszek wygenerowanych przez AI jest akceptowanych** przez użytkownika
- ✓ **75% fiszek tworzonych przez użytkowników pochodzi z AI** (nie ręcznie)
- ✓ **System autentykacji działa bezpiecznie** i izoluje dane użytkowników

---

## 2. Zakres Testów

### 2.1 W Zakresie Testów (In Scope)

#### 2.1.1 Moduł Autentykacji
- Rejestracja użytkownika (email + hasło)
- Logowanie i wylogowanie
- Zarządzanie sesją (JWT, cookies)
- Odzyskiwanie hasła (forgot password flow)
- Ochrona tras (middleware, redirecty)
- Integracja z Supabase Auth

#### 2.1.2 Generator AI
- Walidacja długości tekstu wejściowego (1000-10000 znaków)
- Generowanie fiszek z tekstu przez LLM
- Obsługa błędów API OpenRouter
- Timeout handling (30s)
- Logging metryk generacji (duration, card count, model name)

#### 2.1.3 Tryb Recenzji
- Wyświetlanie wygenerowanych fiszek
- Edycja fiszek przed zapisem
- Detekcja zmian (ai-full vs ai-edited)
- Odrzucanie pojedynczych fiszek
- Zapisywanie pojedynczych lub wszystkich fiszek
- Manualne dodawanie fiszek

#### 2.1.4 Zarządzanie Fiszkami (CRUD)
- Tworzenie fiszki (POST /api/flashcards)
- Listowanie fiszek z paginacją (GET /api/flashcards)
- Edycja fiszki (PATCH /api/flashcards/:id)
- Usuwanie fiszki (DELETE /api/flashcards/:id)
- Walidacja pól (front, back, source)

#### 2.1.5 Bezpieczeństwo
- Row Level Security (RLS) policies
- Autoryzacja na poziomie API
- Izolacja danych użytkowników
- Walidacja server-side
- CSRF protection
- XSS prevention

#### 2.1.6 UI/UX
- Wszystkie komponenty React (Dashboard, GeneratorTab, KnowledgeBaseTab, Auth forms)
- Responsywność formularzy
- Wyświetlanie błędów walidacji
- Loading states i spinners
- Toast notifications
- Nawigacja między zakładkami

### 2.2 Poza Zakresem Testów (Out of Scope)

- ❌ Algorytm spaced repetition (nie w MVP)
- ❌ Import plików (PDF, DOCX)
- ❌ Responsywność mobilna (MVP to desktop-first)
- ❌ Funkcje społecznościowe (sharing, public profiles)
- ❌ Testy wydajnościowe dużej skali (>100k fiszek na użytkownika)
- ❌ Testy kompatybilności z przeglądarkami starszymi niż 2 lata

---

## 3. Typy Testów do Przeprowadzenia

### 3.1 Testy Jednostkowe (Unit Tests)

**Cel**: Weryfikacja poprawności działania pojedynczych funkcji i komponentów w izolacji.

**Narzędzia**: Vitest, React Testing Library

**Zakres**:

#### 3.1.1 Serwisy Backendowe
- **`flashcard.service.ts`**
  - Testy CRUD operations
  - Walidacja danych wejściowych
  - Obsługa błędów Supabase
  
- **`flashcard-generation.service.ts`**
  - Walidacja długości tekstu
  - Parsowanie odpowiedzi LLM
  - Timeout handling
  - Error mapping

- **`auth-validation.service.ts`**
  - Zod schemas (RegisterSchema, LoginSchema, ForgotPasswordSchema, ResetPasswordSchema)
  - Walidacja formatów email
  - Walidacja siły hasła

- **`auth-error-mapping.service.ts`**
  - Mapowanie błędów Supabase na komunikaty użytkownika
  - Obsługa edge cases

#### 3.1.2 Komponenty React
- **`<LoginForm>`**
  - Renderowanie formularza
  - Walidacja client-side
  - Wyświetlanie błędów
  - Stan loading

- **`<RegisterForm>`**
  - Walidacja hasła (min 8 znaków + cyfra)
  - Porównanie hasła i potwierdzenia
  - Success state i redirect

- **`<GeneratorInputSection>`**
  - Licznik znaków
  - Walidacja min/max (1000-10000)
  - Disabled button gdy walidacja nie przeszła

- **`<ReviewCard>`**
  - Edycja fiszki
  - Zapisywanie zmian
  - Odrzucanie fiszki

- **`<FlashcardItem>`**
  - Flip animation
  - Edycja i usuwanie
  - Wyświetlanie metadanych (source, created_at)

#### 3.1.3 Custom Hooks
- **`useGenerator`**
  - Stan generacji (idle, loading, success, error)
  - Wywołanie API generate
  - Zarządzanie listą temporary cards

- **`useFlashcards`**
  - Fetching listy fiszek
  - Paginacja
  - Stan loading/error

- **`useToast`**
  - Wyświetlanie notyfikacji
  - Auto-dismiss
  - Różne typy (success, error, warning)

**Metryki Sukcesu**:
- ✓ Pokrycie kodu: minimum 80% dla serwisów
- ✓ Pokrycie kodu: minimum 70% dla komponentów React
- ✓ Wszystkie testy przechodzą zielono

---

### 3.2 Testy Integracyjne (Integration Tests)

**Cel**: Weryfikacja poprawności współpracy między modułami systemu.

**Narzędzia**: Vitest, Playwright, Supabase Local (Docker)

**Zakres**:

#### 3.2.1 Integracja Frontend - Backend
- **Generator Flow E2E**
  - User wkleja tekst (1000-10000 znaków)
  - Klik "Generuj"
  - API POST /api/flashcards/generate
  - Wyświetlenie listy ReviewCard
  - Edycja fiszki
  - Klik "Zapisz wszystkie"
  - API POST /api/flashcards (batch)
  - Redirect do Knowledge Base Tab
  - Weryfikacja w bazie danych

#### 3.2.2 Integracja Backend - Supabase
- **Auth Flow**
  - Rejestracja → Supabase Auth
  - Email verification → callback
  - Login → session cookies
  - Middleware sprawdza sesję
  - API endpoint używa `locals.user`

- **CRUD Flow**
  - POST flashcard → Supabase insert z RLS
  - GET flashcards → Supabase query z filtrem user_id
  - PATCH flashcard → Supabase update z RLS check
  - DELETE flashcard → Supabase delete z RLS check

#### 3.2.3 Integracja Backend - OpenRouter
- **AI Generation**
  - POST /api/flashcards/generate
  - Wywołanie OpenRouter API z tekstem
  - Timeout po 30s
  - Retry logic (opcjonalnie)
  - Parsowanie JSON response
  - Zapis metryk do `generations` table

**Scenariusze Testowe**:
1. **Happy path**: tekst 5000 znaków → LLM generuje 8 fiszek → user zapisuje 6 → success
2. **Timeout**: tekst 10000 znaków → LLM timeout 30s → error 503 → user retry
3. **Invalid LLM response**: LLM zwraca niepoprawny JSON → error handling → user widzi komunikat
4. **RLS protection**: User A próbuje edytować fiszkę User B → 404 Not Found (nie 403)

**Metryki Sukcesu**:
- ✓ Wszystkie scenariusze happy path przechodzą
- ✓ Error handling działa poprawnie
- ✓ RLS policies chronią dane użytkowników

---

### 3.3 Testy End-to-End (E2E Tests)

**Cel**: Weryfikacja pełnych scenariuszy użytkownika od początku do końca.

**Narzędzia**: Playwright

**Zakres**:

#### Scenariusz 1: Nowy Użytkownik - Rejestracja i Pierwsza Generacja
**Kroki**:
1. Wejście na `/`
2. Redirect na `/auth/login`
3. Klik "Nie masz konta? Zarejestruj się"
4. Wypełnienie formularza rejestracji (email + hasło)
5. Submit → wyświetlenie "Sprawdź email"
6. (Mock) Klik w link weryfikacyjny
7. Redirect na `/auth/login?message=email-confirmed`
8. Logowanie (email + hasło)
9. Redirect na `/` (Dashboard)
10. Generator Tab → wklejenie tekstu (3000 znaków)
11. Klik "Generuj fiszki"
12. Wyświetlenie 10 fiszek w Review Mode
13. Edycja 2 fiszek
14. Klik "Zapisz wszystkie"
15. Przełączenie na Knowledge Base Tab
16. Weryfikacja wyświetlenia 10 fiszek
17. Klik na fiszkę → flip animation
18. Wylogowanie

**Oczekiwany rezultat**:
- ✓ Wszystkie kroki przechodzą bez błędów
- ✓ Fiszki zapisane w bazie danych
- ✓ Metryki: 2 ai-edited, 8 ai-full

---

#### Scenariusz 2: Istniejący Użytkownik - Zarządzanie Fiszkami
**Kroki**:
1. Logowanie
2. Dashboard → Knowledge Base Tab
3. Klik "Dodaj manualnie"
4. Wypełnienie formularza (front + back)
5. Klik "Zapisz"
6. Weryfikacja nowej fiszki w liście
7. Klik "Edytuj" na istniejącej fiszce
8. Zmiana treści back
9. Klik "Zapisz"
10. Weryfikacja aktualizacji
11. Klik "Usuń" na fiszce
12. Potwierdzenie usunięcia
13. Weryfikacja braku fiszki w liście

**Oczekiwany rezultat**:
- ✓ CRUD operations działają poprawnie
- ✓ Toast notifications wyświetlają się
- ✓ Database updated_at timestamp aktualizowany

---

#### Scenariusz 3: Obsługa Błędów i Edge Cases
**Kroki**:
1. Logowanie
2. Generator Tab → wklejenie 500 znaków (za mało)
3. Przycisk "Generuj" disabled
4. Wklejenie 11000 znaków (za dużo)
5. Wyświetlenie błędu walidacji
6. Wklejenie 5000 znaków
7. Klik "Generuj"
8. (Mock) LLM timeout
9. Wyświetlenie błędu 503 "Spróbuj ponownie"
10. Klik "Generuj" ponownie
11. (Mock) LLM success → 5 fiszek
12. Edycja fiszki → pozostawienie pustego front
13. Klik "Zapisz" → błąd walidacji client-side
14. Wypełnienie poprawnie → success

**Oczekiwany rezultat**:
- ✓ Walidacja client-side działa
- ✓ Error handling wyświetla poprawne komunikaty
- ✓ User może retry po błędzie

---

#### Scenariusz 4: Bezpieczeństwo - Próba Dostępu bez Autoryzacji
**Kroki**:
1. User niezalogowany próbuje wejść na `/` → redirect `/auth/login`
2. User niezalogowany próbuje wywołać POST /api/flashcards → 401
3. User A loguje się
4. User A próbuje GET /api/flashcards/:id_user_B → 404
5. User A próbuje PATCH /api/flashcards/:id_user_B → 404
6. User A próbuje DELETE /api/flashcards/:id_user_B → 404

**Oczekiwany rezultat**:
- ✓ Middleware blokuje nieautoryzowane żądania
- ✓ RLS policies chronią dane
- ✓ Brak 403 (information disclosure), zawsze 404

**Metryki Sukcesu**:
- ✓ Wszystkie scenariusze E2E przechodzą
- ✓ Czas wykonania pojedynczego scenariusza < 2 min
- ✓ Flakiness rate < 5%

---

### 3.4 Testy Bezpieczeństwa (Security Tests)

**Cel**: Weryfikacja odporności aplikacji na ataki i przestrzegania najlepszych praktyk bezpieczeństwa.

**Narzędzia**: OWASP ZAP (opcjonalnie), manualne testy, Playwright

**Zakres**:

#### 3.4.1 Autentykacja i Autoryzacja
- **SQL Injection**
  - Test: Wklejenie `' OR '1'='1` w formularzach
  - Oczekiwany rezultat: Supabase parametryzuje zapytania → brak exploitu

- **XSS (Cross-Site Scripting)**
  - Test: Wklejenie `<script>alert('XSS')</script>` w front/back fiszki
  - Oczekiwany rezultat: React automatycznie escapes → brak wykonania skryptu

- **CSRF (Cross-Site Request Forgery)**
  - Test: Wywołanie POST /api/flashcards z zewnętrznej domeny
  - Oczekiwany rezultat: SameSite=lax cookies + Astro CSRF token → request blocked

- **Session Hijacking**
  - Test: Kradzież JWT tokenu z localStorage (brak)
  - Oczekiwany rezultat: Token w httpOnly cookie → JavaScript nie ma dostępu

- **Brute Force Protection**
  - Test: 100 prób logowania z nieprawidłowym hasłem
  - Oczekiwany rezultat: Supabase rate limiting → block po X próbach

#### 3.4.2 Row Level Security (RLS)
- **Test 1**: User A próbuje SELECT * FROM flashcards WHERE user_id = user_B_id
  - Oczekiwany rezultat: RLS policy filtruje → zwraca puste wyniki
  
- **Test 2**: User A próbuje INSERT fiszkę z user_id = user_B_id
  - Oczekiwany rezultat: RLS WITH CHECK fails → 403 Forbidden

- **Test 3**: User A próbuje UPDATE fiszki należącej do User B
  - Oczekiwany rezultat: RLS USING clause fails → 404 Not Found

#### 3.4.3 Walidacja Danych
- **Server-Side Validation Bypass**
  - Test: Wywołanie API z front = "" (pusty string)
  - Oczekiwany rezultat: Server-side Zod validation → 400 Bad Request

- **Generation ID Spoofing**
  - Test: Zapisanie fiszki z generation_id należącym do innego użytkownika
  - Oczekiwany rezultat: Backend weryfikuje ownership → 404 Not Found

#### 3.4.4 API Security
- **Excessive Data Exposure**
  - Test: GET /api/flashcards zwraca wrażliwe dane (np. internal IDs)
  - Oczekiwany rezultat: Response zawiera tylko publiczne pola (zgodnie z DTO)

- **Missing Authorization**
  - Test: Wywołanie /api/flashcards bez tokenu
  - Oczekiwany rezultat: Middleware → 401 Unauthorized

**Metryki Sukcesu**:
- ✓ Brak krytycznych luk bezpieczeństwa
- ✓ Wszystkie testy RLS przechodzą
- ✓ Walidacja server-side działa na wszystkich endpointach

---

### 3.5 Testy Wydajnościowe (Performance Tests)

**Cel**: Weryfikacja wydajności aplikacji pod obciążeniem i optymalizacji zapytań.

**Narzędzia**: k6 (load testing), Lighthouse (frontend performance)

**Zakres**:

#### 3.5.1 Backend Performance
- **Test 1: Generowanie fiszek (POST /api/flashcards/generate)**
  - Scenariusz: 10 równoczesnych użytkowników generuje fiszki
  - Metryka: Średni czas odpowiedzi < 15s (zależny od LLM)
  - Metryka: 95th percentile < 30s
  - Metryka: Rate of errors < 5%

- **Test 2: Listowanie fiszek (GET /api/flashcards)**
  - Scenariusz: 50 równoczesnych użytkowników fetchuje swoje fiszki
  - Metryka: Średni czas odpowiedzi < 200ms
  - Metryka: 95th percentile < 500ms
  - Dataset: 1000 fiszek na użytkownika

- **Test 3: CRUD operations**
  - Scenariusz: 20 równoczesnych użytkowników wykonuje POST/PATCH/DELETE
  - Metryka: Średni czas odpowiedzi < 150ms
  - Metryka: Database connection pool nie wyczerpany

#### 3.5.2 Database Performance
- **Query Optimization**
  - Test: EXPLAIN ANALYZE dla głównych zapytań
  - Oczekiwany rezultat: Używane są indeksy (idx_flashcards_user_created)
  - Metryka: Query execution time < 50ms dla 10k fiszek

- **RLS Policy Overhead**
  - Test: Porównanie query time z RLS vs bez RLS
  - Oczekiwany rezultat: Overhead < 10ms

#### 3.5.3 Frontend Performance (Lighthouse)
- **Dashboard Load Time**
  - Metryka: First Contentful Paint (FCP) < 1.5s
  - Metryka: Time to Interactive (TTI) < 3s
  - Metryka: Lighthouse Score > 90

- **Generator Tab Performance**
  - Test: Renderowanie 50 ReviewCard komponentów
  - Metryka: Render time < 500ms
  - Metryka: No visible lag podczas scroll

**Metryki Sukcesu**:
- ✓ API response times spełniają cele
- ✓ Lighthouse score > 85 dla Dashboard
- ✓ Brak memory leaks w komponencie Dashboard (długotrwała sesja)

---

### 3.6 Testy Kompatybilności i Stabilności Stacku

**Cel**: Weryfikacja stabilności bleeding-edge technologii (React 19, Tailwind 4, Astro 5).

**Narzędzia**: BrowserStack, Cross-browser testing

**Zakres**:

#### 3.6.1 Kompatybilność Przeglądarek
- **Chrome** (latest, -1 version)
- **Firefox** (latest, -1 version)
- **Edge** (latest, -1 version)
- **Safari** (latest na macOS)

**Testy**:
- Renderowanie wszystkich stron (login, register, dashboard)
- Działanie formularzy
- Fetch API calls
- Toast notifications
- CSS Tailwind 4 rendering
- React 19 hydration (no warnings w konsoli)

#### 3.6.2 Stabilność React 19
- **Concurrent Features**
  - Test: useTransition w GeneratorInputSection
  - Oczekiwany rezultat: Brak race conditions podczas edycji

- **Automatic Batching**
  - Test: Wielokrotne setState w useGenerator hook
  - Oczekiwany rezultat: Pojedynczy re-render

- **React Server Components** (jeśli używane w Astro Islands)
  - Test: Hydration errors w konsoli
  - Oczekiwany rezultat: Brak błędów hydration mismatch

#### 3.6.3 Stabilność Astro 5
- **Islands Architecture**
  - Test: Przełączanie między zakładkami Dashboard (Stan generatora zachowany)
  - Oczekiwany rezultat: State lifting działa, brak unintended resets

- **Middleware**
  - Test: Session cookies parsing
  - Oczekiwany rezultat: Middleware poprawnie czyta sb-access-token i sb-refresh-token

#### 3.6.4 Stabilność Tailwind 4
- **CSS Generation**
  - Test: Wszystkie Shadcn/ui komponenty renderują się poprawnie
  - Oczekiwany rezultat: Brak missing classes, brak broken styles

**Metryki Sukcesu**:
- ✓ Brak błędów konsoli w żadnej przeglądarce
- ✓ Wszystkie funkcjonalności działają cross-browser
- ✓ Brak regressions po aktualizacji zależności

---

## 4. Scenariusze Testowe dla Kluczowych Funkcjonalności

### 4.1 Moduł Autentykacji

#### TC-AUTH-001: Rejestracja Nowego Użytkownika (Happy Path)
**Priorytet**: Krytyczny  
**Warunki wstępne**: Użytkownik nie ma konta

**Kroki**:
1. Wejście na `/auth/register`
2. Wypełnienie pola Email: `testuser@example.com`
3. Wypełnienie pola Hasło: `SecurePass123`
4. Wypełnienie pola Potwierdź Hasło: `SecurePass123`
5. Klik "Zarejestruj się"

**Oczekiwany rezultat**:
- ✓ Wyświetlenie komunikatu "Sprawdź swoją skrzynkę email"
- ✓ Redirect na `/auth/login?message=registered` po 3s
- ✓ Email weryfikacyjny wysłany (Supabase)
- ✓ User utworzony w `auth.users` z `email_confirmed_at = null`

---

#### TC-AUTH-002: Rejestracja - Walidacja Słabego Hasła
**Priorytet**: Wysoki  
**Warunki wstępne**: Brak

**Kroki**:
1. Wejście na `/auth/register`
2. Email: `test@example.com`
3. Hasło: `short`
4. Potwierdź Hasło: `short`
5. Klik "Zarejestruj się"

**Oczekiwany rezultat**:
- ✓ Błąd walidacji client-side: "Hasło musi mieć minimum 8 znaków i zawierać cyfrę"
- ✓ Przycisk submit disabled
- ✓ Brak wywołania API

---

#### TC-AUTH-003: Logowanie (Happy Path)
**Priorytet**: Krytyczny  
**Warunki wstępne**: User `test@example.com` istnieje i email jest potwierdzony

**Kroki**:
1. Wejście na `/auth/login`
2. Email: `test@example.com`
3. Hasło: `SecurePass123`
4. Klik "Zaloguj się"

**Oczekiwany rezultat**:
- ✓ POST /api/auth/login → 200 OK
- ✓ Cookies ustawione: `sb-access-token`, `sb-refresh-token`
- ✓ Redirect na `/`
- ✓ Wyświetlenie Dashboard z UserMenu
- ✓ UserMenu wyświetla email użytkownika

---

#### TC-AUTH-004: Logowanie - Nieprawidłowe Hasło
**Priorytet**: Wysoki  
**Warunki wstępne**: User istnieje

**Kroki**:
1. Wejście na `/auth/login`
2. Email: `test@example.com`
3. Hasło: `WrongPassword`
4. Klik "Zaloguj się"

**Oczekiwany rezultat**:
- ✓ POST /api/auth/login → 401 Unauthorized
- ✓ Błąd: "Nieprawidłowy email lub hasło"
- ✓ Brak redirect
- ✓ Brak cookies

---

#### TC-AUTH-005: Forgot Password Flow
**Priorytet**: Średni  
**Warunki wstępne**: User `test@example.com` istnieje

**Kroki**:
1. Wejście na `/auth/login`
2. Klik "Zapomniałeś hasła?"
3. Redirect na `/auth/forgot-password`
4. Email: `test@example.com`
5. Klik "Wyślij link resetujący"

**Oczekiwany rezultat**:
- ✓ POST /api/auth/forgot-password → 200 OK (zawsze sukces)
- ✓ Komunikat: "Jeśli konto z tym adresem istnieje, otrzymasz wiadomość"
- ✓ Email z linkiem wysłany (Supabase)
- ✓ Link zawiera token resetujący

---

#### TC-AUTH-006: Reset Password
**Priorytet**: Średni  
**Warunki wstępne**: User kliknął link z emaila

**Kroki**:
1. Wejście na `/auth/reset-password?token=xxx`
2. Nowe hasło: `NewSecure456`
3. Potwierdź hasło: `NewSecure456`
4. Klik "Ustaw nowe hasło"

**Oczekiwany rezultat**:
- ✓ POST /api/auth/reset-password → 200 OK
- ✓ Hasło zmienione w Supabase
- ✓ Komunikat "Hasło zostało zmienione"
- ✓ Redirect na `/auth/login?message=password-reset` po 2s

---

#### TC-AUTH-007: Wylogowanie
**Priorytet**: Wysoki  
**Warunki wstępne**: User zalogowany

**Kroki**:
1. Dashboard → UserMenu
2. Klik "Wyloguj się"

**Oczekiwany rezultat**:
- ✓ POST /api/auth/logout → 200 OK
- ✓ Cookies usunięte
- ✓ Sesja usunięta w Supabase
- ✓ Redirect na `/auth/login`

---

#### TC-AUTH-008: Próba Dostępu do Dashboard bez Logowania
**Priorytet**: Krytyczny  
**Warunki wstępne**: User niezalogowany

**Kroki**:
1. Wejście na `/`

**Oczekiwany rezultat**:
- ✓ Middleware sprawdza sesję → brak sesji
- ✓ index.astro wykonuje `Astro.redirect('/auth/login')`
- ✓ User widzi stronę logowania

---

### 4.2 Generator AI

#### TC-GEN-001: Generowanie Fiszek (Happy Path)
**Priorytet**: Krytyczny  
**Warunki wstępne**: User zalogowany

**Kroki**:
1. Dashboard → Generator Tab
2. Wklejenie tekstu (5000 znaków)
3. Licznik pokazuje "5000 / 10000"
4. Klik "Generuj fiszki"

**Oczekiwany rezultat**:
- ✓ Loading spinner wyświetlony
- ✓ POST /api/flashcards/generate → 200 OK
- ✓ Response: { generation_id, flashcards: [10 fiszek], model_name, duration_ms, card_count }
- ✓ Record w `generations` table
- ✓ Wyświetlenie ReviewSection z 10 ReviewCard
- ✓ Toast notification: "Wygenerowano 10 fiszek"

---

#### TC-GEN-002: Walidacja - Tekst Za Krótki
**Priorytet**: Wysoki  
**Warunki wstępne**: User zalogowany

**Kroki**:
1. Generator Tab
2. Wklejenie tekstu (500 znaków)
3. Licznik pokazuje "500 / 10000" (czerwony)

**Oczekiwany rezultat**:
- ✓ Przycisk "Generuj fiszki" disabled
- ✓ Komunikat: "Tekst musi mieć minimum 1000 znaków"
- ✓ Brak możliwości kliknięcia

---

#### TC-GEN-003: Walidacja - Tekst Za Długi
**Priorytet**: Wysoki  
**Warunki wstępne**: User zalogowany

**Kroki**:
1. Generator Tab
2. Wklejenie tekstu (15000 znaków)
3. Licznik pokazuje "15000 / 10000" (czerwony)

**Oczekiwany rezultat**:
- ✓ Przycisk "Generuj fiszki" disabled
- ✓ Komunikat: "Tekst nie może przekroczyć 10000 znaków"
- ✓ Brak możliwości kliknięcia

---

#### TC-GEN-004: Timeout LLM API
**Priorytet**: Wysoki  
**Warunki wstępne**: User zalogowany

**Kroki**:
1. Generator Tab
2. Wklejenie tekstu (10000 znaków - maksimum)
3. Klik "Generuj fiszki"
4. (Mock) OpenRouter timeout po 30s

**Oczekiwany rezultat**:
- ✓ Loading spinner przez 30s
- ✓ POST /api/flashcards/generate → 503 Service Unavailable
- ✓ Error response: { error: "AI service temporarily unavailable", retryable: true }
- ✓ Toast error: "Przekroczono czas oczekiwania. Spróbuj ponownie."
- ✓ User może kliknąć "Generuj" ponownie

---

#### TC-GEN-005: LLM Zwraca Nieprawidłowy JSON
**Priorytet**: Średni  
**Warunki wstępne**: User zalogowany

**Kroki**:
1. Generator Tab → tekst 3000 znaków
2. Klik "Generuj fiszki"
3. (Mock) OpenRouter zwraca malformed JSON

**Oczekiwany rezultat**:
- ✓ FlashcardGenerationService.parse() fails
- ✓ POST /api/flashcards/generate → 500 Internal Server Error
- ✓ Toast error: "Wystąpił błąd podczas generowania. Spróbuj ponownie."
- ✓ Brak crashu aplikacji

---

### 4.3 Tryb Recenzji

#### TC-REV-001: Edycja Fiszki Przed Zapisem
**Priorytet**: Krytyczny  
**Warunki wstępne**: User wygenerował fiszki

**Kroki**:
1. ReviewSection wyświetla 10 fiszek
2. Klik "Edytuj" na fiszce #3
3. Zmiana pola front: "Nowe pytanie"
4. Zmiana pola back: "Nowa odpowiedź"
5. Klik "Zapisz" (na pojedynczej fiszce)

**Oczekiwany rezultat**:
- ✓ Stan fiszki zaktualizowany (local state)
- ✓ Fiszka oznaczona jako edited (visual indicator)
- ✓ Source zmienia się na "ai-edited" (internal state)

---

#### TC-REV-002: Odrzucenie Fiszki
**Priorytet**: Wysoki  
**Warunki wstępne**: User wygenerował 10 fiszek

**Kroki**:
1. Klik "Odrzuć" na fiszce #5
2. Potwierdzenie odrzucenia

**Oczekiwany rezultat**:
- ✓ Fiszka usunięta z listy temporary cards
- ✓ Lista teraz zawiera 9 fiszek
- ✓ Brak zapisu do bazy danych (ephemeral)

---

#### TC-REV-003: Zapisanie Wszystkich Fiszek
**Priorytet**: Krytyczny  
**Warunki wstępne**: User wygenerował 10 fiszek, edytował 2

**Kroki**:
1. ReviewSection → 10 fiszek (2 edited, 8 ai-full)
2. Klik "Zapisz wszystkie"

**Oczekiwany rezultat**:
- ✓ POST /api/flashcards (batch)
- ✓ Request body: { flashcards: [10 objects] }
- ✓ 2 fiszki z source: "ai-edited"
- ✓ 8 fiszek z source: "ai-full"
- ✓ Wszystkie z generation_id: "xxx"
- ✓ Response 201 Created
- ✓ Toast success: "Zapisano 10 fiszek"
- ✓ Przełączenie na Knowledge Base Tab
- ✓ Lista fiszek odświeżona

---

#### TC-REV-004: Manualne Dodanie Fiszki
**Priorytet**: Średni  
**Warunki wstępne**: User w Review Mode lub Knowledge Base Tab

**Kroki**:
1. Klik "Dodaj fiszkę manualnie"
2. Wypełnienie formularza:
   - Front: "Pytanie manualne"
   - Back: "Odpowiedź manualna"
3. Klik "Zapisz"

**Oczekiwany rezultat**:
- ✓ POST /api/flashcards
- ✓ Body: { front, back, source: "manual", generation_id: null }
- ✓ Response 201 Created
- ✓ Toast success: "Fiszka dodana"
- ✓ Nowa fiszka pojawia się w Knowledge Base Tab

---

### 4.4 Zarządzanie Fiszkami (CRUD)

#### TC-CRUD-001: Listowanie Fiszek z Paginacją
**Priorytet**: Wysoki  
**Warunki wstępne**: User ma 50 fiszek w bazie

**Kroki**:
1. Dashboard → Knowledge Base Tab
2. GET /api/flashcards?limit=20&offset=0

**Oczekiwany rezultat**:
- ✓ Response 200 OK
- ✓ Body: { flashcards: [20 objects], pagination: { total: 50, limit: 20, offset: 0, has_more: true } }
- ✓ Wyświetlenie 20 fiszek
- ✓ Paginacja pokazuje "Strona 1 z 3"

---

#### TC-CRUD-002: Edycja Istniejącej Fiszki
**Priorytet**: Wysoki  
**Warunki wstępne**: User ma fiszki w bazie

**Kroki**:
1. Knowledge Base Tab → lista fiszek
2. Klik "Edytuj" na fiszce
3. Modal EditFlashcardDialog otwiera się
4. Zmiana front: "Zaktualizowane pytanie"
5. Klik "Zapisz"

**Oczekiwany rezultat**:
- ✓ PATCH /api/flashcards/:id
- ✓ Body: { front: "Zaktualizowane pytanie" }
- ✓ Response 200 OK z zaktualizowaną fiszką
- ✓ Modal zamyka się
- ✓ Lista fiszek odświeżona (optimistic update lub refetch)
- ✓ Toast success: "Fiszka zaktualizowana"
- ✓ Database: updated_at timestamp zaktualizowany

---

#### TC-CRUD-003: Usunięcie Fiszki
**Priorytet**: Wysoki  
**Warunki wstępne**: User ma fiszki w bazie

**Kroki**:
1. Knowledge Base Tab → lista fiszek
2. Klik "Usuń" na fiszce
3. Alert dialog: "Czy na pewno chcesz usunąć tę fiszkę?"
4. Klik "Usuń"

**Oczekiwany rezultat**:
- ✓ DELETE /api/flashcards/:id
- ✓ Response 204 No Content
- ✓ Alert zamyka się
- ✓ Fiszka usunięta z listy (optimistic update)
- ✓ Toast success: "Fiszka usunięta"
- ✓ Database: record permanentnie usunięty (hard delete)

---

#### TC-CRUD-004: Flip Fiszki (Wyświetlenie Odpowiedzi)
**Priorytet**: Średni  
**Warunki wstępne**: User ma fiszki w bazie

**Kroki**:
1. Knowledge Base Tab → lista fiszek
2. Klik na fiszkę (lub przycisk "Pokaż odpowiedź")

**Oczekiwany rezultat**:
- ✓ Flip animation
- ✓ Wyświetlenie pola "back"
- ✓ Klik ponownie → flip z powrotem do "front"

---

### 4.5 Bezpieczeństwo i RLS

#### TC-SEC-001: RLS - User A Nie Widzi Fiszek User B
**Priorytet**: Krytyczny  
**Warunki wstępne**: User A i User B zalogowani, każdy ma fiszki

**Kroki**:
1. User A zalogowany
2. GET /api/flashcards (jako User A)
3. Response zawiera tylko fiszki User A
4. (Bezpośrednie zapytanie SQL) SELECT * FROM flashcards WHERE user_id = 'user_B_id'
5. RLS policy filtruje wyniki

**Oczekiwany rezultat**:
- ✓ User A widzi tylko swoje fiszki
- ✓ RLS policy `flashcards_select_own` działa
- ✓ Brak możliwości obejścia przez API

---

#### TC-SEC-002: RLS - Próba Edycji Cudzej Fiszki
**Priorytet**: Krytyczny  
**Warunki wstępne**: User A zna ID fiszki User B

**Kroki**:
1. User A zalogowany
2. PATCH /api/flashcards/:id_user_B
3. Body: { front: "Hacked" }

**Oczekiwany rezultat**:
- ✓ RLS policy `flashcards_update_own` USING clause fails
- ✓ Response 404 Not Found (nie 403 - security by obscurity)
- ✓ Brak aktualizacji w bazie

---

#### TC-SEC-003: SQL Injection - Formularz Logowania
**Priorytet**: Wysoki  
**Warunki wstępne**: Brak

**Kroki**:
1. /auth/login
2. Email: `admin@example.com' OR '1'='1`
3. Hasło: `anything`
4. Submit

**Oczekiwany rezultat**:
- ✓ Supabase Auth parametryzuje zapytania
- ✓ Response 401 Unauthorized
- ✓ Brak logu jako admin
- ✓ Brak exploitu

---

#### TC-SEC-004: XSS - Pole Fiszki
**Priorytet**: Wysoki  
**Warunki wstępne**: User zalogowany

**Kroki**:
1. Dodanie fiszki manualnie
2. Front: `<script>alert('XSS')</script>`
3. Back: `Normal text`
4. Zapisz
5. Wyświetlenie fiszki w Knowledge Base Tab

**Oczekiwany rezultat**:
- ✓ React escapes HTML
- ✓ Wyświetlenie: `<script>alert('XSS')</script>` jako tekst
- ✓ Brak wykonania skryptu
- ✓ Browser console bez błędów

---

#### TC-SEC-005: Session Hijacking - HttpOnly Cookies
**Priorytet**: Krytyczny  
**Warunki wstępne**: User zalogowany

**Kroki**:
1. Dashboard → otwórz DevTools Console
2. Próba odczytu: `document.cookie`
3. Szukaj `sb-access-token`

**Oczekiwany rezultat**:
- ✓ `sb-access-token` NIE widoczny w document.cookie
- ✓ HttpOnly flag ustawiony
- ✓ JavaScript nie ma dostępu do tokenu
- ✓ Ochrona przed XSS-based token theft

---

## 5. Środowisko Testowe

### 5.1 Środowiska

#### 5.1.1 Lokalne (Development)
**Cel**: Testy deweloperskie podczas implementacji

**Konfiguracja**:
- **Node.js**: 22.20.0 (z `.nvmrc`)
- **npm**: latest
- **Supabase**: Local instance (Docker) lub Supabase Cloud (Dev project)
- **OpenRouter**: API key testowy (ograniczony credit)
- **Przeglądarki**: Chrome latest, Firefox latest

**Uruchomienie**:
```bash
npm install
npm run dev  # Astro dev server na http://localhost:3000
```

**Zmienne środowiskowe** (`.env.local`):
```env
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=your-local-anon-key
OPENROUTER_API_KEY=sk-or-v1-test-key
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

---

#### 5.1.2 Staging
**Cel**: Testy integracyjne i E2E przed wdrożeniem na produkcję

**Konfiguracja**:
- **Hosting**: DigitalOcean App Platform lub Vercel (preview deployment)
- **Supabase**: Oddzielny projekt Staging
- **OpenRouter**: API key z limitem rate (ochrona przed kosztami)
- **SSL**: Tak (HTTPS)
- **URL**: `https://staging.10xcards.com`

**Dane testowe**:
- 5 użytkowników testowych z różnymi scenariuszami
- 100 fiszek na użytkownika (mix manual, ai-full, ai-edited)
- 10 wygenerowanych sesji (generations table)

---

#### 5.1.3 Production
**Cel**: Finalne testy smoke po wdrożeniu

**Konfiguracja**:
- **Hosting**: DigitalOcean Droplet lub Vercel Production
- **Supabase**: Production project
- **OpenRouter**: Production API key
- **SSL**: Tak (HTTPS + HSTS)
- **URL**: `https://10xcards.com`

**Monitoring**:
- Supabase Analytics
- Sentry (error tracking)
- Uptime monitoring (UptimeRobot)

---

### 5.2 Bazy Danych Testowych

#### 5.2.1 Local Database (Supabase Local)
- **PostgreSQL**: 15.x
- **Migracje**: Auto-apply z `supabase/migrations/`
- **RLS**: Enabled
- **Seeding**: Script `seed-local.sql` z danymi testowymi

---

#### 5.2.2 Staging Database
- **Supabase Project**: `10xcards-staging`
- **RLS**: Enabled
- **Backup**: Daily automatic
- **Resetowanie**: Przed każdym cyklem testowym E2E

---

#### 5.2.3 Production Database
- **Supabase Project**: `10xcards-production`
- **RLS**: Enabled
- **Backup**: Hourly
- **Point-in-time recovery**: 7 dni

---

### 5.3 Mock Services

#### 5.3.1 OpenRouter Mock
**Cel**: Testy bez kosztów API i kontrola timeoutów

**Narzędzie**: MSW (Mock Service Worker)

**Scenariusze mockowania**:
- **Success**: Zwraca 10 fiszek w 2s
- **Timeout**: Delay 31s → timeout
- **Invalid JSON**: Zwraca malformed response
- **Rate Limit**: Status 429 Too Many Requests

---

#### 5.3.2 Email Mock (Supabase)
**Cel**: Testy bez wysyłania prawdziwych emaili

**Konfiguracja**:
- Supabase Local: Email printing to console
- Staging: Używa Inbucket (local SMTP server)

---

## 6. Narzędzia do Testowania

### 6.1 Framework Testowy

#### 6.1.1 Vitest
**Zastosowanie**: Testy jednostkowe i integracyjne

**Instalacja**:
```bash
npm install -D vitest @vitest/ui
```

**Konfiguracja** (`vitest.config.ts`):
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['dist/', 'node_modules/', 'test/'],
    },
  },
});
```

**Uruchomienie**:
```bash
npm run test           # Run all tests
npm run test:ui        # Open Vitest UI
npm run test:coverage  # Generate coverage report
```

---

#### 6.1.2 React Testing Library
**Zastosowanie**: Testy komponentów React

**Instalacja**:
```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**Przykład testu**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';

test('displays error for invalid email', async () => {
  render(<LoginForm />);
  
  const emailInput = screen.getByLabelText(/email/i);
  fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
  fireEvent.blur(emailInput);
  
  expect(await screen.findByText(/podaj prawidłowy adres email/i)).toBeInTheDocument();
});
```

---

#### 6.1.3 Playwright
**Zastosowanie**: Testy E2E

**Instalacja**:
```bash
npm install -D @playwright/test
npx playwright install  # Install browsers
```

**Konfiguracja** (`playwright.config.ts`):
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chrome', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'safari', use: { browserName: 'webkit' } },
  ],
});
```

**Uruchomienie**:
```bash
npm run test:e2e              # Run E2E tests
npm run test:e2e:ui           # Open Playwright UI
npm run test:e2e:chrome       # Run only Chrome
```

---

### 6.2 Narzędzia Pomocnicze

#### 6.2.1 MSW (Mock Service Worker)
**Zastosowanie**: Mockowanie API calls w testach

**Setup** (`test/mocks/handlers.ts`):
```typescript
import { rest } from 'msw';

export const handlers = [
  rest.post('/api/flashcards/generate', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        generation_id: 'mock-uuid',
        flashcards: [
          { front: 'Question 1', back: 'Answer 1' },
          { front: 'Question 2', back: 'Answer 2' },
        ],
        model_name: 'mock-model',
        duration_ms: 5000,
        card_count: 2,
      })
    );
  }),
];
```

---

#### 6.2.2 Faker.js
**Zastosowanie**: Generowanie danych testowych

```bash
npm install -D @faker-js/faker
```

**Przykład**:
```typescript
import { faker } from '@faker-js/faker';

const testUser = {
  email: faker.internet.email(),
  password: faker.internet.password({ length: 12, pattern: /[A-Za-z0-9]/ }),
};
```

---

#### 6.2.3 k6 (Load Testing)
**Zastosowanie**: Testy wydajnościowe

**Instalacja**: [k6.io/docs/getting-started/installation](https://k6.io/docs/getting-started/installation)

**Script** (`load-test/generate-flashcards.js`):
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 },  // Ramp-up to 10 users
    { duration: '5m', target: 10 },  // Stay at 10 users
    { duration: '2m', target: 0 },   // Ramp-down
  ],
};

export default function () {
  const payload = JSON.stringify({
    text: 'Lorem ipsum...'.repeat(200), // ~5000 znaków
  });

  const res = http.post('http://localhost:3000/api/flashcards/generate', payload, {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${__ENV.JWT_TOKEN}` },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 15s': (r) => r.timings.duration < 15000,
  });

  sleep(1);
}
```

**Uruchomienie**:
```bash
k6 run load-test/generate-flashcards.js
```

---

#### 6.2.4 Lighthouse CI
**Zastosowanie**: Performance audits

**Setup** (`.lighthouserc.json`):
```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000/", "http://localhost:3000/auth/login"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "first-contentful-paint": ["error", { "maxNumericValue": 1500 }],
        "interactive": ["error", { "maxNumericValue": 3000 }],
        "performance": ["error", { "minScore": 0.85 }]
      }
    }
  }
}
```

---

## 7. Harmonogram Testów

### 7.1 Faza 1: Przygotowanie (Tydzień 1)
**Cel**: Setup środowiska i narzędzi

**Zadania**:
- ✅ Instalacja Vitest, Playwright, MSW
- ✅ Konfiguracja Supabase Local
- ✅ Setup Staging environment
- ✅ Przygotowanie danych testowych (seed scripts)
- ✅ Dokumentacja środowiska testowego

**Odpowiedzialny**: QA Engineer + DevOps

---

### 7.2 Faza 2: Testy Jednostkowe (Tydzień 2-3)
**Cel**: Pokrycie serwisów i komponentów testami jednostkowymi

**Zadania**:
- ✅ Testy `auth-validation.service.ts` (Zod schemas)
- ✅ Testy `flashcard.service.ts` (CRUD operations)
- ✅ Testy `flashcard-generation.service.ts` (AI logic)
- ✅ Testy komponentów auth (`<LoginForm>`, `<RegisterForm>`)
- ✅ Testy komponentów generator (`<GeneratorInputSection>`, `<ReviewCard>`)
- ✅ Testy custom hooks (`useGenerator`, `useFlashcards`)
- ✅ Code coverage report → cel 80%

**Odpowiedzialny**: Developers + QA Engineer

---

### 7.3 Faza 3: Testy Integracyjne (Tydzień 4)
**Cel**: Weryfikacja komunikacji między modułami

**Zadania**:
- ✅ Testy API endpoints (wszystkie `/api/*`)
- ✅ Testy integracji z Supabase (auth, RLS, CRUD)
- ✅ Testy integracji z OpenRouter (mock + real API)
- ✅ Testy middleware (session management)

**Odpowiedzialny**: QA Engineer

---

### 7.4 Faza 4: Testy E2E (Tydzień 5)
**Cel**: Weryfikacja pełnych scenariuszy użytkownika

**Zadania**:
- ✅ TC-AUTH-001 do TC-AUTH-008 (auth flows)
- ✅ TC-GEN-001 do TC-GEN-005 (generator flows)
- ✅ TC-REV-001 do TC-REV-004 (review mode)
- ✅ TC-CRUD-001 do TC-CRUD-004 (flashcard management)
- ✅ TC-SEC-001 do TC-SEC-005 (security tests)

**Odpowiedzialny**: QA Engineer

---

### 7.5 Faza 5: Testy Bezpieczeństwa (Tydzień 6)
**Cel**: Penetration testing i security audit

**Zadania**:
- ✅ RLS policies verification (SQL injection attacks)
- ✅ XSS prevention tests
- ✅ CSRF protection tests
- ✅ Session hijacking tests
- ✅ OWASP ZAP scan (opcjonalnie)

**Odpowiedzialny**: Security Specialist + QA Engineer

---

### 7.6 Faza 6: Testy Wydajnościowe (Tydzień 7)
**Cel**: Load testing i performance benchmarks

**Zadania**:
- ✅ k6 load tests (10 concurrent users)
- ✅ Lighthouse audits (Dashboard, Auth pages)
- ✅ Database query optimization (EXPLAIN ANALYZE)
- ✅ Memory leak detection (React DevTools Profiler)

**Odpowiedzialny**: QA Engineer + Performance Specialist

---

### 7.7 Faza 7: Regresja przed Wdrożeniem (Tydzień 8)
**Cel**: Smoke tests na Staging przed production deploy

**Zadania**:
- ✅ Smoke tests wszystkich kluczowych funkcji
- ✅ Cross-browser testing (Chrome, Firefox, Safari, Edge)
- ✅ Weryfikacja RLS na Staging database
- ✅ Final security checklist
- ✅ Backup verification

**Odpowiedzialny**: QA Lead + DevOps

---

### 7.8 Faza 8: Production Deployment i Monitoring (Tydzień 9)
**Cel**: Deploy i post-deployment verification

**Zadania**:
- ✅ Deploy na Production
- ✅ Smoke tests na Production
- ✅ Monitoring setup (Sentry, Uptime)
- ✅ Bug triage process setup
- ✅ Incident response plan

**Odpowiedzialny**: DevOps + QA Lead

---

## 8. Kryteria Akceptacji Testów

### 8.1 Kryteria Ogólne

#### 8.1.1 Pokrycie Kodu
- ✓ **Serwisy backendowe**: minimum 80% line coverage
- ✓ **Komponenty React**: minimum 70% line coverage
- ✓ **Custom hooks**: minimum 75% coverage
- ✓ **Critical paths** (auth, generator): 100% coverage

#### 8.1.2 Przejście Testów
- ✓ **Wszystkie testy jednostkowe**: 100% passing
- ✓ **Wszystkie testy integracyjne**: 100% passing
- ✓ **Testy E2E**: minimum 95% passing (tolerancja 5% flakiness)
- ✓ **Testy bezpieczeństwa**: 100% passing (zero krytycznych luk)

#### 8.1.3 Performance
- ✓ **Lighthouse Score**: minimum 85 dla Dashboard
- ✓ **API Response Time**: 95th percentile < 500ms (poza LLM)
- ✓ **LLM Generation Time**: 95th percentile < 30s
- ✓ **No Memory Leaks**: w Dashboard po 30 min użytkowania

---

### 8.2 Kryteria Modułów

#### 8.2.1 Moduł Autentykacji
- ✓ Rejestracja działa (email verification)
- ✓ Logowanie/wylogowanie działa
- ✓ Forgot password flow działa
- ✓ Session cookies ustawione (httpOnly, secure)
- ✓ Middleware blokuje nieautoryzowane żądania
- ✓ RLS policies chronią dane użytkowników

**Blokery dla produkcji**:
- ❌ RLS policies DISABLED
- ❌ SUPABASE_SERVICE_KEY exposed w frontendzcie
- ❌ Session hijacking possible

---

#### 8.2.2 Generator AI
- ✓ Generowanie fiszek działa (OpenRouter integration)
- ✓ Walidacja długości tekstu działa (1000-10000)
- ✓ Timeout handling (30s)
- ✓ Error messages wyświetlane użytkownikowi
- ✓ Metryki zapisywane do `generations` table

**Blokery dla produkcji**:
- ❌ LLM API key hardcoded w kodzie
- ❌ Brak timeout → infinite hang
- ❌ Parsing LLM response crashes aplikację

---

#### 8.2.3 Zarządzanie Fiszkami
- ✓ CRUD operations działają (POST, GET, PATCH, DELETE)
- ✓ Paginacja działa (offset-based)
- ✓ Edycja fiszki aktualizuje `updated_at`
- ✓ Usunięcie fiszki (hard delete)
- ✓ RLS chroni przed dostępem do cudzych fiszek

**Blokery dla produkcji**:
- ❌ RLS policies DISABLED
- ❌ User A może edytować fiszki User B
- ❌ Paginacja nie działa dla >100 fiszek

---

### 8.3 Definicja "Done" dla MVP

**Aplikacja jest gotowa do wdrożenia produkcyjnego, gdy**:

1. ✅ **Wszystkie krytyczne testy przechodzą** (auth, generator, CRUD)
2. ✅ **RLS policies enabled i verified**
3. ✅ **Bezpieczeństwo**: brak krytycznych luk (SQL injection, XSS, CSRF)
4. ✅ **Performance**: Lighthouse score > 85, API < 500ms
5. ✅ **Cross-browser**: Działa w Chrome, Firefox, Safari, Edge (latest -1)
6. ✅ **Dokumentacja**: README, API docs, deployment guide
7. ✅ **Monitoring**: Sentry, Uptime monitoring skonfigurowane
8. ✅ **Backup**: Database backup strategy zaimplementowana
9. ✅ **Rollback plan**: Procedura rollback w przypadku incydentu
10. ✅ **Smoke tests production**: Wykonane pomyślnie po deploy

---

## 9. Role i Odpowiedzialności w Procesie Testowania

### 9.1 QA Engineer (Lead Tester)
**Odpowiedzialności**:
- Tworzenie i utrzymanie testów E2E (Playwright)
- Wykonywanie testów manualnych (exploratory testing)
- Zarządzanie bug tracking (Jira/Linear)
- Code review test coverage
- Raportowanie postępu testów
- Weryfikacja kryteriów akceptacji

**Narzędzia**:
- Playwright, Vitest
- Supabase Dashboard (SQL queries)
- Postman (API testing)
- Browser DevTools

---

### 9.2 Developers (Frontend + Backend)
**Odpowiedzialności**:
- Pisanie testów jednostkowych (Vitest + React Testing Library)
- Pisanie testów integracyjnych dla własnego kodu
- Fixing bugs znalezionych przez QA
- Code review test code
- Utrzymanie code coverage > 80%

**Narzędzia**:
- Vitest, React Testing Library
- MSW (mockowanie API)
- Faker.js (dane testowe)

---

### 9.3 DevOps Engineer
**Odpowiedzialności**:
- Setup środowiska testowego (Staging)
- CI/CD pipeline dla testów (GitHub Actions)
- Database seeding scripts
- Monitoring setup (Sentry, Uptime)
- Performance testing infrastructure (k6)

**Narzędzia**:
- Docker, GitHub Actions
- Supabase CLI
- k6, Lighthouse CI
- Sentry

---

### 9.4 Security Specialist (Opcjonalnie)
**Odpowiedzialności**:
- Przeprowadzenie security audit przed produkcją
- Weryfikacja RLS policies
- Penetration testing (OWASP ZAP)
- Review authentication flow
- Setup security headers (HSTS, CSP)

**Narzędzia**:
- OWASP ZAP
- Burp Suite
- Supabase Dashboard (RLS verification)

---

### 9.5 Product Owner
**Odpowiedzialności**:
- Akceptacja kryteriów testów
- Priorytetyzacja bugów
- Decyzja o gotowości do wdrożenia
- UAT (User Acceptance Testing)

---

## 10. Procedury Raportowania Błędów

### 10.1 Proces Wykrywania i Raportowania Błędów

#### 10.1.1 Wykrycie Błędu
**Źródła**:
- Testy automatyczne (Vitest, Playwright)
- Testy manualne QA
- Code review
- Production monitoring (Sentry)
- User feedback

---

#### 10.1.2 Utworzenie Bug Report

**Template Bug Report**:

```markdown
## Tytuł: [Moduł] Krótki opis problemu

### Priorytet:
- [ ] P0 - Critical (blokuje wdrożenie)
- [ ] P1 - High (blokuje funkcjonalność)
- [ ] P2 - Medium (bug ale workaround możliwy)
- [ ] P3 - Low (косmetyczny)

### Środowisko:
- [ ] Local
- [ ] Staging
- [ ] Production
- Przeglądarka: Chrome 119
- OS: Windows 11

### Kroki do Reprodukcji:
1. Zaloguj się jako testuser@example.com
2. Przejdź do Generator Tab
3. Wklej tekst 5000 znaków
4. Kliknij "Generuj fiszki"

### Oczekiwany Rezultat:
System generuje fiszki i wyświetla ReviewSection.

### Faktyczny Rezultat:
Błąd 500 Internal Server Error, toast error "Wystąpił nieoczekiwany błąd".

### Logi / Screenshots:
```json
{
  "error": "TypeError: Cannot read property 'flashcards' of undefined",
  "stack": "..."
}
```

### Dodatkowe Informacje:
- Błąd występuje tylko dla tekstów >8000 znaków
- OpenRouter API zwraca timeout (30s)
- Brak graceful error handling w `flashcard-generation.service.ts`
```

---

#### 10.1.3 Klasyfikacja Bugów

**Severity Levels**:

| Poziom | Opis | Przykład | SLA Fix |
|--------|------|----------|---------|
| **P0 - Critical** | Aplikacja nie działa, produkcja down | RLS policies disabled, SQL injection | 4h |
| **P1 - High** | Kluczowa funkcjonalność nie działa | Generowanie fiszek crashuje | 24h |
| **P2 - Medium** | Funkcjonalność działa ale z bugiem | Paginacja pokazuje złą liczbę stron | 3 dni |
| **P3 - Low** | Kosmetyczny, nie wpływa na użytkowanie | Tooltip typo | 1 tydzień |

---

### 10.2 Workflow Bug Lifecycle

```
[New Bug] 
    ↓
[Triage] (QA Lead + PO) → przypisanie priorytetu
    ↓
[Assigned] (Developer dostaje task)
    ↓
[In Progress] (Developer pracuje nad fix)
    ↓
[Code Review] (Peer review)
    ↓
[Testing] (QA weryfikuje fix)
    ↓
[Verified] → merge do main branch
    ↓
[Closed]
```

---

### 10.3 Bug Metrics do Śledzenia

**KPIs**:
- **Bug Discovery Rate**: liczba bugów znalezionych na tydzień
- **Bug Fix Time**: średni czas od zgłoszenia do fix
- **Reopen Rate**: % bugów reopenowanych po fix (target < 10%)
- **Critical Bugs in Production**: target 0 w pierwszym miesiącu

---

### 10.4 Tools do Bug Tracking

**Rekomendacja**: Linear lub Jira

**Setup**:
- Projekt: 10xCards
- Board: Bug Tracking
- Workflow: New → Triage → Assigned → In Progress → Code Review → Testing → Verified → Closed

**Integration**:
- GitHub: Auto-close bugs when PR merged (commit message: `Fixes #123`)
- Sentry: Auto-create bugs from production errors

---

## 11. Podsumowanie

### 11.1 Kluczowe Wnioski z Analizy Projektu

1. **Bleeding-Edge Stack**: React 19, Tailwind 4, Astro 5 wymagają szczególnej uwagi na testy kompatybilności i stabilności
2. **Bezpieczeństwo Krytyczne**: RLS policies i proper auth handling są fundamentalne dla MVP
3. **Zewnętrzne Zależności**: OpenRouter integration wymaga robust error handling i timeout management
4. **Metryki Biznesowe**: Testy muszą weryfikować AI acceptance rate (75%) i usage ratio (75%)

---

### 11.2 Ryzyko vs Mitigacja

| Ryzyko | Prawdopodobieństwo | Wpływ | Mitigacja |
|--------|-------------------|-------|-----------|
| RLS policies disabled | Średnie | Krytyczny | Automated tests w CI/CD sprawdzające RLS |
| LLM API timeout | Wysokie | Wysoki | Timeout handling + retry logic + user messaging |
| React 19 compatibility issues | Średnie | Wysoki | Extensive browser testing + fallback to React 18 |
| Session hijacking | Niskie | Krytyczny | HttpOnly cookies + security tests |
| Database performance (>10k fiszek) | Średnie | Średni | Query optimization + pagination tests |

---

### 11.3 Następne Kroki

**Pre-Production Checklist**:
1. ✅ Wszystkie testy z tego planu wykonane
2. ✅ RLS policies enabled i zweryfikowane
3. ✅ Security audit zakończony
4. ✅ Performance benchmarks spełnione
5. ✅ Staging environment smoke tests passed
6. ✅ Backup i rollback plan gotowy
7. ✅ Monitoring (Sentry + Uptime) skonfigurowany
8. ✅ Production deploy wykonany
9. ✅ Post-deployment smoke tests passed
10. ✅ User acceptance testing (UAT) zakończone

---

**Dokument utworzony**: 2025-12-11  
**Wersja**: 1.0.0  
**Status**: Gotowy do implementacji  
**Autor**: QA Team - 10xCards

---