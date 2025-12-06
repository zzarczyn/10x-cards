# Dokument wymagań produktu (PRD) - 10xCards

## 1. Przegląd produktu
10xCards to aplikacja internetowa służąca do szybkiego tworzenia materiałów edukacyjnych (fiszek) przy użyciu Sztucznej Inteligencji. Głównym celem produktu jest drastyczne skrócenie czasu potrzebnego na przygotowanie bazy wiedzy, co stanowi największą barierę w adaptacji metody spaced repetition (powtórek w odstępach czasu). W fazie MVP (Minimum Viable Product) aplikacja skupia się na generowaniu par pytań i odpowiedzi z wklejonego tekstu, ich weryfikacji przez użytkownika oraz podstawowym zarządzaniu stworzoną kolekcją.

## 2. Problem użytkownika
Tworzenie wysokiej jakości fiszek jest procesem manualnym, żmudnym i czasochłonnym. Użytkownicy, którzy chcą się uczyć efektywnie, często rezygnują z metody spaced repetition, ponieważ koszt czasowy przygotowania materiałów przewyższa postrzegane korzyści w krótkim terminie. Istniejące rozwiązania albo wymagają ręcznego wpisywania każdej karty, albo oferują skomplikowane importy, które rzadko dają zadowalające rezultaty bez dodatkowej edycji. Użytkownik potrzebuje narzędzia, które wykona "czarną robotę" (ekstrakcję wiedzy z tekstu), pozostawiając mu jedynie rolę recenzenta.

## 3. Wymagania funkcjonalne

### 3.1 Uwierzytelnianie i Konta Użytkowników
- System logowania i rejestracji oparty na parze Email/Hasło.
- Blokada dostępu do treści dla użytkowników niezalogowanych (Landing Page zawiera formularz logowania).
- Sesja użytkownika jest utrzymywana po zalogowaniu.

### 3.2 Generator AI (Core Feature)
- Pojedyncze pole tekstowe input przyjmujące tekst źródłowy.
- Walidacja długości tekstu: minimum 1000 znaków, maksimum 10000 znaków.
- Przycisk generowania jest nieaktywny, dopóki warunki walidacji nie są spełnione.
- Integracja z modelem LLM w celu ekstrakcji par Pytanie-Odpowiedź.
- Obsługa błędów API (wyświetlenie komunikatu z prośbą o ponowienie próby).

### 3.3 Tryb Recenzji (Review Mode)
- Wyświetlanie wygenerowanych kandydatów na fiszki w formie listy tymczasowej (w pamięci przeglądarki).
- Możliwość edycji treści (Front/Back) każdego kandydata przed zapisem.
- Możliwość odrzucenia (usunięcia) kandydata z listy propozycji.
- Możliwość zatwierdzenia kandydata (zapis do trwałej bazy danych).
- Stan recenzji jest ulotny - odświeżenie strony powoduje utratę niezapisanych kandydatów.

### 3.4 Zarządzanie Fiszkami (Baza Danych)
- Widok listy zapisanych fiszek (Front/Back).
- Paginacja listy (brak infinite scroll).
- Interakcja "Flip" - możliwość odwrócenia fiszki na liście, aby zobaczyć rewers.
- Edycja treści zapisanej fiszki.
- Usuwanie zapisanej fiszki.
- Struktura danych uwzględnia pola dla algorytmu SM-2 (interwał, powtórzenia, E-factor), które są inicjowane wartościami domyślnymi, mimo braku aktywnego modułu nauki w MVP.

### 3.5 Manualne tworzenie fiszek
- Formularz dodawania pojedynczej fiszki bez użycia AI.
- Pola: Front (Pytanie), Back (Odpowiedź).

## 4. Granice produktu (Out of Scope dla MVP)
- Algorytm powtórek: Aplikacja nie posiada trybu "Nauki" ani harmonogramu powtórek (pola w bazie są tylko placeholderami).
- Import plików: Brak obsługi PDF, DOCX, obrazów. Tylko tekst surowy (plain text).
- Urządzenia mobilne: Interfejs nie jest responsywny (RWD), dedykowany tylko na Desktop.
- Organizacja: Brak kategorii, tagów czy podziału na talie (jeden wspólny widok dla wszystkich fiszek).
- Społeczność: Brak współdzielenia fiszek, profili publicznych.
- Eksport: Brak możliwości pobrania danych do pliku.
- Automatyczna detekcja duplikatów: System pozwala na stworzenie identycznych fiszek.

## 5. Historyjki użytkowników

### Uwierzytelnianie

#### US-001: Logowanie do systemu
- Tytuł: Logowanie i dostęp do aplikacji
- Opis: Jako nowy użytkownik, chcę założyć konto i zalogować się, aby mieć prywatną przestrzeń na moje fiszki.
- Kryteria akceptacji:
  1. Użytkownik wchodząc na stronę główną widzi formularz logowania/rejestracji.
  2. Po wpisaniu poprawnego emaila i hasła użytkownik jest przekierowywany do głównego widoku aplikacji (Dashboard).
  3. Próba wejścia na podstronę bez logowania przekierowuje do strony logowania.
  4. System obsługuje błędy logowania (niepoprawne hasło, brak użytkownika) wyświetlając komunikat.

