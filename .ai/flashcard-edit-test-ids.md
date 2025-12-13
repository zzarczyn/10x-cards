# Dokumentacja data-testid dla scenariusza edycji fiszki

## Przegląd

Ten dokument opisuje wszystkie atrybuty `data-testid` dodane do komponentów w celu umożliwienia testowania E2E scenariusza edycji fiszek.

## Scenariusz testu

1. Przejdź do zakładki "Baza Wiedzy"
2. Poczekaj aż załadują się wszystkie fiszki
3. Kliknij przycisk edycji pierwszej fiszki
4. Dodaj 5 losowych liter na końcu pytania
5. Dodaj 10 losowych liter na końcu odpowiedzi
6. Zapisz wprowadzone zmiany
7. Sprawdź czy w pytaniu znajduje się 5 wprowadzonych liter
8. Sprawdź czy w odpowiedzi znajduje się 10 wprowadzonych liter

## Dodane atrybuty data-testid

### Dashboard.tsx

#### Zakładki nawigacyjne

- **`tab-generator`** - Przycisk przełączający na zakładkę Generator
- **`tab-knowledge-base`** - Przycisk przełączający na zakładkę Baza Wiedzy
- **`tab-content-generator`** - Kontener z zawartością zakładki Generator
- **`tab-content-knowledge-base`** - Kontener z zawartością zakładki Baza Wiedzy

**Użycie:**
```typescript
await page.getByTestId("tab-knowledge-base").click();
await expect(page.getByTestId("tab-content-knowledge-base")).toBeVisible();
```

---

### KnowledgeBaseTab.tsx

#### Stany komponentu

- **`flashcards-loading`** - Kontener wyświetlany podczas ładowania fiszek (skeleton)
- **`knowledge-base-tab`** - Główny kontener zakładki Baza Wiedzy (widoczny po załadowaniu)
- **`flashcards-grid`** - Grid z listą fiszek

**Użycie:**
```typescript
// Czekaj aż fiszki się załadują
await expect(page.getByTestId("flashcards-loading")).not.toBeVisible({ timeout: 10000 });
await expect(page.getByTestId("flashcards-grid")).toBeVisible();
```

---

### FlashcardItem.tsx

#### Elementy fiszki (indeksowane od 0)

- **`flashcard-item-{index}`** - Kontener pojedynczej fiszki
- **`flashcard-front-{index}`** - Element `<p>` z treścią pytania (przód fiszki)
- **`flashcard-back-{index}`** - Element `<p>` z treścią odpowiedzi (tył fiszki)
- **`flashcard-flip-btn-{index}`** - Przycisk obracający fiszkę
- **`flashcard-edit-btn-{index}`** - Przycisk edycji fiszki
- **`flashcard-delete-btn-{index}`** - Przycisk usuwania fiszki

**Użycie:**
```typescript
// Pierwsza fiszka (index = 0)
const firstFlashcard = page.getByTestId("flashcard-item-0");
await firstFlashcard.hover(); // Przyciski są widoczne po najechaniu

// Odczytaj treść pytania
const frontText = await page.getByTestId("flashcard-front-0").textContent();

// Kliknij edycję
await page.getByTestId("flashcard-edit-btn-0").click();

// Obróć fiszkę, żeby zobaczyć odpowiedź
await page.getByTestId("flashcard-flip-btn-0").click();
const backText = await page.getByTestId("flashcard-back-0").textContent();
```

---

### EditFlashcardDialog.tsx

#### Elementy dialogu edycji

- **`edit-flashcard-dialog`** - Kontener dialogu edycji
- **`edit-flashcard-front-input`** - Pole tekstowe do edycji pytania (Textarea)
- **`edit-flashcard-back-input`** - Pole tekstowe do edycji odpowiedzi (Textarea)
- **`edit-flashcard-cancel-btn`** - Przycisk "Anuluj"
- **`edit-flashcard-save-btn`** - Przycisk "Zapisz zmiany"

**Użycie:**
```typescript
// Poczekaj aż dialog się otworzy
const dialog = page.getByTestId("edit-flashcard-dialog");
await expect(dialog).toBeVisible();

// Edytuj treść
const frontInput = page.getByTestId("edit-flashcard-front-input");
await frontInput.fill("Nowa treść pytania");

const backInput = page.getByTestId("edit-flashcard-back-input");
await backInput.fill("Nowa treść odpowiedzi");

// Zapisz zmiany
await page.getByTestId("edit-flashcard-save-btn").click();

// Poczekaj aż dialog się zamknie
await expect(dialog).not.toBeVisible();
```

