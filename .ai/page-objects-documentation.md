# Dokumentacja Page Object Model (POM)

## Przegląd

Ten dokument opisuje klasy Page Object Model utworzone dla testowania E2E aplikacji 10xCards przy użyciu Playwright.

## Struktura katalogów

```
e2e/
├── page-objects/          # Komponenty wielokrotnego użytku (POM)
│   ├── FlashcardItem.ts
│   ├── EditFlashcardDialog.ts
│   ├── DeleteFlashcardDialog.ts
│   └── KnowledgeBaseTab.ts
├── pages/                 # Całe strony aplikacji
│   ├── DashboardPage.ts
│   └── LoginPage.ts
└── fixtures/              # Test fixtures (np. autentykacja)
    └── auth.setup.ts
```

## Konwencje

### Organizacja kodu

- **`pages/`** - Pełne strony aplikacji (np. Dashboard, Login)
- **`page-objects/`** - Komponenty wielokrotnego użytku (dialogi, zakładki, karty)
- **Selektory** - Używaj `data-testid` z metodą `page.getByTestId()`
- **Async/Await** - Wszystkie metody interakcji są asynchroniczne

### Struktura klasy POM

```typescript
export class ComponentName {
  readonly page: Page;
  readonly element: Locator;

  constructor(page: Page) {
    this.page = page;
    this.element = page.getByTestId("element-testid");
  }

  // Getters - synchroniczne properties
  // Actions - asynchroniczne metody
  // Helpers - metody pomocnicze
}
```

---

## Klasy Page Objects

### 1. FlashcardItem

**Plik:** `e2e/page-objects/FlashcardItem.ts`

**Reprezentuje:** Pojedynczą fiszkę z jej funkcjonalnościami

#### Constructor

```typescript
new FlashcardItem(page: Page, index: number)
```

#### Properties

| Property | Type | Opis |
|----------|------|------|
| `page` | `Page` | Instancja Playwright Page |
| `index` | `number` | Indeks fiszki (zero-based) |
| `container` | `Locator` | Główny kontener fiszki |
| `frontText` | `Locator` | Element z tekstem pytania |
| `backText` | `Locator` | Element z tekstem odpowiedzi |
| `flipButton` | `Locator` | Przycisk obrotu fiszki |
| `editButton` | `Locator` | Przycisk edycji |
| `deleteButton` | `Locator` | Przycisk usuwania |

#### Metody

##### `hover(): Promise<void>`
Najedź kursorem na fiszkę, aby ujawnić przyciski akcji.

```typescript
await flashcard.hover();
```

##### `getFrontText(): Promise<string>`
Pobierz tekst pytania (przód fiszki).

```typescript
const question = await flashcard.getFrontText();
```

##### `getBackText(): Promise<string>`
Pobierz tekst odpowiedzi (tył fiszki).

```typescript
const answer = await flashcard.getBackText();
```

##### `flip(waitForAnimation?: boolean): Promise<void>`
Obróć fiszkę używając przycisku flip. Domyślnie czeka 600ms na animację.

```typescript
await flashcard.flip(); // Czeka na animację
await flashcard.flip(false); // Bez czekania
```

##### `clickToFlip(waitForAnimation?: boolean): Promise<void>`
Obróć fiszkę klikając w kontener. Domyślnie czeka 600ms na animację.

```typescript
await flashcard.clickToFlip();
```

##### `openEditDialog(): Promise<void>`
Otwórz dialog edycji dla tej fiszki.

```typescript
await flashcard.openEditDialog();
```

##### `openDeleteDialog(): Promise<void>`
Otwórz dialog potwierdzenia usunięcia dla tej fiszki.

```typescript
await flashcard.openDeleteDialog();
```

##### `isVisible(): Promise<boolean>`
Sprawdź czy fiszka jest widoczna.

```typescript
const visible = await flashcard.isVisible();
```

##### `waitForVisible(): Promise<void>`
Poczekaj aż fiszka stanie się widoczna.

```typescript
await flashcard.waitForVisible();
```

#### Przykład użycia

