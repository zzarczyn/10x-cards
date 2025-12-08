# Test Results: POST /api/flashcards

**Date:** [TO BE FILLED]  
**Tester:** [TO BE FILLED]  
**Environment:** Development (localhost:4321)  
**Endpoint:** `POST /api/flashcards`

---

## Test Setup

**Prerequisites:**
- ✅ Dev server running (`npm run dev`)
- ✅ Valid JWT token obtained
- ✅ Valid generation_id from POST /api/flashcards/generate
- ✅ Test script prepared (`.ai/test-flashcards-endpoint.sh`)

**Configuration:**
```bash
BASE_URL="http://localhost:4321"
JWT_TOKEN="[REDACTED]"
GENERATION_ID="[REDACTED]"
```

---

## Test Cases

### Test 1: Create Manual Flashcard ✅ SUCCESS

**Scenario:** User creates a flashcard manually (not from AI)

**Request:**
```json
{
  "front": "What is the capital of France?",
  "back": "Paris",
  "source": "manual",
  "generation_id": null
}
```

**Expected Result:**
- HTTP Status: `201 Created`
- Response contains full FlashcardDTO with:
  - `id` (UUID)
  - `user_id` (from authenticated user)
  - `front`, `back`, `source` (as sent)
  - `generation_id: null`
  - `created_at`, `updated_at` (timestamps)

**Actual Result:**
```
[TO BE FILLED AFTER TEST]
```

**Status:** [ ] PASS / [ ] FAIL

---

### Test 2: Create AI Flashcard - ai-full ✅ SUCCESS

**Scenario:** User saves flashcard from AI generation without modifications

**Request:**
```json
{
  "front": "Explain closures in JavaScript",
  "back": "A closure is a function that has access to variables...",
  "source": "ai-full",
  "generation_id": "<VALID_GENERATION_ID>"
}
```

**Expected Result:**
- HTTP Status: `201 Created`
- Response contains FlashcardDTO with `generation_id` set

**Actual Result:**
```
[TO BE FILLED AFTER TEST]
```

**Status:** [ ] PASS / [ ] FAIL

---

### Test 3: Create AI Flashcard - ai-edited ✅ SUCCESS

**Scenario:** User saves flashcard from AI generation with edits

**Request:**
```json
{
  "front": "What is a closure?",
  "back": "A closure is a function that remembers variables from its outer scope.",
  "source": "ai-edited",
  "generation_id": "<VALID_GENERATION_ID>"
}
```

**Expected Result:**
- HTTP Status: `201 Created`
- Response contains FlashcardDTO with `source: "ai-edited"`

**Actual Result:**
```
[TO BE FILLED AFTER TEST]
```

**Status:** [ ] PASS / [ ] FAIL

---

### Test 4: Validation Error - Whitespace Only ❌ ERROR 400

**Scenario:** Front field contains only whitespace

**Request:**
```json
{
  "front": "   ",
  "back": "Answer",
  "source": "manual",
  "generation_id": null
}
```

**Expected Result:**
- HTTP Status: `400 Bad Request`
- Error response:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "front",
      "message": "Front side cannot be empty or whitespace only"
    }
  ]
}
```

**Actual Result:**
```
[TO BE FILLED AFTER TEST]
```

**Status:** [ ] PASS / [ ] FAIL

---

### Test 5: Validation Error - Field Too Long ❌ ERROR 400

**Scenario:** Front field exceeds 200 characters

**Request:**
```json
{
  "front": "aaaaaa... (201 characters)",
  "back": "Answer",
  "source": "manual",
  "generation_id": null
}
```

**Expected Result:**
- HTTP Status: `400 Bad Request`
- Error response:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "front",
      "message": "Front side cannot exceed 200 characters"
    }
  ]
}
```

**Actual Result:**
```
[TO BE FILLED AFTER TEST]
```

**Status:** [ ] PASS / [ ] FAIL

---

### Test 6: Validation Error - Source/Generation Mismatch ❌ ERROR 400

**Scenario:** Manual source with non-null generation_id

