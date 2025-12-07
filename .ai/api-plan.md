# REST API Plan - 10xCards MVP

## 1. Resources

### 1.1 Flashcards
- **Database table:** `public.flashcards`
- **Description:** User-created or AI-generated question-answer pairs for learning
- **Ownership:** Each flashcard belongs to a single authenticated user
- **Access control:** Row Level Security (RLS) enforces user isolation

### 1.2 Generations
- **Database table:** `public.generations`
- **Description:** Analytics logs for AI generation sessions
- **Ownership:** Each generation log belongs to a single authenticated user
- **Access control:** Row Level Security (RLS) enforces user isolation
- **Purpose:** Track metrics for AI acceptance rate and performance monitoring

### 1.3 Users
- **Database table:** `auth.users` (Supabase Auth managed)
- **Description:** User accounts with email/password authentication
- **Access control:** Managed by Supabase Authentication service

## 2. Endpoints

### 2.1 Authentication

Authentication is handled entirely by Supabase Auth SDK (`@supabase/auth-helpers`). No custom REST endpoints are required for auth operations.

**Client-side operations:**
- Sign up: `supabase.auth.signUp({ email, password })`
- Sign in: `supabase.auth.signInWithPassword({ email, password })`
- Sign out: `supabase.auth.signOut()`
- Session management: Automatic via Supabase client

**Server-side middleware:**
- Astro middleware validates session for all `/api/*` routes
- Extracts authenticated user ID from session
- Returns 401 Unauthorized if session invalid

---

### 2.2 Flashcard Generation (AI)

#### `POST /api/flashcards/generate`

Generates flashcard suggestions from user-provided text using AI (LLM via OpenRouter).

**Request Body:**
```json
{
  "text": "string (1000-10000 characters)"
}
```

**Validation:**
- `text` is required
- `text` length must be >= 1000 and <= 10000 characters
- `text` must contain non-whitespace content

**Response (200 OK):**
```json
{
  "generation_id": "uuid",
  "flashcards": [
    {
      "front": "string (question/prompt)",
      "back": "string (answer/explanation)"
    }
  ],
  "model_name": "string",
  "duration_ms": 0,
  "card_count": 0
}
```

**Response Fields:**
- `generation_id`: UUID of the created generation log (used when saving cards)
- `flashcards`: Array of suggested question-answer pairs (ephemeral, not saved to DB yet)
- `model_name`: Name of LLM model used (e.g., "anthropic/claude-3.5-sonnet")
- `duration_ms`: Time taken for generation in milliseconds
- `card_count`: Number of flashcards generated

**Success Status Codes:**
- `200 OK` - Generation successful

**Error Status Codes:**
- `400 Bad Request` - Invalid input (text too short/long, missing field)
  ```json
  {
    "error": "Validation failed",
    "details": [
      {
        "field": "text",
        "message": "Text must be between 1000 and 10000 characters"
      }
    ]
  }
  ```
- `401 Unauthorized` - User not authenticated
  ```json
  {
    "error": "Authentication required"
  }
  ```
- `503 Service Unavailable` - LLM API failure (OpenRouter timeout/error)
  ```json
  {
    "error": "AI service temporarily unavailable",
    "message": "Please try again in a moment",
    "retryable": true
  }
  ```

**Side Effects:**
- Creates a record in `public.generations` table with generation metadata
- Does NOT create flashcards in database (cards are ephemeral until user saves them)

**Performance:**
- Timeout: 30 seconds for LLM API call
- Expected response time: 5-15 seconds depending on LLM model

---

### 2.3 Flashcard CRUD Operations

#### `POST /api/flashcards`

Creates a single flashcard (manual creation or saving from AI suggestions).

**Request Body:**
```json
{
  "front": "string (1-200 characters)",
  "back": "string (1-500 characters)",
  "source": "manual | ai-full | ai-edited",
  "generation_id": "uuid | null"
}
```

**Validation:**
- `front` is required, max 200 chars, cannot be empty/whitespace only
- `back` is required, max 500 chars, cannot be empty/whitespace only
- `source` must be one of: `"manual"`, `"ai-full"`, `"ai-edited"`
- `generation_id` must be null if source is "manual", must be valid UUID if source is AI-related