### Generator AI

#### US-002: Walidacja tekstu wejściowego
- Tytuł: Wprowadzanie tekstu do generatora
- Opis: Jako użytkownik, chcę wiedzieć, czy mój tekst spełnia wymagania długości, aby uniknąć błędów generowania.
- Kryteria akceptacji:
  1. System wyświetla licznik znaków pod polem tekstowym.
  2. Przycisk "Generuj" jest zablokowany (wyszarzony), jeśli liczba znaków jest mniejsza niż 1000.
  3. Przycisk "Generuj" jest zablokowany, jeśli liczba znaków przekracza 10000.
  4. System wyświetla jasny komunikat o wymaganych limitach.

#### US-003: Generowanie fiszek
- Tytuł: Proces generowania propozycji
- Opis: Jako użytkownik, chcę otrzymać propozycje fiszek na podstawie wklejonego tekstu, aby nie musieć wymyślać ich samodzielnie.
- Kryteria akceptacji:
  1. Po kliknięciu "Generuj" wyświetlany jest wskaźnik ładowania (spinner).
  2. Po zakończeniu procesu, interfejs przechodzi w tryb Recenzji wyświetlając listę wygenerowanych par.
  3. W przypadku błędu API/sieci, wyświetlany jest komunikat z przyciskiem "Spróbuj ponownie".

### Tryb Recenzji

#### US-004: Weryfikacja i edycja kandydatów
- Tytuł: Edycja wygenerowanych propozycji
- Opis: Jako użytkownik, chcę poprawić treść wygenerowanej fiszki przed zapisaniem, aby upewnić się, że jest bezbłędna.
- Kryteria akceptacji:
  1. W trybie recenzji pola Front i Back są polami edytowalnymi (input/textarea).
  2. Zmiana treści w polach nie wymaga dodatkowego przycisku "Zapisz zmiany" (stan lokalny jest aktualizowany na bieżąco).

#### US-005: Akceptacja i odrzucanie
- Tytuł: Selekcja fiszek do zapisu
- Opis: Jako użytkownik, chcę wybrać tylko wartościowe fiszki i zapisać je do mojej bazy.
- Kryteria akceptacji:
  1. Każda propozycja posiada przycisk "Zapisz" oraz "Odrzuć".
  2. Kliknięcie "Zapisz" dodaje fiszkę do bazy danych i usuwa ją z listy propozycji.
  3. Kliknięcie "Odrzuć" bezpowrotnie usuwa propozycję z widoku.
  4. Dostępna jest opcja "Zapisz wszystkie", która przenosi wszystkie pozostałe propozycje do bazy.

### Zarządzanie Fiszkami

#### US-006: Manualne dodawanie
- Tytuł: Ręczne dodanie fiszki
- Opis: Jako użytkownik, chcę dodać pojedynczą fiszkę ręcznie, w sytuacji gdy mam specyficzne pytanie nie wynikające z dłuższego tekstu.
- Kryteria akceptacji:
  1. Dostępny jest przycisk "Dodaj fiszkę" w widoku listy.
  2. Otwiera się pusty formularz z polami Front i Back.
  3. Po zatwierdzeniu fiszka pojawia się na górze listy zapisanych fiszek.

#### US-007: Przeglądanie listy
- Tytuł: Lista moich fiszek
- Opis: Jako użytkownik, chcę widzieć wszystkie moje zapisane fiszki, aby mieć przegląd mojej bazy wiedzy.
- Kryteria akceptacji:
  1. Fiszki wyświetlane są na liście z paginacją (np. 20 na stronę).
  2. Domyślnie widoczna jest strona Front (Pytanie).
  3. Użytkownik może kliknąć w fiszkę lub ikonę obrotu, aby zobaczyć stronę Back (Odpowiedź).

#### US-008: Zarządzanie zapisanymi fiszkami (CRUD)
- Tytuł: Usuwanie i edycja z listy
- Opis: Jako użytkownik, chcę usunąć lub poprawić starą fiszkę, jeśli znajdę w niej błąd.
- Kryteria akceptacji:
  1. Przy każdej fiszce na liście znajduje się opcja "Edytuj" i "Usuń".
  2. Opcja "Usuń" wymaga potwierdzenia w modal/alert.
  3. Usunięcie fiszki jest trwałe.
  4. Edycja aktualizuje treść w bazie danych.

## 6. Metryki sukcesu
- Acceptance Rate (Wskaźnik akceptacji): Minimum 75% fiszek zaproponowanych przez algorytm AI jest zapisywanych przez użytkownika do bazy (bez odrzucenia).
- AI Usage Ratio (Wskaźnik użycia AI): 75% wszystkich fiszek w bazie danych systemu pochodzi z generatora AI, a nie z ręcznego wprowadzania.

