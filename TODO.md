# TODO

The fleet's inbox: raw captures, pre-decision. Jess writes here; so do agents (`drop-buoy`).
Format: the seamapping plugin's `INBOX.md`. Committed work lives in the tracker — see
`SEAMAP.md` § Tracking.

Nothing here is triaged. When an item turns out to be real, promote it with `/to-tickets` (or
`/to-spec` first, if it's a multi-session build) and **delete the line**. When an item turns out
not to be real, delete the line. Done work leaves no trace here — git remembers, and a `## Done`
section is just a wall between Jess and the live work.

## In progress

- [ ] `linear-wind-down` Get the work worth keeping out of Linear and into this inbox  ← priority: medium
  - **Charted 2026-08-06** as a wayfinder map: `.scratch/linear-wind-down/map.md`. Destination:
    Jess can work on this project again — everything worth doing is a live line here, everything
    done or dead is gone, and nothing points a session at Linear.
  - Content is safe in `notes/linear-archive.md` (68 issues, snapshotted 2026-08-06). 40 are live
    and need a keep/kill call; the other 28 are Done or Canceled and get no record.
  - What happens *inside* Linear is out of scope — it's abandoned in place, not archived.

## Next

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
