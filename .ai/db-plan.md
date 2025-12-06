# Schemat Bazy Danych - 10xCards MVP

## 1. Tabele

### 1.1 `public.flashcards`
Główna tabela przechowująca fiszki użytkowników.

| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unikalny identyfikator fiszki |
| `user_id` | UUID | NOT NULL, FOREIGN KEY → auth.users(id) | ID właściciela fiszki |
| `front` | VARCHAR(200) | NOT NULL | Treść przodu fiszki (pytanie) |
| `back` | VARCHAR(500) | NOT NULL | Treść tyłu fiszki (odpowiedź) |
| `source` | card_source_type | NOT NULL | Źródło pochodzenia fiszki |
| `generation_id` | UUID | NULL, FOREIGN KEY → generations(id) | ID generacji AI (opcjonalne) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Data utworzenia |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Data ostatniej modyfikacji |

**Ograniczenia:**
- `CHECK (LENGTH(TRIM(front)) > 0)` - przód nie może być pusty (tylko whitespace)
- `CHECK (LENGTH(TRIM(back)) > 0)` - tył nie może być pusty (tylko whitespace)

### 1.2 `public.generations`
Tabela logowania sesji generowania fiszek przez AI (cele analityczne).

| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unikalny identyfikator generacji |
| `user_id` | UUID | NOT NULL, FOREIGN KEY → auth.users(id) | ID użytkownika wykonującego generację |
| `duration_ms` | INTEGER | NOT NULL, CHECK (duration_ms >= 0) | Czas trwania generacji w milisekundach |
| `card_count` | INTEGER | NOT NULL, CHECK (card_count >= 0) | Liczba wygenerowanych fiszek |
| `model_name` | VARCHAR(100) | NOT NULL | Nazwa użytego modelu LLM |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Data wykonania generacji |

### 1.3 Typ ENUM: `card_source_type`
Definiuje źródło pochodzenia fiszki.

```sql
CREATE TYPE card_source_type AS ENUM (
  'ai-full',      -- Fiszka wygenerowana przez AI i zapisana bez edycji
  'ai-edited',    -- Fiszka wygenerowana przez AI i zedytowana przed zapisem
  'manual'        -- Fiszka stworzona ręcznie przez użytkownika
);
```

## 2. Relacje między tabelami

### 2.1 `auth.users` → `public.flashcards` (1:N)
- **Typ:** Jeden-do-wielu
- **Klucz obcy:** `flashcards.user_id` → `auth.users.id`
- **Zasada usuwania:** `ON DELETE CASCADE`
- **Opis:** Jeden użytkownik może posiadać wiele fiszek. Usunięcie użytkownika powoduje kaskadowe usunięcie wszystkich jego fiszek.

### 2.2 `auth.users` → `public.generations` (1:N)
- **Typ:** Jeden-do-wielu
- **Klucz obcy:** `generations.user_id` → `auth.users.id`
- **Zasada usuwania:** `ON DELETE CASCADE`
- **Opis:** Jeden użytkownik może mieć wiele sesji generowania. Usunięcie użytkownika powoduje kaskadowe usunięcie wszystkich logów jego generacji.

### 2.3 `public.generations` → `public.flashcards` (1:N, opcjonalna)
- **Typ:** Jeden-do-wielu (opcjonalna)
- **Klucz obcy:** `flashcards.generation_id` → `generations.id`
- **Zasada usuwania:** `ON DELETE SET NULL`
- **Opis:** Jedna sesja generacji może być źródłem wielu fiszek. Usunięcie logu generacji ustawia `generation_id` w fiszkach na NULL (zachowuje treść fiszek, usuwa tylko referencję do sesji).

**Diagram relacji:**
```
auth.users (1) ──< (N) flashcards
auth.users (1) ──< (N) generations
generations (1) ──< (N) flashcards [opcjonalna]
```

## 3. Indeksy

### 3.1 Indeksy dla tabeli `flashcards`

| Nazwa | Typ | Kolumny | Cel |
|-------|-----|---------|-----|
| `flashcards_pkey` | PRIMARY KEY | `id` | Unikalność i szybkie wyszukiwanie po ID |
| `idx_flashcards_user_created` | BTREE | `user_id, created_at DESC` | Optymalizacja paginacji listy fiszek użytkownika (US-007) |
| `idx_flashcards_generation` | BTREE | `generation_id` | Przyspieszenie zapytań analitycznych łączących fiszki z generacją |
| `idx_flashcards_source` | BTREE | `source` | Wsparcie dla metryk sukcesu (AI Usage Ratio) |

**Uzasadnienie `idx_flashcards_user_created`:**
- Główny przypadek użycia: pobieranie listy fiszek danego użytkownika posortowanych od najnowszych
- Wspiera zapytanie: `SELECT * FROM flashcards WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20 OFFSET 0`
- Indeks złożony (`user_id`, `created_at DESC`) pozwala na efektywne filtrowanie i sortowanie bez dodatkowego kroku

