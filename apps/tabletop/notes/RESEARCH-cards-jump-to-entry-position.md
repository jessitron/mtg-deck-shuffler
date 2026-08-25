# Research: cards-jump-to-entry-position

Scope: `apps/tabletop`. Open bug, unsolved — this file exists to hold what's been
ruled out and what's instrumented, so the next session (or the next occurrence)
doesn't repeat the same dead ends.

**Bottom line up front:** occasionally, with no discernible trigger, a batch of
one player's card shapes reset to their Stack entry position — as if the cards
had just been freshly played. Still happening post-tldraw-upgrade (the upgrade
was tried as a possible fix; it wasn't one). Root cause is still unknown as of
2026-08-25. Two hypotheses have been ruled out, and telemetry now exists for the
one code path that had none.

## Symptom

Jess, verbatim (TODO.md, filed before 2026-08-25):

> weird bug: `cards-jump-to-entry-position` occasionally, for no discernable
> reason, a bunch of Evelyn's cards return to the stack as if they were just
> played 😭

## Ruled out

**1. tldraw undo/redo.** `TablePage.tsx`'s `uiOverrides.actions` wraps both
`actions.undo.onSelect` and `actions.redo.onSelect` in an `inSpan("undo"/"redo",
...)` — added specifically because tldraw's undo/redo run against the *shared
synced store*, not a local-only history, so one player hitting ctrl-Z could in
principle revert other players' card moves back to their creation position.
Confirmed (2026-08-25, Jess): this span does not fire when the bug occurs. Not
the cause.

**2. A server-side write to an existing card's x/y.** Full inventory of every
server-side write to `mtg-card` shapes, via the `tabletop-shape-mechanics` owner
(2026-08-25):

- `cardArrival.ts`'s `placeArrivedCard` (shared by `applyCardArrival` and
  `applyCardDiscard`) — mints a **brand-new** shape via `store.put`, position
  from `stackCardPosition`/`graveyardCardPosition`. Never updates an existing
  shape's x/y. The `hasInstance` dedup check blocks a second `card.played` for
  the same instance from ever reaching `store.put` again.
- `cardRemoval.ts`'s `applyCardRemoval` — deletes the card shape; the only x/y
  math here is repositioning **passenger** shapes (counters/notes) to hold their
  place, never the card itself.
- `seatJoined.ts` — mints commander + ghost cards, only at creation.
- `rooms.ts`'s `RoomEntry.stackCardCount` — read-only snapshot read, never
  writes.

So no known server code path finds an existing card shape by id and overwrites
its x/y. If this is a server-caused reset, it isn't coming through any of the
paths this ship's own code controls.

## Open hypotheses (not investigated)

- **tldraw sync-core / `TLSocketRoom` reconciliation** doing an unexpected
  full-document re-broadcast or reconciliation that re-applies a shape's
  original creation props over a since-moved shape. Nobody has read
  `@tldraw/sync-core`'s wire protocol or `TLSocketRoom` internals for this —
  the `tabletop-shape-mechanics` owner's KB covers client-side
  `SelectTool`/`ShapeUtil` behavior, not sync-core, so this is genuinely
  unexamined territory, not a checked-and-clear one.
- **`cardSwallow.ts:70`** has a defensive guard comment — `if
  (!editor.getShape(id)) return; // already gone (e.g. store reset mid-flight)`
  — that names a "store reset" as a possibility without anyone having traced
  what one actually is or when it fires. Speculative wording, not an observed
  mechanism, but the closest existing reference to this shape of bug.
- Server or client process restart wiping in-memory room state (`TLSocketRoom`
  has no persistence layer) is a bigger-blast-radius event than "a batch of one
  player's cards" and probably doesn't match the symptom, but hasn't been
  formally excluded.

## What's instrumented now (2026-08-25)

The gap: `usePhysicsAnnouncements.ts` (the hook that announces card taps,
flips, zone moves, etc. as spans) only listens with `store.listen(callback,
{ source: "user", scope: "document" })` — tldraw's `source: "user"` filter
means "changes this tab's own actions made." It **never sees a position change
that arrives via the sync protocol** from the server or another client's tab
(`source: "remote"`). Combined with the server-side inventory above, a reset
caused by anything other than a local drag in the affected tab would have
produced **zero telemetry** anywhere in the fleet — client or server.

Fix (instrumentation only, not a resolution): `useCardArrivalSpans.ts` already
had a second, `source: "remote"` listener (previously only used to emit "card
arrived on canvas" for brand-new shapes). Extended it to also watch
`change.changes.updated` for an existing `mtg-card` shape's x/y changing,
emitting a new span **"card moved by remote change"** — `card.instance_id`,
`card.scryfall_id`, `card.name`, `shape.id`, `position.before.x/y`,
`position.after.x/y`. Debounced 300ms per `shape.id` (mirroring
`usePhysicsAnnouncements`'s `GENERIC_SETTLE_MS` pattern) — tldraw's
`Translating.ts` writes to the store on every pointer-move during a drag, not
just on drop, and a remote drag replicates that same per-frame volume over
sync-core, so without debouncing this would fire once per animation frame of
*every* remote drag on the table rather than once per completed move.

This is the one place in the codebase that would currently observe a
remote-origin position change on an existing card shape. It does not explain
the bug — it's there so that the *next* occurrence leaves a trace: whichever
client/session produced the "before" and "after" positions will show up in
Honeycomb (`mtg-tabletop-web`, span name `card moved by remote change`).

See also: `owners/tabletop-shape-mechanics/interactions.md` watch point 20 (the
per-pointer-move noise fact this debounce works around) and `history.md` for the
implementation record.

## Next steps, when this recurs

1. Query Honeycomb (`mtg-tabletop-web`) for `card moved by remote change` spans
   around the reported time. If none fire, the reset isn't a store `updated`
   event at all — reconsider a `deleted`+`added` pair (i.e. the "brand new
   shape" path, which would mean the dedup is somehow failing) or something
   outside tldraw's store entirely.
2. If spans do fire, check `trace.trace_id`/session context to identify which
   client or server process produced the write, and go from there.
3. If it's still a dead end, read `@tldraw/sync-core`'s `TLSocketRoom`
   reconciliation path directly (unexamined territory — see above) rather than
   continuing to guess from this ship's own code, which has now been
   fully inventoried.
