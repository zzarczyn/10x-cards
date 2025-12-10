# Diagram Przepływu Logowania - 10xCards

## 🔄 Szczegółowy przepływ logowania użytkownika

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         INICJALIZACJA STRONY                             │
└─────────────────────────────────────────────────────────────────────────┘

User → GET /
    │
    ├─→ Middleware (src/middleware/index.ts)
    │   │
    │   ├─→ createSupabaseServerInstance({ cookies, headers })
    │   │   └─→ Odczyt cookies: "Cookie" header
    │   │       └─→ Parser cookies → [{ name, value }]
    │   │
    │   └─→ context.locals.supabase = supabase instance
    │
    └─→ index.astro
        │
        ├─→ await locals.supabase.auth.getSession()
        │   │
        │   ├─→ Session exists? ──NO──> return Astro.redirect('/auth/login')
        │   │                            │
        │   │                            └─→ GET /auth/login
        │   │                                │
        │   │                                └─→ Render LoginForm
        │   │
        │   └─→ YES: Render Dashboard


┌─────────────────────────────────────────────────────────────────────────┐
│                         PROCES LOGOWANIA                                 │
└─────────────────────────────────────────────────────────────────────────┘

User → /auth/login (LoginForm.tsx)
    │
    ├─→ Wypełnia formularz:
    │   ├─→ Email: test@example.com
    │   └─→ Password: ••••••
    │
    ├─→ Klik "Zaloguj się"
    │
    ├─→ Client-side validation (React)
    │   ├─→ validateEmail(email)
    │   │   ├─→ Puste? → Error: "Email jest wymagany"
    │   │   └─→ Invalid format? → Error: "Podaj prawidłowy adres email"
    │   │
    │   └─→ validatePassword(password)
    │       ├─→ Puste? → Error: "Hasło jest wymagane"
    │       └─→ < 6 chars? → Error: "Hasło musi mieć minimum 6 znaków"
    │
    ├─→ Validation OK → setIsLoading(true)
    │
    └─→ fetch('/api/auth/login', {
            method: 'POST',
            body: { email, password }
        })


┌─────────────────────────────────────────────────────────────────────────┐
│                         API ENDPOINT                                     │
└─────────────────────────────────────────────────────────────────────────┘

POST /api/auth/login
    │
    ├─→ Middleware (src/middleware/index.ts)
    │   │
    │   ├─→ Path = "/api/auth/login"
    │   │   └─→ Is in PUBLIC_PATHS? ──YES──> Skip auth check
    │   │                                      │
    │   │                                      └─→ Continue to handler
    │   │
    │   └─→ context.locals.supabase = supabase instance (with cookies)
    │
    ├─→ Handler (src/pages/api/auth/login.ts)
    │   │
    │   ├─→ 1. Parse body: await request.json()
    │   │
    │   ├─→ 2. Validate with Zod (LoginSchema)
    │   │   │
    │   │   ├─→ Invalid?
    │   │   │   └─→ Response 400: {
    │   │   │           error: "Validation failed",
    │   │   │           message: "Nieprawidłowe dane",
    │   │   │           details: [{ field, message }]
    │   │   │       }
    │   │   │
    │   │   └─→ Valid? → Continue
    │   │
    │   ├─→ 3. Authenticate with Supabase
    │   │   │
    │   │   └─→ await locals.supabase.auth.signInWithPassword({
    │   │           email,
    │   │           password
    │   │       })
    │   │       │
    │   │       ├─→ Error?
    │   │       │   │
    │   │       │   ├─→ mapSupabaseAuthError(error)
    │   │       │   │   ├─→ "invalid login credentials"
    │   │       │   │   │   → "Nieprawidłowy email lub hasło"
    │   │       │   │   │
    │   │       │   │   ├─→ "email not confirmed"
    │   │       │   │   │   → "Potwierdź swój email przed zalogowaniem"
    │   │       │   │   │
    │   │       │   │   └─→ Other → "Wystąpił błąd..."
    │   │       │   │
    │   │       │   └─→ Response 401: {
    │   │       │           error: "Authentication failed",
    │   │       │           message: <mapped error>
    │   │       │       }
    │   │       │
    │   │       └─→ Success?
    │   │           │
    │   │           ├─→ @supabase/ssr automatically sets cookies:
    │   │           │   ├─→ sb-<project>-auth-token (access token)
    │   │           │   │   └─→ httpOnly: true, secure: true, sameSite: 'lax'
    │   │           │   │
    │   │           │   └─→ sb-<project>-auth-token-code-verifier (refresh)
    │   │           │       └─→ httpOnly: true, secure: true, sameSite: 'lax'
    │   │           │
    │   │           └─→ Response 200: {
    │   │                   success: true,
    │   │                   user: { id, email }
    │   │               }
    │   │
    │   └─→ 4. Return response


┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT RESPONSE HANDLING                         │
└─────────────────────────────────────────────────────────────────────────┘

LoginForm.tsx receives response
    │
    ├─→ response.ok? (status 200)
    │   │
    │   ├─→ YES:
    │   │   ├─→ Cookies są już ustawione przez backend
    │   │   └─→ window.location.href = '/'
    │   │       │
    │   │       └─→ Force page reload
    │   │           │
    │   │           └─→ GET / (with cookies in header)
    │   │               │
    │   │               ├─→ Middleware reads cookies
    │   │               ├─→ getSession() → session exists
    │   │               └─→ Render Dashboard ✅
    │   │
    │   └─→ NO: (status 400/401/500)
    │       │
    │       ├─→ Parse error: await response.json()
    │       │
    │       └─→ setError(errorData.message)
    │           │
    │           └─→ Display error alert above form ❌


┌─────────────────────────────────────────────────────────────────────────┐
│                         SESSION PERSISTENCE                              │
└─────────────────────────────────────────────────────────────────────────┘

User refreshes page (F5)
    │
    └─→ GET /
        │
        ├─→ Browser automatically sends cookies in request header:
        │   Cookie: sb-<project>-auth-token=<JWT>; sb-<project>-auth-token-code-verifier=<refresh>
        │
        ├─→ Middleware:
        │   │
        │   ├─→ createSupabaseServerInstance({ cookies, headers })
        │   │   └─→ Parses "Cookie" header
        │   │       └─→ Extracts tokens
        │   │
        │   └─→ Supabase SDK:
        │       │
        │       ├─→ Access token valid?
        │       │   ├─→ YES: Use existing session
        │       │   └─→ NO (expired):
        │       │       └─→ Use refresh token to get new access token
        │       │           └─→ Auto-refresh (transparent to user)
        │
        └─→ getSession() → session exists
            │
            └─→ Render Dashboard ✅ (user stays logged in)


┌─────────────────────────────────────────────────────────────────────────┐
│                         PROTECTED API CALL                               │
└─────────────────────────────────────────────────────────────────────────┘

User clicks "Generate" (POST /api/flashcards/generate)
    │
    ├─→ Middleware:
    │   │
    │   ├─→ Path = "/api/flashcards/generate"
    │   │   └─→ NOT in PUBLIC_PATHS
    │   │
    │   ├─→ Check authentication:
    │   │   │
    │   │   └─→ await supabase.auth.getUser()
    │   │       │
    │   │       ├─→ User exists? ──YES──> Add to context.locals.user
    │   │       │                          │
    │   │       │                          └─→ Continue to endpoint handler
    │   │       │
    │   │       └─→ NO user (session expired/invalid)
    │   │           │
    │   │           └─→ Response 401: {
    │   │                   error: "Authentication required",
    │   │                   message: "Please log in to continue"
    │   │               }
    │   │
    │   └─→ Endpoint handler:
    │       └─→ locals.user.id → Use for database query ✅


