# Plan — ticket 18: Counters ride along on a card

Mountain: tabletop-replaces-mural
Ship: tabletop
Ticket: `.scratch/tabletop-physics/issues/18-counters.md` (decisions from `07-counters-that-ride-along.md`)

## What lands

A new custom shape type `mtg-counter` — a little circle with free editable text, blank by
default — that attaches to a card by dragging it on (tldraw parenting), detaches by dragging it
off, and auto-detaches to the table's edge the instant its host card leaves the battlefield.

## Verified tldraw 5.2.5 facts this plan stands on

(read from the installed source, `node_modules/@tldraw/editor` and `node_modules/tldraw`)

- `Editor.getDraggingOverShape` (Editor.ts:6571) returns the topmost unlocked shape under the
  pointer whose util defines **any** of `onDragShapesIn/Over/Out`/`onDropShapesOver`. Cards are
  unlocked, so — unlike zones — card-side target hooks genuinely fire.
- `DragAndDropManager` (tldraw/src/lib/tools/SelectTool/DragAndDropManager.ts) calls
  `canReceiveNewChildrenOfType(target, draggedType)` to filter receivable shapes, and when any
  are receivable it calls `onDragShapesIn` **and `editor.setHintingShapes([target])`** — the
  live hover-highlight is free, rendered as the card's hinted indicator.
- `canRemoveChildrenOfType` **defaults to `true`** (ShapeUtil.ts:572) — `onDragShapesOut` fires
  for our children without extra code.
- `BaseFrameLikeShapeUtil` is the reference implementation of attach/detach:
  `onDragShapesIn` → `editor.reparentShapes(shapes, card.id)` (guarded against ancestry cycles);
  `onDragShapesOut` → reparent to page **only when `!info.nextDraggingOverShapeId`** (so a
  counter dragged card-to-card reparents once, to the new card, not via the page).
- A parented shape's own `onTranslateEnd` never fires when only its parent moves (owner-confirmed,
  in the ticket) — battlefield-exit detach must live in the **card's** `onTranslateEnd`.
- `editor.animateShapes(partials, { animation: { duration } })` exists (Editor.ts:8713) — the
  detached counters can visibly scoot to the zone's edge.
- `canEdit(shape, info)` (ShapeUtil.ts:303) + `editor.getEditingShapeId()` is the stock
  double-click-to-edit path; a custom shape renders its own input while editing (tldraw's
  documented editable-shape pattern).

## Pieces

### 1. `src/shared/mtgCounterShape.ts` — props + TLGlobalShapePropsMap augmentation

```ts
interface MtgCounterShapeProps { w: number; h: number; text: string }
```

`text: T.string`, blank by default. No identity beyond its text (per ticket). Same file shape as
`mtgCardShape.ts` / `mtgZoneShape.ts`.

### 2. `src/client/shapes/MtgCounterShapeUtil.tsx`

