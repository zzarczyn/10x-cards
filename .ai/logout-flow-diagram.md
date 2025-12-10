# Diagram Przepływu Wylogowania - 10xCards

## 🔄 Szczegółowy przepływ wylogowania użytkownika

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DASHBOARD STATE                                  │
└─────────────────────────────────────────────────────────────────────────┘

User on Dashboard (/)
    │
    ├─→ Header visible:
    │   ├─→ Left: "10xCards" logo + tagline
    │   └─→ Right: UserMenu component
    │       ├─→ Avatar icon (👤)
    │       ├─→ Email: user@example.com
    │       └─→ Button: "Wyloguj się"
    │
    └─→ User clicks "Wyloguj się"


┌─────────────────────────────────────────────────────────────────────────┐
│                         LOGOUT INITIATION                                │
└─────────────────────────────────────────────────────────────────────────┘

UserMenu.tsx → handleLogout()
    │
    ├─→ setIsLoggingOut(true)
    │   │
    │   └─→ UI updates:
    │       ├─→ Button disabled
    │       ├─→ Spinner shows (spinning circle SVG)
    │       └─→ Text: "Wylogowywanie..."
    │
    └─→ fetch('/api/auth/logout', { method: 'POST' })


┌─────────────────────────────────────────────────────────────────────────┐
│                         API REQUEST FLOW                                 │
└─────────────────────────────────────────────────────────────────────────┘

