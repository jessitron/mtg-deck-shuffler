# 16 — Untap a whole selection from one click, with a safe undo

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: done

**What to build:** With several `mtg-card`s selected (marquee), clicking one propagates that
card's *new* tapped state to every other selected card — not a per-card toggle. The clicked
card's own state change returns synchronously from `onClick`; the other selected cards' writes
must be deferred via `queueMicrotask`, because tldraw's `PointingShape.onPointerUp` calls
`markHistoryStoppingPoint()` and `updateShapes()` *after* `onClick` returns — writing the others
synchronously lands them in the *previous* undo entry instead of the new one.

This leans on undocumented tldraw internal ordering. Jess's condition for accepting that
dependency is a required Playwright regression test: one Ctrl+Z reverts every card
tapped/untapped in the gesture together, and leaves an earlier, unrelated tap untouched. This is
not optional scope — it's what catches a tldraw upgrade silently breaking the grouping.

Two-client sync should also be verified: each player's undo stack stays independent of the
others' multi-untap.

**Blocked by:** 12

- [x] Clicking one selected card propagates its new tapped state to the rest of the selection
- [x] Required Playwright test: one Ctrl+Z reverts the whole multi-untap and leaves an earlier
      unrelated tap alone
- [x] Two-client test: each client's undo stack stays independent of another player's multi-untap
