# 02 — Counter-rotate tldraw's own chrome so it stays legible

**What to build:** Once the canvas pane rotates (ticket 01), tldraw's own stock UI —
`ToolbarWithCounter` (`TablePage.tsx`, wraps `DefaultToolbar`) and `TableContextMenu`
(`CardContextMenu.tsx`, wraps `DefaultContextMenu`) — rotates along with it, because both
render as descendants of `<Tldraw>` inside the rotated wrapper, and their positioning comes
entirely from tldraw's own `tldraw.css`, not app code. A seated player who has rotated their
view still needs the toolbar and context menu to read upright and stay anchored to the same
visual corner of the screen, at all four rotation states (0°/90°/180°/270°) — not just one.

This is not a one-line counter-rotation: rotating a parent flips which corner an
absolutely-positioned child visually lands in, even after its own content is counter-rotated
back upright, so the corner-anchoring itself has to be compensated per rotation state, for both
components.

**Blocked by:** 01 — Local view rotation with cycle + Home controls (needs the rotation wrapper
and rotation state to exist)

**Status:** ready-for-agent

- [ ] `ToolbarWithCounter` reads upright and stays anchored to its intended screen corner at all
      four rotation states.
- [ ] `TableContextMenu` reads upright and stays anchored to its intended screen position at all
      four rotation states.
- [ ] Verified visually (or via bounding-box assertions, extending
      `verify-view-rotation.spec.ts` from ticket 01) at each of the four states — this is
      explicitly the risky/non-trivial part of the spec, budget real implementation time rather
      than treating it as a quick fix.
- [ ] Update `tabletop-shape-mechanics-update` with what actually landed, since this is the
      first time the canvas wrapper carries a real transform and future shape-mechanics work
      will need to know how tldraw's own chrome was compensated.
