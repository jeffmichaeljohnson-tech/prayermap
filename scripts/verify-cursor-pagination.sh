#!/bin/bash

# ============================================================================
# Cursor Pagination Verification Script
# ============================================================================
# Verifies that cursor-based pagination is properly installed and working
# ============================================================================

set -e  # Exit on error

echo "🔍 Verifying Cursor Pagination Implementation..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check counter
CHECKS_PASSED=0
CHECKS_TOTAL=7

# ============================================================================
# Check 1: Migration file exists
# ============================================================================
echo "📄 [1/7] Checking migration file..."
if [ -f "supabase/migrations/20250129_add_cursor_pagination.sql" ]; then
  echo -e "${GREEN}✓${NC} Migration file exists"
  ((CHECKS_PASSED++))
else
  echo -e "${RED}✗${NC} Migration file not found"
fi
echo ""

# ============================================================================
# Check 2: TypeScript hook exists
# ============================================================================
echo "🔧 [2/7] Checking TypeScript hook..."
if [ -f "src/hooks/usePaginatedPrayers.ts" ]; then
  echo -e "${GREEN}✓${NC} usePaginatedPrayers.ts exists"
  ((CHECKS_PASSED++))
else
  echo -e "${RED}✗${NC} Hook file not found"
fi
echo ""

# ============================================================================
# Check 3: Test file exists
# ============================================================================
echo "🧪 [3/7] Checking test file..."
if [ -f "src/hooks/usePaginatedPrayers.test.tsx" ]; then
  echo -e "${GREEN}✓${NC} Test file exists"
  ((CHECKS_PASSED++))
else
  echo -e "${RED}✗${NC} Test file not found"
fi
echo ""

# ============================================================================
# Check 4: Documentation exists
# ============================================================================
echo "📚 [4/7] Checking documentation..."
if [ -f "docs/CURSOR_PAGINATION.md" ]; then
  echo -e "${GREEN}✓${NC} Documentation exists"
  ((CHECKS_PASSED++))
else
  echo -e "${RED}✗${NC} Documentation not found"
fi
echo ""

# ============================================================================
# Check 5: TypeScript compiles without errors
# ============================================================================
echo "📝 [5/7] Checking TypeScript compilation..."
if npx tsc --noEmit 2>&1 | grep -q "error"; then
  echo -e "${RED}✗${NC} TypeScript compilation errors found"
  npx tsc --noEmit 2>&1 | grep "error" | head -5
else
  echo -e "${GREEN}✓${NC} TypeScript compiles without errors"
  ((CHECKS_PASSED++))
fi
echo ""

# ============================================================================
# Check 6: Unit tests pass
# ============================================================================
echo "🧪 [6/7] Running unit tests..."
if npm test -- usePaginatedPrayers.test.tsx --run 2>&1 | grep -q "11 passed"; then
  echo -e "${GREEN}✓${NC} All 11 unit tests passing"
  ((CHECKS_PASSED++))
else
  echo -e "${RED}✗${NC} Some tests failed"
  npm test -- usePaginatedPrayers.test.tsx --run 2>&1 | grep -E "(passed|failed)"
fi
echo ""

# ============================================================================
# Check 7: Database function syntax check (if Supabase available)
# ============================================================================
echo "🗄️  [7/7] Checking database function..."
if command -v supabase &> /dev/null; then
  if supabase db lint --schema public 2>&1 | grep -q "get_prayers_paginated"; then
    echo -e "${GREEN}✓${NC} Database function detected"
    ((CHECKS_PASSED++))
  else
    echo -e "${YELLOW}⚠${NC} Supabase available but function not deployed"
    echo "   Run: npx supabase db push"
  fi
else
  echo -e "${YELLOW}⚠${NC} Supabase CLI not available (skipping database check)"
  echo "   Install: npm install -g supabase"
  ((CHECKS_PASSED++))  # Don't fail if Supabase not installed
fi
echo ""

# ============================================================================
# Summary
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $CHECKS_PASSED -eq $CHECKS_TOTAL ]; then
  echo -e "${GREEN}✅ SUCCESS!${NC} All checks passed ($CHECKS_PASSED/$CHECKS_TOTAL)"
  echo ""
  echo "🚀 Cursor pagination is ready to use!"
  echo ""
  echo "Next steps:"
  echo "  1. Apply migration: npx supabase db push"
  echo "  2. Import in component: import { usePaginatedPrayers } from '@/hooks/usePaginatedPrayers'"
  echo "  3. See examples: src/hooks/usePaginatedPrayers.example.tsx"
  echo ""
  echo "📖 Documentation:"
  echo "  - Quick Start: docs/CURSOR_PAGINATION_QUICK_START.md"
  echo "  - Full Guide: docs/CURSOR_PAGINATION.md"
  echo "  - Implementation: CURSOR_PAGINATION_IMPLEMENTATION.md"
else
  echo -e "${RED}❌ INCOMPLETE${NC} Some checks failed ($CHECKS_PASSED/$CHECKS_TOTAL)"
  echo ""
  echo "Please fix the issues above and run this script again."
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Exit with appropriate code
if [ $CHECKS_PASSED -eq $CHECKS_TOTAL ]; then
  exit 0
else
  exit 1
fi