**Response (201 Created):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "front": "string",
  "back": "string",
  "source": "manual | ai-full | ai-edited",
  "generation_id": "uuid | null",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp"
}
```

**Success Status Codes:**
- `201 Created` - Flashcard created successfully

**Error Status Codes:**
- `400 Bad Request` - Validation error
  ```json
  {
    "error": "Validation failed",
    "details": [
      {
        "field": "front",
        "message": "Front side cannot be empty"
      }
    ]
  }
  ```
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Invalid generation_id (if provided)
  ```json
  {
    "error": "Generation not found"
  }
  ```

---

#### `POST /api/flashcards/batch`

Creates multiple flashcards in a single transaction (used for "Save All" feature).

**Request Body:**
```json
{
  "flashcards": [
    {
      "front": "string",
      "back": "string",
      "source": "manual | ai-full | ai-edited",
      "generation_id": "uuid | null"
    }
  ]
}
```

**Validation:**
- `flashcards` array is required and must contain 1-50 items
- Each flashcard validated same as single POST endpoint

**Response (201 Created):**
```json
{
  "created": [
    {
      "id": "uuid",
      "front": "string",
      "back": "string",
      "source": "string",
      "generation_id": "uuid | null",
      "created_at": "ISO 8601 timestamp",
      "updated_at": "ISO 8601 timestamp"
    }
  ],
  "count": 0
}
```

**Success Status Codes:**
- `201 Created` - All flashcards created successfully

**Error Status Codes:**
- `400 Bad Request` - Validation error (all-or-nothing, transaction rolled back)
  ```json
  {
    "error": "Batch validation failed",
    "details": [
      {
        "index": 0,
        "field": "front",
        "message": "Front side exceeds 200 characters"
      }
    ]
  }
  ```
- `401 Unauthorized` - User not authenticated

**Performance:**
- Database transaction ensures atomicity
- Limit: Maximum 50 flashcards per batch request

---

#### `GET /api/flashcards`

Retrieves paginated list of user's flashcards, sorted by creation date (newest first).

**Query Parameters:**
- `limit` (optional): Number of items per page (default: 20, max: 100)
- `offset` (optional): Number of items to skip (default: 0)

**Example Request:**
```
GET /api/flashcards?limit=20&offset=0
```

**Response (200 OK):**
```json
{
  "flashcards": [
    {
      "id": "uuid",
      "front": "string",
      "back": "string",
      "source": "manual | ai-full | ai-edited",
      "generation_id": "uuid | null",
      "created_at": "ISO 8601 timestamp",
      "updated_at": "ISO 8601 timestamp"
    }
  ],
  "pagination": {
    "total": 0,
    "limit": 20,
    "offset": 0,
    "has_more": false
  }
}
```

**Response Fields:**
- `flashcards`: Array of flashcard objects
- `pagination.total`: Total number of flashcards (for calculating total pages)
- `pagination.has_more`: Boolean indicating if more results exist

**Success Status Codes:**
- `200 OK` - List retrieved successfully (empty array if no flashcards)

**Error Status Codes:**
- `400 Bad Request` - Invalid pagination parameters
  ```json
  {
    "error": "Invalid pagination",
    "message": "Limit must be between 1 and 100"
  }
  ```
- `401 Unauthorized` - User not authenticated

**Performance:**
- Uses database index: `idx_flashcards_user_created (user_id, created_at DESC)`
- Optimized for offset-based pagination

---

#### `GET /api/flashcards/:id`

Retrieves a single flashcard by ID.

**URL Parameters:**
- `id`: UUID of the flashcard

**Response (200 OK):**
```json
{
  "id": "uuid",
  "front": "string",
  "back": "string",
  "source": "manual | ai-full | ai-edited",
  "generation_id": "uuid | null",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp"
}
```

**Success Status Codes:**
- `200 OK` - Flashcard found

**Error Status Codes:**
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Flashcard doesn't exist or doesn't belong to user
  ```json
  {
    "error": "Flashcard not found"
  }
  ```

---

#### `PATCH /api/flashcards/:id`

Updates an existing flashcard (partial update allowed).

**URL Parameters:**
- `id`: UUID of the flashcard

**Request Body (all fields optional):**
```json
{
  "front": "string",
  "back": "string"
}
```

**Validation:**
- At least one field must be provided
- If `front` provided: max 200 chars, cannot be empty/whitespace
- If `back` provided: max 500 chars, cannot be empty/whitespace
- Cannot update `source` or `generation_id` (immutable after creation)

**Response (200 OK):**
```json
{
  "id": "uuid",
  "front": "string",
  "back": "string",
  "source": "manual | ai-full | ai-edited",
  "generation_id": "uuid | null",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp"
}
```

**Success Status Codes:**
- `200 OK` - Flashcard updated successfully

**Error Status Codes:**
- `400 Bad Request` - Validation error or no fields provided
  ```json
  {
    "error": "Validation failed",
    "details": [
      {
        "field": "front",
        "message": "Front side cannot be empty"
      }
    ]
  }
  ```
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Flashcard doesn't exist or doesn't belong to user

**Side Effects:**
- Database trigger automatically updates `updated_at` timestamp

---

#### `DELETE /api/flashcards/:id`

Permanently deletes a flashcard (hard delete).

**URL Parameters:**
- `id`: UUID of the flashcard

**Response (204 No Content):**
- Empty response body

**Success Status Codes:**
- `204 No Content` - Flashcard deleted successfully

**Error Status Codes:**
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Flashcard doesn't exist or doesn't belong to user
  ```json
  {
    "error": "Flashcard not found"
  }
  ```

**Important Notes:**
- Deletion is permanent (no soft delete in MVP)
- Frontend should implement confirmation dialog before calling this endpoint

---

### 2.4 Analytics

#### `GET /api/analytics/metrics`

Retrieves calculated metrics for tracking product success goals.

**Query Parameters:**
None (always calculates for authenticated user)

**Response (200 OK):**
```json
{
  "ai_usage_ratio": 0.75,
  "acceptance_rate": 0.82,
  "total_flashcards": 100,
  "ai_flashcards": 75,
  "manual_flashcards": 25,
  "total_generations": 5,
  "total_generated_suggestions": 92
}
```

**Response Fields:**
- `ai_usage_ratio`: Percentage of total flashcards from AI (target: >= 0.75)
  - Formula: `(ai-full + ai-edited) / total_flashcards`
- `acceptance_rate`: Percentage of AI suggestions that were saved (target: >= 0.75)
  - Formula: `total_flashcards_with_generation_id / total_generated_suggestions`
- `total_flashcards`: Total number of saved flashcards
- `ai_flashcards`: Number of flashcards from AI (ai-full + ai-edited)
- `manual_flashcards`: Number of manually created flashcards
- `total_generations`: Number of generation sessions
- `total_generated_suggestions`: Sum of `card_count` from all generations

**Success Status Codes:**
- `200 OK` - Metrics calculated successfully

**Error Status Codes:**
- `401 Unauthorized` - User not authenticated

**Performance:**
- Uses database indexes: `idx_flashcards_source`, `idx_flashcards_generation`
- Efficient aggregation queries
- Consider caching if calculation becomes expensive (future optimization)

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

**Provider:** Supabase Authentication
**Method:** Email and Password (JWT-based sessions)

**Implementation:**
1. **Client-side:** Supabase Auth SDK handles all authentication flows
   - Sign up with email/password
   - Sign in with email/password
   - Session management with automatic token refresh
   - Persistent sessions (localStorage)

2. **Server-side (Astro Middleware):**
   - Validates JWT session token on every API request
   - Extracts authenticated user ID (`auth.uid()`)
   - Rejects requests with expired or invalid tokens

**Session Token:**
- JWT token stored in HTTP-only cookie (secure)
- Automatic refresh before expiration
- Logout invalidates token server-side

### 3.2 Authorization Model

**Row Level Security (RLS):**
- Enabled on `public.flashcards` and `public.generations` tables
- PostgreSQL policies enforce data isolation
- Users can only access their own data

**Policy Examples:**
```sql
-- Flashcards: Users can only view their own
CREATE POLICY "Users can view own flashcards"
  ON flashcards FOR SELECT
  USING (auth.uid() = user_id);

