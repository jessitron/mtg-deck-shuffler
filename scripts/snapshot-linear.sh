#!/usr/bin/env bash
#
# snapshot-linear.sh — dump Linear issues into a greppable markdown archive.
#
# Point-in-time, read-only. Nothing in Linear is modified. Written for the migration off
# Linear: run it before archiving the project so every issue's content survives in the repo,
# on every machine, without a network call. Safe to re-run — it overwrites the output file.
#
# Usage:
#   scripts/snapshot-linear.sh --repo jessitron "MTG Deck Shuffler"   # THIS REPO'S ISSUES
#   scripts/snapshot-linear.sh --repo jessitron "MTG Deck Shuffler" notes/x.md
#   scripts/snapshot-linear.sh --team jessitron                       # every issue in a team
#   scripts/snapshot-linear.sh "MTG Deck Shuffler"                    # one project's slice only
#   scripts/snapshot-linear.sh "MTG Deck Shuffler" notes/x.md
#
# USE --repo FOR A MIGRATION. The three scopes were learned the hard way against real data:
#
#   project  59 issues — misses the 9 Tabletop issues filed with no project at all (JES-144…154).
#            Under-collects silently, right when you're about to archive the source of truth.
#   team    155 issues — catches those 9, but drags in every other project on the team
#            (Personal task system, claude-log, …), which don't belong in this repo's archive.
#   repo     68 issues — this team's issues that are in this project OR in no project. The
#            shape an actual repo migration wants.
#
# Each issue records its project, or "(none)", so you can see which is which.
#
# Requires: LINEAR_API_KEY (a personal API key from Linear → Settings → Security & access →
# Personal API keys). Put it in the repo-root .be, which is sourced on cd into the repo.
# Also needs curl and jq.

set -u
set -o pipefail

MODE=project
TEAM_NAME=""
case "${1:-}" in
  --team)
    MODE=team
    [ $# -ge 2 ] || { printf 'snapshot-linear.sh: --team needs a team name.\n' >&2; exit 1; }
    SCOPE_NAME="$2"
    OUTFILE="${3:-notes/linear-archive.md}"
    ;;
  --repo)
    MODE=repo
    [ $# -ge 3 ] || { printf 'snapshot-linear.sh: --repo needs a team name and a project name.\n' >&2; exit 1; }
    TEAM_NAME="$2"
    SCOPE_NAME="$3"
    OUTFILE="${4:-notes/linear-archive.md}"
    ;;
  *)
    SCOPE_NAME="${1:-MTG Deck Shuffler}"
    OUTFILE="${2:-notes/linear-archive.md}"
    ;;
esac
API="${LINEAR_API_URL:-https://api.linear.app/graphql}"   # overridable so the renderer can be tested offline
PAGE_SIZE=20        # Linear rejects bigger pages here with "Query too complex"
NESTED_SIZE=20      # cap on each nested connection, for the same reason

die() { printf '%s\n' "$*" >&2; exit 1; }

[ -n "${LINEAR_API_KEY:-}" ] || die "snapshot-linear.sh: LINEAR_API_KEY is not set.
Create a personal API key at Linear → Settings → Security & access → Personal API keys,
add it to the repo-root .be as LINEAR_API_KEY=..., then re-source .be (cd out and back in)."
command -v jq >/dev/null 2>&1 || die "snapshot-linear.sh: jq not found (brew install jq)."
command -v curl >/dev/null 2>&1 || die "snapshot-linear.sh: curl not found."

# Run one GraphQL query. Args: query, variables-json. Fails loudly on transport or GraphQL errors.
#
# NOTE: this runs inside $(...) at every call site, so its `die` exits only the *subshell*.
# Every caller must therefore write `x=$(gql ...) || exit 1`. Without that the script keeps
# going on an empty response and cheerfully writes an empty archive — which is the one failure
# this script must never have, since it runs right before the source of truth is archived.
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

# --- the fields we archive for each issue ------------------------------------

NODE_FIELDS='
        identifier
        title
        url
        priority
        priorityLabel
        createdAt
        updatedAt
        completedAt
        state { name type }
        project { name }
        projectMilestone { name }
        parent { identifier }
        labels(first: $nested) { nodes { name } }
        relations(first: $nested) { nodes { type relatedIssue { identifier } } }
        inverseRelations(first: $nested) { nodes { type issue { identifier } } }
        description'

# --- resolve the scope --------------------------------------------------------

