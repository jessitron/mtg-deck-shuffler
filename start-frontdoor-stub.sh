#!/bin/bash

# Start (or reuse) the official Trainer front-door stub (INTERFACE.md v2.0) for
# local dev. Unlike a hand-rolled fake, this stub speaks the REAL v2.0 wire
# contract — bearer check, session_id >= 33 chars, interface-version header, and
# the `seq` lost-session check — so the local "Improve the Advisor" chat exercises
# the actual contract. Prod talks to the real front door via k8s; this is local-only.
#
# Idempotent: if a healthy stub is already answering on the port, it's reused.
# The container is left running across app restarts; stop it with:
#   docker rm -f trainer-frontdoor-stub
#
# Usage: ./start-frontdoor-stub.sh [port]   (default 8080, or $TRAINER_FRONTDOOR_PORT)

set -euo pipefail

PORT="${1:-${TRAINER_FRONTDOOR_PORT:-8080}}"
REGISTRY=414852377253.dkr.ecr.us-west-2.amazonaws.com
IMAGE="$REGISTRY/trainer-agent-frontdoor-stub:latest"
CONTAINER=trainer-frontdoor-stub
# The bearer the stub will require; the app must send the same as TRAINER_AGENT_TOKEN.
STUB_BEARER="${TRAINER_AGENT_TOKEN:-test-token}"

# Already healthy on this port? Reuse it.
if curl -sf "http://localhost:$PORT/ping" >/dev/null 2>&1; then
  echo "Trainer front-door stub already healthy on :$PORT"
  exit 0
fi

# Ensure the image is present (ECR login + pull only when missing).
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "Pulling front-door stub image (ECR login)..."
  aws ecr get-login-password --region us-west-2 \
    | docker login --username AWS --password-stdin "$REGISTRY" >/dev/null
  docker pull "$IMAGE" >/dev/null
fi

# Clear any stale container of the same name, then start fresh.
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" -p "$PORT:8080" -e STUB_BEARER="$STUB_BEARER" "$IMAGE" >/dev/null

# Wait for health.
for _ in $(seq 1 20); do
  if curl -sf "http://localhost:$PORT/ping" >/dev/null 2>&1; then
    echo "Trainer front-door stub up on :$PORT (v2.0 contract)"
    exit 0
  fi
  sleep 0.5
done

echo "Trainer front-door stub failed to become healthy on :$PORT" >&2
docker logs "$CONTAINER" 2>&1 | tail -20 >&2
exit 1
