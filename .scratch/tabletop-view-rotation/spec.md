# tabletop-view-rotation

Mountain: tabletop-replaces-mural
Ship: tabletop
Status: ready-for-agent

## Problem Statement

A seated player looking at the shared Tabletop canvas sees the whole board from one fixed
orientation, no matter where they're "sitting." On a real card table you turn your body (or
turn the table) so your own side reads right-side-up to you; on the Tabletop today there's no
equivalent — everyone looks at the same unrotated view regardless of seat.

## Solution

Let each player rotate their own view of the shared table locally, in 90° steps, purely in
their own browser — the synced document never changes. A small fixed control strip (temporary,
visually marked as a placeholder) gives them a way to cycle through the four orientations and
to snap back to a known-good "Home" view. Every player starts at Home when they join.

This ticket covers the view only. It deliberately does not touch how cards or zones are laid
out or oriented in the shared document — see "Out of Scope."

## User Stories

1. As a seated player, I want to rotate my view of the table in 90° steps, so that I can look
   at the board from whichever angle suits me, similar to turning around a real table.
2. As a seated player, I want a "Home" control that snaps my view back to a known starting
   orientation, so that I can recover quickly after spinning the view around to look at
   something.
3. As a seated player, I want my view to start at Home the moment I join the table, so that I
   don't have to manually orient myself before the board looks right.
4. As a seated player, I want the rotate/Home controls to stay fixed on my screen regardless of
   my current rotation, so that the controls themselves are never confusing to read or click
   after I've rotated the view.
5. As a seated player, I want a fresh page load to put me back at Home, so that I don't have to
   remember or restore a rotation I'd left the view in during a previous visit.
6. As any player, I want my own rotation choice to have zero effect on what any other player at
   the table sees, so that rotating my view is a private, local action, not something I could
   accidentally do to someone else's screen.
7. As a developer maintaining the Tabletop, I want the rotation implemented as a CSS transform
   on a wrapper around `<Tldraw>` rather than through tldraw's own camera, so that it doesn't
   require (nonexistent) camera-rotation support and never touches the synced document.
8. As a developer maintaining the Tabletop, I want the temporary control strip visually marked
   as a placeholder, so that nobody mistakes its throwaway styling for a finished design
   decision once the real sidebar (a separate, larger idea) gets built.

## Implementation Decisions

- **Rotation mechanism**: a CSS `transform: rotate()` on a new "canvas pane" wrapper `<div>`
  that hosts `<Tldraw>`. tldraw's `TLCamera` schema (confirmed against the installed version)
  has no rotation field at all — pan/zoom only — so this is the only viable mechanism, and it's
  local-only: it never touches the synced tldraw document or any shape's own rotation.
- **States**: four discrete orientations — 0°, 90°, 180°, 270° — cycled by one control, in one
  direction. Scoped for tables of up to 4 players. A second, opposite-direction control may be
  added later based on player feedback; not built now.
- **Home**: a second control that resets the view to a canonical orientation. For this ticket,
  Home's target is **literally 0°/upright**, the same for every player regardless of seat — not
  seat-relative. (Seat-relative Home is deferred; see Out of Scope.)
- **Join behavior**: the view is at Home (0°, for this ticket) the moment a player's page
  finishes loading — no manual step needed to reach the "correct" starting orientation.
