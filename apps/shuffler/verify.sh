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

# Epoch MILLIS. macOS ships bash 3.2 and BSD `date` has no %N, so there is no
# cheap sub-second clock in this script — node costs ~40ms per call, which is
# nothing against a 4-minute suite. Millis (not seconds, not nanos) is what OTel
# reads a bare number as; the reporter re-checks plausibility anyway.
now_ms() {
    node -e 'console.log(Date.now())'
}

# Phase boundaries for the harness spans. The reporter turns these into
# `verify build` and `verify server boot` spans — the parts of a run Playwright
# cannot see from the inside, and `npm run build` is a full tsc every time.
VERIFY_SCRIPT_START_MS=$(now_ms)
VERIFY_RUN_ID=$(node -e 'console.log(crypto.randomUUID())')
VERIFY_GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)

# Random high port per run. .env exports a fixed PORT (for ./run), but the
# inline `PORT=$VERIFY_PORT node ...` below overrides that for this process only.
VERIFY_PORT=$(( (RANDOM % 20000) + 20000 ))
BASE_URL="http://localhost:$VERIFY_PORT"
VERIFY_TABLETOP_PORT=$(( (RANDOM % 20000) + 40000 ))

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Build the app first
echo -e "${YELLOW}Building app...${NC}"
VERIFY_BUILD_START_MS=$(now_ms)
npm run build
VERIFY_BUILD_END_MS=$(now_ms)

# Source .be BEFORE .env: .env's OTEL_EXPORTER_OTLP_HEADERS interpolates
# $HONEYCOMB_API_KEY at source time, and that key is defined in .be. Wrong order
# (or no .be) => telemetry silently 401s ("unknown API key").
# .be lives at the repo root (it is sourced by a shell hook on cd into the repo),
# while this script runs from apps/shuffler/ — so look in both places.
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ..)"
FOUND_BE=""
for candidate in .be "$REPO_ROOT/.be"; do
    if [ -f "$candidate" ]; then
        source "$candidate"
        FOUND_BE="$candidate"
        break
    fi
done
# Say so rather than falling through in silence: without .be, .env still sets
# OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=" — present but keyless — and
# every telemetry export 401s. The reporter treats that as "telemetry off"
# rather than retrying all run, but the run is then unmeasured, so say it out loud.
if [ -z "$FOUND_BE" ]; then
    echo -e "${YELLOW}No .be found (looked in . and $REPO_ROOT) — telemetry will be off for this run${NC}"
fi
if [ -f .env ]; then
    source .env
fi

# The tabletop this run talks to gets its own random port, so a verification run
# never sees (or is seen by) the dev fleet's tabletop on the default 5180. Set
# AFTER .env so it wins. Two specs depend on it: verify-tabletop-integration
# spawns ITS OWN tabletop at this address, and verify-table-mode's
# send-then-commit case needs the address to be unreachable while it runs.
export TABLETOP_URL="http://localhost:$VERIFY_TABLETOP_PORT"
echo -e "${YELLOW}Tabletop address for this run: $TABLETOP_URL${NC}"

# Cold or warm? data.db is never reset between runs, and four identical runs once
# went 9.5 -> 5.4 -> 5.2 -> 3.6 minutes. So the suite has no single duration, and
# every timing number needs its condition attached to mean anything.
#
# This has to happen BEFORE the server starts, because the server creates data.db
# at boot and after that the question is unanswerable. Note the [ -f ] guard:
# `stat` on a missing file exits nonzero, and `set -e` would turn a
# telemetry-only addition into a hard verify failure on a fresh clone.
if [ -f data.db ]; then
    VERIFY_DATA_DB_EXISTED=true
    VERIFY_DATA_DB_BYTES=$(wc -c < data.db | tr -d ' ')
else
    VERIFY_DATA_DB_EXISTED=false
    VERIFY_DATA_DB_BYTES=0
fi

# Start server on the chosen port in the background
echo -e "${YELLOW}Starting server on port $VERIFY_PORT...${NC}"
VERIFY_SERVER_START_MS=$(now_ms)
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

# Run Playwright tests (pass through any args, e.g. ./verify.sh verify-design-gallery
# to run just one spec by name). BASE_URL tells playwright.config.ts and each spec
# which port this run's server is actually on.
#
# The VERIFY_* vars feed the OTel reporter (test/harness-telemetry/), which traces
# the SUITE — spec, test and step spans, plus the build and server-boot phases
# above. They are passed HERE, on this one command, and never `export`ed:
# `.env` already exports OTEL_SERVICE_NAME for the app server, and the harness
# gets its own service name (mtg-fleet-verify) from code, not from the
# environment. Exporting telemetry env after `.env` would rename the app server
# too and silently move its spans to another dataset — see
# test/harness-telemetry/harnessTracing.ts.
echo -e "${YELLOW}Running verification tests...${NC}"
echo -e "${YELLOW}Verify run id: $VERIFY_RUN_ID (data.db existed: $VERIFY_DATA_DB_EXISTED)${NC}"
BASE_URL="$BASE_URL" \
    VERIFY_RUN_ID="$VERIFY_RUN_ID" \
    VERIFY_SHIP=shuffler \
    VERIFY_GIT_SHA="$VERIFY_GIT_SHA" \
    VERIFY_SCRIPT_START_MS="$VERIFY_SCRIPT_START_MS" \
    VERIFY_BUILD_START_MS="$VERIFY_BUILD_START_MS" \
    VERIFY_BUILD_END_MS="$VERIFY_BUILD_END_MS" \
    VERIFY_SERVER_START_MS="$VERIFY_SERVER_START_MS" \
    VERIFY_SERVER_READY_MS="$VERIFY_SERVER_READY_MS" \
    VERIFY_DATA_DB_EXISTED="$VERIFY_DATA_DB_EXISTED" \
    VERIFY_DATA_DB_BYTES="$VERIFY_DATA_DB_BYTES" \
    npx playwright test "$@"

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