```typescript
const firstFlashcard = new FlashcardItem(page, 0);

// Odczytaj treść
const question = await firstFlashcard.getFrontText();
console.log(`Question: ${question}`);

// Obróć i odczytaj odpowiedź
await firstFlashcard.flip();
const answer = await firstFlashcard.getBackText();
console.log(`Answer: ${answer}`);

// Otwórz edycję
await firstFlashcard.openEditDialog();
```

---

### 2. EditFlashcardDialog

**Plik:** `e2e/page-objects/EditFlashcardDialog.ts`

**Reprezentuje:** Dialog edycji fiszki

#### Constructor

```typescript
new EditFlashcardDialog(page: Page)
```

#### Properties

| Property | Type | Opis |
|----------|------|------|
| `page` | `Page` | Instancja Playwright Page |
| `dialog` | `Locator` | Kontener dialogu |
| `frontInput` | `Locator` | Pole tekstowe pytania |
| `backInput` | `Locator` | Pole tekstowe odpowiedzi |
| `cancelButton` | `Locator` | Przycisk anulowania |
| `saveButton` | `Locator` | Przycisk zapisu |

#### Metody

##### `waitForVisible(): Promise<void>`
Poczekaj aż dialog stanie się widoczny.

```typescript
await editDialog.waitForVisible();
```

##### `waitForHidden(): Promise<void>`
Poczekaj aż dialog zostanie ukryty.

```typescript
await editDialog.waitForHidden();
```

##### `isVisible(): Promise<boolean>`
Sprawdź czy dialog jest widoczny.

```typescript
const visible = await editDialog.isVisible();
```

##### `getFrontValue(): Promise<string>`
Pobierz aktualną wartość pola pytania.

```typescript
const currentFront = await editDialog.getFrontValue();
```

##### `getBackValue(): Promise<string>`
Pobierz aktualną wartość pola odpowiedzi.

```typescript
const currentBack = await editDialog.getBackValue();
```

##### `fillFront(text: string): Promise<void>`
Wypełnij pole pytania nową wartością.

```typescript
await editDialog.fillFront("Nowe pytanie");
```

##### `fillBack(text: string): Promise<void>`
Wypełnij pole odpowiedzi nową wartością.

```typescript
await editDialog.fillBack("Nowa odpowiedź");
```

##### `appendToFront(text: string): Promise<void>`
Dodaj tekst na końcu istniejącego pytania.

```typescript
await editDialog.appendToFront("xyz");
```

##### `appendToBack(text: string): Promise<void>`
Dodaj tekst na końcu istniejącej odpowiedzi.

```typescript
await editDialog.appendToBack("abcdefghij");
```

##### `editFlashcard(front?: string, back?: string): Promise<void>`
Edytuj fiszkę - aktualizuj pytanie i/lub odpowiedź.

```typescript
await editDialog.editFlashcard("Nowe pytanie", "Nowa odpowiedź");
await editDialog.editFlashcard("Tylko pytanie", undefined); // Zmieni tylko pytanie
```

##### `save(waitForClose?: boolean): Promise<void>`
Zapisz zmiany i zamknij dialog. Domyślnie czeka na zamknięcie i odświeżenie (500ms).

```typescript
await editDialog.save(); // Czeka na zamknięcie + 500ms
await editDialog.save(false); // Nie czeka
```

##### `cancel(waitForClose?: boolean): Promise<void>`
Anuluj edycję i zamknij dialog. Domyślnie czeka na zamknięcie.

```typescript
await editDialog.cancel();
```

##### `editAndSave(front?: string, back?: string): Promise<void>`
Kompletny flow: poczekaj na otwarcie, edytuj, zapisz.

```typescript
await editDialog.editAndSave("Nowe pytanie", "Nowa odpowiedź");
```

##### `isSaveDisabled(): Promise<boolean>`
Sprawdź czy przycisk zapisu jest zablokowany.

```typescript
const disabled = await editDialog.isSaveDisabled();
```

##### `isSubmitting(): Promise<boolean>`
Sprawdź czy dialog jest w stanie zapisywania.

```typescript
const submitting = await editDialog.isSubmitting();
```

#### Przykład użycia