- **Persistence**: none. A page reload behaves like a fresh join and lands back at Home. No
  `localStorage`/`sessionStorage` involved (this would otherwise have been the Tabletop
  client's first use of either).
- **Controls placement and structure**: both controls (cycle, Home) render in a **fixed vertical
  strip in the bottom-right of the screen**, as a true DOM sibling **outside** the rotated
  wrapper — never a descendant of it. This means the controls never themselves visually rotate
  and need no counter-rotation logic, unlike tldraw's own in-canvas chrome (see next point).
- **tldraw's own chrome still rotates with the canvas**: `ToolbarWithCounter` and
  `TableContextMenu` (`TablePage.tsx`) render as descendants of `<Tldraw>`, which lives inside
  the rotated wrapper — so they visually rotate along with the canvas and need the
  counter-rotation + corner-anchoring compensation already anticipated for them. This ticket
  must implement that compensation for all four rotation states, not just one.
- **Control strip styling is explicitly design-exempt**: styled with a deliberately jarring
  color (an "ugly pink," per direction) rather than a considered design, and flagged as
  temporary/placeholder — it stands in for a future real sidebar (a separate, bigger idea, out
  of scope here). Check with the `shuffler-looks-like-itself` owner on whether the repo already
  has a "design-exempt" convention to reuse, or whether this establishes the first one.
- **Hit-testing risk, already checked**: `zoneHitTest.ts` and the `MtgCardShapeUtil`
  translate/drag hooks use only tldraw page-space coordinates (`getShapePageBounds`,
  `currentPagePoint`), never screen-space — so a CSS rotation on the wrapper's DOM ancestor is
  not expected to disturb pointer hit-testing or zone detection. Still confirm with
  `tabletop-shape-mechanics` before implementing, since this is the first time that wrapper
  gets a real transform applied to it.

## Testing Decisions

- One Playwright spec, following the existing pattern in
  `apps/tabletop/test/verification/verify-card-rotate.spec.ts` (bounding-box assertions on real
  rendered elements) and using the existing `openTable`/`placeCard` helpers
  (`test/verification/helpers.ts`).
- Test only externally observable behavior — click the cycle control, click Home — and assert on
  visible DOM state (the canvas wrapper's transform/bounding box vs. the fixed control strip's
  position), not on any internal rotation-state variable.
- Cover in that one spec: cycling through all four states in order; Home resetting to 0° from
  any of the four states; a fresh join already sitting at 0°/Home with no interaction; the
  control strip's own position/bounding box staying constant across all four canvas rotation
  states (proving it truly doesn't rotate).
- No separate unit test needed — confirmed with the user that the single black-box Playwright
  seam is sufficient; there's no internal "next rotation state" computation complex enough to
  warrant isolating.

## Out of Scope

- **Seat-relative Home / seat-aware default orientation.** Follow-on work, tracked separately
  (see the `tabletop-card-orientation` line added to the repo-root `TODO.md`), and blocked on
  this ticket landing first.
- **Cards and zones rotating in the shared document to face their owner.** This is a
  synced-document change (`cardLayout.ts` currently keeps every zone deliberately upright and
  unrotated), a different layer entirely from this ticket's local CSS-only view rotation. Also
  tracked in the same follow-on `tabletop-card-orientation` TODO line.
- **Client-side "which seat is this browser" association.** Only needed once Home or card
  placement become seat-relative — not needed for this ticket, since Home stays literal 0°
  here.
- **A real sidebar layout** (resized canvas + a reserved column, rather than a floating overlay
  strip). Explicitly deferred; the control strip here is a temporary floating placeholder, not
  a first step toward the real layout change.
- **A second, opposite-direction rotate control.** May be added later based on player feedback;
  not part of this ticket.

## Further Notes

- Surfaced 2026-08-10 via `/grilling` on the repo-root `TODO.md` line `tabletop-view-rotation`;
  this spec supersedes that line.
- The corner-anchoring side effect noted during grilling (rotating a parent flips which corner
  an absolutely-positioned child visually lands in, even after counter-rotating its content
  back upright) applies to `ToolbarWithCounter`/`TableContextMenu` at all four rotation states,
  not just one — budget real implementation time for this, it's not a one-line fix.
- Consult `tabletop-shape-mechanics` (`-review`) before implementing, and `shuffler-looks-like-itself`
  (`-review`) for the control strip's design-exempt treatment and corner placement, per the
  fleet-level `CLAUDE.md` owner-consultation process.

## Comments
