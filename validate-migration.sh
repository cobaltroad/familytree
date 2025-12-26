#!/bin/bash
# Validation test script for Story 7: Go Backend Removal
# This script validates the acceptance criteria for the migration

set -e  # Exit on any error

echo "=========================================="
echo "Story 7 Validation Tests"
echo "=========================================="
echo ""

FAILED_TESTS=()
PASSED_TESTS=()

# Test 1: Go backend should be archived
echo "Test 1: Checking Go backend archival..."
if [ -d "archive/backend-go-"* ]; then
  echo "  ✓ Go backend archived"
  PASSED_TESTS+=("Go backend archival")
else
  echo "  ✗ Go backend NOT archived"
  FAILED_TESTS+=("Go backend archival")
fi
echo ""

# Test 2: go.mod and go.sum should not exist at root
echo "Test 2: Checking go.mod and go.sum removal at root..."
if [ ! -f "go.mod" ] && [ ! -f "go.sum" ]; then
  echo "  ✓ go.mod and go.sum removed from root"
  PASSED_TESTS+=("go.mod/go.sum removal")
else
  echo "  ✗ go.mod or go.sum still exists at root"
  FAILED_TESTS+=("go.mod/go.sum removal")
fi
echo ""

# Test 3: Database should exist at project root
echo "Test 3: Checking database location..."
if [ -f "familytree.db" ]; then
  echo "  ✓ Database exists at project root"
  PASSED_TESTS+=("Database location")
else
  echo "  ✗ Database NOT at project root"
  FAILED_TESTS+=("Database location")
fi
echo ""

# Test 4: package.json should exist at root
echo "Test 4: Checking package.json at root..."
if [ -f "package.json" ]; then
  echo "  ✓ package.json exists at root"
  PASSED_TESTS+=("package.json location")
else
  echo "  ✗ package.json NOT at root"
  FAILED_TESTS+=("package.json location")
fi
echo ""

# Test 5: .gitignore should include SvelteKit artifacts
echo "Test 5: Checking .gitignore for SvelteKit artifacts..."
if grep -q ".svelte-kit" .gitignore && grep -q "build/" .gitignore; then
  echo "  ✓ .gitignore includes SvelteKit artifacts"
  PASSED_TESTS+=(".gitignore update")
else
  echo "  ✗ .gitignore missing SvelteKit artifacts"
  FAILED_TESTS+=(".gitignore update")
fi
echo ""

# Test 6: CLAUDE.md should reference SvelteKit
echo "Test 6: Checking CLAUDE.md for SvelteKit documentation..."
if grep -q "SvelteKit" CLAUDE.md && grep -q "Drizzle" CLAUDE.md; then
  echo "  ✓ CLAUDE.md documents SvelteKit architecture"
  PASSED_TESTS+=("CLAUDE.md update")
else
  echo "  ✗ CLAUDE.md missing SvelteKit documentation"
  FAILED_TESTS+=("CLAUDE.md update")
fi
echo ""

# Test 7: README.md should have updated setup instructions
echo "Test 7: Checking README.md for updated instructions..."
if grep -q "npm install" README.md && grep -q "npm run dev" README.md; then
  echo "  ✓ README.md has setup instructions"
  PASSED_TESTS+=("README.md update")
else
  echo "  ✗ README.md missing setup instructions"
  FAILED_TESTS+=("README.md update")
fi
echo ""

# Test 8: Package scripts should be correct
echo "Test 8: Checking package.json scripts..."
if [ -f "package.json" ]; then
  if grep -q '"dev".*"vite' package.json && grep -q '"build".*"vite build"' package.json; then
    echo "  ✓ package.json has correct scripts"
    PASSED_TESTS+=("package.json scripts")
  else
    echo "  ✗ package.json scripts incorrect"
    FAILED_TESTS+=("package.json scripts")
  fi
fi
echo ""

# Test 9: CLAUDE.md should have migration history section
echo "Test 9: Checking for migration history documentation..."
if grep -q "Migration History" CLAUDE.md; then
  echo "  ✓ Migration history documented"
  PASSED_TESTS+=("Migration history")
else
  echo "  ✗ Migration history missing"
  FAILED_TESTS+=("Migration history")
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Passed: ${#PASSED_TESTS[@]}"
echo "Failed: ${#FAILED_TESTS[@]}"
echo ""

if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
  echo "✓ ALL TESTS PASSED"
  exit 0
else
  echo "✗ SOME TESTS FAILED:"
  for test in "${FAILED_TESTS[@]}"; do
    echo "  - $test"
  done
  exit 1
fi
