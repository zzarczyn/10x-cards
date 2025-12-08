#!/bin/bash

# ==============================================================================
# Test Script for POST /api/flashcards/generate
# ==============================================================================
# Usage: ./test-generate-endpoint.sh [SESSION_TOKEN]
#
# This script tests the flashcard generation endpoint with various scenarios.
# You need to provide a valid Supabase session token as argument.
#
# To get your session token:
# 1. Log in to your app in browser
# 2. Open DevTools → Application → Cookies
# 3. Copy the value of 'sb-access-token' cookie
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:3000/api/flashcards/generate"
SESSION_TOKEN="${1:-}"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# ==============================================================================
# Helper Functions
# ==============================================================================

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}→ Test: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# ==============================================================================
# Validation
# ==============================================================================

if [ -z "$SESSION_TOKEN" ]; then
    echo -e "${RED}Error: Session token is required${NC}"
    echo "Usage: $0 <SESSION_TOKEN>"
    echo ""
    echo "To get your session token:"
    echo "1. Log in to your app in browser"
    echo "2. Open DevTools → Application → Cookies"
    echo "3. Copy the value of 'sb-access-token' cookie"
    exit 1
fi

print_header "API Endpoint Test Suite"
echo "API URL: $API_URL"
echo "Session: ${SESSION_TOKEN:0:20}..."
echo ""

# ==============================================================================
# Test 1: Valid Request (Success)
# ==============================================================================

print_test "Valid text generates flashcards (200 OK)"

VALID_TEXT="React is a JavaScript library for building user interfaces. It was developed by Facebook and released in 2013. React uses a component-based architecture where UIs are built from reusable pieces called components. Components can be function components or class components. Function components are simpler and are the modern way of writing React code. React uses a virtual DOM to efficiently update the real DOM. When state changes, React compares the virtual DOM with the real DOM and only updates what changed. This process is called reconciliation. React hooks like useState and useEffect allow function components to have state and side effects. JSX is a syntax extension that allows writing HTML-like code in JavaScript. It gets compiled to React.createElement calls. Props are used to pass data from parent to child components. State is used for data that changes over time within a component. Reacts one-way data flow makes it easier to understand and debug applications."

RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "Cookie: sb-access-token=$SESSION_TOKEN" \
    -d "{\"text\": \"$VALID_TEXT\"}" \
    -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" == "200" ]; then
    print_success "Status 200 OK"
    
    # Validate response structure
    if echo "$BODY" | jq -e '.generation_id' > /dev/null 2>&1; then
        print_success "Response contains generation_id"
    else
        print_error "Missing generation_id in response"
    fi
    
    if echo "$BODY" | jq -e '.flashcards | length > 0' > /dev/null 2>&1; then
        CARD_COUNT=$(echo "$BODY" | jq '.flashcards | length')
        print_success "Generated $CARD_COUNT flashcards"
    else
        print_error "No flashcards in response"
    fi
    
    print_info "Response sample:"
    echo "$BODY" | jq '.'
else
    print_error "Expected 200, got $HTTP_CODE"
    echo "$BODY"
fi

# ==============================================================================
# Test 2: Text Too Short (400)
# ==============================================================================

print_test "Text too short returns 400 Bad Request"

SHORT_TEXT="Too short"

RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "Cookie: sb-access-token=$SESSION_TOKEN" \
    -d "{\"text\": \"$SHORT_TEXT\"}" \
    -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" == "400" ]; then
    print_success "Status 400 Bad Request"
    
    if echo "$BODY" | jq -e '.error == "Validation failed"' > /dev/null 2>&1; then
        print_success "Correct error message"
    else
        print_error "Unexpected error format"
    fi
else
    print_error "Expected 400, got $HTTP_CODE"
fi

# ==============================================================================
# Test 3: Missing Field (400)
# ==============================================================================

print_test "Missing 'text' field returns 400 Bad Request"

RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "Cookie: sb-access-token=$SESSION_TOKEN" \
    -d '{}' \
    -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" == "400" ]; then
    print_success "Status 400 Bad Request for missing field"
else
    print_error "Expected 400, got $HTTP_CODE"
fi

# ==============================================================================
# Test 4: Invalid JSON (400)
# ==============================================================================

print_test "Invalid JSON returns 400 Bad Request"

RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "Cookie: sb-access-token=$SESSION_TOKEN" \
    -d 'invalid json {' \
    -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" == "400" ]; then
    print_success "Status 400 Bad Request"
    
    if echo "$BODY" | jq -e '.error == "Invalid JSON"' > /dev/null 2>&1; then
        print_success "Correct error for invalid JSON"
    else
        print_error "Unexpected error format"
    fi
else
    print_error "Expected 400, got $HTTP_CODE"
fi

# ==============================================================================
# Test 5: No Authentication (401)
# ==============================================================================

print_test "Request without auth returns 401 Unauthorized"

RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"$VALID_TEXT\"}" \
    -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" == "401" ]; then
    print_success "Status 401 Unauthorized"
    
    if echo "$BODY" | jq -e '.error == "Authentication required"' > /dev/null 2>&1; then
        print_success "Correct authentication error"
    else
        print_error "Unexpected error format"
    fi
else
    print_error "Expected 401, got $HTTP_CODE"
fi

# ==============================================================================
# Summary
# ==============================================================================

print_header "Test Summary"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}\n"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed${NC}\n"
    exit 1
fi