-- Flashcards: Users can only create for themselves
CREATE POLICY "Users can create own flashcards"
  ON flashcards FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**API Enforcement:**
- All endpoints automatically filtered by `user_id = auth.uid()`
- Attempting to access another user's resource returns 404 (not 403, to avoid information disclosure)
- No role-based access control in MVP (all authenticated users have same permissions)

### 3.3 Error Responses for Auth Failures

**401 Unauthorized (No session/invalid token):**
```json
{
  "error": "Authentication required",
  "message": "Please log in to continue"
}
```

**403 Forbidden (Valid session, insufficient permissions - rare in MVP):**
```json
{
  "error": "Access denied"
}
```

---

## 4. Validation and Business Logic

### 4.1 Flashcard Validation Rules

**Field: `front` (Question/Prompt side)**
- **Required:** Yes
- **Type:** String
- **Max length:** 200 characters
- **Min length:** 1 character (after trimming whitespace)
- **Constraint:** Cannot be empty or whitespace-only
- **Error message:** "Front side is required and cannot be empty"

**Field: `back` (Answer/Explanation side)**
- **Required:** Yes
- **Type:** String
- **Max length:** 500 characters
- **Min length:** 1 character (after trimming whitespace)
- **Constraint:** Cannot be empty or whitespace-only
- **Error message:** "Back side is required and cannot be empty"

