#!/bin/bash
# Safety net for a fleet ./run that didn't exit cleanly (e.g. Ctrl-C landed
# mid-build and dodged the trap). Kills anything bound to the fleet's local
# ports, then sweeps any leftover ./run process trees under this repo.
#
# Usage: scripts/kill-fleet.sh
#
# Ports: Shuffler 3344, Tabletop 5180, Spine 4600 (see ./run at repo root).

set -u
cd "$(dirname "$0")/.."

PORTS=(3344 5180 4600)

echo "🔪 killing anything on ports: ${PORTS[*]}"
for port in "${PORTS[@]}"; do
  pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  for pid in $pids; do
    echo "  port $port -> pid $pid ($(ps -o command= -p "$pid" 2>/dev/null | head -c 80))"
    kill "$pid" 2>/dev/null || true
  done
done

echo "🔪 sweeping leftover ./run processes under this repo"
REPO_ROOT="$(pwd)"
ps -eo pid,command | grep -F './run' | grep -v grep | while read -r pid _rest; do
  cwd=$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')
  if [[ "$cwd" == "$REPO_ROOT"* ]]; then
    echo "  pid $pid (cwd $cwd)"
    kill "$pid" 2>/dev/null || true
  fi
done

sleep 1

echo "🔪 escalating to SIGKILL for anything still holding those ports"
for port in "${PORTS[@]}"; do
  pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  for pid in $pids; do
    echo "  port $port -> pid $pid still up, SIGKILL"
    kill -9 "$pid" 2>/dev/null || true
  done
done

echo "✅ done"