```typescript
const editDialog = new EditFlashcardDialog(page);

// Otwórz dialog (przez inny komponent)
await flashcard.openEditDialog();

// Czekaj aż się otworzy
await editDialog.waitForVisible();

// Dodaj tekst na końcu
await editDialog.appendToFront("xyz");
await editDialog.appendToBack("abcdefghij");

// Zapisz
await editDialog.save();
```

---

### 3. DeleteFlashcardDialog

**Plik:** `e2e/page-objects/DeleteFlashcardDialog.ts`

**Reprezentuje:** Dialog potwierdzenia usunięcia fiszki

#### Constructor

```typescript
new DeleteFlashcardDialog(page: Page)
```

#### Properties

| Property | Type | Opis |
|----------|------|------|
| `page` | `Page` | Instancja Playwright Page |
| `dialog` | `Locator` | Kontener dialogu |
| `cancelButton` | `Locator` | Przycisk anulowania |
| `confirmButton` | `Locator` | Przycisk potwierdzenia usunięcia |

#### Metody

##### `waitForVisible(): Promise<void>`
Poczekaj aż dialog stanie się widoczny.

##### `waitForHidden(): Promise<void>`
Poczekaj aż dialog zostanie ukryty.

##### `isVisible(): Promise<boolean>`
Sprawdź czy dialog jest widoczny.

##### `confirm(waitForClose?: boolean): Promise<void>`
Potwierdź usunięcie. Domyślnie czeka na zamknięcie i odświeżenie (500ms).

```typescript
await deleteDialog.confirm();
```

##### `cancel(waitForClose?: boolean): Promise<void>`
Anuluj usunięcie. Domyślnie czeka na zamknięcie.

```typescript
await deleteDialog.cancel();
```

##### `isConfirmDisabled(): Promise<boolean>`
Sprawdź czy przycisk potwierdzenia jest zablokowany.

##### `isDeleting(): Promise<boolean>`
Sprawdź czy dialog jest w stanie usuwania.

#### Przykład użycia

```typescript
const deleteDialog = new DeleteFlashcardDialog(page);

// Otwórz dialog
await flashcard.openDeleteDialog();
await deleteDialog.waitForVisible();

// Potwierdź usunięcie
await deleteDialog.confirm();
```

---

### 4. KnowledgeBaseTab

**Plik:** `e2e/page-objects/KnowledgeBaseTab.ts`

**Reprezentuje:** Zakładkę Bazy Wiedzy z listą fiszek

#### Constructor

```typescript
new KnowledgeBaseTab(page: Page)
```

#### Properties

| Property | Type | Opis |
|----------|------|------|
| `page` | `Page` | Instancja Playwright Page |
| `container` | `Locator` | Kontener zakładki |
| `loadingIndicator` | `Locator` | Wskaźnik ładowania (skeleton) |
| `flashcardsGrid` | `Locator` | Grid z fiszkami |
| `editDialog` | `EditFlashcardDialog` | Instancja dialogu edycji |
| `deleteDialog` | `DeleteFlashcardDialog` | Instancja dialogu usuwania |

#### Metody

##### `waitForLoaded(timeout?: number): Promise<void>`
Poczekaj aż fiszki się załadują. Domyślny timeout: 10000ms.

```typescript
await knowledgeBase.waitForLoaded();
await knowledgeBase.waitForLoaded(5000); // Custom timeout
```

##### `isLoading(): Promise<boolean>`
Sprawdź czy fiszki są obecnie ładowane.

```typescript
const loading = await knowledgeBase.isLoading();
```

##### `getFlashcard(index: number): FlashcardItem`
Pobierz instancję fiszki według indeksu (zero-based).

```typescript
const firstFlashcard = knowledgeBase.getFlashcard(0);
const secondFlashcard = knowledgeBase.getFlashcard(1);
```

##### `getFirstFlashcard(): FlashcardItem`
Pobierz pierwszą fiszkę.

```typescript
const firstFlashcard = knowledgeBase.getFirstFlashcard();
```

##### `getFlashcardsCount(): Promise<number>`
Pobierz liczbę widocznych fiszek.

```typescript
const count = await knowledgeBase.getFlashcardsCount();
console.log(`Flashcards: ${count}`);
```

##### `hasFlashcards(): Promise<boolean>`
Sprawdź czy są jakiekolwiek fiszki.

