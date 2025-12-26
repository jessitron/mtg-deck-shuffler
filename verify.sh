#!/bin/bash

# Run verification tests with server lifecycle management
# This script:
# 1. Starts the app on port 3001
# 2. Waits for the server to be ready
# 3. Runs Playwright verification tests
# 4. Shuts down the server
# 5. Returns the test exit code

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Build the app first
echo -e "${YELLOW}Building app...${NC}"
npm run build

# Source .env file if it exists
if [ -f .env ]; then
    source .env
fi

# Start server on port 3001 in the background
echo -e "${YELLOW}Starting server on port 3001...${NC}"
PORT=3001 node -r ./dist/tracing.js dist/server.js &
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

# Run Playwright tests
echo -e "${YELLOW}Running verification tests...${NC}"
npx playwright test

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