**Field: `source` (Origin tracking)**
- **Required:** Yes
- **Type:** Enum
- **Allowed values:** 
  - `"manual"` - User created without AI
  - `"ai-full"` - AI generated, saved without edits
  - `"ai-edited"` - AI generated, modified before saving
- **Error message:** "Source must be one of: manual, ai-full, ai-edited"

**Field: `generation_id` (Link to generation log)**
- **Required:** Conditional
- **Type:** UUID or null
- **Rules:**
  - Must be null if `source === "manual"`
  - Must be valid UUID if `source` is AI-related
  - Must reference existing generation owned by same user
- **Error message:** "Invalid generation reference"

**Database Constraints:**
- PostgreSQL CHECK constraints enforce trimmed length validation
- Foreign key constraint validates `generation_id` references
- RLS policies enforce `user_id` matches authenticated user

### 4.2 Generation Input Validation

**Field: `text` (Source text for AI generation)**
- **Required:** Yes
- **Type:** String
- **Min length:** 1000 characters
- **Max length:** 10000 characters
- **Constraint:** Must contain non-whitespace content
- **Rationale:** Ensures sufficient context for quality flashcard generation
- **Error messages:**
  - "Text is required"
  - "Text must be at least 1000 characters (currently: {count})"
  - "Text cannot exceed 10000 characters (currently: {count})"

### 4.3 Business Logic Rules

#### BL-1: Source Determination
**Requirement:** Track whether AI-generated card was edited

**Client-side Logic:**
1. When generation completes, store original suggestions: `{ _original: {front, back} }`
2. When user saves card, compare current vs original:
   ```javascript
   if (front === _original.front && back === _original.back) {
     source = "ai-full"
   } else {
     source = "ai-edited"
   }
   ```
3. Send determined `source` to API

**Backend Validation:**
- API trusts client's source determination (ephemeral review state not stored server-side per PRD requirement)
- Validates source is appropriate for generation_id (AI sources require generation_id, manual requires null)

#### BL-2: Generation Metadata Logging
**Requirement:** Track AI performance metrics

**Implementation:**
1. When `/api/flashcards/generate` called:
   - Record start timestamp
   - Call LLM API
   - Record end timestamp
   - Calculate `duration_ms`
   - Count number of flashcards returned (`card_count`)
   - Extract `model_name` from LLM response

2. Store in `generations` table:
   ```json
   {
     "user_id": "auth.uid()",
     "duration_ms": 12500,
     "card_count": 8,
     "model_name": "anthropic/claude-3.5-sonnet"
   }
   ```

3. Return `generation_id` to client for linking saved flashcards

**Purpose:** Enables calculation of Acceptance Rate metric

#### BL-3: Automatic Timestamp Management
**Requirement:** Track when flashcards are created and modified

**Implementation:**
- `created_at`: Set automatically by database DEFAULT (NOW())
- `updated_at`: 
  - Set automatically on INSERT by database DEFAULT (NOW())
  - Updated automatically on UPDATE by `moddatetime` trigger
  - API never sends `updated_at` in request payload

**Behavior:**
- Every PATCH request triggers automatic `updated_at` update
- Clients receive new timestamp in response for optimistic UI updates

#### BL-4: Cascade Deletion
**Requirement:** Clean up related data when user or generation deleted

**Implementation:**
- **User deletion** (handled by Supabase Auth):
  - `ON DELETE CASCADE` removes all flashcards owned by user
  - `ON DELETE CASCADE` removes all generation logs owned by user
  
- **Generation deletion** (rare, not exposed in MVP UI):
  - `ON DELETE SET NULL` preserves flashcards but removes generation reference
  - Flashcard content retained, only metadata link removed

**Rationale:** User data privacy (GDPR compliance), preserves flashcard content even if analytics log removed

