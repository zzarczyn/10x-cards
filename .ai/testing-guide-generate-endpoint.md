# Testing Guide: POST /api/flashcards/generate

This guide provides manual testing instructions for the flashcard generation endpoint.

## Prerequisites

### 1. Environment Setup

Ensure you have a `.env` file with valid credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key
OPENROUTER_API_KEY=sk-or-v1-your-api-key
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

### 2. Database Setup

Apply migrations to ensure the `generations` table exists:

```bash
npx supabase db reset  # Reset local database (if using local Supabase)
# OR
npx supabase db push   # Apply migrations to remote database
```

Verify the `generations` table exists:

```sql
-- Run in Supabase SQL Editor
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'generations' AND table_schema = 'public';
```

Expected columns:
- `id` (uuid, not null)
- `user_id` (uuid, not null)
- `duration_ms` (integer, not null)
- `card_count` (integer, not null)
- `model_name` (character varying, not null)
- `created_at` (timestamp with time zone, not null)

### 3. Start Development Server

```bash
npm run dev
```

Server should be running at `http://localhost:3000`

### 4. Authenticate a Test User

Before testing, you need a valid authentication session. Options:

**Option A: Use Supabase Auth UI** (recommended for manual testing)
1. Implement a login page using Supabase Auth
2. Log in via browser to get session cookies
3. Use browser DevTools Network tab to inspect cookies

**Option B: Get token programmatically** (for automated testing)

```javascript
// Quick script to get auth token (run in browser console on your app)
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'your-password'
});

if (data.session) {
  console.log('Access Token:', data.session.access_token);
  // Use this token in Authorization header
}
```

---

## Test Cases

### Test 1: Successful Generation (200 OK)

**Purpose:** Verify happy path - valid text generates flashcards

**Request:**

```bash
curl -X POST http://localhost:3000/api/flashcards/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_SESSION_TOKEN_HERE" \
  -d '{
    "text": "React is a JavaScript library for building user interfaces. It was developed by Facebook and released in 2013. React uses a component-based architecture where UIs are built from reusable pieces called components. Components can be function components or class components. Function components are simpler and are the modern way of writing React code. React uses a virtual DOM to efficiently update the real DOM. When state changes, React compares the virtual DOM with the real DOM and only updates what changed. This process is called reconciliation. React hooks like useState and useEffect allow function components to have state and side effects. JSX is a syntax extension that allows writing HTML-like code in JavaScript. It gets compiled to React.createElement calls. Props are used to pass data from parent to child components. State is used for data that changes over time within a component. React'\''s one-way data flow makes it easier to understand and debug applications. The React ecosystem includes tools like React Router for routing and Redux for state management. React Native allows building mobile apps using React principles."
  }'
```

**Expected Response:**

```json
{
  "generation_id": "550e8400-e29b-41d4-a716-446655440000",
  "flashcards": [
    {
      "front": "What is React?",
      "back": "A JavaScript library for building user interfaces, developed by Facebook"
    },
    {
      "front": "What are the two types of React components?",
      "back": "Function components and class components"
    },
    {
      "front": "What is the virtual DOM in React?",
      "back": "A lightweight copy of the real DOM that React uses to efficiently update the UI"
    }
  ],
  "model_name": "anthropic/claude-3.5-sonnet",
  "duration_ms": 8750,
  "card_count": 3
}
```

**Validation:**
- ✅ Status: `200 OK`
- ✅ Response has `generation_id` (valid UUID)
- ✅ Response has `flashcards` array (3-10 items)
- ✅ Each flashcard has `front` and `back` strings
- ✅ `model_name` matches env variable
- ✅ `duration_ms` is reasonable (5000-30000)
- ✅ `card_count` matches array length

**Database Verification:**

```sql
-- Check if generation was logged
SELECT * FROM public.generations 
ORDER BY created_at DESC 
LIMIT 1;

-- Verify fields match response
-- id should equal generation_id from response
-- card_count should equal number of flashcards
-- duration_ms should match response
```

---

