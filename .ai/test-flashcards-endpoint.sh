#!/bin/bash

# Test script for POST /api/flashcards endpoint
# Prerequisites:
# 1. Dev server running (npm run dev)
# 2. Valid JWT token set in JWT_TOKEN variable
# 3. Valid generation_id set in GENERATION_ID variable (from POST /api/flashcards/generate)

# Configuration
BASE_URL="http://localhost:4321"
ENDPOINT="/api/flashcards"
JWT_TOKEN="YOUR_JWT_TOKEN_HERE"  # Replace with actual token
GENERATION_ID="YOUR_GENERATION_ID_HERE"  # Replace with actual generation_id

echo "=========================================="
echo "Testing POST /api/flashcards endpoint"
echo "=========================================="
echo ""

# Test 1: Manual flashcard creation (SUCCESS)
echo "Test 1: Create manual flashcard (SUCCESS)"
echo "------------------------------------------"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "front": "What is the capital of France?",
    "back": "Paris",
    "source": "manual",
    "generation_id": null
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 2: AI flashcard without edit (ai-full) (SUCCESS)
echo "Test 2: Create AI flashcard - ai-full (SUCCESS)"
echo "------------------------------------------------"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d "{
    \"front\": \"Explain closures in JavaScript\",
    \"back\": \"A closure is a function that has access to variables in its outer (enclosing) lexical scope, even after the outer function has returned.\",
    \"source\": \"ai-full\",
    \"generation_id\": \"${GENERATION_ID}\"
  }" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 3: AI flashcard with edit (ai-edited) (SUCCESS)
echo "Test 3: Create AI flashcard - ai-edited (SUCCESS)"
echo "---------------------------------------------------"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d "{
    \"front\": \"What is a closure?\",
    \"back\": \"A closure is a function that remembers variables from its outer scope.\",
    \"source\": \"ai-edited\",
    \"generation_id\": \"${GENERATION_ID}\"
  }" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 4: Validation error - empty field (ERROR 400)
echo "Test 4: Validation error - whitespace only front (ERROR 400)"
echo "-------------------------------------------------------------"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "front": "   ",
    "back": "Answer",
    "source": "manual",
    "generation_id": null
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 5: Validation error - field too long (ERROR 400)
echo "Test 5: Validation error - front exceeds 200 chars (ERROR 400)"
echo "---------------------------------------------------------------"
LONG_FRONT=$(printf 'a%.0s' {1..201})
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d "{
    \"front\": \"${LONG_FRONT}\",
    \"back\": \"Answer\",
    \"source\": \"manual\",
    \"generation_id\": null
  }" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 6: Validation error - source/generation_id mismatch (ERROR 400)
echo "Test 6: Validation error - manual with generation_id (ERROR 400)"
echo "-----------------------------------------------------------------"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "front": "Question",
    "back": "Answer",
    "source": "manual",
    "generation_id": "550e8400-e29b-41d4-a716-446655440000"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 7: Not found error - invalid generation_id (ERROR 404)
echo "Test 7: Not found error - invalid generation_id (ERROR 404)"
echo "------------------------------------------------------------"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "front": "Question",
    "back": "Answer",
    "source": "ai-full",
    "generation_id": "00000000-0000-0000-0000-000000000000"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 8: Authentication error - no token (ERROR 401)
echo "Test 8: Authentication error - no token (ERROR 401)"
echo "----------------------------------------------------"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "front": "Question",
    "back": "Answer",
    "source": "manual",
    "generation_id": null
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 9: Validation error - invalid JSON (ERROR 400)
echo "Test 9: Validation error - invalid JSON (ERROR 400)"
echo "----------------------------------------------------"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{ "front": "test", "back": invalid }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>&1
echo ""
echo ""

# Test 10: Validation error - ai-full without generation_id (ERROR 400)
echo "Test 10: Validation error - ai-full without generation_id (ERROR 400)"
echo "----------------------------------------------------------------------"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "front": "Question",
    "back": "Answer",
    "source": "ai-full",
    "generation_id": null
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

echo "=========================================="
echo "All tests completed!"
echo "=========================================="


