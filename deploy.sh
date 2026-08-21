#!/bin/bash
# Deploy the whole fleet: Spine, then Shuffler, then Tabletop.
#
#   ./deploy.sh
#
# Each ship has its own deploy.sh (services/spine, apps/shuffler,
# apps/tabletop) — this just runs all three in order and stops at the
# first failure, so a broken ship doesn't leave the others half-deployed
# behind it. Spine goes first since the other two talk to it.

set -e
cd "$(dirname "$0")"

deploy_ship() {
  local label="$1" dir="$2"
  echo ""
  echo "══════════════════════════════════════════════════"
  echo "🚢 deploying $label"
  echo "══════════════════════════════════════════════════"
  (cd "$dir" && ./deploy.sh)
}

deploy_ship "spine"    services/spine
deploy_ship "shuffler" apps/shuffler
deploy_ship "tabletop" apps/tabletop

echo ""
echo "══════════════════════════════════════════════════"
echo "⛵ the fleet is deployed"
echo "══════════════════════════════════════════════════"
