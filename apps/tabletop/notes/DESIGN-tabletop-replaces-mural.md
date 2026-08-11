# The Tabletop replaces Mural

The high-level path for `SEAMAP.md`'s **Mountain 1**. This document is the chart _above_
the wayfinder maps: it holds the whole parity list in one place, splits it into five maps,
and says what order they go in. Each map points back here; this points at each map.

Source: `notes/ramble-tabletop-replaces-mural.md` (Jess, 2026-08-06) — a dictated pass over
everything the Tabletop needs before it can take Mural's place — grilled into shape the same
day. It's kept as a primary source: when this document and the ramble disagree, the ramble is
what she actually said.

## The destination

**Parity, judged before the first real game — not discovered during it.**

Mural is not a fallback. You cannot start a game on the Tabletop and reach for Mural when
something is missing, so the list has to be complete _before_ you play on it, not after.
That rules out the tempting alternative destination ("play one real game and see what
breaks"): one game wouldn't exercise everything, and a gap found mid-game is a ruined game.

Arrival is **Jess judging it playable**. Playtesting after that will lengthen the list;
that's expected and is not a failure of this chart.

## Where things stand (verified in code, 2026-08-06)

The honest floor, because several docs overstate it:

- **There is no custom card shape.** `MtgCardImageShapeUtil` extends tldraw's stock
  `ImageShapeUtil` and overrides two methods — `onClick` (tap) and `onTranslateEnd` (zone
  detect). Cards are plain tldraw `image` shapes; `meta.instanceId` is the only thing that
  marks one as a card.
- **Furniture is stock locked `geo`/`image` shapes**, tagged with `meta.zone`. There is
  nothing to hang target-side behaviour on. The seat name label isn't even locked.
- **The tldraw UI is completely un-curated** — no `components=`, `overrides=`, or `tools=`
  anywhere. Every draw tool, the context menu, double-click-to-crop, and free-rotate handles
  are all live. Resize/rotate handles silently break the tap toggle.
- **Persistence is zero.** Rooms live in a `Map` in `rooms.ts`; a redeploy wipes every board.
  Seat→position is assigned by join order, so a restart reseats everyone.
- **The Tabletop emits nothing.** No Spine client, no `SPINE` env var — it does not know the
  Spine exists.
- **`contracts/` is read by no code on either side.** Both TS validators are hand-rolled `if`
  chains against a different shape than the schemas describe, and the Shuffler sends
  `seat.joined` while the contract file is named `seat.taken.v1`.
- **Undo is stock tldraw**: per-client, local, and blind to server-placed cards.
- **The Shuffler pushes on 3 actions only** (start/restart, play, discard). Draw, shuffle,
  mulligan, flip, undo, put-on-top/bottom are invisible to the table.
- Landed and real: the synced canvas at `/t/:tableName`, card arrival with per-seat player
  areas, tap-on-click, and zone-entry detection (to `console.log` only).

Stale docs to fix as their areas get touched: `apps/tabletop/DESIGN.md`'s "delta from what's
built today" table lists four things as unbuilt that are built; `contracts/README.md` claims
both sides validate, and neither does; `apps/tabletop/SEAMAP.md` Mountain 2 says "not yet
built" of work that has partly shipped.

## The parity list

Everything Mural does for the group today that the Tabletop must do, sorted into the map that
owns it. ✅ marks what already works.

### 1 — Physics

Cards and furniture become real custom shapes, so they can recognise what happens to them.

- flip a card over (MDFC, and face-down)
- put cards behind cards
- counters — little circles you drag onto a card; on landing the counter **groups with the
  card**, so moving the card moves its counters, and they vanish when the card hits the graveyard
- post-its attachable to a card the same way, carrying arbitrary text
- tap ✅ — but a resize handle silently breaks it, so tap has to become state rather than
  incidental geometry
- **furniture as custom shapes too**, so a zone can recognise what lands on it rather than the
  card scanning the page for `meta.zone`

### 2 — Table layout

- playmats arranged in a **square with the Stack in the middle**, not today's row. Some
  players' mats will be sideways to the others; that's fine.
- a **command zone** as furniture (does not exist in code), with the commander dragging in and out
- life counters — numbers players can modify
- commander damage
- playmat and sleeve picker
- seat labels showing the deck name
- move cards forward and back like they're attacking ✅

### 3 — Cards come and go

Rescoped at charting (2026-08-08, `.scratch/tabletop-cards-come-and-go/map.md`): the table
shows no hand/library counts on this mountain (Mural doesn't), so the **eleven hidden-zone
Shuffler actions** (draw, shuffle, mulligan, put-on-top/bottom, …) left this map — they're
Spine-vocabulary work for a Spine-side design effort (map 5 / Mountain 2). What stays is
every card crossing the table boundary:

- drag a card over the library → the library changes appearance to show it's about to take the
  card → the card lands in the Shuffler's **Reveal zone** (the player chooses hand, top, or
  bottom there — no separate hand target on the table)
- Shuffler-side **undo of a play or discard** poofs the card off the table (its own event kind;
  attachments stay behind, detached)
- **commanders start on the table in the command zone**, placed as part of the seating message

### 4 — Only Magic moves

Subtraction, plus the one gesture that has to work.

- kill double-click-to-crop, and everything else in the stock tldraw UI not conducive to Magic
- decide what freeform survives: little shapes, post-its, and lines (lines are minor — Jess said
  she could live without them)
- **undo — "totally crucial."** Today it is per-client tldraw history that cannot see
  server-placed cards, so this is a design question, not a wiring one.

### 5 — The table reports

- define the event vocabulary — this wants real domain-modeling work and a `CONTEXT.md`, not a
  field list
- a lot of moves, but explicitly **not every move**
- the Tabletop→Spine sender, a data-flow direction that doesn't exist yet
- make `contracts/` actually load and validate on both sides, or stop claiming it does

## Out of scope

Recorded so it's ruled out rather than forgotten:

- **Chat** — Discord carries the call.
- **Interpretation** — Mountain 3, `interpreter-learns-to-read`. The Tabletop reports physics;
  meaning is not its job.
- **Playing a card from the library face-down onto the table** — Mural doesn't do it either, so
  it isn't parity. Real Magic wants it; a later mountain can have it.
- **Everything else needed to play Magic _correctly_.** This chart is bounded by what Mural
  solves today, not by the game's full surface.
- **Rules enforcement** — a standing fleet non-goal.
- **Tabletop-state persistence** — surviving a crash or redeploy without losing card
  positions and freeform drawings. Descoped from this mountain entirely (Jess, 2026-08-11):
  it used to be map 6, "The table remembers," but persistence is going to happen a
  different way, as part of a different map, not as parity work here. Until that map
  exists, a redeploy still wipes every board — same honest floor as today. The open
  question map 6 carried (same mechanism as the Spine feed, or a second one?) travels
  with it, unresolved, to wherever persistence actually gets designed.

## The five maps

Charted with `/wayfinder`, one at a time. Each map's own `map.md` links back to this document.

| #   | Map                                           | Tracker                           | Status                                        |
| --- | --------------------------------------------- | --------------------------------- | --------------------------------------------- |
| 1   | Physics — cards and furniture are real shapes | `.scratch/tabletop-physics/`      | charted 2026-08-06                            |
| 2   | Table layout                                  | `.scratch/tabletop-table-layout/` | charted (was `tabletop-card-physics-starter`) |
| 3   | Cards come and go                             | `.scratch/tabletop-cards-come-and-go/` | charted 2026-08-08                       |
| 4   | Only Magic moves                              | —                                 | not charted                                   |
| 5   | The table reports                             | `.scratch/tabletop-table-reports/` | charted 2026-08-10                       |

**Order.** Map 1 blocks map 2: the square layout, the command zone, and life counters all want
furniture that behaves, and rebuilding the shape layer underneath finished geometry is the
expensive way round. Several of map 2's tickets (deck name on the seat label, sleeve and playmat
picker) genuinely don't touch the shape architecture and can be worked in parallel if you want
motion. Maps 3–5 are independent of each other; chart one when you're ready to work it, not
before — five shallow maps are worth less than one deep one.

**Parked tickets** live at `.scratch/tabletop-replaces-mural/parked/`: written work that belongs
to a map that doesn't exist yet. It sits outside any `issues/` directory so no frontier scan
picks it up. When map 3, 4, or 5 gets charted, its parked ticket goes in as founding material.