┌─────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Layer 1: Client-Side Validation (LoginForm.tsx)                     │
│ → Walidacja formatów, długości                                      │
│ → Blokada submit gdy błędy                                          │
│ → UX: natychmiastowy feedback                                       │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Layer 2: Server-Side Validation (login.ts)                          │
│ → Zod schema validation                                             │
│ → Nigdy nie ufaj clientowi                                          │
│ → Response 400 jeśli invalid                                        │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Layer 3: Supabase Auth                                              │
│ → Weryfikacja credentials w bazie                                   │
│ → Password hashing (bcrypt)                                         │
│ → JWT generation                                                    │
│ → Email confirmation check                                          │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Layer 4: Cookie Security                                            │
│ → httpOnly: true (nie dostępne dla JS → XSS protection)            │
│ → secure: true (tylko HTTPS w prod)                                │
│ → sameSite: 'lax' (CSRF protection)                                │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Layer 5: Middleware Authentication                                  │
│ → Sprawdzenie JWT przy każdym request                              │
│ → Automatyczny refresh expired tokens                              │
│ → Blokada API dla niezalogowanych (401)                            │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Layer 6: Row Level Security (RLS) - TODO                           │
│ → PostgreSQL policies                                               │
│ → auth.uid() = user_id                                             │
│ → Ostatnia linia obrony w bazie danych                             │
└─────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                         COOKIE STRUCTURE                                 │
└─────────────────────────────────────────────────────────────────────────┘

Cookies ustawiane przez @supabase/ssr po sukcesie logowania:

sb-<project-ref>-auth-token
├─ Value: JWT access token (eyJ...)
├─ HttpOnly: true
├─ Secure: true (production)
├─ SameSite: Lax
├─ Path: /
├─ Max-Age: 3600 (1 hour)
└─ Purpose: Uwierzytelnienie requestów

sb-<project-ref>-auth-token-code-verifier
├─ Value: Refresh token
├─ HttpOnly: true
├─ Secure: true (production)
├─ SameSite: Lax
├─ Path: /
├─ Max-Age: 2592000 (30 days)
└─ Purpose: Odświeżanie access tokena

Automatic refresh flow:
1. Access token wygasa (1h)
2. Middleware wykrywa expired token
3. Supabase SDK automatycznie używa refresh token
4. Nowy access token wygenerowany i zwrócony
5. Użytkownik nie zauważa (seamless)
```

## 📊 Stan aplikacji w różnych scenariuszach

| Scenariusz | Cookies | getSession() | Wynik |
|------------|---------|--------------|-------|
| Pierwsza wizyta | ❌ Brak | null | → Redirect /auth/login |
| Po zalogowaniu | ✅ JWT + Refresh | { session, user } | → Render Dashboard |
| Po odświeżeniu (F5) | ✅ JWT + Refresh | { session, user } | → Render Dashboard |
| JWT wygasł (1h) | ✅ Refresh token | Auto-refresh → { session, user } | → Render Dashboard |
| Refresh wygasł (30d) | ❌ Expired | null | → Redirect /auth/login |
| Wyczyść cookies | ❌ Brak | null | → Redirect /auth/login |

---

## 🔍 Debug checklist

### Sprawdź cookies w przeglądarce:
```
DevTools → Application → Cookies → http://localhost:3000
```

Powinno być widoczne:
- `sb-<project-ref>-auth-token` (JWT)
- `sb-<project-ref>-auth-token-code-verifier` (refresh)

### Sprawdź Network requests:
```
DevTools → Network → Filter: Fetch/XHR
```

1. **POST /api/auth/login**
   - Request payload: `{ email, password }`
   - Response 200: `{ success: true, user: {...} }`
   - Response headers: `Set-Cookie: sb-...`

2. **GET /** (po redirect)
   - Request headers: `Cookie: sb-...`
   - Response: HTML z Dashboard

### Sprawdź Console errors:
```javascript
// W middleware możesz dodać debug:
console.log('Session check:', await supabase.auth.getSession());
console.log('User check:', await supabase.auth.getUser());
```

---

## ✅ Expected flow summary

1. **Niezalogowany użytkownik** → `/` → Middleware + index.astro → Redirect `/auth/login`
2. **Na stronie login** → Wypełnia form → Submit → POST `/api/auth/login`
3. **API endpoint** → Zod validation → Supabase auth → Set cookies → Response 200
4. **Frontend** → window.location.href = `/` → GET `/` (with cookies)
5. **Middleware** → Read cookies → Set session → Continue
6. **index.astro** → getSession() → Has session → Render Dashboard ✅
7. **User refreshes** → Cookies sent → Session persists → Dashboard stays ✅