---

## Przykładowy test E2E

Pełny przykład testu znajduje się w pliku: `e2e/flashcard-edit.spec.ts`

### Test używający Page Object Model (zalecane):

```typescript
import { test, expect } from "@playwright/test";
import { DashboardPage } from "./pages/DashboardPage";

test("should edit first flashcard", async ({ page }) => {
  // ===== ARRANGE =====
  const dashboard = new DashboardPage(page);
  await dashboard.goto();
  await dashboard.switchToKnowledgeBaseTab();
  await dashboard.knowledgeBase.waitForFlashcards();

  const firstFlashcard = dashboard.knowledgeBase.getFirstFlashcard();
  const originalFront = await firstFlashcard.getFrontText();

  // ===== ACT =====
  await firstFlashcard.openEditDialog();
  await dashboard.knowledgeBase.editDialog.fillFront("Nowe pytanie");
  await dashboard.knowledgeBase.editDialog.fillBack("Nowa odpowiedź");
  await dashboard.knowledgeBase.editDialog.save();

  // ===== ASSERT =====
  const updatedFront = await firstFlashcard.getFrontText();
  expect(updatedFront).toBe("Nowe pytanie");
});
```

### Test używający bezpośrednio data-testid:

```typescript
import { test, expect } from "@playwright/test";

test("should edit first flashcard", async ({ page }) => {
  // 1. Przejdź do zakładki Baza Wiedzy
  await page.getByTestId("tab-knowledge-base").click();
  await expect(page.getByTestId("tab-content-knowledge-base")).toBeVisible();

  // 2. Poczekaj na załadowanie fiszek
  await expect(page.getByTestId("flashcards-loading")).not.toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId("flashcards-grid")).toBeVisible();

  // 3. Otwórz dialog edycji pierwszej fiszki
  const firstFlashcard = page.getByTestId("flashcard-item-0");
  await firstFlashcard.hover();
  await page.getByTestId("flashcard-edit-btn-0").click();

  // 4. Edytuj treść
  await page.getByTestId("edit-flashcard-front-input").fill("Nowe pytanie");
  await page.getByTestId("edit-flashcard-back-input").fill("Nowa odpowiedź");

  // 5. Zapisz
  await page.getByTestId("edit-flashcard-save-btn").click();

  // 6. Weryfikuj zmiany
  const updatedFront = await page.getByTestId("flashcard-front-0").textContent();
  expect(updatedFront).toBe("Nowe pytanie");
});
```

**Zalecenie:** Używaj Page Object Model dla lepszej konserwacji i reużywalności kodu. Zobacz dokumentację POM: `.ai/page-objects-documentation.md`

---

### DeleteFlashcardAlertDialog.tsx

#### Elementy dialogu usuwania

- **`delete-flashcard-dialog`** - Kontener dialogu potwierdzenia usunięcia
- **`delete-flashcard-cancel-btn`** - Przycisk "Anuluj"
- **`delete-flashcard-confirm-btn`** - Przycisk "Usuń" (potwierdzenie)

**Użycie:**
```typescript
// Otwórz dialog usuwania
await page.getByTestId("flashcard-delete-btn-0").click();

// Poczekaj aż dialog się otworzy
const deleteDialog = page.getByTestId("delete-flashcard-dialog");
await expect(deleteDialog).toBeVisible();

// Potwierdź usunięcie
await page.getByTestId("delete-flashcard-confirm-btn").click();

// Lub anuluj
// await page.getByTestId("delete-flashcard-cancel-btn").click();

// Poczekaj aż dialog się zamknie
await expect(deleteDialog).not.toBeVisible();
```

---

## Konwencje nazewnictwa

### Wzorce używane w projekcie:

1. **Zakładki**: `tab-{nazwa}` dla przycisków, `tab-content-{nazwa}` dla zawartości
2. **Fiszki**: `flashcard-{akcja}-{index}` dla akcji na konkretnej fiszce
3. **Dialogi**: `{nazwa}-dialog` dla kontenera dialogu
4. **Inputy**: `{nazwa}-{pole}-input` dla pól formularza
5. **Przyciski**: `{nazwa}-{akcja}-btn` dla przycisków akcji

