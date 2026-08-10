# Card tucking / attach (tabletop-physics ticket 20) — abandoned 2026-08-10

Two implementations of "one card rides under/with another" were built and reverted in one day.
Recording why, so a future attempt doesn't repeat either mistake or waste time re-discovering
tldraw's group/selection behavior. The feature does not exist right now — cards can be manually
reordered and grouped with tldraw's own stock UI, and that's it.

## Attempt 1: real parenting (`dada48a`, ticket 20 as originally specced)

A card dropped onto another became a genuine tldraw child (same mechanism as counters/notes,
tickets 18/19). Broke on the very first live test: "send to back" on a tucked card did nothing.
Root cause, confirmed against tldraw source: `Editor.getUnorderedRenderingShapes` gives every
descendant a strictly higher z-index than its own ancestor, unconditionally — a child can
*never* paint behind its own parent, no matter what reorder command runs. And tldraw's reorder
actions (`getReorderingShapesChanges`) only reorder shapes against their siblings, so a lone
child's reorder against its own parent is a silent no-op. Real parenting between two cards made
the ticket's core requirement structurally impossible.

## Attempt 2: `meta.tuckedWith` link + live z-order host (`8e39b0d`)

Fix for attempt 1: stop parenting cards to each other. Keep them as ordinary page siblings,
linked by a `meta.tuckedWith` pointer written on both sides; "host" (whoever's drag carries the
other) computed live from current z-order (`current.index > partner.index`) instead of fixed at
attach time; drag-carry hand-rolled in `onTranslateEnd`.

This shipped, then broke worse: cards started flying to/away from each other unpredictably.
Root cause, confirmed against `DragAndDropManager` source
(`node_modules/tldraw/src/lib/tools/SelectTool/DragAndDropManager.ts`): `onDragShapesIn` fires
every time the shape you're hovering over *changes* during **any** drag — not just on drop. So
merely dragging card A past card B (never intending to drop it there) silently tucked them
together, calling `bringToFront(A)` as a side effect. There is no analogous un-tuck when the
drag continues past B — `canRemoveChildrenOfType` only ever returned true for counters/notes,
never for a tucked card, because a tucked card was deliberately never a real child (that's the
whole point of this attempt). So the accidental link stuck, and the `bringToFront` call
corrupted the very z-order the "who's the host" check depended on. Next time you dragged either
card — even far away, unrelated to the first drag — it could yank its accidentally-tucked
partner along for the whole trip.

Lesson: **writing persistent state from a live-hover preview hook (`onDragShapesIn`) needs an
exit path symmetric to the entry path.** The real-children case (counters/notes) has one
(`onDragShapesOut` reparents back to the page); this one didn't, because "detach" was never
wired as a hover-exit event, only as a distance check on drag-*settle*.

## Redesign explored but not built: attach-via-group

Discussed at length before abandoning; recorded here in case it's picked back up.

- **Attach**/**Detach** as explicit context-menu actions (not a drag/hover side effect at all —
  this alone would have avoided attempt 2's whole failure mode). Attach visible only when the
  selected card currently overlaps exactly one other card/group; joins or creates a real tldraw
  `group` shape, ordering the attached card to the back of it. Grouping under a neutral third
  shape sidesteps attempt 1's blocker too, since neither card is the other's ancestor.
- Two real blockers surfaced by `owners/tabletop-shape-mechanics` review, both solvable but
  neither trivial:
  1. tldraw resolves a click on any group member up to the group itself unless you've
     double-clicked to drill in, and stock `GroupShapeUtil` has no `onClick` — so tapping a
     creature that has anything attached would silently stop working. Fix would be a subclassed
     `GroupShapeUtil` that re-queries `editor.getShapeAtPoint()` (tldraw doesn't pass the click
     point to `onClick`) and forwards to whichever member was actually hit.
  2. Dragging an undrilled group only fires tldraw lifecycle hooks (`onTranslateEnd`) on the
     *group* shape, never on member cards — so zone-entry/eviction logic (tickets 18/19) would
     need the group's own hook to explicitly delegate to the top member's existing hook, rather
     than firing naturally.
  3. Found but not fully resolved: tldraw's native Ctrl+G leaves the new group selected with no
     drag involved at all, which the planned `onTranslateEnd`-based selection-clear fix doesn't
     cover — a real gap that would need either disabling the native group shortcut or adding an
     explicit clear right after it fires.
- Auto-detach (pulling one card out of a pile) was designed as: double-click to drill into the
  group (tldraw's native "enter group" gesture), drag that one card, and if its position *at
  settle* — never live, mid-drag — ends up more than a card's-width from the other members'
  combined bounds, it detaches.

## Why abandoned rather than fixed again

Jess: this was blocking deploys of unrelated features, cost a full implementation-and-revert
cycle already, and the group-based redesign — while structurally sound — has enough open
tldraw-behavior edge cases (see above) that it needs more thought/user input before a third
attempt. Manual reorder + tldraw's stock grouping cover the need for now.

Ticket: `.scratch/tabletop-physics/issues/20-cards-behind-cards.md` (status: wontfix, points
here). Owner history: `owners/tabletop-shape-mechanics/history.md`, "What Was Tried and
Abandoned".
