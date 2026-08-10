# Plan — ticket 20: Cards tuck behind other cards

Mountain: tabletop-replaces-mural
Ship: tabletop
Ticket: `.scratch/tabletop-physics/issues/20-cards-behind-cards.md`

## What lands

Extend the existing card-hosted drag-attach mechanism (ticket 18/19, already generic over
`PASSENGER_TYPES`) so `mtg-card` is itself a passenger type. A card dropped onto another card
parents it (lands on top by default, via tldraw's own sibling paint order); the existing
`ReorderMenuSubmenu` in `CardContextMenu.tsx` already gives "Send backward"/"Send to back" for
free — no new context-menu code needed there.

The one genuinely new piece: **rotation compensation**. tldraw composes a parent's rotation into
every child's page transform unconditionally. Counters/notes are *meant* to tilt with a tap
(ticket 18's "ride-along" visual); a tucked **card** should not — its printed face shouldn't
appear to spin every time its host taps. Because a passenger generally isn't centered on its
host, simply zeroing the passenger's local rotation isn't enough — the host's own tap pivots
around the host's *center* (`tapPartial`'s center-preserving math), which also displaces any
off-center child. Full fix: solve for the passenger's new local (x, y, rotation) that reproduces
its *current* page transform under the host's *post-tap* local transform — one level of the same
"hold a point fixed across a transform change" trick `tapPartial` already does for the host
itself, expressed as `newHostLocal⁻¹ · oldHostLocal · passengerLocal` via tldraw's `Mat`.

## Pieces

### 1. `src/client/shapes/cardTap.ts`

- `passengerTapCompensation(passenger, oldHost, newHost)` — pure function, no `Editor`. Builds
  `Mat.Identity().translate(x,y).rotate(rotation)` for `oldHost`/`newHost`/`passenger`, solves
  `newHostMat⁻¹ · oldHostMat · passengerMat`, decomposes to `{x, y, rotation}`. Unit-testable
  (vitest, no Editor) — the pre-agreed TDD seam for this ticket.
- `passengerCompensationPartials(editor, oldHost, newHost)` — looks up `oldHost`'s direct
  `mtg-card` children via `getSortedChildIdsForParent`, maps each through the pure function above.
- `tapPartialsForCards(editor, cards, tapped)` — the shared "tap N cards, compensate each one's
  card-passengers" loop; skips cards already at the target state. Replaces the
  filter+map that `CardContextMenu`'s Tap/Untap item does today, and is what the multi-select
  propagation branch in `onClick` calls for the *other* selected cards.

### 2. `MtgCardShapeUtil.tsx`

- `PASSENGER_TYPES` gains `"mtg-card"` — this alone makes cards receivable/removable as
  passengers (both `can*ChildrenOfType` gates), makes `evictPassengers` treat a passenger card
  like any other passenger (existing eviction already writes `rotation: 0` on the animated
  partial, so "reconcile to zero" on battlefield-exit is already covered, free), and folds
  card-passengers into the existing zero-rotation-on-attach loop in `onDragShapesIn` (unchanged
  logic — geometry-bounds-based, not `props.w/h`, already generic).
- `onClick`: after computing the clicked card's own `tapPartial`, the existing deferred
  `queueMicrotask` (already required by tldraw's `PointingShape` ordering, per the multi-untap
  comment) now *always* runs (not only when other cards are selected), pushing
  `passengerCompensationPartials` for the clicked card's own passengers plus
  `tapPartialsForCards` for any other selected cards.
- `onDragShapesOut`: after reparenting `mine` back to the page, any of them that is `"mtg-card"`
  gets its rotation reconciled to 0 (center-preserving, same math already inlined in
  `onDragShapesIn`'s zeroing loop — pulled out to a small shared helper
  `zeroRotationHoldingCenter(editor, id)`) — a detached card should read as lying flat, not at
  whatever angle its compensation happened to be holding. Counters/notes are untouched here
  (no requirement to reconcile their tilt on manual drag-off).

### 3. `CardContextMenu.tsx`

- Tap/Untap item body becomes `commit(tapPartialsForCards(editor, cards, anyUntapped), "tap")` —
  no behavior change for cards without passengers, now also compensates any card-passengers of
  the tapped cards.

## Known gap (flagging, not solving)

Multi-selecting a host *and* its own passenger together and tapping both in one action can push
two conflicting partials for the passenger's id (its own standalone tap vs. the compensation
written for it as someone else's passenger) — last-write-wins in `updateShapes`. Not covered by
the ticket's acceptance criteria; not fixing pre-emptively.

## Verification

- **vitest**: `test/passengerTapCompensation.test.ts` — passenger's page position/rotation is
  unchanged across a synthetic host tap, for an off-center passenger; a passenger with no
  compensation on an untapped→tapped, tapped→untapped round trip round-trips back to its
  original local coordinates.
- **Playwright**: `test/verification/verify-cards-behind-cards.spec.ts` (pattern of
  `verify-counter.spec.ts`):
  1. Dragging a card onto another parents it (dragging the host afterward carries it).
  2. Dragging the passenger alone (a small in-place move) does not detach it; dragging it far
     off does.
  3. The passenger is independently clickable (tap toggles its own `tapped`, not the host's).
  4. Tapping the host does not move the passenger's on-screen position.
  5. Host leaves the battlefield (dragged to the graveyard): passenger detaches, ends up outside
     the graveyard, near its edge, rotation reset to 0.
