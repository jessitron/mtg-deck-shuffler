#!/bin/bash
# Smoke-check that the fleet's shared palette actually reaches both ships.
#
# Both halves of this fail SILENTLY in a browser — CSS drops an unknown var()
# and a missing font falls back to a system serif — so the only way to know the
# plumbing works is to assert on it. This script is the fast local check; the
# real gates are the Playwright specs in each ship's verify suite.
#
# Usage: scripts/check-fleet-tokens.sh [shuffler-port] [tabletop-port]

set -u

SHUFFLER_PORT="${1:-3344}"
TABLETOP_PORT="${2:-5180}"
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
failures=0

check() {
  local label="$1" url="$2" needle="$3"
  local body
  body=$(curl -sf --max-time 5 "$url" 2>/dev/null)
  if [ -z "$body" ]; then
    echo -e "${RED}✗${NC} $label — could not fetch $url (is the server up?)"
    failures=$((failures + 1))
  elif echo "$body" | grep -q -- "$needle"; then
    echo -e "${GREEN}✓${NC} $label"
  else
    echo -e "${RED}✗${NC} $label — fetched $url but did not find '$needle'"
    failures=$((failures + 1))
  fi
}

echo -e "${YELLOW}Shuffler (:$SHUFFLER_PORT)${NC}"
check "serves the shared palette at /fleet/tokens.css" \
      "http://localhost:$SHUFFLER_PORT/fleet/tokens.css" "--deep-space"
check "site pages link it"  "http://localhost:$SHUFFLER_PORT/"  "/fleet/tokens.css"

echo -e "${YELLOW}Tabletop (:$TABLETOP_PORT)${NC}"
check "loads Orbitron" "http://localhost:$TABLETOP_PORT/" "family=Orbitron"

# The Tabletop inlines the tokens into its bundle, so assert on the built CSS
# rather than on a served path — there is no /fleet route on this ship.
tokens_css=$(curl -sf --max-time 5 "http://localhost:$TABLETOP_PORT/" 2>/dev/null \
  | grep -o '/assets/[^"]*\.css' | head -1)
if [ -n "$tokens_css" ]; then
  check "bundles the shared palette" "http://localhost:$TABLETOP_PORT$tokens_css" "221534"
else
  echo -e "${RED}✗${NC} Tabletop — could not find a stylesheet link on the page"
  failures=$((failures + 1))
fi

echo
if [ "$failures" -eq 0 ]; then
  echo -e "${GREEN}All token plumbing checks passed.${NC}"
else
  echo -e "${RED}$failures check(s) failed.${NC}"
fi
exit "$failures"