### Test 2: Text Too Short (400 Bad Request)

**Purpose:** Verify validation rejects text < 1000 characters

**Request:**

```bash
curl -X POST http://localhost:3000/api/flashcards/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_SESSION_TOKEN_HERE" \
  -d '{
    "text": "This is too short"
  }'
```

**Expected Response:**

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "text",
      "message": "Text must be at least 1000 characters"
    }
  ]
}
```

**Validation:**
- ✅ Status: `400 Bad Request`
- ✅ Error message indicates validation failure
- ✅ Details array contains field-specific error

---

### Test 3: Text Too Long (400 Bad Request)

**Purpose:** Verify validation rejects text > 10000 characters

**Request:**

```bash
# Generate 10001 character string
LONG_TEXT=$(python3 -c "print('a' * 10001)")

curl -X POST http://localhost:3000/api/flashcards/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_SESSION_TOKEN_HERE" \
  -d "{\"text\": \"$LONG_TEXT\"}"
```

**Expected Response:**

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "text",
      "message": "Text cannot exceed 10000 characters"
    }
  ]
}
```

**Validation:**
- ✅ Status: `400 Bad Request`
- ✅ Error indicates character limit exceeded

---

### Test 4: Whitespace-Only Text (400 Bad Request)

**Purpose:** Verify rejection of empty content (only spaces/tabs/newlines)

**Request:**

```bash
# Create 1000 spaces
WHITESPACE=$(python3 -c "print(' ' * 1000)")

curl -X POST http://localhost:3000/api/flashcards/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_SESSION_TOKEN_HERE" \
  -d "{\"text\": \"$WHITESPACE\"}"
```

**Expected Response:**

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "text",
      "message": "Text must contain at least 1000 non-whitespace characters"
    }
  ]
}
```

**Validation:**
- ✅ Status: `400 Bad Request`
- ✅ Error indicates non-whitespace requirement

---

### Test 5: Invalid JSON (400 Bad Request)

**Purpose:** Verify handling of malformed JSON

**Request:**

```bash
curl -X POST http://localhost:3000/api/flashcards/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_SESSION_TOKEN_HERE" \
  -d 'invalid json syntax {'
```

**Expected Response:**

```json
{
  "error": "Invalid JSON",
  "message": "Request body must be valid JSON"
}
```

**Validation:**
- ✅ Status: `400 Bad Request`
- ✅ Clear error message about JSON parsing

---

### Test 6: Missing Authentication (401 Unauthorized)

**Purpose:** Verify endpoint requires authentication

**Request:**

```bash
# No Cookie header = no authentication
curl -X POST http://localhost:3000/api/flashcards/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "React is a JavaScript library for building user interfaces. It was developed by Facebook and released in 2013. React uses a component-based architecture where UIs are built from reusable pieces called components. Components can be function components or class components. Function components are simpler and are the modern way of writing React code. React uses a virtual DOM to efficiently update the real DOM. When state changes, React compares the virtual DOM with the real DOM and only updates what changed. This process is called reconciliation. React hooks like useState and useEffect allow function components to have state and side effects. JSX is a syntax extension that allows writing HTML-like code in JavaScript."
  }'