**Request:**
```json
{
  "front": "Question",
  "back": "Answer",
  "source": "manual",
  "generation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Expected Result:**
- HTTP Status: `400 Bad Request`
- Error response:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "generation_id",
      "message": "generation_id must be null for manual cards and required for AI-generated cards"
    }
  ]
}
```

**Actual Result:**
```
[TO BE FILLED AFTER TEST]
```

**Status:** [ ] PASS / [ ] FAIL

---

### Test 7: Not Found Error - Invalid Generation ID ❌ ERROR 404

**Scenario:** AI flashcard with non-existent generation_id

**Request:**
```json
{
  "front": "Question",
  "back": "Answer",
  "source": "ai-full",
  "generation_id": "00000000-0000-0000-0000-000000000000"
}
```

**Expected Result:**
- HTTP Status: `404 Not Found`
- Error response:
```json
{
  "error": "Generation not found",
  "message": "The specified generation_id does not exist or does not belong to your account"
}
```

**Actual Result:**
```
[TO BE FILLED AFTER TEST]
```

**Status:** [ ] PASS / [ ] FAIL

---

### Test 8: Authentication Error - No Token ❌ ERROR 401

**Scenario:** Request without JWT token

**Request:**
```json
{
  "front": "Question",
  "back": "Answer",
  "source": "manual",
  "generation_id": null
}
```
*Note: No Authorization header*

**Expected Result:**
- HTTP Status: `401 Unauthorized`
- Error response:
```json
{
  "error": "Authentication required",
  "message": "Please log in to continue"
}
```

**Actual Result:**
```
[TO BE FILLED AFTER TEST]
```

**Status:** [ ] PASS / [ ] FAIL

---

### Test 9: Validation Error - Invalid JSON ❌ ERROR 400

**Scenario:** Malformed JSON in request body

**Request:**
```
{ "front": "test", "back": invalid }
```

**Expected Result:**
- HTTP Status: `400 Bad Request`
- Error response:
```json
{
  "error": "Invalid JSON",
  "message": "Request body must be valid JSON"
}
```

**Actual Result:**
```
[TO BE FILLED AFTER TEST]
```

**Status:** [ ] PASS / [ ] FAIL

---

### Test 10: Validation Error - AI Source Without Generation ID ❌ ERROR 400

**Scenario:** ai-full source with null generation_id

**Request:**
```json
{
  "front": "Question",
  "back": "Answer",
  "source": "ai-full",
  "generation_id": null
}
```

**Expected Result:**
- HTTP Status: `400 Bad Request`
- Error response:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "generation_id",
      "message": "generation_id must be null for manual cards and required for AI-generated cards"
    }
  ]
}
```

**Actual Result:**
```
[TO BE FILLED AFTER TEST]
```

**Status:** [ ] PASS / [ ] FAIL

---

## Summary

**Total Tests:** 10  
**Passed:** [TO BE FILLED]  
**Failed:** [TO BE FILLED]  
**Pass Rate:** [TO BE FILLED]%

### Issues Found
[TO BE FILLED - List any bugs or unexpected behaviors]

### Database Verification

**Flashcards Created:**
- [ ] Verified flashcards appear in Supabase dashboard
- [ ] Verified user_id matches authenticated user
- [ ] Verified generation_id links correctly (for AI cards)
- [ ] Verified timestamps are set correctly
- [ ] Verified RLS policies work (other users can't see these cards)

**Queries Used:**
```sql
-- Check created flashcards
SELECT id, user_id, front, back, source, generation_id, created_at
FROM flashcards
ORDER BY created_at DESC
LIMIT 10;

-- Verify generation linkage
SELECT f.id, f.front, f.source, f.generation_id, g.id as gen_id, g.user_id
FROM flashcards f
LEFT JOIN generations g ON f.generation_id = g.id
WHERE f.generation_id IS NOT NULL;
```

---

## Notes

[TO BE FILLED - Any additional observations or comments]

---

**Test Completion Date:** [TO BE FILLED]  
**Reviewed By:** [TO BE FILLED]  
**Status:** [ ] All tests passed - Ready for merge [ ] Issues found - Needs fixes

