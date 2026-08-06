#!/usr/bin/env bash
#
# One-time verification of scripts/snapshot-linear.sh against a fake Linear API.
# Proves: pagination across pages, and that the jq renderer produces sane markdown
# for a full issue, a bare issue, and one with relations. Deleted after it passes;
# the evidence lives in git history alongside test-snapshot-linear.out.

set -u
set -o pipefail

cd "$(dirname "$0")/.." || exit 1
work=$(mktemp -d) || exit 1
trap 'rm -rf "$work"; kill "${server_pid:-}" 2>/dev/null' EXIT

cat > "$work/fake_linear.py" <<'PY'
import json, sys
from http.server import BaseHTTPRequestHandler, HTTPServer

PROJECT = {"data": {"projects": {"nodes": [
    {"id": "proj-1", "name": "MTG Deck Shuffler",
     "url": "https://linear.app/honeycombio/project/fake"}]}}}

def issue(ident, title, **kw):
    base = {
        "identifier": ident, "title": title,
        "url": f"https://linear.app/honeycombio/issue/{ident}",
        "priority": 2, "priorityLabel": "High",
        "createdAt": "2026-07-01T10:00:00.000Z",
        "updatedAt": "2026-07-02T10:00:00.000Z",
        "completedAt": None,
        "state": {"name": "Todo", "type": "unstarted"},
        "projectMilestone": {"name": "The Tabletop replaces Mural"},
        "parent": None,
        "labels": {"nodes": [{"name": "tabletop"}]},
        "relations": {"nodes": []},
        "inverseRelations": {"nodes": []},
        "description": "Body text.\n\nSecond paragraph.",
    }
    base.update(kw)
    return base

PAGES = [
    {"nodes": [
        issue("JES-149", "Card zone-entry events"),
        issue("JES-144", "Rotate cards",
              relations={"nodes": [{"type": "blocks",
                                    "relatedIssue": {"identifier": "JES-145"}}]},
              inverseRelations={"nodes": [{"type": "blocks",
                                           "issue": {"identifier": "JES-140"}}]}),
     ], "pageInfo": {"hasNextPage": True, "endCursor": "cursor-1"}},
    {"nodes": [
        issue("JES-151", "Persistence", description="", projectMilestone=None,
              priorityLabel="", labels={"nodes": []},
              completedAt="2026-07-20T09:00:00.000Z",
              state={"name": "Done", "type": "completed"}),
     ], "pageInfo": {"hasNextPage": False, "endCursor": None}},
]

class H(BaseHTTPRequestHandler):
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        if "projects(" in body["query"]:
            out = PROJECT
        else:
            after = body["variables"].get("after")
            out = {"data": {"project": {"issues": PAGES[0 if after is None else 1]}}}
        raw = json.dumps(out).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)
    def log_message(self, *a):
        pass

HTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
PY

port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')
python3 "$work/fake_linear.py" "$port" &
server_pid=$!

# wait for the fake API to accept connections
for _ in $(seq 1 50); do
  python3 -c "import socket,sys; s=socket.socket(); sys.exit(0 if s.connect_ex(('127.0.0.1',$port))==0 else 1)" && break
  sleep 0.1
done

echo "=== run against the fake API ==="
LINEAR_API_KEY=fake-key LINEAR_API_URL="http://127.0.0.1:$port" \
  scripts/snapshot-linear.sh "MTG Deck Shuffler" "$work/archive.md"
status=$?
echo "exit=$status"

echo
echo "=== generated archive ==="
cat "$work/archive.md"

echo
echo "=== assertions ==="
fail=0
check() {
  if grep -q "$2" "$work/archive.md"; then echo "PASS  $1"; else echo "FAIL  $1"; fail=1; fi
}
check "paginated: page-2 issue present"      "## JES-151 — Persistence"
check "page-1 issue present"                 "## JES-149 — Card zone-entry events"
check "issue count is 3"                     "^3 issues\.$"
check "milestone rendered"                   "Milestone:\*\* The Tabletop replaces Mural"
check "relations rendered"                   "blocks → JES-145"
check "inverse relations rendered"           "inverse blocks ← JES-140"
check "completed date rendered"              "Completed:\*\* 2026-07-20"
check "empty description handled"            "_No description\._"
grep -q "Milestone:\*\* null" "$work/archive.md" && { echo "FAIL  absent milestone leaked 'null'"; fail=1; } \
  || echo "PASS  absent milestone omitted, not 'null'"
grep -q "Priority:\*\* $" "$work/archive.md" && { echo "FAIL  empty priority left a blank field"; fail=1; } \
  || echo "PASS  empty priority omitted"

echo
[ "$fail" -eq 0 ] && echo "ALL PASS" || echo "FAILURES PRESENT"
exit "$fail"
