# Specyfikacja Architektury Autentykacji - 10xCards

## 1. WPROWADZENIE

### 1.1 Cel dokumentu
Niniejsza specyfikacja techniczna definiuje architekturę modułu autentykacji dla aplikacji 10xCards, obejmującą rejestrację, logowanie, wylogowanie oraz odzyskiwanie hasła użytkowników zgodnie z wymaganiem **US-001** z PRD.

### 1.2 Zakres funkcjonalny
- **Rejestracja** - tworzenie nowego konta użytkownika (email + hasło)
- **Logowanie** - uwierzytelnianie użytkownika i nawiązanie sesji
- **Wylogowanie** - zakończenie aktywnej sesji użytkownika
- **Odzyskiwanie hasła** - reset hasła poprzez link wysłany emailem
- **Ochrona tras** - kontrola dostępu do aplikacji dla użytkowników niezalogowanych
- **Zarządzanie sesją** - utrzymanie stanu autentykacji między żądaniami

### 1.3 Założenia architektoniczne
1. **Supabase Auth** jako dostawca usług autentykacji (provider)
2. **Astro SSR** (output: "server") dla renderowania stron z weryfikacją po stronie serwera
3. **Middleware Astro** jako centralny punkt kontroli dostępu
4. **React** komponenty dla interaktywnych formularzy autentykacyjnych
5. **Brak zewnętrznych OAuth providers** w MVP (tylko Email/Password)
6. **Server-Side Cookie** dla zarządzania sesją (token JWT w httpOnly cookie)

---

## 2. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 2.1 Struktura stron i nawigacja

#### 2.1.1 Routing aplikacji

```
┌─────────────────────────────────────────────────────────────┐
│                      Hierarchia Stron                        │
└─────────────────────────────────────────────────────────────┘

PUBLIC (niezalogowani użytkownicy)
├── /auth/login          - Formularz logowania
├── /auth/register       - Formularz rejestracji
├── /auth/forgot-password - Formularz żądania resetu hasła
└── /auth/reset-password - Formularz ustawienia nowego hasła

PROTECTED (wymagają autentykacji)
├── /                    - Dashboard (Generator + Baza Wiedzy)
└── /api/*               - Wszystkie endpointy API
```

#### 2.1.2 Diagram przepływu nawigacji

```
┌───────────────┐
│ Wejście na    │
│ /             │
└───────┬───────┘
        │
        ├─── Zalogowany? ───────┐
        │                        │
       TAK                      NIE
        │                        │
        v                        v
┌──────────────┐        ┌──────────────┐
│  Dashboard   │        │ Redirect →   │
│  (index)     │        │ /auth/login  │
└──────────────┘        └──────────────┘
                                │
                         ┌──────┴──────┐
                         │             │
                    Login Form    Register Link
                         │             │
                         │      ┌──────v──────┐
                         │      │  /auth/     │
                         │      │  register   │
                         │      └─────────────┘
                         v
                   Po sukcesie → redirect /
```

### 2.2 Nowe strony Astro

#### 2.2.1 `/src/pages/auth/login.astro`
**Odpowiedzialność:**
- Renderowanie strony logowania po stronie serwera
- Sprawdzenie czy użytkownik jest już zalogowany (redirect do `/` jeśli tak)
- Osadzenie komponentu React z formularzem logowania
- Wyświetlenie komunikatów z query params (np. `?message=registered`)

**Struktura:**
```typescript
// Frontmatter (server-side logic)
- Sprawdzenie sesji przez context.locals.supabase.auth.getSession()
- Redirect do "/" jeśli użytkownik zalogowany
- Odczyt query params (message, error)

// Template
- Layout bez nagłówka Dashboard
- Komponent <AuthLayout> z centrowaniem i brandingiem
- Komponent React <LoginForm client:load />
- Linki do: /auth/register, /auth/forgot-password
```

**Przypadki użycia:**
- Użytkownik wchodzi bezpośrednio na `/auth/login`
- Użytkownik jest przekierowywany z `/` (gdy niezalogowany)
- Użytkownik widzi błąd logowania (przekazany przez query param)
- Użytkownik widzi potwierdzenie rejestracji (query param `?message=registered`)

#### 2.2.2 `/src/pages/auth/register.astro`
**Odpowiedzialność:**
- Renderowanie strony rejestracji
- Sprawdzenie czy użytkownik nie jest już zalogowany
- Osadzenie komponentu React z formularzem rejestracji

**Struktura:**
```typescript
// Frontmatter
- Sprawdzenie sesji (redirect do "/" jeśli zalogowany)

// Template
- Layout z komponentem <AuthLayout>
- Komponent React <RegisterForm client:load />
- Link powrotu do /auth/login
```

#### 2.2.3 `/src/pages/auth/forgot-password.astro`
**Odpowiedzialność:**
- Renderowanie formularza żądania resetu hasła
- Przyjęcie emaila użytkownika i wysłanie linku resetującego

**Struktura:**
```typescript
// Frontmatter
- Brak konieczności sprawdzania sesji (public)

// Template
- Layout z komponentem <AuthLayout>
- Komponent React <ForgotPasswordForm client:load />
- Link powrotu do /auth/login
```

#### 2.2.4 `/src/pages/auth/reset-password.astro`
**Odpowiedzialność:**
- Renderowanie formularza zmiany hasła po kliknięciu linku z emaila
- Walidacja tokenu resetującego z query params
- Obsługa ustawienia nowego hasła

**Struktura:**
```typescript
// Frontmatter
- Odczyt tokenu z URL (Supabase dołącza token jako fragment/query param)
- Walidacja czy token istnieje

// Template
- Layout z komponentem <AuthLayout>
- Komponent React <ResetPasswordForm client:load token={token} />
- Link powrotu do /auth/login (jeśli token nieważny)
```

#### 2.2.5 Modyfikacja `/src/pages/index.astro`
**Zmiana:**
- Dodanie warstwy ochrony - sprawdzenie autentykacji przed renderowaniem Dashboard
- Redirect do `/auth/login` jeśli użytkownik niezalogowany

**Nowa struktura:**
```typescript
// Frontmatter (PRZED renderowaniem)
const { data: { session }, error } = await Astro.locals.supabase.auth.getSession();

if (!session) {
  return Astro.redirect('/auth/login');
}

// Pobranie danych użytkownika dla potrzeb Dashboard (opcjonalne)
const user = session.user;

// Template (BEZ ZMIAN)
- Layout + Dashboard client:load
```

### 2.3 Nowe komponenty React

#### 2.3.1 `<LoginForm>` - `/src/components/auth/LoginForm.tsx`
**Odpowiedzialność:**
- Formularz logowania z walidacją klienta
- Wywoływanie API endpointu `/api/auth/login` (POST)
- Wyświetlanie błędów walidacji i błędów serwera
- Przekierowanie po sukcesie na `/`

**Props:** brak

**Stan wewnętrzny:**
```typescript
interface LoginFormState {
  email: string;
  password: string;
  isLoading: boolean;
  error: string | null;
  validationErrors: {
    email?: string;
    password?: string;
  };
}
```

