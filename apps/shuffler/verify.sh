#!/bin/bash

# Run verification tests with server lifecycle management
# This script:
# 1. Starts the app on a random port (so concurrent runs in other worktrees
#    don't collide on a fixed port)
# 2. Waits for the server to be ready
# 3. Runs Playwright verification tests
# 4. Shuts down the server
# 5. Returns the test exit code

set -e

# Random high port per run. .env exports a fixed PORT (for ./run), but the
# inline `PORT=$VERIFY_PORT node ...` below overrides that for this process only.
VERIFY_PORT=$(( (RANDOM % 20000) + 20000 ))
BASE_URL="http://localhost:$VERIFY_PORT"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Build the app first
echo -e "${YELLOW}Building app...${NC}"
npm run build

# Source .be BEFORE .env: .env's OTEL_EXPORTER_OTLP_HEADERS interpolates
# $HONEYCOMB_API_KEY at source time, and that key is defined in .be. Wrong order
# (or no .be) => telemetry silently 401s ("unknown API key").
# .be lives at the repo root (it is sourced by a shell hook on cd into the repo),
# while this script runs from apps/shuffler/ — so look in both places.
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ..)"
for candidate in .be "$REPO_ROOT/.be"; do
    if [ -f "$candidate" ]; then
        source "$candidate"
        break
    fi
done
if [ -f .env ]; then
    source .env
fi

# Start server on the chosen port in the background
echo -e "${YELLOW}Starting server on port $VERIFY_PORT...${NC}"
PORT=$VERIFY_PORT node --import ./dist/tracing.js dist/server.js &
SERVER_PID=$!

# Function to cleanup server on exit
cleanup() {
    if [ -n "$SERVER_PID" ]; then
        echo -e "${YELLOW}Shutting down server (PID: $SERVER_PID)...${NC}"
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    fi
}

# Register cleanup function to run on script exit
trap cleanup EXIT INT TERM

# Wait for server to be ready (max 10 seconds)
echo -e "${YELLOW}Waiting for server to be ready...${NC}"
for i in {1..20}; do
    if curl -s "$BASE_URL/" > /dev/null 2>&1; then
        echo -e "${GREEN}Server is ready!${NC}"
        break
    fi
    if [ $i -eq 20 ]; then
        echo -e "${RED}Server failed to start within 10 seconds${NC}"
        exit 1
    fi
    sleep 0.5
done

# Run Playwright tests (pass through any args, e.g. ./verify.sh verify-design-gallery
# to run just one spec by name). BASE_URL tells playwright.config.ts and each spec
# which port this run's server is actually on.
echo -e "${YELLOW}Running verification tests...${NC}"
BASE_URL="$BASE_URL" npx playwright test "$@"

# Capture the exit code
TEST_EXIT_CODE=$?

# The cleanup function will run automatically due to the trap
# Return the test exit code
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}Verification tests passed!${NC}"
else
    echo -e "${RED}Verification tests failed!${NC}"
fi

exit $TEST_EXIT_CODE
