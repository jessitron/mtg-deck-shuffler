#!/usr/bin/env bash
# Post a deploy marker to Honeycomb, so deploys show up as lines on graphs.
#
# Usage (from a ship's deploy.sh, AFTER rollout succeeded):
#     "$REPO_ROOT/scripts/deploy-marker.sh" shuffler
#
# Adapted from ../mtg-sparrow/scripts/deploy-marker.sh. Two changes for this fleet:
#
#  1. The marker names the SHIP. One repo deploys three things, so "deploy <sha>" alone
#     wouldn't say which of them moved.
#  2. It verifies the key's environment before posting. Markers are environment-scoped and
#     a marker in the wrong environment fails silently -- it succeeds, just somewhere you
#     won't look. See notes/AGENT-NOTES.md on silent-success bugs; we've had enough.
#
# Best-effort by design: the deploy has already happened by the time this runs, so nothing
# here should fail the deploy. Exits non-zero on trouble; callers warn and carry on.
#
# NOT the ingest key. `HONEYCOMB_API_KEY` in .be is the `local` environment's ingest key
# and has only createDatasets access, so it cannot write markers and would target the wrong
# environment anyway. This needs a key for the PROD environment with Markers access.
set -uo pipefail

SHIP="${1:-}"
EXPECTED_ENV="${2:-mtg-deck-shuffler}"

if [ -z "$SHIP" ]; then
    echo "usage: deploy-marker.sh <ship-name> [expected-environment]" >&2
    exit 2
fi

if [ -z "${HONEYCOMB_MARKER_KEY:-}" ]; then
    echo "⚠️  No deploy marker: HONEYCOMB_MARKER_KEY not set."
    echo "   Add a key for the '${EXPECTED_ENV}' environment with Markers access to the"
    echo "   repo-root .be:  export HONEYCOMB_MARKER_KEY=..."
    echo "   (HONEYCOMB_API_KEY is the 'local' ingest key -- it can't write markers.)"
    exit 1
fi

# Confirm the key points where we think it does before writing anything.
AUTH="$(curl -sS --max-time 10 https://api.honeycomb.io/1/auth \
    -H "X-Honeycomb-Team: $HONEYCOMB_MARKER_KEY" 2>/dev/null)"
KEY_ENV="$(printf '%s' "$AUTH" | node -e \
    'const s=require("fs").readFileSync(0,"utf8");try{process.stdout.write(String(JSON.parse(s).environment?.slug??""))}catch{}' 2>/dev/null)"

if [ -z "$KEY_ENV" ]; then
    echo "⚠️  No deploy marker: HONEYCOMB_MARKER_KEY was rejected by Honeycomb."
    exit 1
fi
if [ "$KEY_ENV" != "$EXPECTED_ENV" ]; then
    echo "⚠️  No deploy marker: HONEYCOMB_MARKER_KEY is for environment '${KEY_ENV}',"
    echo "   but this deploy targets '${EXPECTED_ENV}'. Refusing to mark the wrong environment."
    exit 1
fi

SHA="$(git rev-parse HEAD)"
SHORT_SHA="$(git rev-parse --short HEAD)"
REPO_URL="$(git remote get-url origin 2>/dev/null | sed 's/\.git$//' | sed 's|git@github.com:|https://github.com/|')"

RESPONSE="$(curl -sS --max-time 10 -w '\n%{http_code}' \
    -X POST "https://api.honeycomb.io/1/markers/__all__" \
    -H "X-Honeycomb-Team: $HONEYCOMB_MARKER_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"deploy ${SHIP} ${SHORT_SHA}\", \"type\": \"deploy\", \"url\": \"${REPO_URL}/commit/${SHA}\"}" 2>/dev/null)"
STATUS="$(printf '%s' "$RESPONSE" | tail -n1)"

if [ "$STATUS" != "200" ] && [ "$STATUS" != "201" ]; then
    echo "⚠️  Deploy marker failed (HTTP ${STATUS:-none}). The deploy itself is fine."
    printf '%s\n' "$RESPONSE" | head -n1
    exit 1
fi

echo "🔖 Honeycomb marker: deploy ${SHIP} ${SHORT_SHA} (environment ${KEY_ENV})"
