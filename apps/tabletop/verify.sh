#!/bin/bash

# Run Tabletop verification tests with server lifecycle management, mirroring
# apps/shuffler/verify.sh: build, start on port 5183, run Playwright, shut down.

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Building tabletop...${NC}"
npm run build

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
PORT=5183 node --import ./dist/server/tracing.js dist/server/server.js &
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
npx playwright test
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}Verification tests passed!${NC}"
else
    echo -e "${RED}Verification tests failed!${NC}"
fi

exit $TEST_EXIT_CODE