`BaseBoxShapeUtil<MtgCounterShape>`, default ~44×44, `isAspectRatioLocked` true. Renders a
circle (`border-radius: 50%` — sanctioned for count discs) with the text centered.
`canEdit() => true`; while `editor.getEditingShapeId() === shape.id`, render an auto-focused
input writing `props.text` on change (stock double-click enters editing — no custom `onClick`,
deliberately avoiding mtg-card's PointingShape selection-deferral quirk). The editing input is
invisible chrome per the design owner: transparent background, no border, inherits the disc's
font/color — entering edit mode changes nothing visually except the caret. The input stops
pointer-down propagation so cursor-positioning clicks don't hit the canvas. Keystroke shielding
is free: `areShortcutsDisabled` is true while any shape is being edited.

**Look (design owner, from the `.hand-count` disc precedent — the app's one existing count
disc):** `--deep-space` fill, `3px solid var(--dark-pink)` border, `--light-pink` text,
`fontFamily: "var(--font-chrome)"`, inline `CSSProperties` with token `var()`s (no ship-local
stylesheet — that's an open decision this ticket must not resolve as a side effect). tldraw's
default indicator, unstyled. The counter's *appearance is a new decision pending Jess's
sign-off* — flagged in the final report; a `/design` gallery specimen is a cheap follow-up.

**Owner-required (Hazard A):** the counter defines its own `onTranslateEnd` calling
`this.editor.setSelectedShapes([])` — tldraw leaves any just-dragged shape selected, and a
stale counter selection re-arms the card's PointingShape drag-identity bug (drag counter, then
drag a card → the *counter* would move). Playwright covers exactly that sequence.

### 3. `MtgCardShapeUtil` — become a counter host

- `canReceiveNewChildrenOfType(shape, type)` → `!shape.isLocked && type === "mtg-counter"`
  (ticket 19 will add `"note"` later).
- `canRemoveChildrenOfType(shape, type)` → `type === "mtg-counter"` (**Hazard B**: the default
  is `true` for all types, and once mtg-card defines any drag hook every card becomes a drag
  target for every drag — without this gate, dragging card A across card B fires
  `B.onDragShapesOut(B, [cardA])`). Narrowing it also keeps `kickoutOccludedShapes` working
  for counters while never firing for cards.
- `onDragShapesIn(card, shapes)` → `editor.reparentShapes(shapes, card.id)` (with the
  frame-like ancestry guard), then normalize each counter's local `rotation: 0` —
  `reparentShapes` preserves page rotation, so a counter dropped on an already-tapped card
  would otherwise stay tilted forever after untap. Counters are card-aligned: they tilt with a
  tap (the riding-along visual) and always sit upright relative to the card.
- `onDragShapesOut(card, shapes, info)` → when `!info.nextDraggingOverShapeId`, reparent
  `shapes.filter(s => s.parentId === card.id)` (the dragged shapes that are currently my
  children — NOT my children wholesale) back to the page. Dropped anywhere on the page =
  detached where dropped; dropped on another card = `onDragShapesIn` of the new card wins.
- No auto-spacing: counters land where dropped, overlap freely (ticket says so).

### 4. Battlefield-exit detach — in the card's `onTranslateEnd`

Where the existing zone-transition detection already fires (the `if (zone)` branch, after the
`zone === previousZone` debounce): if the new zone is a **non-battlefield** zone, detach every
`mtg-counter` child.

- Battlefield = the playmat, the command zone, and the bare table (no zone). Non-battlefield =
  `graveyard | exile | library | stack`. (The ticket enumerates "graveyard, exile, hand,
  library"; there is no hand zone on the Tabletop, and the grilling's one-rule framing — "the
  instant the card leaves the battlefield" — puts the stack on the detach side. Flagging this
  interpretation for review.)
- Mechanism: `editor.getSortedChildIdsForParent(card.id)` → filter `type === "mtg-counter"` →
  `editor.reparentShapes(counters, currentPageId)` then `editor.animateShapes` each to an open
  spot near the destination zone's edge. Side-effect calls inside `onTranslateEnd` are already
  this util's pattern (`setSelectedShapes([])`).

### 5. `src/client/shapes/openSpotNearZoneEdge.ts` — pure placement function (unit-tested seam)

`findOpenSpotsNearZoneEdge(zoneBounds, spotSize, occupiedBounds[], count)` → page points just
**outside** the zone edge nearest the card's landing point, stepping sideways alternately from
that point, skipping candidates that intersect any occupied bounds; capped attempts, falls back
to overlapping placement rather than failing. Pure geometry over `Box`-like plain data — vitest
without an Editor.

### 6. Creation affordance — minimal toolbar tool (**assumption, flagged for Jess**)

The spec/ticket never say how a player gets a counter, but every acceptance criterion starts
from one existing, and story 13 has the *player* dragging counters. Smallest thing that makes
the feature real: a `StateNode` tool (`id: "mtg-counter"`) that creates one blank counter
centered on the click point and returns to the select tool, plus `uiOverrides.tools` and one
`TldrawUiMenuItem` appended to the default toolbar in `TablePage.tsx`. No icon asset work — use
a stock tldraw icon (e.g. the oval geo icon). If this is more UI than map 4 wants pre-empted,
the fallback is programmatic-only creation, but then no player can use the feature.

### 7. Sync registration — all three places, same deploy (spec's mandatory list)

- `TablePage.tsx` `shapeUtils` array (feeds both `useSync` and `<Tldraw>` — already one shared
  const) + `tools` prop + toolbar override.
- `rooms.ts` schema: `"mtg-counter": { props: mtgCounterShapeProps }`.

## Verification (written first, watched failing)

- **vitest**: `test/openSpotNearZoneEdge.test.ts` — spots sit outside the zone, near the entry
  edge, don't overlap occupied bounds, fall back gracefully when crowded.
- **Playwright**: `test/verification/verify-counter.spec.ts` (pattern of
  `verify-zone-entry.spec.ts` — real mouse drags, `Shift+1` zoom-to-fit, deterministic shape
  ids):
  1. Toolbar tool creates a blank counter.
  0. Drag a counter, then drag a card — the card (not the stale-selected counter) moves
     (Hazard A regression).
  2. Drag counter onto a card → dragging the card afterward moves the counter with it
     (bounding-box delta equality).
  3. Drag counter off the card → dragging the card no longer moves it.
  4. Multiple counters on one card can overlap (drop two at the same spot; both attached).
  5. Drag the host card into the graveyard → counter ends up **outside** the graveyard's
     bounds, near its edge, still on the table.
  6. Double-click counter, type "+1/+1" → text renders.
  (Hover-highlight during drag is tldraw's hinted-indicator DOM; asserted cheaply via
  `.tl-hint`-class presence if stable, else dropped from automation and eyeballed.)

## Risks / open questions for owners

- Does defining drag hooks on `mtg-card` disturb existing card dragging, zone entry, or the
  onClick/PointingShape quirk? (My read: no — hooks only matter when the card is the *target*,
  and receivables are type-gated to counters.)
- `kickoutOccludedShapes` (auto-reparent on geometry exit) also consults
  `canRemoveChildrenOfType` — any interaction with resize? Cards don't resize children today.
- Stack-counts-as-leaving-battlefield interpretation (above).
- Counter visual treatment + toolbar-item design want the design owner's eye.

## Review outcomes (both owners, 2026-08-08)

Verdict: plan holds. Amendments adopted:

- **Name collision (both owners' blocker):** table-layout ticket 12 uses `mtg-counter` as the
  *working name* for a locked life/commander-damage furniture shape. Ticket 18 + the
  tabletop-physics spec explicitly assign `mtg-counter` to THIS shape (and MTG vocabulary
  agrees — a "counter" is the thing on a card). Resolution: keep `mtg-counter` here per the
  authoritative ticket; buoy a rename of the life-total working name (`mtg-life-counter`?);
  flag to Jess in the report. The sync-schema slot goes to this shape knowingly, not silently.
- **Stage, don't argue:** the `.hand-count` disc treatment gets a `/design` gallery specimen
  (Shuffler, `.stage-white`, labelled mock) in the same commit — the sanctioned cross-ship
  exception; the gallery speaks for the Tabletop.
- Rotation-zero on attach uses the center-preserving math `onClick` already uses (zeroing
  rotation alone swings a disc ~18px around its top-left corner).
- Counter's `onTranslateEnd` cleanup has no early return above it.
- Pointer-events: the disc needs a `pointer-events: all` wrapper (`.tl-image-container`
  pattern) or double-click-to-edit never lands; input pointer handlers use
  `editor.markEventAsHandled`.
- Border token: `var(--narrow-border) solid var(--dark-pink)` (not a raw 3px); font
  `--font-chrome`, bold, centered, sized proportional to `props.h` (resize stays on; fixed
  px would drift out of proportion — playmat-radius lesson). `border-radius: 50%` is safe only
  because aspect lock keeps the box square — commented.
- Edit input suppresses its native focus outline with the sanctioned canvas-exemption comment.
- Playwright additions: Hazard A sequence; after dragging host card with counter, drag a
  *different* card (cleanup still works with children).
- `toSvg`: skipped, consistent with mtg-card/mtg-zone (neither implements it) — buoyed as a
  three-shape gap rather than solved piecemeal here.
- Behavioral notes accepted: detach fires only on zone *change* (a counter attached to a card
  already in the graveyard stays); bare table = battlefield (check lives inside `if (zone)`).