**Pola formularza:**
1. **Email**
   - Typ: `<Input type="email" />`
   - Walidacja (client-side):
     - Wymagane
     - Format email (regex)
   - Komunikat błędu: "Podaj prawidłowy adres email"

2. **Hasło**
   - Typ: `<Input type="password" />`
   - Walidacja (client-side):
     - Wymagane
     - Minimum 6 znaków
   - Komunikat błędu: "Hasło musi mieć minimum 6 znaków"

3. **Przycisk Submit**
   - Tekst: "Zaloguj się"
   - Stan loading: disabled + spinner
   - Wyłączony gdy walidacja nie przeszła

**Logika Submit:**
```typescript
async function handleSubmit(e: FormEvent) {
  e.preventDefault();
  
  // 1. Walidacja pól
  if (!validateForm()) return;
  
  // 2. Wywołanie API
  setIsLoading(true);
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  // 3. Obsługa odpowiedzi
  if (response.ok) {
    // Success: przekierowanie przez window.location (force reload)
    window.location.href = '/';
  } else {
    const errorData = await response.json();
    setError(errorData.message || 'Błąd logowania');
    setIsLoading(false);
  }
}
```

**Wyświetlanie błędów:**
- Błędy walidacji: pod każdym polem (inline, czerwony tekst)
- Błąd serwera: nad formularzem (Alert component z Shadcn/ui)

**Przykładowe komunikaty błędów serwera:**
- "Nieprawidłowy email lub hasło"
- "Konto nie zostało aktywowane. Sprawdź swoją skrzynkę email."
- "Wystąpił błąd. Spróbuj ponownie później."

**Dodatkowe linki:**
- "Nie masz konta? Zarejestruj się" → `/auth/register`
- "Zapomniałeś hasła?" → `/auth/forgot-password`

#### 2.3.2 `<RegisterForm>` - `/src/components/auth/RegisterForm.tsx`
**Odpowiedzialność:**
- Formularz rejestracji z walidacją klienta
- Wywoływanie API endpointu `/api/auth/register` (POST)
- Wyświetlanie informacji o konieczności potwierdzenia emaila
- Przekierowanie do `/auth/login?message=registered` po sukcesie

**Props:** brak

**Stan wewnętrzny:**
```typescript
interface RegisterFormState {
  email: string;
  password: string;
  confirmPassword: string;
  isLoading: boolean;
  isSuccess: boolean; // Po sukcesie, przed redirectem
  error: string | null;
  validationErrors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
}
```

**Pola formularza:**
1. **Email**
   - Walidacja: wymagane, format email
   - Komunikat: "Podaj prawidłowy adres email"

2. **Hasło**
   - Walidacja: wymagane, min. 8 znaków, przynajmniej 1 cyfra
   - Komunikat: "Hasło musi mieć minimum 8 znaków i zawierać cyfrę"
   - Wskaźnik siły hasła (opcjonalnie - progress bar)

3. **Potwierdzenie hasła**
   - Walidacja: wymagane, musi być identyczne z hasłem
   - Komunikat: "Hasła muszą być identyczne"

4. **Przycisk Submit**
   - Tekst: "Zarejestruj się"
   - Stan loading: disabled + spinner

**Logika Submit:**
```typescript
async function handleSubmit(e: FormEvent) {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  setIsLoading(true);
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  if (response.ok) {
    setIsSuccess(true);
    // Wyświetl info o emailu weryfikacyjnym przez 3 sekundy
    setTimeout(() => {
      window.location.href = '/auth/login?message=registered';
    }, 3000);
  } else {
    const errorData = await response.json();
    setError(errorData.message || 'Błąd rejestracji');
    setIsLoading(false);
  }
}
```

**Komunikaty:**
- **Po sukcesie (przed redirectem):**  
  "Konto zostało utworzone! Sprawdź swoją skrzynkę email, aby potwierdzić adres."
  
- **Błędy serwera:**
  - "Ten adres email jest już zarejestrowany"
  - "Hasło jest zbyt słabe"
  - "Wystąpił błąd. Spróbuj ponownie później."

**Dodatkowe linki:**
- "Masz już konto? Zaloguj się" → `/auth/login`

#### 2.3.3 `<ForgotPasswordForm>` - `/src/components/auth/ForgotPasswordForm.tsx`
**Odpowiedzialność:**
- Przyjęcie adresu email od użytkownika
- Wywołanie endpointu `/api/auth/forgot-password` (POST)
- Wyświetlenie potwierdzenia wysłania emaila

**Props:** brak

**Stan wewnętrzny:**
```typescript
interface ForgotPasswordFormState {
  email: string;
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
}
```

**Pola:**
1. **Email**
   - Walidacja: wymagane, format email
2. **Przycisk:** "Wyślij link resetujący"

**Logika Submit:**
```typescript
async function handleSubmit(e: FormEvent) {
  e.preventDefault();
  
  setIsLoading(true);
  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  
  // ZAWSZE pokaż sukces (security best practice - nie ujawniaj czy email istnieje)
  setIsSuccess(true);
  setIsLoading(false);
}
```

**Komunikat sukcesu:**
"Jeśli konto z tym adresem email istnieje, otrzymasz wiadomość z linkiem do zresetowania hasła."

#### 2.3.4 `<ResetPasswordForm>` - `/src/components/auth/ResetPasswordForm.tsx`
**Odpowiedzialność:**
- Formularz ustawienia nowego hasła
- Walidacja tokenu (przekazanego z URL)
- Wywołanie endpointu `/api/auth/reset-password` (POST)

**Props:**
```typescript
interface ResetPasswordFormProps {
  token: string | null; // Token z URL
}
```

**Stan wewnętrzny:**
```typescript
interface ResetPasswordFormState {
  password: string;
  confirmPassword: string;
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
}
```

**Pola:**
1. **Nowe hasło** - walidacja jak w RegisterForm
2. **Potwierdzenie hasła** - musi być identyczne
3. **Przycisk:** "Ustaw nowe hasło"

**Logika Submit:**
```typescript
async function handleSubmit(e: FormEvent) {
  e.preventDefault();
  
  if (!token) {
    setError('Nieprawidłowy link resetujący');
    return;
  }
  
  setIsLoading(true);
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  
  if (response.ok) {
    setIsSuccess(true);
    setTimeout(() => {
      window.location.href = '/auth/login?message=password-reset';
    }, 2000);
  } else {
    const errorData = await response.json();
    setError(errorData.message || 'Nie udało się zmienić hasła');
    setIsLoading(false);
  }
}
```

#### 2.3.5 `<UserMenu>` - `/src/components/auth/UserMenu.tsx`
**Odpowiedzialność:**
- Wyświetlenie informacji o zalogowanym użytkowniku w Dashboard
- Przycisk wylogowania
- Dropdown menu z opcjami użytkownika (opcjonalnie)

**Props:**
```typescript
interface UserMenuProps {
  userEmail: string; // Przekazany z SSR (Astro)
}
```

**Pozycja:** Prawy górny róg Dashboard (header)

**Elementy:**
- Avatar/ikona użytkownika (placeholder)
- Email użytkownika (skrócony jeśli za długi)
- Przycisk "Wyloguj się"

