#!/bin/bash

# Verify the LIVE Trainer wiring (INTERFACE.md v2.0) end-to-end, without the real
# agent or AWS. This script:
# 1. Starts the official front-door stub (start-frontdoor-stub.sh) on :8099 — it
#    speaks the real v2.0 contract (bearer, session_id >= 33, version header, seq
#    lost-session check) and returns canned replies driven by the message text.
# 2. Starts the app on port 3001 with TRAINER_AGENT_URL pointed at the stub.
# 3. Runs the Trainer PR-link verification spec.
# 4. Shuts both down and returns the test exit code.

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

FRONTDOOR_PORT=8099

echo -e "${YELLOW}Building app...${NC}"
npm run build

# Source .be then .env for OTEL config (non-fatal: this local stub check needs
# no telemetry, so a hiccup sourcing personal env files shouldn't abort the run).
set +e
[ -f .be ] && source .be
[ -f .env ] && source .env
set -e

LOG_DIR=$(mktemp -d)
echo -e "${YELLOW}Logs: $LOG_DIR${NC}"

echo -e "${YELLOW}Starting front-door stub on port $FRONTDOOR_PORT...${NC}"
TRAINER_AGENT_TOKEN=test-token ./start-frontdoor-stub.sh "$FRONTDOOR_PORT"

echo -e "${YELLOW}Starting app on port 3001 (wired to the stub)...${NC}"
TRAINER_AGENT_URL="http://localhost:$FRONTDOOR_PORT/" \
TRAINER_AGENT_TOKEN=test-token \
PORT_PERSIST_STATE=in-memory \
PORT=3001 node --import ./dist/tracing.js dist/server.js > "$LOG_DIR/app.log" 2>&1 &
SERVER_PID=$!

cleanup() {
    [ -n "$SERVER_PID" ] && kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
    docker rm -f "trainer-frontdoor-stub-$FRONTDOOR_PORT" >/dev/null 2>&1 || true
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
    echo -e "${YELLOW}--- stub (docker) ---${NC}"; docker logs "trainer-frontdoor-stub-$FRONTDOOR_PORT" 2>&1 | tail -20 || true
    echo -e "${YELLOW}--- app (trainer lines) ---${NC}"; grep -i "trainer\|advisor\|error" "$LOG_DIR/app.log" | tail -30 || true
fi

exit $TEST_EXIT_CODE
