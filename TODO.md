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
    were filed from the old `apps/tabletop/notes/todo.md` on 2026-08-01 without one. That's why
    the script has a `--repo` mode; a plain project snapshot silently misses them.

Folded up from `apps/tabletop/notes/todo.md` (2026-08-06), Jess's wording preserved as the quote.
None of these are in Linear — they postdate the 2026-08-01 promotion.

- [ ] `deck-title-placement` Move the deck title out of the command zone on the game screen  ← mountain: tabletop-replaces-mural
  - > on the game screen, let's move the title of the deck out of the command zone; put it above
    > the table button(s), top-aligned with the hamburger menu.

- [ ] `playmat-command-zone` Redraw the player area to include the command zone  ← mountain: tabletop-replaces-mural
  - > the Tabletop drawing needs to change: I forgot the command zone. Move exile down to replace
    > the bottom third of the Graveyard, instead.
  - Touches `apps/tabletop/DESIGN.md` and `src/server/tableFurniture.ts` — the design doc is the
    spec for the player area, so change it first.

- [ ] `seat-label-deck-name` Show the deck name with the player name above the playmat  ← mountain: tabletop-replaces-mural
  - > have the player name include the deck name, above the playmat on the Tabletop

- [ ] `commander-in-command-zone` Place the commander in the command zone when the Tabletop loads  ← mountain: tabletop-replaces-mural
  - > When the Tabletop loads, have the commander appear in the command zone. Also place a
    > transparent version of the commander in its spot, one that doesn't move when they play the
    > commander.
  - The ghost copy is the interesting half: it marks *where the commander lives* so the zone still
    reads as the commander's home once the real card is out on the table.

- [ ] `no-doubleclick-crop` Turn off the crop tool on double-clicking a card  ← mountain: tabletop-replaces-mural
  - > On the Tabletop, double-clicking a card brings up something useless, a weird cropping thing.
    > Turn that off.
  - Adjacent to JES-144 (remove crop/download from the card *context menu*) but distinct — that's
    the menu, this is the double-click gesture. Both want the custom card `ShapeUtil` that JES-149
    needs anyway.

- [ ] `animate-tap` Animate tapping a card  ← mountain: tabletop-replaces-mural
  - > Can we animate tapping the card?
  - Rides on the same custom card shape as rotation (JES-143/JES-144). Consult the `animations`
    owner — the Shuffler already has a card-movement animation vocabulary worth matching.

## Backlog

## Done

- [x] ~~`tabletop-todo-fold` Decide what happens to `apps/tabletop/notes/todo.md`~~
  done: 2026-08-06 — folded and deleted. Its historical section was pure duplication of
  `notes/linear-archive.md` (all 8 `JES-` ids verified present there). Its 6 undone live items
  moved to `## Next` above with Jess's wording quoted; the 7th (Precon/Archidekt tabs not
  toggling as primary buttons) was already fixed in `d77b1ae` / `55c459d`. One inbox again.

- [x] ~~`tracker-migrate` Move the Linear coordinates into `docs/agents/issue-tracker.md`~~
  done: 2026-08-06 — resolved differently. Rather than declaring Linear in the shared location,
  the tracker *changed*: issues are now committed markdown under `.scratch/`, with a `Mountain:`
  line on every spec and ticket. `docs/agents/{issue-tracker,triage-labels,domain}.md` written;
  `CLAUDE.md` § Seamap and `SEAMAP.md` § Tracking rewritten. Linear wind-down split out as
  `linear-wind-down`.
