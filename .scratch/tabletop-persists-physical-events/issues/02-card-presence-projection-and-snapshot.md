# 02 — Card-presence projection, snapshot, and diff (unit-testable, no UI)

**What to build:** The pure, headless heart of the diagnostic: a `TableState` type
tracking which cards (by instanceId) are present on the table, a `projectEvents` function
that folds the *existing* `card.played`/`card.returned` events into that state, a
`snapshotCanvas` function that reads card shapes off a live tldraw editor into the same
shape, and a diff between the two. No new contracts, no Spine round-trip, no button —
this ticket proves the diagnostic can work at all, on the smallest possible slice.

**Blocked by:** None — can start immediately (parallel to ticket 01).

**Status:** resolved

- [x] `TableState` type defined in `apps/tabletop`, independent of tldraw and Spine types,
      modeling (for now) just which card instanceIds are present.
- [x] `projectEvents(events) -> TableState` is a pure function (no I/O, no editor
      instance, no Spine client) that folds `card.played` (add) and `card.returned`
      (remove) events into a `TableState`.
- [x] `snapshotCanvas(editor) -> TableState` reads card shape records from a live tldraw
      editor into the same `TableState` shape.
- [x] A diff function compares two `TableState` values and reports discrepancies (cards
      present in one but not the other).
- [x] `projectEvents` is tested with hand-built event lists only — no server, no live
      Spine, no tldraw editor — covering a card arriving and a card returning, plus
      interleaved events for multiple cards.
- [x] `snapshotCanvas` is tested against a real in-memory tldraw editor instance (no fake
      tldraw) — create card shapes via the editor's own API, snapshot, assert the result.
- [x] The diff is tested for both a matching pair and a deliberately desynced pair.
