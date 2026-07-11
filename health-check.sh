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

# Check 2: Lint (target src/ directly — whole-tree `eslint .` can starve for
# CPU on overloaded hosts; src/ is the only source that matters and finishes
# instantly even under heavy load)
echo "🔧 Running linter..."
LINT_OUTPUT=$(npx eslint src/ 2>&1)
LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep -oP '\d+(?= errors)' || echo "0")
if [ "$LINT_ERRORS" -gt "0" ]; then
    echo "❌ Lint failed with $LINT_ERRORS errors"
    echo "$LINT_OUTPUT" | tail -20
    exit 1
fi
echo "✅ Lint passed (0 errors)"
echo ""

# Check 3: Build (run in isolation; under heavy host load vite can be CPU-
# starved, so each attempt is bounded by a timeout and retried a few times
# with backoff. A transient throttle minute won't trip a false "broken"
# alert, but a genuinely broken build still fails loudly after the retries.)
echo "🏗️  Running build..."
BUILD_OK=0
for attempt in 1 2 3; do
    if BUILD_OUTPUT=$(timeout 120 npm run build 2>&1); then
        BUILD_OK=1
        break
    fi
    echo "  ↻ build attempt $attempt timed out under host load, retrying in 10s..."
    sleep 10
done
if [ "$BUILD_OK" -ne 1 ]; then
    echo "❌ Build failed or timed out after 3 attempts (120s each)"
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