#### BL-5: Pagination and Sorting
**Requirement:** Efficiently list flashcards, newest first

**Implementation:**
- Default sort: `ORDER BY created_at DESC`
- Database index: `(user_id, created_at DESC)` optimizes query
- Offset-based pagination (not cursor-based for simplicity)
- Query pattern:
  ```sql
  SELECT * FROM flashcards
  WHERE user_id = $1
  ORDER BY created_at DESC
  LIMIT $2 OFFSET $3
  ```

**Performance:**
- Index scan (not full table scan)
- Efficient even with 100,000+ flashcards per user

#### BL-6: Metrics Calculation
**Requirement:** Calculate AI Usage Ratio and Acceptance Rate

**AI Usage Ratio:**
```sql
SELECT 
  COUNT(CASE WHEN source IN ('ai-full', 'ai-edited') THEN 1 END)::FLOAT / 
  NULLIF(COUNT(*), 0)::FLOAT AS ai_usage_ratio
FROM flashcards
WHERE user_id = auth.uid();
```

**Acceptance Rate:**
```sql
SELECT 
  COUNT(DISTINCT f.id)::FLOAT / 
  NULLIF(SUM(g.card_count), 0)::FLOAT AS acceptance_rate
FROM generations g
LEFT JOIN flashcards f ON f.generation_id = g.id
WHERE g.user_id = auth.uid();
```

**Handling Edge Cases:**
- Division by zero: Return 0 if no flashcards/generations exist
- New users: Return 0 values for all metrics

### 4.4 Error Response Format

**Standard Error Response Structure:**
```json
{
  "error": "Brief error title",
  "message": "Human-readable explanation (optional)",
  "details": [
    {
      "field": "field_name",
      "message": "Specific validation error"
    }
  ]
}
```

**HTTP Status Code Guidelines:**
- `400 Bad Request` - Client error (validation, malformed request)
- `401 Unauthorized` - Authentication required or invalid session
- `404 Not Found` - Resource doesn't exist (or belongs to different user)
- `409 Conflict` - Business rule violation (rare in this API)
- `500 Internal Server Error` - Unexpected server error (logged for debugging)
- `503 Service Unavailable` - External service failure (e.g., LLM API down)

**Examples:**

Validation error (400):
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "front",
      "message": "Front side cannot exceed 200 characters"
    },
    {
      "field": "back",
      "message": "Back side is required"
    }
  ]
}
```

Authentication error (401):
```json
{
  "error": "Authentication required",
  "message": "Your session has expired. Please log in again."
}
```

LLM service error (503):
```json
{
  "error": "AI service temporarily unavailable",
  "message": "The AI generation service is currently experiencing issues. Please try again in a moment.",
  "retryable": true
}
```

---

## 5. Additional Considerations

### 5.1 API Versioning
**Current:** No versioning in MVP (breaking changes managed through database migrations)
**Future:** If breaking changes needed, use `/api/v2/` prefix

### 5.2 Rate Limiting
**MVP:** Not implemented (single-user application, Supabase connection pooling handles load)
**Future:** Consider implementing if abuse detected:
- 100 requests per minute per user
- 10 generations per hour per user (LLM cost control)

### 5.3 CORS Policy
**Configuration:** 
- Same-origin policy (frontend and API on same domain)
- No cross-origin requests in MVP

### 5.4 Request/Response Content Type
**Content-Type:** `application/json` for all endpoints
**Accept:** `application/json` required in request headers

### 5.5 Idempotency
**POST endpoints:** Not idempotent (each call creates new resource)
**PATCH/DELETE endpoints:** Idempotent (repeated calls with same data produce same result)
**GET endpoints:** Safe and idempotent

### 5.6 Logging and Monitoring
**Application Logs:**
- API request/response times
- LLM API failures and retry attempts
- Validation errors (aggregated for debugging)

**Metrics to Track:**
- Average generation duration
- Generation success/failure rate
- API endpoint response times
- Error rates by endpoint

### 5.7 Future Enhancements (Out of Scope for MVP)
- Real-time updates via Supabase Realtime (sync across devices)
- Bulk export (CSV, Anki format)
- Duplicate detection
- Flashcard tagging/categorization
- Shared flashcard decks
- Image attachments for flashcards
- Spaced repetition algorithm integration

---

**Document Version:** 1.0.0  
**Status:** Ready for Implementation  
**Last Updated:** 2025-12-07