```typescript
const hasAny = await knowledgeBase.hasFlashcards();
```

##### `waitForFlashcards(): Promise<void>`
Poczekaj aż fiszki się załadują i pierwsza fiszka będzie widoczna.

```typescript
await knowledgeBase.waitForFlashcards();
```

##### `editFlashcard(index: number, front?: string, back?: string): Promise<void>`
Edytuj fiszkę według indeksu.

```typescript
await knowledgeBase.editFlashcard(0, "Nowe pytanie", "Nowa odpowiedź");
```

##### `deleteFlashcard(index: number): Promise<void>`
Usuń fiszkę według indeksu.

```typescript
await knowledgeBase.deleteFlashcard(0);
```

##### `editFirstFlashcard(front?: string, back?: string): Promise<void>`
Edytuj pierwszą fiszkę.

```typescript
await knowledgeBase.editFirstFlashcard("Pytanie", "Odpowiedź");
```

##### `deleteFirstFlashcard(): Promise<void>`
Usuń pierwszą fiszkę.

```typescript
await knowledgeBase.deleteFirstFlashcard();
```

#### Przykład użycia

```typescript
const knowledgeBase = new KnowledgeBaseTab(page);

// Poczekaj na załadowanie
await knowledgeBase.waitForFlashcards();

// Sprawdź liczbę fiszek
const count = await knowledgeBase.getFlashcardsCount();
console.log(`Total flashcards: ${count}`);

// Pracuj z konkretną fiszką
const firstFlashcard = knowledgeBase.getFirstFlashcard();
const question = await firstFlashcard.getFrontText();

// Lub użyj metod pomocniczych
await knowledgeBase.editFirstFlashcard("Nowe pytanie", "Nowa odpowiedź");
```

---

### 5. DashboardPage

**Plik:** `e2e/pages/DashboardPage.ts`

**Reprezentuje:** Główna strona Dashboard aplikacji

#### Constructor

```typescript
new DashboardPage(page: Page)
```

#### Properties

| Property | Type | Opis |
|----------|------|------|
| `page` | `Page` | Instancja Playwright Page |
| `welcomeHeading` | `Locator` | Nagłówek powitalny (H1) |
| `generatorTab` | `Locator` | Przycisk zakładki Generator |
| `knowledgeBaseTab` | `Locator` | Przycisk zakładki Baza Wiedzy |
| `generatorContent` | `Locator` | Zawartość zakładki Generator |
| `knowledgeBaseContent` | `Locator` | Zawartość zakładki Baza Wiedzy |
| `knowledgeBase` | `KnowledgeBaseTab` | Instancja page object dla Bazy Wiedzy |

#### Metody

##### `goto(): Promise<void>`
Przejdź na stronę główną.

```typescript
await dashboard.goto();
```

##### `switchToGeneratorTab(): Promise<void>`
Przełącz na zakładkę Generator i poczekaj na jej widoczność.

```typescript
await dashboard.switchToGeneratorTab();
```

##### `switchToKnowledgeBaseTab(): Promise<void>`
Przełącz na zakładkę Baza Wiedzy i poczekaj na jej widoczność.

```typescript
await dashboard.switchToKnowledgeBaseTab();
```

#### Przykład użycia

```typescript
const dashboard = new DashboardPage(page);
await dashboard.goto();

// Przejdź do Bazy Wiedzy
await dashboard.switchToKnowledgeBaseTab();

// Użyj zagnieżdżonego page object
await dashboard.knowledgeBase.waitForFlashcards();
const firstFlashcard = dashboard.knowledgeBase.getFirstFlashcard();
```

---

## Wzorce użycia

### Wzorzec AAA (Arrange-Act-Assert)

```typescript
test("should edit flashcard", async ({ page }) => {
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
  await dashboard.knowledgeBase.editDialog.save();

  // ===== ASSERT =====
  const updatedFront = await firstFlashcard.getFrontText();
  expect(updatedFront).toBe("Nowe pytanie");
});
```

### Kompozycja Page Objects

