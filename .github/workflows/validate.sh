#!/bin/bash
# Validation script for CI/CD workflow
# Usage: bash .github/workflows/validate.sh

set -e

echo "🔍 CI/CD Workflow Validation"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
CHECKS=0

# Helper functions
check_pass() {
    CHECKS=$((CHECKS + 1))
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    ERRORS=$((ERRORS + 1))
    CHECKS=$((CHECKS + 1))
    echo -e "${RED}✗${NC} $1"
}

check_warn() {
    WARNINGS=$((WARNINGS + 1))
    CHECKS=$((CHECKS + 1))
    echo -e "${YELLOW}⚠${NC} $1"
}

echo "1. Checking required files..."
echo "------------------------------"

# Check workflow file
if [ -f ".github/workflows/ci.yml" ]; then
    check_pass "ci.yml exists"
else
    check_fail "ci.yml not found"
fi

# Check .nvmrc
if [ -f ".nvmrc" ]; then
    check_pass ".nvmrc exists"
    NODE_VERSION=$(cat .nvmrc)
    echo "   Node version: $NODE_VERSION"
else
    check_fail ".nvmrc not found"
fi

# Check package.json
if [ -f "package.json" ]; then
    check_pass "package.json exists"
else
    check_fail "package.json not found"
fi

# Check package-lock.json
if [ -f "package-lock.json" ]; then
    check_pass "package-lock.json exists"
else
    check_warn "package-lock.json not found (npm ci will fail)"
fi

echo ""
echo "2. Checking documentation..."
echo "----------------------------"

# Check documentation files
DOCS=(
    ".github/workflows/README.md"
    ".github/workflows/ARCHITECTURE.md"
    ".github/workflows/LOCAL_TESTING.md"
    ".github/workflows/EXAMPLES.md"
    ".github/workflows/MAINTENANCE.md"
    ".github/workflows/SUMMARY.md"
    ".github/workflows/INDEX.md"
    ".github/workflows/DIAGRAM.md"
    "CI_CD_SETUP.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        check_pass "$(basename $doc) exists"
    else
        check_warn "$(basename $doc) not found"
    fi
done

echo ""
echo "3. Checking npm scripts..."
echo "--------------------------"

if [ -f "package.json" ]; then
    # Check required scripts
    SCRIPTS=("lint" "test" "test:e2e" "build")
    
    for script in "${SCRIPTS[@]}"; do
        if grep -q "\"$script\":" package.json; then
            check_pass "npm run $script is defined"
        else
            check_fail "npm run $script is missing"
        fi
    done
fi

echo ""
echo "4. Checking workflow syntax..."
echo "-------------------------------"

if command -v npx &> /dev/null; then
    if [ -f ".github/workflows/ci.yml" ]; then
        # Try to validate YAML syntax
        if npx js-yaml .github/workflows/ci.yml > /dev/null 2>&1; then
            check_pass "ci.yml has valid YAML syntax"
        else
            check_fail "ci.yml has invalid YAML syntax"
        fi
    fi
else
    check_warn "npx not available, skipping YAML validation"
fi

echo ""
echo "5. Checking environment..."
echo "--------------------------"

# Check if .env exists (local development)
if [ -f ".env" ]; then
    check_pass ".env exists (local)"
    
    # Check required env vars
    ENV_VARS=("SUPABASE_URL" "SUPABASE_KEY" "OPENROUTER_API_KEY")
    
    for var in "${ENV_VARS[@]}"; do
        if grep -q "^$var=" .env; then
            check_pass "$var is set in .env"
        else
            check_warn "$var is missing in .env"
        fi
    done
else
    check_warn ".env not found (OK for CI, needed for local)"
fi

echo ""
echo "6. Checking Git configuration..."
echo "---------------------------------"

# Check current branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "   Current branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
    check_pass "On main/master branch (workflow will trigger)"
else
    check_warn "Not on main/master (workflow won't trigger automatically)"
fi

# Check if there are uncommitted changes
if git diff-index --quiet HEAD -- 2>/dev/null; then
    check_pass "No uncommitted changes"
else
    check_warn "Uncommitted changes detected"
fi

echo ""
echo "7. Checking Node.js version..."
echo "-------------------------------"

if command -v node &> /dev/null; then
    CURRENT_NODE=$(node -v | sed 's/v//')
    EXPECTED_NODE=$(cat .nvmrc 2>/dev/null || echo "unknown")
    
    echo "   Current: $CURRENT_NODE"
    echo "   Expected: $EXPECTED_NODE"
    
    if [ "$CURRENT_NODE" = "$EXPECTED_NODE" ]; then
        check_pass "Node.js version matches .nvmrc"
    else
        check_warn "Node.js version mismatch (use 'nvm use')"
    fi
else
    check_fail "Node.js not installed"
fi

echo ""
echo "8. Checking dependencies..."
echo "---------------------------"

if [ -f "node_modules/.package-lock.json" ]; then
    check_pass "node_modules exists"
else
    check_warn "node_modules not found (run 'npm install')"
fi

# Check if Playwright is installed
if [ -d "node_modules/@playwright" ]; then
    check_pass "Playwright is installed"
else
    check_warn "Playwright not installed"
fi

echo ""
echo "=============================="
echo "Validation Summary"
echo "=============================="
echo ""
echo "Total checks: $CHECKS"
echo -e "${GREEN}Passed: $((CHECKS - ERRORS - WARNINGS))${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Errors: $ERRORS${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Validation FAILED${NC}"
    echo "Please fix the errors above before pushing to main."
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Validation PASSED with warnings${NC}"
    echo "Consider addressing the warnings above."
    exit 0
else
    echo -e "${GREEN}✅ Validation PASSED${NC}"
    echo "CI/CD setup looks good!"
    exit 0
fi

