# 01 — Local view rotation with cycle + Home controls

**What to build:** A seated player can rotate their own view of the shared Tabletop canvas in
90° steps and snap it back to a known "Home" orientation — purely locally, in their own
browser. A fixed control strip (bottom-right, visually marked as a temporary placeholder) holds
a cycle control and a Home control. Rotation state lives only in the browser: it starts at 0°
the moment a player's page finishes loading, resets on every fresh join or reload, and never
touches the synced tldraw document. Rotating one player's view has zero effect on any other
player at the table.

Mechanically: `<Tldraw>` (currently rendered bare inside the fixed `data-testid="table-canvas"`
div in `apps/tabletop/src/client/TablePage.tsx`) gets wrapped in a new "canvas pane" `<div>`
that carries a CSS `transform: rotate()`. The control strip is a true DOM sibling of that
wrapper — never a descendant — so it never itself visually rotates and needs no
counter-rotation logic.

This ticket does not need tldraw's own toolbar/context menu to look correct while rotated —
that's ticket 02.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Consult `tabletop-shape-mechanics-review` before implementing: confirm the CSS rotation on
      the wrapper doesn't disturb `zoneHitTest.ts` or the `MtgCardShapeUtil` drag/translate
      hooks (spec's read: they use page-space coordinates only, so it shouldn't — verify before
      building).
- [ ] Consult `shuffler-looks-like-itself-review` for the control strip's placeholder styling:
      check whether a "design-exempt" convention already exists to reuse, or whether this
      establishes the first one (grep confirmed none exists yet in either ship). Style is
      deliberately jarring (an "ugly pink," per direction), flagged as temporary.
- [ ] `<Tldraw>` renders inside a new wrapper `<div>` with a CSS `transform: rotate()`; the
      transform is local-only and never mutates the synced tldraw document.
- [ ] A cycle control advances the wrapper's rotation through 0° → 90° → 180° → 270° → 0°, one
      direction only.
- [ ] A Home control resets the wrapper's rotation to 0°/upright from any of the four states.
- [ ] Rotation state is 0°/Home the instant a player's page finishes loading — no manual step
      required. A page reload behaves identically to a fresh join (no `localStorage`/
      `sessionStorage`).
- [ ] The control strip renders as a fixed vertical strip in the bottom-right of the screen, as
      a DOM sibling outside the rotated wrapper — its own position/bounding box is identical
      across all four canvas rotation states.
- [ ] One Playwright spec (e.g. `apps/tabletop/test/verification/verify-view-rotation.spec.ts`),
      following the bounding-box-assertion pattern in `verify-card-rotate.spec.ts` and reusing
      `openTable`/`placeCard` from `test/verification/helpers.ts`. Covers, asserting only on
      visible DOM state (never an internal rotation-state variable):
  - [ ] Cycling through all four rotation states in order
  - [ ] Home resetting to 0° from each of the four states
  - [ ] A fresh join already sitting at 0°/Home with no interaction
  - [ ] The control strip's bounding box staying constant across all four canvas rotation states
- [ ] Update `tabletop-shape-mechanics-update` and `shuffler-looks-like-itself-update` with what
      actually landed.