**Logika wylogowania:**
```typescript
async function handleLogout() {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
  });
  
  if (response.ok) {
    // Force reload do strony logowania
    window.location.href = '/auth/login';
  }
}
```

#### 2.3.6 Modyfikacja `<Dashboard>` - `/src/components/Dashboard.tsx`
**Zmiana:**
- Dodanie komponentu `<UserMenu>` w nagłówku
- Przekazanie informacji o użytkowniku z props

**Nowa struktura:**
```typescript
interface DashboardProps {
  userEmail: string; // Nowy prop
}

export function Dashboard({ userEmail }: DashboardProps) {
  // ... existing generator logic
  
  return (
    <div className="container">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1>10xCards</h1>
          <p>Twórz fiszki szybciej dzięki AI</p>
        </div>
        <UserMenu userEmail={userEmail} />
      </header>
      {/* ... rest of Dashboard */}
    </div>
  );
}
```

**Aktualizacja w `/src/pages/index.astro`:**
```astro
---
const session = await Astro.locals.supabase.auth.getSession();
const userEmail = session.data.session?.user.email ?? '';
---

<Layout>
  <Dashboard client:load userEmail={userEmail} />
</Layout>
```

### 2.4 Nowy komponent layoutu

#### 2.4.1 `<AuthLayout>` - `/src/layouts/AuthLayout.astro`
**Cel:** Dedykowany layout dla stron autentykacyjnych (login, register, etc.)

**Struktura:**
```astro
---
interface Props {
  title?: string;
  description?: string;
}

const { title = "10xCards - Logowanie", description } = Astro.props;
---

<!doctype html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
  </head>
  <body>
    <div class="auth-container">
      <!-- Branding/Logo -->
      <div class="auth-header">
        <h1 class="text-2xl font-bold">10xCards</h1>
        <p class="text-muted-foreground">Twórz fiszki szybciej dzięki AI</p>
      </div>
      
      <!-- Slot dla formularzy -->
      <div class="auth-card">
        <slot />
      </div>
      
      <!-- Opcjonalna stopka -->
      <div class="auth-footer">
        <p class="text-sm text-muted-foreground">
          &copy; 2025 10xCards
        </p>
      </div>
    </div>
  </body>
</html>

<style>
  .auth-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 2rem;
    background: linear-gradient(to bottom, #f8f9fa, #e9ecef);
  }
  
  .auth-header {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .auth-card {
    width: 100%;
    max-width: 400px;
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
  
  .auth-footer {
    margin-top: 2rem;
    text-align: center;
  }
</style>
```

### 2.5 Walidacja i komunikaty błędów

#### 2.5.1 Zasady walidacji

**Client-side (React):**
- Walidacja formularzy przed wywołaniem API
- Komunikaty błędów wyświetlane inline (pod polami)
- Wyłączenie przycisku submit gdy formularz niepoprawny
- Real-time walidacja podczas wpisywania (z debounce)

**Server-side (API Endpoints):**
- Duplikacja wszystkich walidacji (nigdy nie ufaj frontendowi)
- Użycie Zod schemas dla walidacji danych wejściowych
- Zwracanie szczegółowych błędów walidacji w formacie:
  ```typescript
  {
    error: "Validation failed",
    details: [
      { field: "email", message: "Invalid email format" },
      { field: "password", message: "Password too short" }
    ]
  }
  ```

#### 2.5.2 Katalog komunikatów błędów

**Email:**
- Puste: "Email jest wymagany"
- Nieprawidłowy format: "Podaj prawidłowy adres email"
- Już istnieje: "Ten adres email jest już zarejestrowany"

**Hasło:**
- Puste: "Hasło jest wymagane"
- Za krótkie (login): "Hasło musi mieć minimum 6 znaków"
- Za słabe (rejestracja): "Hasło musi mieć minimum 8 znaków i zawierać cyfrę"
- Niezgodne potwierdzenie: "Hasła muszą być identyczne"

**Autentykacja:**
- Nieprawidłowe credentials: "Nieprawidłowy email lub hasło"
- Konto nieaktywne: "Potwierdź swój adres email przed zalogowaniem"
- Sesja wygasła: "Sesja wygasła. Zaloguj się ponownie."
- Brak uprawnień: "Nie masz dostępu do tej strony"

**Sieć/Serwer:**
- Timeout: "Przekroczono czas oczekiwania. Spróbuj ponownie."
- 500 error: "Wystąpił błąd serwera. Spróbuj ponownie później."
- Brak połączenia: "Brak połączenia z internetem"

### 2.6 Scenariusze użytkowania

#### Scenariusz 1: Nowy użytkownik - Rejestracja
1. Użytkownik wchodzi na `/` (lub bezpośrednio `/auth/login`)
2. System wykrywa brak sesji → redirect `/auth/login`
3. Użytkownik klika "Nie masz konta? Zarejestruj się"
4. System przekierowuje na `/auth/register`
5. Użytkownik wypełnia formularz (email + hasło + potwierdzenie)
6. Walidacja client-side OK → klik "Zarejestruj się"
7. POST `/api/auth/register` → Supabase tworzy konto
8. Komponent wyświetla sukces: "Sprawdź email, aby potwierdzić konto"
9. Po 3s redirect → `/auth/login?message=registered`
10. Strona logowania wyświetla: "Konto utworzone! Potwierdź email przed logowaniem."
11. Użytkownik klika link w emailu → konto aktywowane
12. Użytkownik wraca na `/auth/login` i loguje się

#### Scenariusz 2: Zalogowanie istniejącego użytkownika
1. Użytkownik wchodzi na `/auth/login`
2. Wypełnia email + hasło
3. Walidacja client-side OK → klik "Zaloguj się"
4. POST `/api/auth/login` → Supabase weryfikuje credentials
5. Endpoint ustawia session cookie (httpOnly)
6. Response 200 OK
7. Frontend wykonuje `window.location.href = '/'`
8. GET `/` → Middleware wykrywa sesję → renderuje Dashboard
9. Dashboard wyświetla się z menu użytkownika

#### Scenariusz 3: Próba dostępu do Dashboard bez logowania
1. Użytkownik wchodzi na `/` (np. przez zakładkę)
2. Middleware sprawdza sesję → brak sesji
3. Astro page wykonuje `Astro.redirect('/auth/login')`
4. Użytkownik widzi stronę logowania

#### Scenariusz 4: Odzyskiwanie hasła
1. Użytkownik na `/auth/login` klika "Zapomniałeś hasła?"
2. System przekierowuje na `/auth/forgot-password`
3. Użytkownik wpisuje email → klik "Wyślij link"
4. POST `/api/auth/forgot-password` → Supabase wysyła email
5. Komponent wyświetla: "Jeśli konto istnieje, otrzymasz email"
6. Użytkownik klika link w emailu → przekierowanie `/auth/reset-password?token=xxx`
7. Strona `reset-password.astro` waliduje token
8. Użytkownik ustawia nowe hasło → POST `/api/auth/reset-password`
9. Sukces → redirect `/auth/login?message=password-reset`
10. Strona logowania wyświetla: "Hasło zostało zmienione"

