# Tabletop card physics: first steps

Mountain: tabletop-replaces-mural
Type: wayfinder:map

## Destination

**Not Mountain 1 itself — a first slice of it.** This map covers only the card-physics
and player-area work that was already well-documented (`DESIGN.md`, the old TODO.md
lines, `linear-wind-down`'s clusters): zone gestures, tap/rotate, menu curation, player-
area geometry, and the first design step toward restart durability. When this map runs
dry, that slice is decided — it is **not** "the Tabletop replaces Mural," which is a much
bigger destination Jess says needs its own proper grilling session (2026-08-06: "there is
SOOOO much more to replacing Mural than you have any idea about").

**Do not treat this map's completion as Mountain 1's completion.** The real Mountain-1
map — everything Mural does today that the Tabletop doesn't have a plan for yet — is
still to be charted, with Jess grilled properly (breadth-first, docs written down) rather
than synthesized from what was already on paper. Start that as its own map when she's
ready; don't retrofit it onto this one.

## Notes

- Skills every session should consult: `/grilling`, `/domain-modeling`. Read
  `docs/agents/issue-tracker.md` before writing into the tracker.
- This map's tickets came from **synthesizing existing analysis**, not a fresh
  breadth-first grill — `linear-wind-down`'s clusters 06–08 already did that legwork
  (see their tickets for verified-against-code detail this map doesn't repeat) and
  `apps/tabletop/DESIGN.md` / `apps/tabletop/SEAMAP.md` already carry the target shape.
  That's exactly why this map is a narrow slice, not the whole Mountain — a proper
  breadth-first grill of Jess is what would surface the rest. Read a linked source
  ticket before resolving anything it covers. `apps/tabletop/CLAUDE.md` has this ship's
  own architecture/commands/gotchas. Consult the `two-faced-cards` owner before touching
  MDFC flip; `animations` before touching tap/rotate motion; `fleet-is-observable` before
  touching the Tabletop→Spine sender.
- **Each ticket here corresponds to a `TODO.md` line** (named in its body). Once a
  ticket resolves, update or delete that `TODO.md` line to match — don't let the two
  drift, since `TODO.md` is still where Jess looks for "what's live."

## Decisions so far

- **The synced canvas is landed** (ship SEAMAP Mountain 1, `JES-127`, 2026-07-27) — a
  tldraw room at `/t/:tableName`, card arrival from the Shuffler, deployed at
  `table.jessitron.honeydemo.io`. Not re-tickets here; it's the floor this map builds on.
- **Player-area geometry is built** (`apps/tabletop/DESIGN.md`, 2026-08-01) — playmat,
  library, graveyard, exile, the Stack — except the "mat grows taller" edge case, which
  rides with [Design command-zone geometry and redraw the player
  area](issues/01-command-zone-and-player-area.md).
- [Tabletop cards report zone entry as named
  events](../tabletop-card-shape/issues/01-zone-entry-events.md) — implemented
  2026-08-06, `ready-for-human`. `MtgCardImageShapeUtil` now detects zone entry via
  `onTranslateEnd`, debounced on `meta.zone`, notified via bare `console.log`. This is
  the architecture spike three tickets below wait on — it's done, so they're unblocked.

## Not yet specified

- **Everything about Mural that hasn't been grilled out of Jess yet.** The honest fog:
  this map only knows what old TODO lines and DESIGN.md already wrote down. What Mural
  actually does for the group during a real session — beyond zones/tap/geometry — is
  still unknown to this repo. That's the real Mountain-1 map, waiting on its own session.
- **Counters and notes on cards.** `SEAMAP.md`'s Mountain 1 names "tap, counters, zone
  areas" as the physics of Magic; `apps/tabletop/SEAMAP.md`'s Mountain 2 repeats "holds
  counters and notes." Nothing in `TODO.md` or `.scratch/` addresses this at all — no
  shape for what a counter looks like on a card (a +1/+1 counter? poison? a life total
  companion?), whether it's a tldraw child shape or a `meta` field, or how a note differs
  from a counter. Too unformed to ticket; likely belongs on the real Mountain-1 map above.
- **Replay-on-room-startup mechanism.** Waits on [Design the card.moved contract payload
  and the Tabletop→Spine sender](issues/10-card-moved-contract-and-sender.md) — the shape
  of the event decides what replay has to reconstruct.
- **Freeform-doodle snapshot store.** Doodles (arrows, scribbles, sticky notes) are
  explicitly never going in the event log (`linear-wind-down` cluster 08, carrying
  `JES-131`'s point forward), so restart durability for them is a *second*, unrelated
  persistence mechanism — a tldraw snapshot store. Not shaped yet; revisit once the
  event-sourced half (ticket 10) is decided, so the two don't get tangled together.

## Out of scope

- **The narration/chat panel** (`apps/tabletop/SEAMAP.md`'s own Mountain 3, "the window
  on the game"). Despite living in the Tabletop's ship-level SEAMAP as a numbered
  Mountain, its content — "the running interpretation, the interpreter's questions" — is
  fleet Mountain 2 (`spine-tells-the-story`) and Mountain 3 (`interpreter-learns-to-read`)
  territory, not this one. Ruled out 2026-08-06 so this map doesn't accidentally grow to
  cover two fleet Mountains. Whoever charts Mountain 2 should pick it up.
- **Spectator mode.** Already ruled a category error, not a ticket, by `linear-wind-down`
  cluster 08 (closed [table-durability-and-the-event-log
  cluster](../linear-wind-down/issues/08-cluster-table-durability-and-event-log.md)) —
  it's a standing constraint in `SEAMAP.md`, not work.
- **Rules enforcement.** Explicit fleet non-goal (`SEAMAP.md`); the human adjudicates.
