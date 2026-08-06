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

- [ ] `tabletop-card-shape` Give Tabletop cards a custom `ShapeUtil` that reports zone entry  ← mountain: tabletop-replaces-mural  ← was: JES-149
  - > "card was dragged into the graveyard" / "card was dragged from here to here" are essential
    > game events — not cosmetic, core to whether this architecture works at all.
  - **The keystone.** Cards and zones are stock tldraw `image`/`geo` records today
    (`src/server/cardArrival.ts`, `tableFurniture.ts`), rendered by a bare `<Tldraw store={...}>`
    in `TablePage.tsx` with no `shapeUtils` registered — so no hook fires. Confirmed present in
    `tldraw@5.2.5`: `onDragShapesOver`/`onDropShapesOver` on the *target* (how tldraw's own frame
    shape reparents), `onTranslateEnd` on the mover.
  - Do this **first**. `no-doubleclick-crop` and `animate-tap` both want this same custom shape,
    and the persistence work waits on having named domain events instead of raw sync-protocol diffs.

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

- [ ] `no-doubleclick-crop` Curate the card's menus — kill crop, add rotate  ← mountain: tabletop-replaces-mural  ← was: JES-144
  - > On the Tabletop, double-clicking a card brings up something useless, a weird cropping thing.
    > Turn that off.
  - Two surfaces, one job: the double-click gesture (above) and the popup menu — drop "crop" and
    "download", keep "alt" and "replace media", add "rotate". Also a way to flip MDFC cards, ideally
    from the same submenu.
  - Cosmetic; rides on `tabletop-card-shape`. Don't build the shape for this.

- [ ] `animate-tap` Rotate a card 90° to tap it, and animate it  ← mountain: tabletop-replaces-mural  ← was: JES-144, JES-143
  - > Can we animate tapping the card?
  - > We must be able to rotate cards. Ideally, clicking on a card turns it 90 degrees.
  - **Rotation is the essential half** — real players hit this. Jess's college kid and their
    friends (2026-08-01) wanted to tap lands for mana and turn creatures sideways for summoning
    sickness; without it they track tapped state out-of-band, which defeats a shared visual table.
  - `onRotateStart`/`onRotate`/`onRotateEnd` are real hooks in `tldraw@5.2.5`, on the same custom
    shape `tabletop-card-shape` builds. Consult the `animations` owner — the Shuffler already has a
    card-movement animation vocabulary worth matching.

## Backlog
