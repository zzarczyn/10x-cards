# Quick Testing Guide: POST /api/flashcards

## Prerequisites

1. **Start dev server:**
```bash
npm run dev
```

2. **Get JWT token:**
   - Log in via Supabase Auth UI
   - Open browser DevTools → Application/Storage → Cookies
   - Copy the `sb-access-token` value OR
   - Check Network tab → Authorization header → Copy Bearer token

3. **Get generation_id (for AI flashcards):**
```bash
# First, generate flashcards using the generation endpoint
curl -X POST http://localhost:4321/api/flashcards/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "text": "JavaScript is a programming language. It was created by Brendan Eich in 1995. JavaScript runs in web browsers and can also run on servers using Node.js. The language is dynamically typed and supports object-oriented, imperative, and functional programming styles. JavaScript is one of the core technologies of the World Wide Web, alongside HTML and CSS. Modern JavaScript includes features like arrow functions, promises, and async/await for handling asynchronous operations." 
  }'

# Copy the "generation_id" from the response
```

## Quick Tests

### 1. Manual Flashcard (Success)
```bash
curl -X POST http://localhost:4321/api/flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "front": "What is the capital of France?",
    "back": "Paris",
    "source": "manual",
    "generation_id": null
  }' | jq
```
**Expected:** 201 Created with full flashcard object

### 2. AI Flashcard - Full (Success)
```bash
curl -X POST http://localhost:4321/api/flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "front": "What is JavaScript?",
    "back": "A programming language created by Brendan Eich in 1995",
    "source": "ai-full",
    "generation_id": "YOUR_GENERATION_ID_HERE"
  }' | jq
```
**Expected:** 201 Created with generation_id set

### 3. Validation Error (Empty field)
```bash
curl -X POST http://localhost:4321/api/flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "front": "   ",
    "back": "Answer",
    "source": "manual",
    "generation_id": null
  }' | jq
```
**Expected:** 400 Bad Request with validation details

### 4. Invalid Generation ID
```bash
curl -X POST http://localhost:4321/api/flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "front": "Question",
    "back": "Answer",
    "source": "ai-full",
    "generation_id": "00000000-0000-0000-0000-000000000000"
  }' | jq
```
**Expected:** 404 Not Found

### 5. No Authentication
```bash
curl -X POST http://localhost:4321/api/flashcards \
  -H "Content-Type: application/json" \
  -d '{
    "front": "Question",
    "back": "Answer",
    "source": "manual",
    "generation_id": null
  }' | jq
```
**Expected:** 401 Unauthorized

## Automated Testing

### Setup test script:
```bash
# Edit the script with your credentials
nano .ai/test-flashcards-endpoint.sh

# Update these variables:
JWT_TOKEN="your_actual_jwt_token"
GENERATION_ID="your_actual_generation_id"
```

### Run all tests:
```bash
bash .ai/test-flashcards-endpoint.sh
```

## Database Verification

After creating flashcards, verify in Supabase:

```sql
-- Check created flashcards
SELECT 
  id, 
  user_id, 
  front, 
  back, 
  source, 
  generation_id, 
  created_at 
FROM flashcards 
ORDER BY created_at DESC 
LIMIT 10;

-- Verify generation linkage
SELECT 
  f.id,
  f.front,
  f.source,
  f.generation_id,
  g.card_count,
  g.model_name
FROM flashcards f
LEFT JOIN generations g ON f.generation_id = g.id
WHERE f.generation_id IS NOT NULL;
```

## Troubleshooting

### Error: 401 Unauthorized
- Check if JWT token is valid and not expired
- Ensure Authorization header is set correctly
- Try generating a new token by logging in again

### Error: 404 Generation Not Found
- Verify generation_id exists in database
- Ensure generation_id belongs to your user
- Try creating a new generation first

### Error: 400 Validation Failed
- Check all required fields are present
- Verify field lengths (front: 1-200, back: 1-500)
- Ensure source/generation_id consistency
- Check that fields aren't whitespace-only

## Success Criteria

✅ All HTTP status codes match expected values  
✅ Response bodies contain correct data structure  
✅ Flashcards appear in Supabase dashboard  
✅ user_id matches authenticated user  
✅ generation_id links correctly (for AI cards)  
✅ Timestamps are set automatically  
✅ RLS policies prevent cross-user access

---

For detailed test cases and expected results, see: `.ai/test-flashcards-endpoint.md`