### 3.2 Indeksy dla tabeli `generations`

| Nazwa | Typ | Kolumny | Cel |
|-------|-----|---------|-----|
| `generations_pkey` | PRIMARY KEY | `id` | Unikalność i szybkie wyszukiwanie po ID |
| `idx_generations_user_created` | BTREE | `user_id, created_at DESC` | Opcjonalne raportowanie historii generacji użytkownika |

## 4. Row Level Security (RLS) Policies

### 4.1 Polityki dla tabeli `flashcards`

**Włączenie RLS:**
```sql
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
```

**Policy 1: SELECT (odczyt)**
```sql
CREATE POLICY "Users can view own flashcards"
  ON flashcards
  FOR SELECT
  USING (auth.uid() = user_id);
```
- **Cel:** Użytkownik widzi tylko swoje fiszki
- **Wymaganie:** US-001 (izolacja danych użytkownika)

**Policy 2: INSERT (tworzenie)**
```sql
CREATE POLICY "Users can create own flashcards"
  ON flashcards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```
- **Cel:** Użytkownik może tworzyć fiszki tylko dla siebie
- **Wymaganie:** US-005, US-006 (zapis po recenzji, ręczne dodawanie)

**Policy 3: UPDATE (edycja)**
```sql
CREATE POLICY "Users can update own flashcards"
  ON flashcards
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```
- **Cel:** Użytkownik może edytować tylko swoje fiszki
- **Wymaganie:** US-008 (edycja zapisanych fiszek)

**Policy 4: DELETE (usuwanie)**
```sql
CREATE POLICY "Users can delete own flashcards"
  ON flashcards
  FOR DELETE
  USING (auth.uid() = user_id);
```
- **Cel:** Użytkownik może usuwać tylko swoje fiszki
- **Wymaganie:** US-008 (usuwanie z potwierdzeniem)

### 4.2 Polityki dla tabeli `generations`

**Włączenie RLS:**
```sql
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
```

**Policy 1: SELECT (odczyt)**
```sql
CREATE POLICY "Users can view own generations"
  ON generations
  FOR SELECT
  USING (auth.uid() = user_id);
```
- **Cel:** Użytkownik widzi tylko swoje logi generacji
- **Wymaganie:** Izolacja danych analitycznych

**Policy 2: INSERT (tworzenie)**
```sql
CREATE POLICY "Users can create own generations"
  ON generations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```
- **Cel:** Użytkownik może tworzyć logi generacji tylko dla siebie
- **Wymaganie:** US-003 (proces generowania)

**Policy 3: DELETE (opcjonalne czyszczenie)**
```sql
CREATE POLICY "Users can delete own generations"
  ON generations
  FOR DELETE
  USING (auth.uid() = user_id);
```
- **Cel:** Pozwala użytkownikowi na ręczne czyszczenie historii generacji (feature dodatkowy, poza MVP)

## 5. Triggery i Automatyzacja

### 5.1 Automatyczna aktualizacja `updated_at`

**Wymagane rozszerzenie:**
```sql
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;
```

**Trigger dla tabeli `flashcards`:**
```sql
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON flashcards
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
```

**Cel:** Automatyczne ustawienie `updated_at` na aktualny timestamp przy każdej modyfikacji rekordu (US-008 - edycja).

## 6. Dodatkowe uwagi i decyzje projektowe

### 6.1 Wybór UUID zamiast SERIAL
- **Uzasadnienie:** Większa bezpieczeństwo (brak przewidywalności ID), kompatybilność z systemem Supabase Auth, możliwość generowania ID po stronie klienta (offline-first w przyszłości).

### 6.2 Brak tabeli `drafts` (kandydatów na fiszki)
- **Uzasadnienie:** PRD wyraźnie określa, że stan recenzji (US-004, US-005) jest ulotny i istnieje tylko w pamięci przeglądarki. Zapis do bazy następuje dopiero po akceptacji.
- **Korzyść:** Uproszczenie schematu, brak dodatkowych operacji CRUD na tymczasowych danych.

### 6.3 Hard Delete zamiast Soft Delete
- **Uzasadnienie:** MVP nie wymaga funkcji "Przywróć usuniętą fiszkę". Hard delete upraszcza zapytania (brak filtrowania `WHERE deleted_at IS NULL`) i zmniejsza rozmiar bazy.
- **Ryzyko:** Brak możliwości odzyskania pomyłkowo usuniętych danych. Rekomendacja: Backup bazy danych lub implementacja Soft Delete w przyszłej wersji, jeśli pojawią się skargi użytkowników.

### 6.4 Limity długości treści
- **Front:** `VARCHAR(200)` - krótkie pytanie/podpowiedź
- **Back:** `VARCHAR(500)` - dłuższa odpowiedź/wyjaśnienie
- **Uzasadnienie:** Wymusza zwięzłość (zasada dobrej fiszki w metodzie spaced repetition). Jeśli użytkownik potrzebuje więcej miejsca, to sygnał, że fiszka powinna być podzielona na mniejsze jednostki.
- **Rozszerzalność:** W razie potrzeby limity można zwiększyć prostą migracją `ALTER COLUMN`.

