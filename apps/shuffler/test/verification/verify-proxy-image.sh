#!/usr/bin/env bash
# Verify /proxy-image actually returns card images (JES-136).
#
# The bug this guards: Node's default `User-Agent: node` gets a 400 from
# Scryfall's Cloudflare-fronted CDN, so every card copy failed even though the
# image URL was correct. A unit test can prove we SEND a User-Agent; only a real
# request to Scryfall proves the one we send is ACCEPTED. So this hits the live
# CDN through a real server. Needs network.
#
# Usage: test/verification/verify-proxy-image.sh   (from apps/shuffler/)
set -euo pipefail

PORT="${PORT:-3399}"
# "<scryfallId> <face>" pairs. The two front checks are Kindred Dominance and
# Scavenger Grounds — the exact cards that 400'd in the trace that opened this
# investigation. Both are single-faced, so neither has a back to ask for; the
# back check uses Archangel Avacyn, a real two-faced card, so the face=back path
# is covered too.
CHECKS=(
  "f6cd7c08-f5d4-4bdc-a254-809d900b0fc3 front"
  "9fbe68ba-ffe5-4fe0-ac0a-0b3221e4f395 front"
  "485211cd-6c9f-4fb6-99da-f876c55531b4 front"
  "485211cd-6c9f-4fb6-99da-f876c55531b4 back"
)

npm run build

PORT="$PORT" PORT_PERSIST_STATE=in-memory node dist/server.js &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
  curl -fsS "http://localhost:$PORT/health" >/dev/null 2>&1 && break
  sleep 0.5
done

failures=0
for check in "${CHECKS[@]}"; do
  read -r card_id face <<<"$check"
  url="http://localhost:$PORT/proxy-image?cardId=$card_id&face=$face"
  # Trailing \n matters: without it `read` hits EOF, returns 1, and `set -e` aborts.
  read -r status type size < <(curl -s -o /dev/null -w '%{http_code} %{content_type} %{size_download}\n' "$url")
  if [[ "$status" == "200" && "$type" == image/* && "$size" -gt 1000 ]]; then
    echo "PASS $card_id/$face -> $status $type ${size}B"
  else
    echo "FAIL $card_id/$face -> $status $type ${size}B"
    failures=$((failures + 1))
  fi
done

if [[ "$failures" -gt 0 ]]; then
  echo "$failures check(s) failed"
  exit 1
fi
echo "All /proxy-image checks passed"
