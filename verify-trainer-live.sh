#!/bin/bash

# Verify the LIVE Trainer wiring (INTERFACE.md v1.0) end-to-end, without the real
# agent or AWS. This script:
# 1. Starts a fake Trainer front door (test/verification/fake-frontdoor.mjs) on :8099
#    that returns {status: "done", pr_url}
# 2. Starts the app on port 3001 with TRAINER_AGENT_URL pointed at the fake door
# 3. Runs the Trainer PR-link verification spec
# 4. Shuts both down and returns the test exit code

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Building app...${NC}"
npm run build

# Source .be then .env for OTEL config (non-fatal: this local fake-door check needs
# no telemetry, so a hiccup sourcing personal env files shouldn't abort the run).
set +e
[ -f .be ] && source .be
[ -f .env ] && source .env
set -e

LOG_DIR=$(mktemp -d)
echo -e "${YELLOW}Logs: $LOG_DIR${NC}"

echo -e "${YELLOW}Starting fake Trainer front door on port 8099...${NC}"
PORT=8099 node test/verification/fake-frontdoor.mjs > "$LOG_DIR/frontdoor.log" 2>&1 &
FRONTDOOR_PID=$!

echo -e "${YELLOW}Starting app on port 3001 (wired to the fake front door)...${NC}"
TRAINER_AGENT_URL=http://localhost:8099/ \
TRAINER_AGENT_TOKEN=test-token \
PORT_PERSIST_STATE=in-memory \
PORT=3001 node --import ./dist/tracing.js dist/server.js > "$LOG_DIR/app.log" 2>&1 &
SERVER_PID=$!

cleanup() {
    [ -n "$SERVER_PID" ] && kill $SERVER_PID 2>/dev/null || true
    [ -n "$FRONTDOOR_PID" ] && kill $FRONTDOOR_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
    wait $FRONTDOOR_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo -e "${YELLOW}Waiting for server to be ready...${NC}"
for i in {1..20}; do
    if curl -s http://localhost:3001/ > /dev/null 2>&1; then
        echo -e "${GREEN}Server is ready!${NC}"
        break
    fi
    if [ $i -eq 20 ]; then
        echo -e "${RED}Server failed to start within 10 seconds${NC}"
        exit 1
    fi
    sleep 0.5
done

echo -e "${YELLOW}Running Trainer PR-link verification...${NC}"
set +e
TRAINER_LIVE_VERIFY=1 npx playwright test test/verification/verify-trainer-pr-link.spec.ts
TEST_EXIT_CODE=$?
set -e

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}Live Trainer wiring verified!${NC}"
else
    echo -e "${RED}Live Trainer verification failed! Logs:${NC}"
    echo -e "${YELLOW}--- front door ---${NC}"; cat "$LOG_DIR/frontdoor.log" || true
    echo -e "${YELLOW}--- app (trainer lines) ---${NC}"; grep -i "trainer\|advisor\|error" "$LOG_DIR/app.log" | tail -30 || true
fi

exit $TEST_EXIT_CODE
