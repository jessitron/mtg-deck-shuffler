#!/bin/bash

# Run Tabletop verification tests with server lifecycle management, mirroring
# apps/shuffler/verify.sh: build, start on port 5183, run Playwright, shut down.

set -e

# Epoch MILLIS — see apps/shuffler/verify.sh for why: no cheap sub-second
# clock in bash on macOS, and millis is what OTel reads a bare number as.
now_ms() {
    node -e 'console.log(Date.now())'
}

# Phase boundaries for the harness spans. The reporter turns these into
# `verify build` and `verify server boot` spans.
VERIFY_SCRIPT_START_MS=$(now_ms)
VERIFY_RUN_ID=$(node -e 'console.log(crypto.randomUUID())')
VERIFY_GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Building tabletop...${NC}"
VERIFY_BUILD_START_MS=$(now_ms)
npm run build
VERIFY_BUILD_END_MS=$(now_ms)

# Source .be BEFORE .env: .env's OTEL_EXPORTER_OTLP_HEADERS interpolates
# $HONEYCOMB_API_KEY at source time; wrong order => telemetry silently 401s.
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ../..)"
for candidate in .be "$REPO_ROOT/.be"; do
    if [ -f "$candidate" ]; then
        source "$candidate"
        break
    fi
done
if [ -f .env ]; then
    source .env
fi

echo -e "${YELLOW}Starting tabletop server on port 5183...${NC}"
# Verification specs seed cards via the test-only /test/tables/:tableSlug/cards route
# (helpers.ts, and several specs directly) — never mounted without this.
VERIFY_SERVER_START_MS=$(now_ms)
PORT=5183 ENABLE_TEST_SEED_ROUTE=true node --import ./dist/server/tracing.js dist/server/server.js &
SERVER_PID=$!

cleanup() {
    if [ -n "$SERVER_PID" ]; then
        echo -e "${YELLOW}Shutting down server (PID: $SERVER_PID)...${NC}"
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

echo -e "${YELLOW}Waiting for server to be ready...${NC}"
for i in {1..20}; do
    if curl -s http://localhost:5183/health > /dev/null 2>&1; then
        VERIFY_SERVER_READY_MS=$(now_ms)
        echo -e "${GREEN}Server is ready!${NC}"
        break
    fi
    if [ $i -eq 20 ]; then
        echo -e "${RED}Server failed to start within 10 seconds${NC}"
        exit 1
    fi
    sleep 0.5
done

echo -e "${YELLOW}Running verification tests...${NC}"
echo -e "${YELLOW}Verify run id: $VERIFY_RUN_ID${NC}"
# Any arguments are passed through to Playwright, e.g. ./verify.sh verify-tap-animation
#
# set -e is off around this one command for the same reason as the Shuffler's
# verify.sh: otherwise a nonzero exit would abort the script before
# TEST_EXIT_CODE=$? below ever runs.
set +e
VERIFY_RUN_ID="$VERIFY_RUN_ID" \
    VERIFY_SHIP=tabletop \
    VERIFY_GIT_SHA="$VERIFY_GIT_SHA" \
    VERIFY_SCRIPT_START_MS="$VERIFY_SCRIPT_START_MS" \
    VERIFY_BUILD_START_MS="$VERIFY_BUILD_START_MS" \
    VERIFY_BUILD_END_MS="$VERIFY_BUILD_END_MS" \
    VERIFY_SERVER_START_MS="$VERIFY_SERVER_START_MS" \
    VERIFY_SERVER_READY_MS="$VERIFY_SERVER_READY_MS" \
    npx playwright test "$@"
TEST_EXIT_CODE=$?
set -e

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}Verification tests passed!${NC}"
else
    echo -e "${RED}Verification tests failed!${NC}"
fi

exit $TEST_EXIT_CODE