#### Scenariusz 5: Wylogowanie
1. Zalogowany użytkownik na Dashboard klika menu użytkownika
2. Klika "Wyloguj się"
3. POST `/api/auth/logout` → endpoint usuwa session
4. Response 200 OK
5. Frontend wykonuje `window.location.href = '/auth/login'`
6. Użytkownik widzi stronę logowania

---

## 3. LOGIKA BACKENDOWA

### 3.1 Endpointy API Autentykacji

#### 3.1.1 `POST /api/auth/register`
**Plik:** `/src/pages/api/auth/register.ts`

**Odpowiedzialność:**
- Rejestracja nowego użytkownika w Supabase Auth
- Walidacja danych wejściowych
- Wysłanie emaila weryfikacyjnego

**Request Body:**
```typescript
{
  email: string;      // Email użytkownika
  password: string;   // Hasło (min. 8 znaków, 1 cyfra)
}
```

**Walidacja Schema (Zod):**
```typescript
const RegisterSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/\d/, "Password must contain at least one digit"),
});
```

**Logika:**
```typescript
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Parse i walidacja body
    const body = await request.json();
    const validationResult = RegisterSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: validationResult.error.issues.map(issue => ({
            field: issue.path[0],
            message: issue.message,
          })),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const { email, password } = validationResult.data;
    
    // 2. Wywołanie Supabase Auth
    const { data, error } = await locals.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${request.url.origin}/auth/callback`,
      },
    });
    
    // 3. Obsługa błędów Supabase
    if (error) {
      // Mapowanie błędów Supabase na komunikaty użytkownika
      if (error.message.includes("already registered")) {
        return new Response(
          JSON.stringify({
            error: "Registration failed",
            message: "Ten adres email jest już zarejestrowany",
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({
          error: "Registration failed",
          message: "Nie udało się utworzyć konta. Spróbuj ponownie.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // 4. Sukces
    return new Response(
      JSON.stringify({
        success: true,
        message: "Sprawdź swoją skrzynkę email, aby potwierdzić konto",
        userId: data.user?.id,
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (err) {
    console.error("Register endpoint error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "Wystąpił nieoczekiwany błąd",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

**Response (Success - 201):**
```typescript
{
  success: true;
  message: string;
  userId: string;
}
```

**Response (Error - 400/409/500):**
```typescript
{
  error: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}
```

#### 3.1.2 `POST /api/auth/login`
**Plik:** `/src/pages/api/auth/login.ts`

**Odpowiedzialność:**
- Uwierzytelnianie użytkownika przez Supabase Auth
- Ustawienie session cookie (httpOnly)

**Request Body:**
```typescript
{
  email: string;
  password: string;
}
```

**Walidacja Schema (Zod):**
```typescript
const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
```

**Logika:**
```typescript
export const POST: APIRoute = async ({ request, locals, cookies }) => {
  try {
    // 1. Walidacja
    const body = await request.json();
    const validationResult = LoginSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: validationResult.error.issues.map(issue => ({
            field: issue.path[0],
            message: issue.message,
          })),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const { email, password } = validationResult.data;
    
    // 2. Uwierzytelnienie przez Supabase
    const { data, error } = await locals.supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // 3. Obsługa błędów
    if (error) {
      // Nie ujawniamy czy email istnieje (security best practice)
      return new Response(
        JSON.stringify({
          error: "Authentication failed",
          message: "Nieprawidłowy email lub hasło",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // 4. Ustawienie session cookie
    // Supabase automatycznie zarządza session, ale możemy dodać dodatkowe cookies
    const session = data.session;
    
    if (session) {
      // Set httpOnly cookie z access tokenem
      cookies.set('sb-access-token', session.access_token, {
        path: '/',
        httpOnly: true,
        secure: import.meta.env.PROD, // tylko HTTPS w production
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 dni
      });
      
      // Set refresh token
      cookies.set('sb-refresh-token', session.refresh_token, {
        path: '/',
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 dni
      });
    }
    
    // 5. Sukces
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (err) {
    console.error("Login endpoint error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "Wystąpił nieoczekiwany błąd",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

**Response (Success - 200):**
```typescript
{
  success: true;
  user: {
    id: string;
    email: string;
  };
}
```

**Response (Error - 401/500):**
```typescript
{
  error: string;
  message: string;
}
```

#### 3.1.3 `POST /api/auth/logout`
**Plik:** `/src/pages/api/auth/logout.ts`

**Odpowiedzialność:**
- Wylogowanie użytkownika (usunięcie sesji Supabase)
- Wyczyszczenie cookies

**Request Body:** brak (endpoint nie wymaga danych)

**Logika:**
```typescript
export const POST: APIRoute = async ({ locals, cookies }) => {
  try {
    // 1. Wylogowanie przez Supabase
    const { error } = await locals.supabase.auth.signOut();
    
    if (error) {
      console.error("Supabase logout error:", error);
      // Mimo błędu, czyścimy cookies (fail-safe)
    }
    
    // 2. Wyczyszczenie cookies
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });
    
    // 3. Sukces
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (err) {
    console.error("Logout endpoint error:", err);
    // W przypadku błędu, i tak zwracamy sukces (logout zawsze powinien "działać")
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

**Response (Success - 200):**
```typescript
{
  success: true;
}
```

#### 3.1.4 `POST /api/auth/forgot-password`
**Plik:** `/src/pages/api/auth/forgot-password.ts`

**Odpowiedzialność:**
- Wysłanie emaila z linkiem resetującym hasło
- Nie ujawnia czy email istnieje w systemie

**Request Body:**
```typescript
{
  email: string;
}
```

**Walidacja Schema (Zod):**
```typescript
const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});
```

**Logika:**
```typescript
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Walidacja
    const body = await request.json();
    const validationResult = ForgotPasswordSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          message: "Podaj prawidłowy adres email",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const { email } = validationResult.data;
    
    // 2. Wywołanie Supabase (resetPasswordForEmail)
    const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${request.url.origin}/auth/reset-password`,
    });
    
    // 3. ZAWSZE zwracamy sukces (security - nie ujawniamy czy email istnieje)
    // Ignorujemy error od Supabase
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Jeśli konto z tym adresem istnieje, otrzymasz email",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (err) {
    console.error("Forgot password endpoint error:", err);
    // Mimo błędu, zwracamy sukces (security)
    return new Response(
      JSON.stringify({
        success: true,
        message: "Jeśli konto z tym adresem istnieje, otrzymasz email",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

**Response (Always Success - 200):**
```typescript
{
  success: true;
  message: string;
}
```

#### 3.1.5 `POST /api/auth/reset-password`
**Plik:** `/src/pages/api/auth/reset-password.ts`

**Odpowiedzialność:**
- Ustawienie nowego hasła po kliknięciu linku z emaila
- Walidacja tokenu resetującego

**Request Body:**
```typescript
{
  token: string;      // Token z URL (przekazany przez frontend)
  password: string;   // Nowe hasło
}
```

**Walidacja Schema (Zod):**
```typescript
const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/\d/, "Password must contain at least one digit"),
});
```

**Logika:**
```typescript
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Walidacja
    const body = await request.json();
    const validationResult = ResetPasswordSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: validationResult.error.issues.map(issue => ({
            field: issue.path[0],
            message: issue.message,
          })),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const { token, password } = validationResult.data;
    
    // 2. Weryfikacja tokenu i aktualizacja hasła
    // Note: Supabase automatycznie weryfikuje token w updateUser
    const { data, error } = await locals.supabase.auth.updateUser({
      password,
    });
    
    // 3. Obsługa błędów
    if (error) {
      if (error.message.includes("token")) {
        return new Response(
          JSON.stringify({
            error: "Invalid token",
            message: "Link resetujący wygasł lub jest nieprawidłowy",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({
          error: "Reset failed",
          message: "Nie udało się zmienić hasła. Spróbuj ponownie.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // 4. Sukces
    return new Response(
      JSON.stringify({
        success: true,
        message: "Hasło zostało zmienione",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (err) {
    console.error("Reset password endpoint error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "Wystąpił nieoczekiwany błąd",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

**Response (Success - 200):**
```typescript
{
  success: true;
  message: string;
}
```

**Response (Error - 400/500):**
```typescript
{
  error: string;
  message: string;
}
```

#### 3.1.6 `GET /api/auth/callback`
**Plik:** `/src/pages/api/auth/callback.ts`

**Odpowiedzialność:**
- Obsługa callback po kliknięciu linku weryfikacyjnego z emaila
- Finalizacja rejestracji lub resetu hasła
- Redirect użytkownika do odpowiedniej strony

**Query Params:**
- `token_hash` - token z emaila (Supabase format)
- `type` - typ akcji: "signup" | "recovery" | "magiclink"

**Logika:**
```typescript
export const GET: APIRoute = async ({ url, locals, redirect }) => {
  try {
    const token_hash = url.searchParams.get('token_hash');
    const type = url.searchParams.get('type') as 'signup' | 'recovery' | null;
    
    if (!token_hash || !type) {
      return redirect('/auth/login?error=invalid-callback');
    }
    
    // Weryfikacja tokenu przez Supabase
    const { error } = await locals.supabase.auth.verifyOtp({
      token_hash,
      type,
    });
    
    if (error) {
      console.error("Callback verification error:", error);
      return redirect('/auth/login?error=verification-failed');
    }
    
    // Redirect w zależności od typu
    if (type === 'signup') {
      return redirect('/auth/login?message=email-confirmed');
    }
    
    if (type === 'recovery') {
      return redirect('/auth/reset-password');
    }
    
    return redirect('/');
    
  } catch (err) {
    console.error("Callback endpoint error:", err);
    return redirect('/auth/login?error=unknown');
  }
};
```

### 3.2 Aktualizacja istniejących endpointów

#### 3.2.1 Obecny middleware `/src/middleware/index.ts`
**Obecna funkcjonalność:**
- Dodaje `supabase` do `context.locals`
- Sprawdza autentykację tylko dla endpointów `/api/*`
- Dodaje `user` do `context.locals` dla API

**Zmiana:** Rozszerzenie sprawdzania sesji z cookie

**Nowa logika:**
```typescript
export const onRequest = defineMiddleware(async (context, next) => {
  // Add Supabase client to context
  context.locals.supabase = supabaseClient;
  
  // Odczyt session z cookies (dla SSR)
  const accessToken = context.cookies.get('sb-access-token')?.value;
  const refreshToken = context.cookies.get('sb-refresh-token')?.value;
  
  if (accessToken && refreshToken) {
    // Ustawienie sesji w kliencie Supabase
    await context.locals.supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }
  
  // For API endpoints, enforce authentication
  if (context.url.pathname.startsWith("/api/")) {
    // Pomiń endpointy auth (są publiczne)
    if (context.url.pathname.startsWith("/api/auth/")) {
      return next();
    }
    
    const {
      data: { user },
      error,
    } = await context.locals.supabase.auth.getUser();

    if (error || !user) {
      return new Response(
        JSON.stringify({
          error: "Authentication required",
          message: "Please log in to continue",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Add user to context for easy access in endpoints
    context.locals.user = user;
  }

  return next();
});
```

**Uwaga:** Sprawdzanie autentykacji dla stron (np. `/`) jest realizowane bezpośrednio w plikach `.astro`, nie w middleware (zgodnie z best practices Astro).

### 3.3 Typy i serwisy pomocnicze

#### 3.3.1 Rozszerzenie typów Astro
**Plik:** `/src/env.d.ts`

**Dodanie:**
```typescript
declare namespace App {
  interface Locals {
    supabase: SupabaseClient;
    user?: User; // User z @supabase/supabase-js
  }
}
```

#### 3.3.2 Serwis walidacji
**Plik:** `/src/lib/services/auth-validation.service.ts`

**Cel:** Centralizacja schematów walidacji Zod dla autentykacji

```typescript
import { z } from "zod";

/**
 * Schema dla rejestracji
 */
export const RegisterSchema = z.object({
  email: z
    .string()
    .min(1, "Email jest wymagany")
    .email("Podaj prawidłowy adres email"),
  password: z
    .string()
    .min(8, "Hasło musi mieć minimum 8 znaków")
    .regex(/\d/, "Hasło musi zawierać przynajmniej jedną cyfrę"),
});

/**
 * Schema dla logowania
 */
export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email jest wymagany")
    .email("Podaj prawidłowy adres email"),
  password: z
    .string()
    .min(6, "Hasło musi mieć minimum 6 znaków"),
});

/**
 * Schema dla zapomnienia hasła
 */
export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email jest wymagany")
    .email("Podaj prawidłowy adres email"),
});

/**
 * Schema dla resetu hasła
 */
export const ResetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Hasło musi mieć minimum 8 znaków")
    .regex(/\d/, "Hasło musi zawierać przynajmniej jedną cyfrę"),
});

/**
 * Typy inferred ze schematów
 */
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
```

#### 3.3.3 Typy DTO dla autentykacji
**Plik:** `/src/types.ts` (rozszerzenie istniejącego)

**Dodanie:**
```typescript
// ============================================================================
// Authentication - DTOs
// ============================================================================

/**
 * Response z endpointu logowania
 */
export interface LoginResponseDTO {
  success: true;
  user: {
    id: string;
    email: string;
  };
}

/**
 * Response z endpointu rejestracji
 */
export interface RegisterResponseDTO {
  success: true;
  message: string;
  userId: string;
}

/**
 * Response z endpointu zapomnienia hasła
 */
export interface ForgotPasswordResponseDTO {
  success: true;
  message: string;
}

/**
 * Response z endpointu resetu hasła
 */
export interface ResetPasswordResponseDTO {
  success: true;
  message: string;
}

/**
 * Response z endpointu wylogowania
 */
export interface LogoutResponseDTO {
  success: true;
}

/**
 * Props dla komponentu UserMenu
 */
export interface UserMenuProps {
  userEmail: string;
}
```

### 3.4 Zarządzanie sesją i ciasteczkami

#### 3.4.1 Strategia sesji

**Mechanizm:**
- Supabase Auth używa JWT (JSON Web Tokens) do zarządzania sesją
- Tokeny przechowywane w httpOnly cookies (bezpieczne, niedostępne dla JavaScript)
- Access token (krótkotrwały, 1h) + Refresh token (długotrwały, 30 dni)

**Ciasteczka ustawiane przez `/api/auth/login`:**
```
sb-access-token: JWT access token
  - httpOnly: true
  - secure: true (w production)
  - sameSite: 'lax'
  - maxAge: 7 days

sb-refresh-token: JWT refresh token
  - httpOnly: true
  - secure: true (w production)
  - sameSite: 'lax'
  - maxAge: 30 days
```

#### 3.4.2 Odświeżanie sesji

**Middleware automatycznie odświeża sesję:**
- Supabase SDK automatycznie wykrywa wygasły access token
- Jeśli refresh token jest ważny, wymienia go na nowy access token
- Proces transparentny dla użytkownika

**Scenariusz:**
1. Użytkownik zalogowany 8 dni temu (access token wygasł)
2. Wchodzi na `/` → middleware czyta cookies
3. `supabase.auth.setSession()` wykrywa wygasły access token
4. Supabase automatycznie używa refresh token do pobrania nowego access token
5. Nowy access token zwrócony w odpowiedzi (opcjonalnie aktualizujemy cookie)
6. Użytkownik widzi Dashboard bez relogowania

#### 3.4.3 Wygaśnięcie sesji

**Gdy oba tokeny wygasły:**
- `getUser()` zwraca `error`
- Middleware lub strona wykrywa brak sesji
- Redirect do `/auth/login`

**Wymuszone wylogowanie (przez admina):**
- Supabase pozwala na "blacklisting" tokenów
- Użytkownik przy kolejnym żądaniu otrzyma error 401
- Redirect do logowania

---

## 4. SYSTEM AUTENTYKACJI (Supabase Integration)

### 4.1 Konfiguracja Supabase Auth

#### 4.1.1 Zmienne środowiskowe
**Plik:** `.env` (lokalnie) lub ENV w hosting (produkcja)

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key  # Opcjonalnie, dla operacji admin
```

**Bezpieczeństwo:**
- `SUPABASE_KEY` (anon key) - bezpieczny do użycia w frontendzcie (jest publiczny)
- `SUPABASE_SERVICE_KEY` - NIGDY nie ujawniać, tylko server-side (pełne uprawnienia)

#### 4.1.2 Konfiguracja Supabase Dashboard

**Email Templates:**
1. **Confirm signup** (Potwierdzenie rejestracji)
   - Subject: "Potwierdź swój adres email - 10xCards"
   - Body: Custom HTML template z linkiem {{ .ConfirmationURL }}

2. **Reset password** (Reset hasła)
   - Subject: "Zresetuj hasło - 10xCards"
   - Body: Custom HTML template z linkiem {{ .ConfirmationURL }}

3. **Magic Link** (Opcjonalnie - nie używane w MVP)

**URL Configuration:**
- **Site URL:** `https://yourdomain.com` (produkcja) lub `http://localhost:3000` (dev)
- **Redirect URLs:**
  - `http://localhost:3000/api/auth/callback`
  - `https://yourdomain.com/api/auth/callback`

**Auth Settings:**
- **Enable Email Confirmations:** `true` (użytkownik musi potwierdzić email)
- **Disable Email Confirmation:** `false` w produkcji, `true` w dev (opcjonalnie)
- **Minimum Password Length:** 8 znaków (można skonfigurować w dashboard)
- **Enable Sign Ups:** `true`

#### 4.1.3 Supabase Client - aktualizacja
**Plik:** `/src/db/supabase.client.ts`

**Obecna implementacja jest wystarczająca**, ale można dodać:

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Automatyczne odświeżanie tokenu
    autoRefreshToken: true,
    // Persist session w localStorage (opcjonalnie - dla client-side)
    persistSession: false, // false dla SSR (używamy cookies)
    // Wykrywanie sesji z storage event (dla multi-tab)
    detectSessionInUrl: true,
  },
});

// Export type for use in other files
export type SupabaseClient = typeof supabaseClient;
```

### 4.2 Row Level Security (RLS) - Aktywacja

#### 4.2.1 Wymaganie dla produkcji

**Obecny stan:** RLS policies są zakomentowane w migracji (`20251207165500_initial_schema.sql`).

**Akcja wymagana przed wdrożeniem autentykacji:**
1. Odkomentować wszystkie RLS policies w migracji
2. Uruchomić migrację ponownie lub zastosować policies ręcznie w Supabase Dashboard

**Kluczowe policies (już zdefiniowane, wymaga odkomentowania):**
```sql
-- Flashcards
alter table public.flashcards enable row level security;

create policy "flashcards_select_own"
  on public.flashcards for select to authenticated
  using (auth.uid() = user_id);

create policy "flashcards_insert_own"
  on public.flashcards for insert to authenticated
  with check (auth.uid() = user_id);

create policy "flashcards_update_own"
  on public.flashcards for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "flashcards_delete_own"
  on public.flashcards for delete to authenticated
  using (auth.uid() = user_id);

-- Generations
alter table public.generations enable row level security;

create policy "generations_select_own"
  on public.generations for select to authenticated
  using (auth.uid() = user_id);

create policy "generations_insert_own"
  on public.generations for insert to authenticated
  with check (auth.uid() = user_id);
```

#### 4.2.2 Dlaczego RLS jest krytyczne?

**Bez RLS:**
- Użytkownik A może odczytać fiszki użytkownika B (jeśli zna UUID)
- Możliwe zapytania typu: `SELECT * FROM flashcards WHERE user_id != auth.uid()`

**Z RLS:**
- PostgreSQL automatycznie filtruje wyniki zapytań
- Nawet jeśli kod aplikacji ma błąd, baza danych chroni dane
- Każde SELECT/INSERT/UPDATE/DELETE jest ograniczone do `auth.uid() = user_id`

### 4.3 Integracja z istniejącymi endpointami API

#### 4.3.1 Obecne endpointy (wymagają user_id)

**Endpointy do aktualizacji:**
1. `POST /api/flashcards/generate`
2. `POST /api/flashcards` (batch create)
3. `GET /api/flashcards` (list)
4. `PATCH /api/flashcards/:id` (update)
5. `DELETE /api/flashcards/:id` (delete)

**Zmiana:** Wszystkie już mają zabezpieczenie w middleware:
```typescript
// Middleware sprawdza user dla /api/* (poza /api/auth/*)
context.locals.user = user; // Dostępne w endpoint
```

**Użycie w endpointach:**
```typescript
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user; // Użytkownik z middleware
  
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401 }
    );
  }
  
  // Użycie user.id przy insercie
  await locals.supabase.from('flashcards').insert({
    ...data,
    user_id: user.id, // Z autentykacji
  });
};
```

**Dodatkowa warstwa bezpieczeństwa:**
Nawet jeśli endpoint błędnie użyje innego `user_id`, RLS policy zablokuje operację.

### 4.4 Obsługa błędów autentykacji

#### 4.4.1 Katalog błędów Supabase Auth

**Błędy zwracane przez `signInWithPassword`:**
- `Invalid login credentials` → "Nieprawidłowy email lub hasło"
- `Email not confirmed` → "Potwierdź swój email przed zalogowaniem"
- `User not found` → "Nieprawidłowy email lub hasło" (nie ujawniamy)

**Błędy zwracane przez `signUp`:**
- `User already registered` → "Ten adres email jest już zarejestrowany"
- `Password is too weak` → "Hasło jest zbyt słabe"
- `Invalid email` → "Podaj prawidłowy adres email"

**Błędy zwracane przez `resetPasswordForEmail`:**
- Supabase NIGDY nie zwraca błędu jeśli email nie istnieje (security by design)

**Błędy sesji:**
- `JWT expired` → Automatycznie odświeżane przez SDK (transparentne)
- `JWT malformed` → Wyczyść cookies i redirect do login
- `Refresh token expired` → Redirect do login

#### 4.4.2 Serwis mapowania błędów
**Plik:** `/src/lib/services/auth-error-mapping.service.ts`

```typescript
/**
 * Mapowanie błędów Supabase Auth na komunikaty użytkownika
 */
export function mapSupabaseAuthError(error: unknown): string {
  if (!error || typeof error !== 'object' || !('message' in error)) {
    return "Wystąpił nieoczekiwany błąd";
  }
  
  const message = String(error.message).toLowerCase();
  
  // Login errors
  if (message.includes("invalid login credentials")) {
    return "Nieprawidłowy email lub hasło";
  }
  
  if (message.includes("email not confirmed")) {
    return "Potwierdź swój email przed zalogowaniem";
  }
  
  // Signup errors
  if (message.includes("already registered")) {
    return "Ten adres email jest już zarejestrowany";
  }
  
  if (message.includes("password") && message.includes("weak")) {
    return "Hasło jest zbyt słabe. Użyj minimum 8 znaków i jednej cyfry.";
  }
  
  // Session errors
  if (message.includes("jwt expired") || message.includes("token expired")) {
    return "Sesja wygasła. Zaloguj się ponownie.";
  }
  
  // Default
  return "Wystąpił błąd. Spróbuj ponownie później.";
}
```

### 4.5 Bezpieczeństwo

#### 4.5.1 Najlepsze praktyki zaimplementowane

**1. HttpOnly Cookies**
- Tokeny niedostępne dla JavaScript (ochrona przed XSS)
- Cookies wysyłane automatycznie przy każdym żądaniu

**2. HTTPS Only w produkcji**
- `secure: true` w production → cookies tylko przez HTTPS

**3. SameSite Cookie Attribute**
- `sameSite: 'lax'` → ochrona przed CSRF

**4. Nie ujawnianie informacji**
- Błędy logowania: zawsze "Nieprawidłowy email lub hasło" (nie "Email nie istnieje")
- Forgot password: zawsze sukces (nie ujawniamy czy email istnieje)

**5. Rate Limiting (do zaimplementowania)**
- Supabase Auth ma wbudowany rate limiting
- Opcjonalnie: dodatkowy middleware w Astro dla /api/auth/* (np. max 5 prób logowania na minutę)

**6. CSRF Protection**
- Astro automatycznie dodaje CSRF token dla form actions
- API endpointy chronione przez SameSite cookies

**7. Password Hashing**
- Supabase używa bcrypt (transparentnie, nie wymaga konfiguracji)

**8. Email Verification**
- Wymagane potwierdzenie emaila przed pełnym dostępem (konfiguracja Supabase Dashboard)

#### 4.5.2 Checklist przed wdrożeniem produkcyjnym

- [ ] Włączenie RLS policies na wszystkich tabelach
- [ ] Zmienne środowiskowe w bezpiecznym vault (nie w .env commited do git)
- [ ] `SUPABASE_SERVICE_KEY` NIGDY nie wystawione na frontend
- [ ] Konfiguracja HTTPS w hosting
- [ ] Custom email templates w Supabase (branding + polski język)
- [ ] Redirect URLs w Supabase Dashboard zawierają tylko produkcyjne domeny
- [ ] Rate limiting włączony w Supabase Dashboard
- [ ] Monitorowanie prób nieudanych logowań (Supabase Analytics)
- [ ] Polityka haseł skonfigurowana (min. 8 znaków, 1 cyfra)

---

## 5. PODSUMOWANIE IMPLEMENTACJI

### 5.1 Nowe pliki do utworzenia

**Strony Astro (5):**
1. `/src/pages/auth/login.astro`
2. `/src/pages/auth/register.astro`
3. `/src/pages/auth/forgot-password.astro`
4. `/src/pages/auth/reset-password.astro`
5. `/src/pages/api/auth/callback.ts`

**Endpointy API (5):**
1. `/src/pages/api/auth/register.ts`
2. `/src/pages/api/auth/login.ts`
3. `/src/pages/api/auth/logout.ts`
4. `/src/pages/api/auth/forgot-password.ts`
5. `/src/pages/api/auth/reset-password.ts`

**Komponenty React (5):**
1. `/src/components/auth/LoginForm.tsx`
2. `/src/components/auth/RegisterForm.tsx`
3. `/src/components/auth/ForgotPasswordForm.tsx`
4. `/src/components/auth/ResetPasswordForm.tsx`
5. `/src/components/auth/UserMenu.tsx`

**Layouty (1):**
1. `/src/layouts/AuthLayout.astro`

**Serwisy i narzędzia (2):**
1. `/src/lib/services/auth-validation.service.ts`
2. `/src/lib/services/auth-error-mapping.service.ts`

**Pliki do modyfikacji (5):**
1. `/src/pages/index.astro` - dodanie sprawdzania autentykacji
2. `/src/middleware/index.ts` - rozszerzenie o obsługę cookies i wykluczenie /api/auth/*
3. `/src/components/Dashboard.tsx` - dodanie UserMenu
4. `/src/types.ts` - dodanie typów DTO dla autentykacji
5. `/src/env.d.ts` - rozszerzenie App.Locals
6. `/supabase/migrations/20251207165500_initial_schema.sql` - odkomentowanie RLS policies

### 5.2 Diagram przepływu danych

```
┌──────────────────────────────────────────────────────────────────┐
│                    User Registration Flow                         │
└──────────────────────────────────────────────────────────────────┘

User → /auth/register (Astro Page)
         ↓
      <RegisterForm> (React)
         ↓ [Submit]
      POST /api/auth/register (Astro Endpoint)
         ↓
      Zod Validation
         ↓
      Supabase.auth.signUp()
         ↓
      Supabase Auth → Send Verification Email
         ↓
      Response: { success: true, userId }
         ↓
      Frontend: Redirect → /auth/login?message=registered
         ↓
      User: Click email link
         ↓
      GET /api/auth/callback?token_hash=xxx&type=signup
         ↓
      Supabase.auth.verifyOtp()
         ↓
      Redirect → /auth/login?message=email-confirmed

┌──────────────────────────────────────────────────────────────────┐
│                      User Login Flow                              │
└──────────────────────────────────────────────────────────────────┘

User → /auth/login (Astro Page)
         ↓
      <LoginForm> (React)
         ↓ [Submit]
      POST /api/auth/login (Astro Endpoint)
         ↓
      Supabase.auth.signInWithPassword()
         ↓
      Set httpOnly cookies (access + refresh tokens)
         ↓
      Response: { success: true, user }
         ↓
      Frontend: window.location.href = '/'
         ↓
      GET / (index.astro)
         ↓
      Middleware: Read cookies → setSession
         ↓
      Page: getSession() → user exists
         ↓
      Render: <Dashboard userEmail={user.email} />

┌──────────────────────────────────────────────────────────────────┐
│                   Protected Route Access                          │
└──────────────────────────────────────────────────────────────────┘

User → GET /
         ↓
      Middleware: Check cookies → setSession
         ↓
      index.astro: getSession()
         ↓
      session exists? ──NO──> Astro.redirect('/auth/login')
         │
        YES
         ↓
      Render Dashboard

User → POST /api/flashcards
         ↓
      Middleware: Check session
         ↓
      session exists? ──NO──> Response 401 Unauthorized
         │
        YES
         ↓
      locals.user = user
         ↓
      Endpoint: Use locals.user.id
```

### 5.3 Macierz odpowiedzialności

| Warstwa | Komponent | Odpowiedzialność |
|---------|-----------|------------------|
| **Frontend - Pages** | `/auth/login.astro` | SSR strony logowania, redirect jeśli zalogowany |
| | `/auth/register.astro` | SSR strony rejestracji |
| | `/auth/forgot-password.astro` | SSR strony zapomnienia hasła |
| | `/auth/reset-password.astro` | SSR strony resetu hasła, walidacja tokenu |
| | `/index.astro` | SSR Dashboard + ochrona trasy (redirect jeśli niezalogowany) |
| **Frontend - Components** | `<LoginForm>` | Formularz + walidacja client-side + wywołanie API |
| | `<RegisterForm>` | Formularz + walidacja + wywołanie API |
| | `<ForgotPasswordForm>` | Formularz + wywołanie API |
| | `<ResetPasswordForm>` | Formularz + wywołanie API |
| | `<UserMenu>` | Wyświetlenie użytkownika + przycisk wylogowania |
| | `<Dashboard>` | Istniejący + dodanie UserMenu |
| **Backend - API** | `/api/auth/register` | Rejestracja + walidacja + Supabase signUp |
| | `/api/auth/login` | Logowanie + ustawienie cookies |
| | `/api/auth/logout` | Wylogowanie + czyszczenie cookies |
| | `/api/auth/forgot-password` | Wysłanie emaila z linkiem resetującym |
| | `/api/auth/reset-password` | Zmiana hasła + walidacja tokenu |
| | `/api/auth/callback` | Obsługa callback z emaila (weryfikacja) |
| **Middleware** | `/middleware/index.ts` | Sprawdzanie sesji, dodanie user do context, ochrona API |
| **Services** | `auth-validation.service.ts` | Zod schemas dla wszystkich formularzy auth |
| | `auth-error-mapping.service.ts` | Mapowanie błędów Supabase na komunikaty użytkownika |
| **Database** | Supabase RLS Policies | Izolacja danych użytkowników, wymuszenie auth.uid() = user_id |
| **Auth Provider** | Supabase Auth | JWT, sesje, wysyłka emaili, hashowanie haseł |

### 5.4 Kolejność implementacji (rekomendowana)

**Faza 1: Fundament (Backend + Supabase)**
1. Aktywacja RLS policies w bazie danych
2. Konfiguracja Supabase Dashboard (email templates, redirect URLs)
3. Serwis `auth-validation.service.ts` (Zod schemas)
4. Serwis `auth-error-mapping.service.ts`
5. Aktualizacja typów w `types.ts` i `env.d.ts`

**Faza 2: API Endpoints**
1. `/api/auth/register.ts`
2. `/api/auth/login.ts`
3. `/api/auth/logout.ts`
4. `/api/auth/forgot-password.ts`
5. `/api/auth/reset-password.ts`
6. `/api/auth/callback.ts`
7. Aktualizacja middleware (`/middleware/index.ts`)

**Faza 3: Frontend - Komponenty**
1. Layout `AuthLayout.astro`
2. Komponent `<LoginForm>`
3. Komponent `<RegisterForm>`
4. Komponent `<ForgotPasswordForm>`
5. Komponent `<ResetPasswordForm>`
6. Komponent `<UserMenu>`

**Faza 4: Frontend - Strony**
1. `/auth/login.astro`
2. `/auth/register.astro`
3. `/auth/forgot-password.astro`
4. `/auth/reset-password.astro`
5. Aktualizacja `/index.astro` (ochrona Dashboard)
6. Aktualizacja `<Dashboard>` (dodanie UserMenu)

**Faza 5: Testy i Walidacja**
1. Test rejestracji (happy path + błędy)
2. Test logowania (happy path + błędy)
3. Test ochrony Dashboard (redirect)
4. Test reset hasła (pełny flow)
5. Test wylogowania
6. Test odświeżania sesji (po 1h)
7. Test RLS (próba dostępu do cudzych danych)

---

## 6. APPENDIX

### 6.1 Zmienne środowiskowe (komplet)

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# App Configuration
PUBLIC_APP_URL=http://localhost:3000  # Dev
# PUBLIC_APP_URL=https://yourdomain.com  # Prod

# OpenRouter (existing)
OPENROUTER_API_KEY=your-openrouter-key
```

### 6.2 Przykładowe email templates (Supabase)

**Confirm Signup Template:**
```html
<h2>Witaj w 10xCards!</h2>
<p>Kliknij poniższy link, aby potwierdzić swój adres email:</p>
<p><a href="{{ .ConfirmationURL }}">Potwierdź email</a></p>
<p>Link wygasa za 24 godziny.</p>
<p>Jeśli nie zakładałeś konta w 10xCards, zignoruj tę wiadomość.</p>
```

**Reset Password Template:**
```html
<h2>Reset hasła - 10xCards</h2>
<p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta.</p>
<p>Kliknij poniższy link, aby ustawić nowe hasło:</p>
<p><a href="{{ .ConfirmationURL }}">Zresetuj hasło</a></p>
<p>Link wygasa za 1 godzinę.</p>
<p>Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.</p>
```

### 6.3 Potencjalne rozszerzenia (poza MVP)

**Funkcjonalności do rozważenia w przyszłości:**
1. **OAuth Providers** - Google, GitHub login
2. **2FA (Two-Factor Authentication)** - dodatkowa warstwa bezpieczeństwa
3. **Remember Me** - przedłużenie sesji (już częściowo obsługiwane przez refresh token)
4. **Email Change** - zmiana adresu email z weryfikacją
5. **Profile Management** - edycja danych użytkownika (imię, avatar)
6. **Account Deletion** - możliwość usunięcia konta przez użytkownika
7. **Session Management** - lista aktywnych sesji + wylogowanie zdalne
8. **Login History** - log ostatnich logowań (IP, device)
9. **Password Strength Meter** - wizualna ocena siły hasła w RegisterForm
10. **Social Login** - sign in with Google/Facebook

---

## KONIEC SPECYFIKACJI

**Wersja dokumentu:** 1.0  
**Data:** 2025-12-10  
**Autor:** 10xCards Development Team  
**Status:** Gotowe do implementacji

