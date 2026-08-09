# Plan — ticket 16: multi-untap with safe undo

Ticket: `.scratch/tabletop-physics/issues/16-multi-untap.md`
Ship: apps/tabletop. All code in `MtgCardShapeUtil.tsx` plus one new Playwright spec.

## Behavior

With several `mtg-card`s selected (marquee), clicking one propagates that card's **new**
tapped state to every other selected `mtg-card` — propagation of a state, not a per-card
toggle. Cards already in the target state are skipped entirely (their rotation must not
move; rotation is an additive delta over free rotation, not an absolute).

## Mechanism (in `MtgCardShapeUtil.onClick`)

1. Extract the existing center-fixed pivot math into a small pure helper
   `tapPartial(shape: MtgCardShape, tapped: boolean): TLShapePartial<MtgCardShape>` —
   the same `halfExtent`/`center`/`topLeft` solve currently inlined at
   `MtgCardShapeUtil.tsx:152–155`. Used for the clicked card and each propagated card.
2. `onClick` computes `tapped = !shape.props.tapped` and **still returns** the clicked
   card's partial synchronously — required: when `onClick` returns a change,
   `PointingShape.onPointerUp` early-returns and the multi-selection survives; returning
   `undefined` would collapse the selection to the clicked card.
3. Before returning, read `this.editor.getSelectedShapeIds()`. If the clicked card is part
   of the current selection and the selection holds other `mtg-card`s, `queueMicrotask` the
   propagation:
   - Re-fetch each id fresh (`this.editor.getShape`), skip missing shapes, skip
     non-`mtg-card`s (a marquee can catch counters), skip the clicked card itself, skip
     cards already at the target `tapped` state.
   - One `this.editor.updateShapes([...partials])` call for the whole batch.

   Why microtask: `PointingShape.onPointerUp` calls `markHistoryStoppingPoint()` then
   `updateShapes([change])` *after* `onClick` returns. A synchronous write would land
   before the mark → previous undo entry. The microtask runs after the pointer-up task,
   after the mark — same (new) undo entry as the clicked card's change. Must stay
   `queueMicrotask` (never `setTimeout`, which could interleave with other events).
4. If the clicked card is NOT in the current selection, behave exactly as today (single
   toggle). No modifier-key handling changes (shift-click already fires onClick; out of
   scope).

The tap animation (ticket 15) keys off `props.tapped` changing per shape, so propagated
cards animate for free, locally and on remote peers.

## Tests (Playwright, required by the ticket — regression guard on tldraw internals)

New spec `test/verification/verify-multi-untap.spec.ts`, following house conventions
(cardPlayed helper, `zoneHint: "battlefield"` for distinct positions, marquee selection by
dragging on empty canvas, 500ms double-click cooldowns, `expect(...).toPass()` for
post-write assertions, everything kept in the framed viewport).

1. **Propagate + one-undo grouping** (the ticket's required regression test):
   - Place cards A, B, C on the battlefield.
   - Tap A alone (the "earlier, unrelated tap").
   - Marquee-select B and C; tap B → assert C also rotates (both tapped).
   - One Ctrl+Z (`Meta+z` on darwin — use `page.keyboard.press("ControlOrMeta+z")`)
     → B **and** C revert together; A stays tapped.
   - Assert tapped-ness via bounding-box width/height swap, as verify-card-rotate does.
   - Mixed-state propagation check rides along: after undo, select A(tapped)+B(untapped),
     click B → both end tapped... (kept if cheap; core assertions are the above).
2. **Two-client undo independence**:
   - Alice and Bob on the same table (two contexts, as verify-shared-canvas).
   - Alice multi-untaps B+C. Bob presses Ctrl+Z → nothing changes on either client
     (Bob's local history is empty of that change); Alice's Ctrl+Z still reverts it.

Unit tests: the pivot-math helper is pure — but it's already exercised via existing
onClick path; no new vitest file unless extraction makes one natural.

## Risks / notes

- Leans on undocumented tldraw ordering (`PointingShape.onPointerUp` mark-then-update);
  the Playwright undo test IS the tripwire for upgrades. Comment in code points at the
  ticket and at PointingShape.ts.
- Microtask must not itself mark history — plain `updateShapes` doesn't.
- After a *drag*, onTranslateEnd clears selection (drag-identity fix, untouched) — so
  multi-untap only works marquee-then-click, which matches the ticket.