### Reguły:

- Używaj kebab-case (małe litery z myślnikami)
- Bądź opisowy, ale zwięzły
- Dla elementów w pętli dodaj suffix z indeksem: `-{index}`
- Dla stanów ładowania/błędów: `-loading`, `-error`, `-empty`

---

## Wskazówki dla testerów

### 1. Obsługa animacji

Fiszki mają animacje obrotu (500ms). Po kliknięciu przycisku flip należy poczekać:

```typescript
await page.getByTestId("flashcard-flip-btn-0").click();
await page.waitForTimeout(600); // Poczekaj na animację
```

### 2. Widoczność przycisków akcji

Przyciski edycji/usuwania są widoczne tylko po najechaniu myszką:

```typescript
const flashcard = page.getByTestId("flashcard-item-0");
await flashcard.hover(); // Konieczne, aby przyciski stały się widoczne
await page.getByTestId("flashcard-edit-btn-0").click();
```

### 3. Weryfikacja treści po edycji

Po zapisaniu edycji dane są odświeżane asynchronicznie. Warto dodać krótkie opóźnienie:

```typescript
await page.getByTestId("edit-flashcard-save-btn").click();
await expect(page.getByTestId("edit-flashcard-dialog")).not.toBeVisible();
await page.waitForTimeout(500); // Poczekaj na odświeżenie danych
```

### 4. Pusta baza fiszek

Jeśli użytkownik nie ma żadnych fiszek, wyświetlany jest pusty stan. Nie będzie wtedy elementu `flashcards-grid`.

---

## Komponenty powiązane

### Modyfikowane pliki:

1. `src/components/Dashboard.tsx` - Dodano testid do zakładek
2. `src/components/KnowledgeBaseTab.tsx` - Dodano testid do stanów i kontenera
3. `src/components/FlashcardItem.tsx` - Dodano testid do elementów fiszki i przycisków
4. `src/components/EditFlashcardDialog.tsx` - Dodano testid do dialogu edycji i formularza
5. `src/components/DeleteFlashcardAlertDialog.tsx` - Dodano testid do dialogu usuwania

### Nowe pliki testowe:

1. `e2e/flashcard-edit.spec.ts` - Test E2E dla scenariusza edycji fiszki

### Page Object Model:

1. `e2e/page-objects/FlashcardItem.ts` - POM dla pojedynczej fiszki
2. `e2e/page-objects/EditFlashcardDialog.ts` - POM dla dialogu edycji
3. `e2e/page-objects/DeleteFlashcardDialog.ts` - POM dla dialogu usuwania
4. `e2e/page-objects/KnowledgeBaseTab.ts` - POM dla zakładki Baza Wiedzy
5. `e2e/pages/DashboardPage.ts` - POM dla strony Dashboard (zaktualizowany)

Dokumentacja POM: `.ai/page-objects-documentation.md`

---

## Diagram przepływu testu

```
Dashboard
  ├─ Kliknij: tab-knowledge-base
  └─ Poczekaj: tab-content-knowledge-base (visible)
       │
       └─ KnowledgeBaseTab
            ├─ Poczekaj: flashcards-loading (not visible)
            └─ Poczekaj: flashcards-grid (visible)
                 │
                 └─ FlashcardItem (index=0)
                      ├─ Hover na: flashcard-item-0
                      ├─ Odczytaj: flashcard-front-0
                      ├─ Kliknij: flashcard-edit-btn-0
                      │
                      └─ EditFlashcardDialog
                           ├─ Poczekaj: edit-flashcard-dialog (visible)
                           ├─ Wypełnij: edit-flashcard-front-input
                           ├─ Wypełnij: edit-flashcard-back-input
                           ├─ Kliknij: edit-flashcard-save-btn
                           ├─ Poczekaj: edit-flashcard-dialog (not visible)
                           │
                           └─ Weryfikacja
                                ├─ Sprawdź: flashcard-front-0 (nowa treść)
                                ├─ Kliknij: flashcard-flip-btn-0
                                └─ Sprawdź: flashcard-back-0 (nowa treść)
```