```typescript
// DashboardPage zawiera KnowledgeBaseTab
// KnowledgeBaseTab zawiera EditFlashcardDialog i DeleteFlashcardDialog
// KnowledgeBaseTab tworzy instancje FlashcardItem

const dashboard = new DashboardPage(page);
await dashboard.switchToKnowledgeBaseTab();

// Dostęp do zagnieżdżonych page objects
const editDialog = dashboard.knowledgeBase.editDialog;
const deleteDialog = dashboard.knowledgeBase.deleteDialog;
const firstFlashcard = dashboard.knowledgeBase.getFirstFlashcard();
```

### Metody pomocnicze high-level

```typescript
// Zamiast:
await firstFlashcard.openEditDialog();
await editDialog.waitForVisible();
await editDialog.fillFront("Pytanie");
await editDialog.fillBack("Odpowiedź");
await editDialog.save();

// Użyj:
await knowledgeBase.editFirstFlashcard("Pytanie", "Odpowiedź");
```

---

## Best Practices

### 1. Używaj data-testid dla selektorów

```typescript
// ✅ Dobre
this.element = page.getByTestId("element-name");

// ❌ Złe
this.element = page.locator(".css-class");
this.element = page.locator("#id");
```

### 2. Wszystkie interakcje jako metody

```typescript
// ✅ Dobre
async openEditDialog() {
  await this.hover();
  await this.editButton.click();
}

// ❌ Złe - bezpośrednie używanie locatorów w testach
await flashcard.editButton.click();
```

### 3. Zwracaj Page Objects z metod

```typescript
// ✅ Dobre
getFlashcard(index: number): FlashcardItem {
  return new FlashcardItem(this.page, index);
}

// Pozwala na fluent API
const flashcard = knowledgeBase.getFlashcard(0);
await flashcard.openEditDialog();
```

### 4. Enkapsulacja waitów

```typescript
// ✅ Dobre - wait jest w środku metody
async save(waitForClose = true) {
  await this.saveButton.click();
  if (waitForClose) {
    await this.waitForHidden();
    await this.page.waitForTimeout(500);
  }
}

// ❌ Złe - wait w teście
await editDialog.save();
await page.waitForTimeout(500);
```

### 5. Używaj parametrów opcjonalnych

```typescript
async flip(waitForAnimation = true) {
  await this.flipButton.click();
  if (waitForAnimation) {
    await this.page.waitForTimeout(600);
  }
}

// Flexibility
await flashcard.flip(); // Czeka
await flashcard.flip(false); // Nie czeka
```

---

## Troubleshooting

### Problem: Elementy nie są widoczne

```typescript
// Sprawdź czy element naprawdę istnieje
await expect(flashcard.container).toBeVisible();

// Użyj debugowania
await page.pause(); // Playwright Inspector
```

### Problem: Timeout podczas ładowania

```typescript
// Zwiększ timeout dla wolniejszych środowisk
await knowledgeBase.waitForLoaded(20000); // 20 sekund
```

### Problem: Animacje powodują flaky tests

```typescript
// Używaj built-in waitów dla animacji
await flashcard.flip(); // Ma wbudowany wait 600ms
```

### Problem: Stale elementy (stale element reference)

```typescript
// ✅ Dobre - pobierz element na nowo
const flashcard = knowledgeBase.getFirstFlashcard();
const text = await flashcard.getFrontText();

// ❌ Złe - przechowywanie locatorów w zmiennych
const text = await firstFlashcard.frontText.textContent();
// Po aktualizacji DOM locator może być nieaktualny
```

---

## Podsumowanie

Struktura POM dla 10xCards:

```
DashboardPage (strona)
  └── KnowledgeBaseTab (komponent)
      ├── EditFlashcardDialog (komponent)
      ├── DeleteFlashcardDialog (komponent)
      └── FlashcardItem[] (komponenty)
```

**Zalety tego podejścia:**
- ✅ Łatwa konserwacja - zmiany w UI wymagają aktualizacji tylko w jednym miejscu
- ✅ Reużywalność - komponenty mogą być używane w wielu testach
- ✅ Czytelność - testy są bardziej zwięzłe i ekspresyjne
- ✅ Separacja - logika UI oddzielona od logiki testów
- ✅ Typowanie - TypeScript zapewnia autouzupełnianie i type safety

