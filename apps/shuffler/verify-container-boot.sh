#!/bin/bash

# Build the production image and confirm it BOOTS past the OpenTelemetry ESM loader
# hook (the import-in-the-middle `register(...)` in dist/tracing.js). Image
# 31aaa75 crashes here on Node 24.18.0 with ERR_INVALID_RETURN_PROPERTY_VALUE; this
# script is how we check whether a base-image (or dep) change fixes it, without
# touching prod. Reads the FROM lines straight from the Dockerfile, so just edit the
# Dockerfile and re-run.

set -euo pipefail

IMAGE_TAG="mtg-deck-shuffler-boottest"
CONTAINER_NAME="mtg-boottest"

echo "Base image(s) in Dockerfile:"
grep -nE "^FROM" Dockerfile

echo "Building $IMAGE_TAG (this compiles TS + native better-sqlite3)..."
# Build context is the repo root — the npm-workspaces lockfile lives there. See Dockerfile.
docker build -t "$IMAGE_TAG" -f Dockerfile ../..

docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
echo "Running the container (in-memory persistence, no real OTLP needed)..."
docker run -d --name "$CONTAINER_NAME" \
  -e PORT=3333 \
  -e PORT_PERSIST_STATE=in-memory \
  -e OTEL_SDK_DISABLED=false \
  "$IMAGE_TAG" >/dev/null

# Give it a few seconds to either boot or crashloop.
sleep 8
LOGS=$(docker logs "$CONTAINER_NAME" 2>&1 || true)
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

echo "----- container logs -----"
echo "$LOGS"
echo "--------------------------"

if echo "$LOGS" | grep -q "Server running"; then
  echo "BOOT OK — server started past the OTel ESM hook."
  exit 0
elif echo "$LOGS" | grep -q "ERR_INVALID_RETURN_PROPERTY_VALUE"; then
  echo "BOOT FAILED — still the import-in-the-middle ESM loader crash."
  exit 1
else
  echo "BOOT UNCLEAR — neither 'Server running' nor the known crash; inspect logs above."
  exit 2
fi