```

**Expected Response:**

```json
{
  "error": "Authentication required",
  "message": "Please log in to continue"
}
```

**Validation:**
- ✅ Status: `401 Unauthorized`
- ✅ Clear authentication error message

---

### Test 7: Invalid API Key (503 Service Unavailable)

**Purpose:** Verify handling of OpenRouter API errors

**Setup:** Temporarily set invalid `OPENROUTER_API_KEY` in `.env`:

```env
OPENROUTER_API_KEY=invalid-key-here
```

**Request:** Same as Test 1 (valid text)

**Expected Response:**

```json
{
  "error": "AI service temporarily unavailable",
  "message": "OpenRouter API error: 401 Unauthorized",
  "retryable": false
}
```

**Validation:**
- ✅ Status: `503 Service Unavailable`
- ✅ Error indicates AI service problem
- ✅ `retryable` field present

**Cleanup:** Restore valid `OPENROUTER_API_KEY`

---

### Test 8: Timeout Simulation (503 Service Unavailable)

**Purpose:** Verify 30-second timeout handling

**Note:** This is difficult to test manually. The timeout is handled by the service.

**Expected Behavior:**
- If LLM takes > 30s, request should abort
- Response: 503 with "AI generation timed out after 30 seconds"
- `retryable: true` should be set

---

## Performance Benchmarks

Expected performance metrics for successful generations:

| Metric | Expected Value | Notes |
|--------|---------------|-------|
| Response Time | 5-15 seconds | Typical for Claude 3.5 Sonnet |
| Max Response Time | 30 seconds | Timeout threshold |
| Generated Cards | 3-10 cards | Depends on content richness |
| Front Length | 1-200 chars | Auto-truncated if longer |
| Back Length | 1-500 chars | Auto-truncated if longer |

---

## Database Verification Queries

After successful generation, verify data was logged:

```sql
-- 1. Check recent generations
SELECT 
  id,
  user_id,
  duration_ms,
  card_count,
  model_name,
  created_at
FROM public.generations
ORDER BY created_at DESC
LIMIT 5;

-- 2. Verify user association
SELECT 
  g.id,
  g.card_count,
  g.duration_ms,
  u.email
FROM public.generations g
JOIN auth.users u ON u.id = g.user_id
ORDER BY g.created_at DESC
LIMIT 5;

-- 3. Check generation stats
SELECT 
  user_id,
  COUNT(*) as total_generations,
  AVG(duration_ms) as avg_duration,
  AVG(card_count) as avg_cards_per_gen
FROM public.generations
GROUP BY user_id;
```

---

## Common Issues & Troubleshooting

### Issue: "OPENROUTER_API_KEY not configured"

**Cause:** Missing or invalid environment variable

**Solution:**
1. Check `.env` file exists in project root
2. Verify `OPENROUTER_API_KEY` is set
3. Restart dev server after changing `.env`

---

### Issue: "Failed to save generation log"

**Cause:** Database connection error or missing `generations` table

**Solution:**
1. Verify Supabase is running (local or remote)
2. Run migrations: `npx supabase db push`
3. Check Supabase URL and key in `.env`

---

### Issue: "Authentication required" despite being logged in

**Cause:** Session cookie not being sent or expired

**Solution:**
1. Check session in browser DevTools → Application → Cookies
2. Verify cookie domain matches server domain
3. Re-authenticate to refresh session
4. Check middleware is properly configured

---

### Issue: Generation times out (> 30s)

**Cause:** Very long text or slow OpenRouter response

**Solution:**
1. Try with shorter text (2000-5000 chars optimal)
2. Check OpenRouter status page
3. Consider increasing timeout in service (not recommended for MVP)

---

## Automated Testing (Future)

Consider implementing automated tests using:

**Option 1: Vitest + Supertest**
```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';

describe('POST /api/flashcards/generate', () => {
  it('should generate flashcards from valid text', async () => {
    const response = await request(app)
      .post('/api/flashcards/generate')
      .set('Cookie', `sb-access-token=${validToken}`)
      .send({ text: validLongText })
      .expect(200);
    
    expect(response.body).toHaveProperty('generation_id');
    expect(response.body.flashcards).toHaveLength.greaterThan(2);
  });
});
```

**Option 2: Playwright E2E Tests**
- Test full flow from browser
- Handle authentication naturally
- Verify UI updates with generated cards

---

## Success Criteria

All tests pass when:
- ✅ Valid requests return 200 with flashcards
- ✅ Invalid requests return appropriate 4xx errors
- ✅ Unauthenticated requests return 401
- ✅ LLM errors return 503 with retryable flag
- ✅ Generation logs saved to database
- ✅ Response times < 30 seconds
- ✅ No unhandled exceptions in logs

---

**Last Updated:** 2025-12-08
**Endpoint Version:** 1.0.0 (MVP)

