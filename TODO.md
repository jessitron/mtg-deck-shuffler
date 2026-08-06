# TODO

The fleet's inbox: raw captures, pre-decision. Jess writes here; so do agents (`drop-buoy`).
Format: the seamapping plugin's `INBOX.md`. Committed work lives in the tracker — see
`SEAMAP.md` § Tracking.

Nothing here is triaged. When an item turns out to be real, promote it with `/to-tickets` (or
`/to-spec` first, if it's a multi-session build), strike the line through with a `promoted:`
pointer, and sweep it to `## Done`.

## In progress

## Next

- [ ] `linear-wind-down` Archive the old Linear project and stop writing to it  ← priority: medium
  - The tracker is now `.scratch/` (see `docs/agents/issue-tracker.md`); Linear still holds the
    live issues.
  - **Snapshot done** (2026-08-06): `notes/linear-archive.md`, 68 issues, via
    `scripts/snapshot-linear.sh --repo jessitron "MTG Deck Shuffler"`. Re-run it right before
    archiving the project, in case anything moved.
  - Remaining: decide per open issue whether it becomes a `.scratch/` ticket or dies with the
    project — 39 Backlog + 1 Todo are the ones that need a decision; 16 Canceled and 12 Done
    need nothing. Then archive the project in Linear and stop writing there.
  - **Watch out:** 9 of the 68 (JES-144…JES-154, all Tabletop) have **no Linear project** — they
    were filed from `apps/tabletop/notes/todo.md` on 2026-08-01 without one. That's why the
    script has a `--repo` mode; a plain project snapshot silently misses them. They overlap the
    7 live items still sitting in that file, so do `tabletop-todo-fold` and this one together
    or you'll triage the same work twice.

- [ ] `tabletop-todo-fold` Decide what happens to `apps/tabletop/notes/todo.md`  ← priority: medium
  - It's already an inbox — its first line is "jess writes notes here" — and it has 7 live items
    at the top plus a historical section of items already promoted to Linear on 2026-08-01.
  - Now that the fleet has a root `TODO.md`, two inboxes is the thing the convention exists to
    avoid. Options: fold the 7 live items up into this file and leave the historical section as a
    ship-local record; or keep it as a deliberate ship-scoped inbox and teach `orient` to read
    both. Jess's call — the items are hers and nothing has been moved.

## Backlog

## Done

- [x] ~~`tracker-migrate` Move the Linear coordinates into `docs/agents/issue-tracker.md`~~
  done: 2026-08-06 — resolved differently. Rather than declaring Linear in the shared location,
  the tracker *changed*: issues are now committed markdown under `.scratch/`, with a `Mountain:`
  line on every spec and ticket. `docs/agents/{issue-tracker,triage-labels,domain}.md` written;
  `CLAUDE.md` § Seamap and `SEAMAP.md` § Tracking rewritten. Linear wind-down split out as
  `linear-wind-down`.
