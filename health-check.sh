#!/bin/bash
# Project Health Check Script for Solid Timesheets
# Run this periodically to detect regressions

set -e

echo "🔍 Running project health checks..."
echo ""

# Check 1: Dependencies installed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules not found - run 'npm install'"
    exit 1
fi
echo "✅ Dependencies installed"
echo ""

# Check 2: Lint
echo "🔧 Running linter..."
LINT_OUTPUT=$(npm run lint 2>&1)
LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep -oP '\d+(?= errors)' || echo "0")
if [ "$LINT_ERRORS" -gt "0" ]; then
    echo "❌ Lint failed with $LINT_ERRORS errors"
    echo "$LINT_OUTPUT" | tail -20
    exit 1
fi
echo "✅ Lint passed (0 errors)"
echo ""

# Check 3: Build
echo "🏗️  Running build..."
BUILD_OUTPUT=$(npm run build 2>&1)
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    echo "$BUILD_OUTPUT" | tail -30
    exit 1
fi
echo "✅ Build successful"
echo ""

# Check 4: Git status (optional warning)
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: Uncommitted changes detected"
    git status --short
else
    echo "✅ Working tree clean"
fi
echo ""

echo "✅ All health checks passed!"
echo "📊 Project is in a healthy state"
