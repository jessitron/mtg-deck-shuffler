# Tabletop replaces Mural

Mountain: tabletop-replaces-mural
Type: wayfinder:map

## Destination

**Mountain 1 (`SEAMAP.md`) fully built.** The Tabletop is a complete, comfortable
replacement for a Mural whiteboard: the synced canvas (already landed), the physics of
Magic — zone gestures, tap, counters, notes — and player-area geometry matching
`apps/tabletop/DESIGN.md`, plus enough durability that the table doesn't lose state on a
redeploy the way a real Mural board never would. When this map runs dry, nothing stands
between the repo and Mountain 2 (`spine-tells-the-story`) except that mountain's own map.

## Notes

- Skills every session should consult: `/grilling`, `/domain-modeling`. Read
  `docs/agents/issue-tracker.md` before writing into the tracker.
- This map's tickets came from **synthesizing existing analysis**, not a fresh
  breadth-first grill — `linear-wind-down`'s clusters 06–08 already did that legwork
  (see their tickets for verified-against-code detail this map doesn't repeat) and
  `apps/tabletop/DESIGN.md` / `apps/tabletop/SEAMAP.md` already carry the target shape.
  Charted this way at Jess's direction (2026-08-06) to avoid re-deriving what's already
  written down. Read a linked source ticket before resolving anything it covers.
  `apps/tabletop/CLAUDE.md` has this ship's own architecture/commands/gotchas.
  Consult the `two-faced-cards` owner before touching MDFC flip; `animations` before
  touching tap/rotate motion; `fleet-is-observable` before touching the Tabletop→Spine
  sender.
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

- **Counters and notes on cards.** `SEAMAP.md`'s Mountain 1 names "tap, counters, zone
  areas" as the physics of Magic; `apps/tabletop/SEAMAP.md`'s Mountain 2 repeats "holds
  counters and notes." Nothing in `TODO.md` or `.scratch/` addresses this at all — no
  shape for what a counter looks like on a card (a +1/+1 counter? poison? a life total
  companion?), whether it's a tldraw child shape or a `meta` field, or how a note differs
  from a counter. Too unformed to ticket; revisit once the tickets below land and there's
  a card shape mature enough to hang a counter on.
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