### 6.5 Opcjonalność `generation_id` w `flashcards`
- **Uzasadnienie:** 
  - Fiszki ręczne (source = 'manual') nie mają przypisanej generacji.
  - Usunięcie logu generacji nie powinno usuwać fiszek (tylko referencja).
- **ON DELETE SET NULL:** Zachowuje integralność treści, usuwa tylko metadane o pochodzeniu.

### 6.6 Metryki sukcesu (PRD §6)
Schemat wspiera obliczanie kluczowych metryk:

**AI Usage Ratio (75% fiszek z AI):**
```sql
SELECT 
  COUNT(CASE WHEN source IN ('ai-full', 'ai-edited') THEN 1 END)::FLOAT / 
  COUNT(*)::FLOAT * 100 AS ai_usage_percent
FROM flashcards
WHERE user_id = auth.uid();
```

**Acceptance Rate (75% zaakceptowanych propozycji):**
```sql
SELECT 
  SUM(card_count)::FLOAT / 
  (SELECT COUNT(*) FROM flashcards WHERE generation_id IS NOT NULL)::FLOAT * 100 
  AS acceptance_rate
FROM generations
WHERE user_id = auth.uid();
```
*(Uwaga: Ta metryka wymaga logowania liczby odrzuconych kandydatów w tabeli `generations` lub osobnej tabeli `generation_candidates` w przyszłości)*

### 6.7 Normalizacja
- **Poziom:** 3NF (Third Normal Form)
- **Uzasadnienie:** 
  - Brak redundancji danych (email użytkownika w `auth.users`, nie w `flashcards`)
  - Każdy atrybut zależy tylko od klucza głównego
  - Tabela `generations` wydzielona jako odrębna encja (zamiast duplikowania `model_name` w każdej fiszce)

### 6.8 Skalowalność
- **Paginacja:** Indeks `(user_id, created_at DESC)` zapewnia wydajność nawet przy >100k fiszkach użytkownika
- **Sharding (przyszłość):** Możliwy podział po `user_id` przy wzroście do milionów użytkowników
- **Archiwizacja:** Możliwość przeniesienia starych rekordów `generations` do oddzielnej tabeli archiwum (poza zakresem MVP)

### 6.9 Kompatybilność z Supabase
- **Schema:** `public` (domyślny dla API Supabase)
- **Auth:** Integracja z `auth.users` poprzez `auth.uid()` w politykach RLS
- **Realtime (opcjonalnie):** Tabela `flashcards` może być włączona do Supabase Realtime dla synchronizacji między urządzeniami (feature poza MVP)

### 6.10 Brak obsługi załączników
- **Decyzja:** PRD wyraźnie wyklucza obrazy, pliki audio (§4 Out of Scope)
- **Przyszłość:** Dodanie kolumny `media_url` (VARCHAR lub JSONB dla wielu załączników) wymaga oddzielnej migracji

## 7. Checklist zgodności z PRD

| Wymaganie | Wsparcie w schemacie |
|-----------|---------------------|
| US-001: Logowanie (Email/Hasło) | ✅ Integracja z `auth.users`, RLS wymusza izolację |
| US-002: Walidacja tekstu (1000-10000 znaków) | ✅ Walidacja po stronie aplikacji, schemat przechowuje tylko wynik |
| US-003: Generowanie fiszek AI | ✅ Tabela `generations` loguje proces, `flashcards.source` oznacza pochodzenie |
| US-004: Edycja kandydatów | ✅ Stan w przeglądarce, schemat nie przechowuje draftów (zgodnie z decyzją) |
| US-005: Akceptacja/Odrzucenie | ✅ Zapis do `flashcards` po akceptacji, `source` rozróżnia edytowane |
| US-006: Manualne dodawanie | ✅ `source = 'manual'`, `generation_id = NULL` |
| US-007: Lista fiszek | ✅ Indeks `(user_id, created_at DESC)` dla paginacji |
| US-008: CRUD zapisanych fiszek | ✅ RLS policies (UPDATE, DELETE), `updated_at` trigger |
| Metryka: Acceptance Rate | ⚠️ Częściowe (wymaga logowania odrzuconych kandydatów) |
| Metryka: AI Usage Ratio | ✅ Kolumna `source` pozwala na obliczenie |

**Legenda:**
- ✅ Pełne wsparcie
- ⚠️ Częściowe wsparcie (wymaga rozszerzenia w przyszłości)
- ❌ Brak wsparcia (nie dotyczy MVP)

---

**Status dokumentu:** Gotowy do implementacji  
**Wersja schematu:** 1.0.0 (MVP)  
**Data utworzenia:** 2025-12-06