if [ "$MODE" = project ]; then
  PROJECT_QUERY='query($name: String!) {
    projects(filter: { name: { eq: $name } }, first: 2) {
      nodes { id name url }
    }
  }'

  project_json=$(gql "$PROJECT_QUERY" "$(jq -nc --arg n "$SCOPE_NAME" '{name: $n}')") || exit 1
  project_count=$(printf '%s' "$project_json" | jq '.data.projects.nodes | length')

  [ "$project_count" -ge 1 ] || die "snapshot-linear.sh: no Linear project named \"$SCOPE_NAME\"."
  [ "$project_count" -eq 1 ] || die "snapshot-linear.sh: more than one project named \"$SCOPE_NAME\"; rename or pass an exact name."

  SCOPE_ID=$(printf '%s' "$project_json" | jq -r '.data.projects.nodes[0].id')
  SCOPE_URL=$(printf '%s' "$project_json" | jq -r '.data.projects.nodes[0].url')
  SCOPE_LABEL="project \"$SCOPE_NAME\""
  NODES_PATH='.data.project.issues'

  ISSUES_QUERY="query(\$id: String!, \$first: Int!, \$after: String, \$nested: Int!) {
    project(id: \$id) {
      issues(first: \$first, after: \$after) {
        pageInfo { hasNextPage endCursor }
        nodes {$NODE_FIELDS
        }
      }
    }
  }"
elif [ "$MODE" = team ]; then
  SCOPE_ID=""
  SCOPE_LABEL="team \"$SCOPE_NAME\" (every issue, project or not)"
  NODES_PATH='.data.issues'

  ISSUES_QUERY="query(\$name: String!, \$first: Int!, \$after: String, \$nested: Int!) {
    issues(filter: { team: { name: { eq: \$name } } }, first: \$first, after: \$after) {
      pageInfo { hasNextPage endCursor }
      nodes {$NODE_FIELDS
      }
    }
  }"
else
  SCOPE_ID=""
  SCOPE_LABEL="team \"$TEAM_NAME\", project \"$SCOPE_NAME\" or no project"
  NODES_PATH='.data.issues'

  ISSUES_QUERY="query(\$team: String!, \$project: String!, \$first: Int!, \$after: String, \$nested: Int!) {
    issues(
      filter: {
        team: { name: { eq: \$team } }
        or: [
          { project: { name: { eq: \$project } } }
          { project: { null: true } }
        ]
      }
      first: \$first, after: \$after
    ) {
      pageInfo { hasNextPage endCursor }
      nodes {$NODE_FIELDS
      }
    }
  }"
fi

tmp=$(mktemp -t linear-snapshot) || die "snapshot-linear.sh: could not create a temp file."
trap 'rm -f "$tmp" "$tmp.md"' EXIT

after=null
page=0
total=0
while : ; do
  page=$((page + 1))
  case "$MODE" in
    project)
      vars=$(jq -nc --arg id "$SCOPE_ID" --argjson first "$PAGE_SIZE" --argjson after "$after" \
        --argjson nested "$NESTED_SIZE" \
        '{id: $id, first: $first, after: $after, nested: $nested}') ;;
    team)
      vars=$(jq -nc --arg name "$SCOPE_NAME" --argjson first "$PAGE_SIZE" --argjson after "$after" \
        --argjson nested "$NESTED_SIZE" \
        '{name: $name, first: $first, after: $after, nested: $nested}') ;;
    repo)
      vars=$(jq -nc --arg team "$TEAM_NAME" --arg project "$SCOPE_NAME" \
        --argjson first "$PAGE_SIZE" --argjson after "$after" --argjson nested "$NESTED_SIZE" \
        '{team: $team, project: $project, first: $first, after: $after, nested: $nested}') ;;
  esac
  resp=$(gql "$ISSUES_QUERY" "$vars") || exit 1

  count=$(printf '%s' "$resp" | jq "$NODES_PATH.nodes | length")
  total=$((total + count))
  printf '%s' "$resp" | jq -c "$NODES_PATH.nodes[]" >> "$tmp"
  printf 'page %d: %d issues\n' "$page" "$count" >&2

  if [ "$(printf '%s' "$resp" | jq -r "$NODES_PATH.pageInfo.hasNextPage")" = "true" ]; then
    after=$(printf '%s' "$resp" | jq "$NODES_PATH.pageInfo.endCursor")
  else
    break
  fi
done

# --- render ------------------------------------------------------------------

# Belt and braces alongside the `|| exit 1` at each call site: a zero-issue archive is almost
# certainly a bug, not an empty project, and writing it would destroy a good previous snapshot.
[ "$total" -gt 0 ] || die "snapshot-linear.sh: no issues came back for $SCOPE_LABEL.
Refusing to write an empty archive over $OUTFILE. If the project really is empty, delete the
file by hand."

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
  "- **Project:** " + (.project.name // "(none)"),
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
  printf '# Linear archive — %s\n\n' "$SCOPE_NAME"
  printf 'Point-in-time snapshot of every issue in %s, taken %s by `scripts/snapshot-linear.sh`.\n\n' \
    "$SCOPE_LABEL" "$(date -u '+%Y-%m-%d')"
  printf 'This is an **archive, not a tracker** — nothing here is live and nothing here is worked.\n'
  printf 'It exists so the content survives archiving the Linear project, greppable offline and on\n'
  printf 'every machine. Live work is in `TODO.md` (inbox) and the tracker named in `SEAMAP.md`.\n\n'
  printf '%d issues.\n\n---\n\n' "$total"
  cat "$rendered"
} > "$OUTFILE"

printf 'Wrote %d issues to %s\n' "$total" "$OUTFILE"
