#!/usr/bin/env bash
#
# snapshot-linear.sh — dump a Linear project's issues into a greppable markdown archive.
#
# Point-in-time, read-only. Nothing in Linear is modified. Written for the migration off
# Linear: run it before archiving the project so every issue's content survives in the repo,
# on every machine, without a network call. Safe to re-run — it overwrites the output file.
#
# Usage:
#   scripts/snapshot-linear.sh                                  # default project → default file
#   scripts/snapshot-linear.sh "MTG Deck Shuffler"              # named project → default file
#   scripts/snapshot-linear.sh "MTG Deck Shuffler" notes/x.md   # named project → given file
#
# Requires: LINEAR_API_KEY (a personal API key from Linear → Settings → Security & access →
# Personal API keys). Put it in the repo-root .be, which is sourced on cd into the repo.
# Also needs curl and jq.

set -u
set -o pipefail

PROJECT_NAME="${1:-MTG Deck Shuffler}"
OUTFILE="${2:-notes/linear-archive.md}"
API="${LINEAR_API_URL:-https://api.linear.app/graphql}"   # overridable so the renderer can be tested offline
PAGE_SIZE=50

die() { printf '%s\n' "$*" >&2; exit 1; }

[ -n "${LINEAR_API_KEY:-}" ] || die "snapshot-linear.sh: LINEAR_API_KEY is not set.
Create a personal API key at Linear → Settings → Security & access → Personal API keys,
add it to the repo-root .be as LINEAR_API_KEY=..., then re-source .be (cd out and back in)."
command -v jq >/dev/null 2>&1 || die "snapshot-linear.sh: jq not found (brew install jq)."
command -v curl >/dev/null 2>&1 || die "snapshot-linear.sh: curl not found."

# Run one GraphQL query. Args: query, variables-json. Fails loudly on transport or GraphQL errors.
gql() {
  local query="$1" vars="$2" body response
  body=$(jq -nc --arg q "$query" --argjson v "$vars" '{query: $q, variables: $v}') \
    || die "snapshot-linear.sh: could not build the request body."
  response=$(curl -sS -X POST "$API" \
    -H "Authorization: ${LINEAR_API_KEY}" \
    -H "Content-Type: application/json" \
    --data "$body") || die "snapshot-linear.sh: request to Linear failed."
  if printf '%s' "$response" | jq -e '.errors' >/dev/null 2>&1; then
    die "snapshot-linear.sh: Linear returned errors:
$(printf '%s' "$response" | jq -r '.errors[]?.message')"
  fi
  printf '%s' "$response"
}

# --- find the project -------------------------------------------------------

PROJECT_QUERY='query($name: String!) {
  projects(filter: { name: { eq: $name } }, first: 2) {
    nodes { id name url }
  }
}'

project_json=$(gql "$PROJECT_QUERY" "$(jq -nc --arg n "$PROJECT_NAME" '{name: $n}')")
project_count=$(printf '%s' "$project_json" | jq '.data.projects.nodes | length')

[ "$project_count" -ge 1 ] || die "snapshot-linear.sh: no Linear project named \"$PROJECT_NAME\"."
[ "$project_count" -eq 1 ] || die "snapshot-linear.sh: more than one project named \"$PROJECT_NAME\"; rename or pass an exact name."

PROJECT_ID=$(printf '%s' "$project_json" | jq -r '.data.projects.nodes[0].id')
PROJECT_URL=$(printf '%s' "$project_json" | jq -r '.data.projects.nodes[0].url')

# --- page through its issues ------------------------------------------------

ISSUES_QUERY='query($id: String!, $first: Int!, $after: String) {
  project(id: $id) {
    issues(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        identifier
        title
        url
        priority
        priorityLabel
        createdAt
        updatedAt
        completedAt
        state { name type }
        projectMilestone { name }
        parent { identifier }
        labels { nodes { name } }
        relations { nodes { type relatedIssue { identifier } } }
        inverseRelations { nodes { type issue { identifier } } }
        description
      }
    }
  }
}'

tmp=$(mktemp -t linear-snapshot) || die "snapshot-linear.sh: could not create a temp file."
trap 'rm -f "$tmp" "$tmp.md"' EXIT

after=null
page=0
total=0
while : ; do
  page=$((page + 1))
  vars=$(jq -nc --arg id "$PROJECT_ID" --argjson first "$PAGE_SIZE" --argjson after "$after" \
    '{id: $id, first: $first, after: $after}')
  resp=$(gql "$ISSUES_QUERY" "$vars")

  count=$(printf '%s' "$resp" | jq '.data.project.issues.nodes | length')
  total=$((total + count))
  printf '%s' "$resp" | jq -c '.data.project.issues.nodes[]' >> "$tmp"
  printf 'page %d: %d issues\n' "$page" "$count" >&2

  if [ "$(printf '%s' "$resp" | jq -r '.data.project.issues.pageInfo.hasNextPage')" = "true" ]; then
    after=$(printf '%s' "$resp" | jq '.data.project.issues.pageInfo.endCursor')
  else
    break
  fi
done

# --- render ------------------------------------------------------------------

mkdir -p "$(dirname "$OUTFILE")"

# Render the issue bodies first, into their own file. If jq fails, we must NOT go on to write a
# half-empty archive over a good one — this is the last copy of the content before Linear is
# archived, so a silent truncation here is the expensive failure.
rendered="$tmp.md"
jq -r '
  def fld(name; value): if (value // "") == "" then empty else "- **" + name + ":** " + value end;

  "## " + .identifier + " — " + .title,
  "",
  "- **URL:** " + .url,
  "- **State:** " + (.state.name // "unknown") + " (" + (.state.type // "?") + ")",
  (fld("Milestone"; .projectMilestone.name)),
  (fld("Priority"; .priorityLabel)),
  (fld("Parent"; .parent.identifier)),
  (fld("Labels"; (.labels.nodes // [] | map(.name) | join(", ")))),
  (fld("Relations";
       (((.relations.nodes // []) | map(.type + " → " + (.relatedIssue.identifier // "?")))
        + ((.inverseRelations.nodes // []) | map("inverse " + .type + " ← " + (.issue.identifier // "?"))))
       | join(", "))),
  (fld("Created"; (.createdAt // "" | split("T")[0]))),
  (fld("Completed"; (.completedAt // "" | split("T")[0]))),
  "",
  (if (.description // "") == "" then "_No description._" else .description end),
  "",
  "---",
  ""
' "$tmp" > "$rendered" || die "snapshot-linear.sh: rendering failed; $OUTFILE left untouched."

{
  printf '# Linear archive — %s\n\n' "$PROJECT_NAME"
  printf 'Point-in-time snapshot of every issue in [%s](%s), taken %s by `scripts/snapshot-linear.sh`.\n\n' \
    "$PROJECT_NAME" "$PROJECT_URL" "$(date -u '+%Y-%m-%d')"
  printf 'This is an **archive, not a tracker** — nothing here is live and nothing here is worked.\n'
  printf 'It exists so the content survives archiving the Linear project, greppable offline and on\n'
  printf 'every machine. Live work is in `TODO.md` (inbox) and the tracker named in `SEAMAP.md`.\n\n'
  printf '%d issues.\n\n---\n\n' "$total"
  cat "$rendered"
} > "$OUTFILE"

printf 'Wrote %d issues to %s\n' "$total" "$OUTFILE"