POST /api/auth/logout
    │
    ├─→ Middleware (src/middleware/index.ts)
    │   │
    │   ├─→ createSupabaseServerInstance({ cookies, headers })
    │   │   └─→ Reads cookies from request
    │   │
    │   ├─→ Path check: "/api/auth/logout"
    │   │   └─→ Is in PUBLIC_PATHS? ──YES──> Skip auth check
    │   │                                      │
    │   │                                      └─→ Continue to handler
    │   │
    │   └─→ context.locals.supabase = supabase instance
    │
    └─→ Handler (src/pages/api/auth/logout.ts)
        │
        ├─→ try {
        │   │
        │   ├─→ 1. Sign out from Supabase
        │   │   │
        │   │   └─→ await locals.supabase.auth.signOut()
        │   │       │
        │   │       ├─→ Supabase Auth:
        │   │       │   ├─→ Invalidates JWT on server
        │   │       │   ├─→ Marks session as expired
        │   │       │   └─→ Triggers cookie clearing
        │   │       │
        │   │       └─→ @supabase/ssr cookie adapter:
        │   │           │
        │   │           ├─→ Calls setAll([]) internally
        │   │           │   └─→ Clears all Supabase cookies:
        │   │           │       ├─→ sb-<project>-auth-token
        │   │           │       └─→ sb-<project>-auth-token-code-verifier
        │   │           │
        │   │           └─→ Sets Set-Cookie headers in response:
        │   │               ├─→ sb-<project>-auth-token=; Max-Age=0; Path=/
        │   │               └─→ sb-<project>-auth-token-code-verifier=; Max-Age=0; Path=/
        │   │
        │   ├─→ 2. Check for errors (non-blocking)
        │   │   │
        │   │   ├─→ if (error) → console.error()
        │   │   │   └─→ BUT: Continue anyway (fail-safe)
        │   │   │
        │   │   └─→ No error → Continue
        │   │
        │   └─→ 3. Return success response
        │       │
        │       └─→ Response 200: {
        │               success: true
        │           }
        │
        └─→ } catch (err) {
            │
            ├─→ console.error("Logout endpoint error:", err)
            │
            └─→ STILL return 200: { success: true }
                │
                └─→ Fail-safe: Logout ALWAYS succeeds


┌─────────────────────────────────────────────────────────────────────────┐
│                         RESPONSE HANDLING                                │
└─────────────────────────────────────────────────────────────────────────┘

UserMenu.tsx receives response
    │
    ├─→ if (response.ok) {
    │   │
    │   └─→ window.location.href = '/auth/login'
    │       │
    │       └─→ Force full page reload
    │           ├─→ Clears all React state
    │           ├─→ Clears all client-side data
    │           ├─→ Browser sends GET /auth/login
    │           └─→ Cookies in request: NONE (already cleared)
    │
    └─→ } else {
        │
        ├─→ console.error("Logout request failed, redirecting anyway")
        │
        └─→ window.location.href = '/auth/login'
            │
            └─→ Fail-safe: Redirect even if logout failed


┌─────────────────────────────────────────────────────────────────────────┐
│                         AFTER REDIRECT                                   │
└─────────────────────────────────────────────────────────────────────────┘

GET /auth/login
    │
    ├─→ Middleware:
    │   │
    │   ├─→ createSupabaseServerInstance({ cookies, headers })
    │   │   │
    │   │   └─→ Parses "Cookie" header
    │   │       └─→ No Supabase cookies found
    │   │           └─→ No session to restore
    │   │
    │   └─→ context.locals.supabase = supabase (no session)
    │
    └─→ login.astro:
        │
        ├─→ Check if user is already logged in:
        │   │
        │   └─→ await locals.supabase.auth.getSession()
        │       │
        │       └─→ Returns: { data: { session: null }, error: null }
        │           │
        │           └─→ No redirect (user not logged in) ✅
        │
        └─→ Render LoginForm
            │
            └─→ User sees login page ✅


┌─────────────────────────────────────────────────────────────────────────┐
│                         VERIFICATION                                     │
└─────────────────────────────────────────────────────────────────────────┘

User tries to access / again
    │
    └─→ GET /
        │
        ├─→ Middleware:
        │   │
        │   └─→ createSupabaseServerInstance({ cookies, headers })
        │       └─→ No cookies → No session
        │
        └─→ index.astro:
            │
            ├─→ await locals.supabase.auth.getSession()
            │   │
            │   └─→ Returns: { data: { session: null } }
            │
            ├─→ if (!session) {
            │   │
            │   └─→ return Astro.redirect('/auth/login')
            │       │
            │       └─→ User redirected to login ✅
            │
            └─→ Session verified: User is logged out ✅


┌─────────────────────────────────────────────────────────────────────────┐
│                         ERROR SCENARIOS                                  │
└─────────────────────────────────────────────────────────────────────────┘

Scenario 1: Network Error
    │
    UserMenu → fetch('/api/auth/logout')
    │
    └─→ catch (error) {
        │
        ├─→ console.error("Logout error:", error)
        │
        └─→ window.location.href = '/auth/login'
            │
            └─→ User redirected to login
                └─→ Cookies invalid anyway (not removed but expired) ✅


Scenario 2: Supabase signOut() fails
    │
    Handler → await locals.supabase.auth.signOut()
    │
    └─→ Returns: { error: "Some error" }
        │
        ├─→ console.error("Supabase logout error:", error)
        │
        └─→ STILL: Response 200 { success: true }
            │
            └─→ Frontend: window.location.href = '/auth/login'
                │
                └─→ Session invalid on next request anyway ✅


Scenario 3: Cookie clearing fails (edge case)
    │
    Handler → @supabase/ssr setAll([])
    │
    └─→ Internal error in cookie adapter
        │
        └─→ Cookies NOT cleared
            │
            └─→ BUT: Response 200 { success: true }
                │
                └─→ Frontend: window.location.href = '/auth/login'
                    │
                    └─→ Next request:
                        │
                        └─→ Middleware sees expired/invalid token
                            │
                            └─→ getSession() returns null
                                │
                                └─→ User treated as logged out ✅


Scenario 4: User clicks logout multiple times
    │
    First click:
    ├─→ setIsLoggingOut(true)
    ├─→ Button disabled ✅
    └─→ fetch('/api/auth/logout')
    
    Second click (while loading):
    └─→ onClick ignored (button disabled) ✅
        │
        └─→ Only one request sent ✅


┌─────────────────────────────────────────────────────────────────────────┐
│                         COOKIE LIFECYCLE                                 │
└─────────────────────────────────────────────────────────────────────────┘

BEFORE LOGOUT:
Browser cookies:
├─→ sb-<project>-auth-token: eyJhbGc... (JWT)
│   ├─→ HttpOnly: true
│   ├─→ Secure: true
│   ├─→ SameSite: Lax
│   └─→ Max-Age: 3600 (1 hour)
│
└─→ sb-<project>-auth-token-code-verifier: abc123... (refresh token)
    ├─→ HttpOnly: true
    ├─→ Secure: true
    ├─→ SameSite: Lax
    └─→ Max-Age: 2592000 (30 days)


DURING LOGOUT (Response headers):
Set-Cookie headers from /api/auth/logout:
├─→ sb-<project>-auth-token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax
│   └─→ Max-Age=0 → Tells browser to DELETE cookie
│
└─→ sb-<project>-auth-token-code-verifier=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax
    └─→ Max-Age=0 → Tells browser to DELETE cookie


AFTER LOGOUT:
Browser cookies:
└─→ (no Supabase cookies) ✅


┌─────────────────────────────────────────────────────────────────────────┐
│                         STATE TRANSITIONS                                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  STATE: Logged In                            │
│  - Cookies: Present                          │
│  - Session: Valid                            │
│  - UI: Dashboard with UserMenu              │
│  - Available actions: Use app, Logout       │
└─────────────────────────────────────────────┘
                    │
                    │ User clicks "Wyloguj się"
                    ↓
┌─────────────────────────────────────────────┐
│  STATE: Logging Out                          │
│  - Cookies: Still present                    │
│  - Session: Still valid                      │
│  - UI: Dashboard, button disabled, spinner  │
│  - Available actions: None (waiting)        │
└─────────────────────────────────────────────┘
                    │
                    │ POST /api/auth/logout → 200
                    │ Cookies cleared
                    ↓
┌─────────────────────────────────────────────┐
│  STATE: Redirecting                          │
│  - Cookies: Cleared                          │
│  - Session: Invalid                          │
│  - UI: Dashboard (page reloading)           │
│  - Available actions: None                  │
└─────────────────────────────────────────────┘
                    │
                    │ window.location.href = '/auth/login'
                    │ GET /auth/login
                    ↓
┌─────────────────────────────────────────────┐
│  STATE: Logged Out                           │
│  - Cookies: None                             │
│  - Session: None                             │
│  - UI: Login page                            │
│  - Available actions: Login, Register       │
└─────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                         COMPONENT INTERACTION                            │
└─────────────────────────────────────────────────────────────────────────┘

index.astro (SSR)
    ↓ props: { userEmail }
Dashboard.tsx (React)
    ↓ props: { userEmail }
UserMenu.tsx (React)
    │
    ├─→ Display: email + avatar + button
    │
    └─→ Event: onClick handleLogout()
        │
        ├─→ State: setIsLoggingOut(true)
        │
        ├─→ API: fetch('/api/auth/logout')
        │
        └─→ Navigation: window.location.href = '/auth/login'


┌─────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                                  │
└─────────────────────────────────────────────────────────────────────────┘

Layer 1: UI Prevents Accidental Logout
├─→ Single click required (no confirmation modal in MVP)
├─→ Button disabled during logout (no double requests)
└─→ Visual feedback (spinner + "Wylogowywanie...")

Layer 2: API Logout (Server-side)
├─→ Supabase session invalidation
├─→ JWT marked as invalid
└─→ Cookies cleared (Max-Age=0)

Layer 3: Frontend Cleanup
├─→ Force page reload (window.location.href)
├─→ All React state cleared
└─→ All client-side storage preserved (localStorage, sessionStorage)
    └─→ Note: Could be cleared if needed in future

Layer 4: Middleware Protection
├─→ All subsequent requests checked
├─→ No valid cookies → No session
└─→ Access to / → Redirect to /auth/login

Layer 5: Fail-safe Design
├─→ Logout endpoint ALWAYS returns 200
├─→ Frontend ALWAYS redirects to login
├─→ Even if errors → User is logged out
└─→ User can never be "stuck" in logged-in state
```

## 📊 Timing Diagram

```
Time  User Action              Frontend State        Backend Action         Browser State
─────────────────────────────────────────────────────────────────────────────────────────
0ms   User on Dashboard       Dashboard visible     -                      Logged in
      [UserMenu shown]        isLoggingOut: false                          Cookies: ✅
                              │
100ms User clicks logout      ├─→ setState          -                      Logged in
                              │   isLoggingOut: true                       Cookies: ✅
                              │   Button: disabled
                              │   Text: "Wylogowywanie..."
                              │
150ms -                       └─→ fetch() starts    -                      Logged in
                                  POST /api/auth/logout                    Cookies: ✅
                                  │
200ms -                       Request in flight     Middleware processes   Logged in
                              (waiting)             Request reaches handler Cookies: ✅
                                  │
250ms -                       Still waiting         signOut() called       Logged in
                              (waiting)             Supabase invalidates   Cookies: ✅
                                  │                 Session deleted
300ms -                       Still waiting         Cookies cleared        Transitioning
                              (waiting)             Set-Cookie: Max-Age=0  Cookies: ⏳
                                  │                 Response sent: 200
350ms Response received       response.ok = true    -                      Logged out
      [200 OK]                ├─→ Check success                           Cookies: ❌
                              │
400ms -                       └─→ window.location   -                      Logged out
                                  .href = '/auth/login'                    Cookies: ❌
                                  │
500ms Page unloading          React unmounting      -                      Logged out
      [Dashboard cleanup]     All state cleared                            Cookies: ❌
                                  │
700ms GET /auth/login         -                     Middleware: No session Logged out
      [New page loading]                            login.astro: Render    Cookies: ❌
                                  │
1000ms Login page visible     LoginForm mounted     -                      Logged out
       [Ready for login]      Fresh state                                  Cookies: ❌
```

---

## 🔍 Debug Points

### Checkpoint 1: UserMenu rendering
```tsx
// In Dashboard.tsx
console.log('Dashboard userEmail:', userEmail);

// In UserMenu.tsx
console.log('UserMenu received email:', userEmail);
```

### Checkpoint 2: Logout initiated
```tsx
// In UserMenu.tsx handleLogout()
console.log('Logout initiated');
console.log('isLoggingOut:', isLoggingOut);
```

### Checkpoint 3: API request
```tsx
// In UserMenu.tsx
const response = await fetch('/api/auth/logout', { method: 'POST' });
console.log('Logout response:', response.status, await response.json());
```

### Checkpoint 4: Backend processing
```typescript
// In logout.ts
console.log('Logout endpoint called');
console.log('signOut error:', error); // If any
console.log('Returning success');
```

### Checkpoint 5: Cookie clearing
```
DevTools > Application > Cookies > http://localhost:3000
Before: sb-<project>-auth-token, sb-<project>-auth-token-code-verifier
After: (no Supabase cookies)
```

### Checkpoint 6: Redirect
```tsx
// In UserMenu.tsx
console.log('Redirecting to login');
window.location.href = '/auth/login';
```

---

## ✅ Success Criteria

Flow is successful when:

1. ✅ UserMenu visible in Dashboard
2. ✅ Email displayed correctly (truncated if long)
3. ✅ Click "Wyloguj się" → Button disabled + spinner
4. ✅ POST /api/auth/logout → 200 { success: true }
5. ✅ Cookies cleared (DevTools shows no Supabase cookies)
6. ✅ Redirect to /auth/login
7. ✅ Login page visible
8. ✅ Try to access / → Redirect to /auth/login (protected route works)
9. ✅ No console errors
10. ✅ No linter errors

**All 10 criteria must pass for complete success! ✅**

