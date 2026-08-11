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

STASHED=0
if [ -n "$(git status --porcelain)" ]; then
  echo "main checkout has uncommitted changes — stashing them before merging."
  git stash push -u -m "merge-worktree.sh: auto-stash before merging $BRANCH"
  STASHED=1
fi

if ! git merge --no-ff "$BRANCH" -m "$MSG"; then
  echo "Error: merge of '$BRANCH' failed." >&2
  if [ "$STASHED" -eq 1 ]; then
    echo "Your uncommitted changes are untouched, safe in the stash — see 'git stash list' / 'git stash pop'." >&2
  fi
  exit 1
fi

echo "Merged '$BRANCH' into main."

REPO_ROOT=$(git rev-parse --show-toplevel)
echo "Running fleet tests before cleanup..."
TESTS_FAILED=0
(cd "$REPO_ROOT" && npm test) || TESTS_FAILED=1
(cd "$REPO_ROOT" && npm run tabletop:test) || TESTS_FAILED=1
if [ -x "$REPO_ROOT/services/spine/bin/test" ]; then
  (cd "$REPO_ROOT/services/spine" && bin/test) || TESTS_FAILED=1
fi

if [ "$TESTS_FAILED" -eq 1 ]; then
  echo "Error: tests failed after merging '$BRANCH' into main." >&2
  echo "The merge commit is in place, but the worktree and branch were left alone so you can investigate." >&2
  if [ "$STASHED" -eq 1 ]; then
    echo "Your uncommitted changes are still stashed — see 'git stash list' / 'git stash pop'." >&2
  fi
  echo "Remember, if this isn't _your_ test failure, the user wants you to spin up a subagent to find the problem and fix the failure." >&2
  exit 1
fi

echo "All fleet tests passed."

if [ "$STASHED" -eq 1 ]; then
  if ! git stash pop; then
    echo "Error: 'git stash pop' failed — the merge brought in changes that conflict with your stashed changes." >&2
    echo "Your stashed changes are safe in the stash list; resolve manually with 'git stash list' / 'git stash pop'." >&2
    echo "Skipping worktree removal until that's sorted out." >&2
    exit 1
  fi
fi

WORKTREE_PATH=$(git worktree list --porcelain | awk -v b="refs/heads/$BRANCH" '
  /^worktree /{p=$2} /^branch /{if ($2==b) print p}')
if [ -n "$WORKTREE_PATH" ]; then
  REMOVE_ERR=$(mktemp)
  if git worktree remove "$WORKTREE_PATH" 2>"$REMOVE_ERR"; then
    git branch -d "$BRANCH"
    echo "Removed worktree at $WORKTREE_PATH and deleted branch '$BRANCH'."
  else
    cat "$REMOVE_ERR" >&2
    echo "Could not auto-remove the worktree (likely still locked by another session)." >&2
    echo "Once it's free: git worktree remove \"$WORKTREE_PATH\" && git branch -d \"$BRANCH\"" >&2
  fi
  rm -f "$REMOVE_ERR"
fi
