#!/bin/bash
# Merge a finished worktree branch into local main. No push, no PR — just a
# local merge commit, pre-authorized (see fleet CLAUDE.md, step 12).
#
# Usage: scripts/merge-worktree.sh <branch-name> ["merge commit message"]
#
# Run this from the main checkout (repo root), not from inside the worktree.
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <branch-name> [\"merge commit message\"]" >&2
  exit 1
fi

BRANCH="$1"
MSG="${2:-Merge worktree branch '$BRANCH' - claude}"

CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Error: run this from the main checkout, on branch 'main' (currently on '$CURRENT_BRANCH')." >&2
  echo "Use ExitWorktree, or 'cd' to the repo root, first." >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: main checkout has uncommitted changes. Commit or stash before merging." >&2
  exit 1
fi

git merge --no-ff "$BRANCH" -m "$MSG"

echo "Merged '$BRANCH' into main."

WORKTREE_PATH=$(git worktree list --porcelain | awk -v b="refs/heads/$BRANCH" '
  /^worktree /{p=$2} /^branch /{if ($2==b) print p}')
if [ -n "$WORKTREE_PATH" ]; then
  echo "Worktree still present at $WORKTREE_PATH — remove it with:"
  echo "  git worktree remove \"$WORKTREE_PATH\""
  echo "(or use the ExitWorktree tool if you're the session that created it)."
fi
