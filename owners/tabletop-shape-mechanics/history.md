# History

## Origin: Tap/Untap (JES-144)

- **`7bb13f8`** - Tabletop: rotate a card 90° by clicking it (essential slice) — first
  `onClick` override on `MtgCardImageShapeUtil`, introducing the tldraw quirk this owner exists
  to track (see below).
- **`98f8bea`** - Fix card rotation to pivot around its center, not top-left corner — tldraw
  rotates shapes around `x,y` (top-left), so the initial rotation implementation swung the card
  around its corner instead of spinning in place. Fixed with the `halfExtent`/`center`/`topLeft`
  math still in `onClick` today.
- **`263d1d6`** - Tap/untap toggle instead of a 4-way rotation cycle — changed the gesture from
  "rotate 90° each click" to "toggle between 0° and 90°," matching the physical tap/untap
  gesture rather than a generic rotation control.

## Zone Entry Detection

- **`600cac1`** - Detect card zone entry via `onTranslateEnd`, log it
  (`.scratch/tabletop-physics/issues/01-instrument-the-harness.md`-adjacent ticket
  `01-zone-entry-events`). Chose `onTranslateEnd` (fires once, on the moved card, when a drag
  settles) over `onDragShapesOver`/`onDropShapesOver` (fire on the *target*, every frame during
  drag) because zones are stock locked `geo`/`image` shapes with no ShapeUtil of their own to
  hang a target-side hook on. Debounces on the card's own `meta.zone` so re-entering a
  previously-left zone still counts as fresh, but staying put doesn't. Notification is a bare
  `console.log` for now (Jess, 2026-08-06: no consumer wired yet — that's a later ticket's job).

## Tabletop Drag Picked Up the Wrong Card — Found and Fixed (2026-08-07, `959831c`)

**Bug** (reported by Jess): play two cards, drag one, then drag the *other* (still-unmoved) card
— the first card silently moved again instead of the one under the pointer.

- **Root cause**, confirmed with a Playwright reproduction, not guessed: `MtgCardImageShapeUtil`
  defines `onClick` (for tap/untap, above), which makes tldraw's own `SelectTool` treat card
  shapes specially. tldraw's `PointingShape.onEnter` defers selecting the pointed-at shape until
  pointer-up whenever the hit ShapeUtil defines `onClick`. Its `startTranslating` safety net only
  force-reselects the actually-hit shape when *nothing* is currently selected — but tldraw
  leaves the just-dragged card selected after a drag ends. So on the next drag (of a *different*
  card), the safety net's guard is false, nothing gets reselected, and `Translating.onEnter`
  translates the still-selected *first* card using the pointer deltas from the second drag.
  Verified with `document.elementFromPoint` during the repro: the pointer correctly resolved to
  the second card's DOM element, yet the first card moved — confirming the bug lived in tldraw's
  selection state machine, not hit-testing or DOM z-order.
- **Fix**: `onTranslateEnd` now calls `this.editor.setSelectedShapes([])` unconditionally, right
  after the `meta.instanceId` guard and *before* the zone-equality early return (some drags — two
  lands on the same playmat — hit that early return, so the clear has to happen first). This
  empties the selection on every drag settle, so the next drag's `startTranslating` safety net
  correctly fires and reselects whichever card is actually under the pointer.
- **Test**: `apps/tabletop/test/verification/verify-drag-identity.spec.ts` — plays two
  non-overlapping lands, drags the first, then drags the second, and asserts the second card
  moves while the first stays exactly where its own drag left it. Failed before the fix,
  reproducing the bug bit-for-bit; passes after.
- **Full detail in `architecture.md`** — this is the load-bearing mechanism this owner exists to
  track.

### This owner's own origin story

The finding above initially landed entirely in `owners/two-faced-cards/` — its trigger ("the
Tabletop's card rendering (apps/tabletop)") was broad enough to catch a change to
`MtgCardImageShapeUtil.tsx` even though the bug had nothing to do with card faces, flip, or
`CardDefinition`. That cost a real round-trip: the fix required consulting `two-faced-cards`
for a question it had no stake in, and the finding then lived in the wrong owner's history and
watch points (watch point 16 in `owners/two-faced-cards/interactions.md`, and the matching
`history.md` entry there — both migrated out to this owner on creation, 2026-08-07, leaving a
short cross-reference behind in `two-faced-cards`).

Jess's call (2026-08-07): shape-selection mechanics is complex enough, and distinct enough from
card-face rendering, to warrant its own standing owner — `tabletop-shape-mechanics` — so future
tldraw shape/selection/drag bugs route here instead of being caught incidentally by a
card-rendering owner's overly broad trigger. This KB (`README.md`, `architecture.md`,
`interactions.md`, this file) was seeded from that fix and from reading
`MtgCardImageShapeUtil.tsx` and tldraw's `PointingShape.ts`/`Translating.ts` end to end.

## Ticket 12: `mtg-card` becomes a genuine custom shape type (2026-08-08)

Implements the rewrite decided by ticket 02 (`.scratch/tabletop-physics/issues/02-what-a-card-is.md`,
resolved 2026-08-07). Replaced `MtgCardImageShapeUtil` (extended tldraw's `ImageShapeUtil`,
sharing tldraw `type: "image"` with furniture and stray drops) with `mtg-card`, a genuine custom
shape type: `apps/tabletop/src/shared/mtgCardShape.ts` (props, validators, `TLGlobalShapePropsMap`
registration) and `apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` (extends
`BaseBoxShapeUtil<MtgCardShape>`; old file deleted).

- **New tldraw fact** (a KB gap an earlier `-context` call flagged): a custom shape needs
  `declare module "@tldraw/tlschema" { interface TLGlobalShapePropsMap { 'my-type': MyProps } }`
  to join tldraw's ambient `TLShape` union — without it, `BaseBoxShapeUtil<MyShape>`'s generic
  constraint fails to typecheck, since a hand-rolled `TLBaseShape<'my-type', Props>` is never a
  member of that closed union on its own. tldraw's own documented pattern; now in
  `architecture.md`.
- **New gotcha**: `useSync`'s schema-building does NOT fold in tldraw's own default shape utils
  the way `<Tldraw shapeUtils={...}>` does — passing `shapeUtils: [MtgCardShapeUtil]` alone to
  `useSync` silently dropped geo/image/text/etc. from the *client* store's validation schema,
  breaking furniture sync. Fixed by spreading `defaultShapeUtils` in (`TablePage.tsx`). The
  server side has the mirror gotcha: `createTLSchema({ shapes: {...} })` also doesn't
  default-fill omitted shapes — fixed by spreading `defaultShapeSchemas` in `rooms.ts`. Missing
  either breaks furniture, not cards, and the server-side miss disconnects clients outright
  rather than degrading quietly.
- **New gotcha, the one that broke every click-based Playwright spec until found**: tldraw's
  `.tl-html-container` is `pointer-events: none` by default, and pointer-events inherits, so a
  bare `<img>` inside `<HTMLContainer>` was unclickable ("tl-background intercepts pointer
  events"). Fixed by reusing tldraw's own `.tl-image-container`/`.tl-image` classes (which set
  `pointer-events: all`) instead of inventing inline styles.
- The `meta.instanceId`/`meta.scryfallId`/`meta.cardName` guard at the top of
  `onClick`/`onTranslateEnd` — needed only because cards/furniture/stray-drops shared
  `type: "image"` — is now dead weight and was removed. `mtg-card` is its own exclusive type, so
  every instance is a real card by construction; identity now lives in validated `props`. `meta`
  survives only for zone-entry dedup (`meta.zone`) — ticket 13 will move that to reading
  `mtg-zone` shapes' props instead.
- Rotation-as-delta and the `onTranslateEnd` selection-clearing workaround (both already
  documented above) carried forward unchanged in substance: tap is now `props.tapped` (no more
  `UNTAPPED_EPSILON` float-tolerance readback from rotation), with rotation applied as
  `shape.rotation ± 90°` (a pure visual delta) so free rotation and tap compose independently.

Full detail in `architecture.md` (Registration sections, "The `meta` guard is gone", "Ticket
02/12: the rewrite, landed") and `interactions.md` (watch point 6, new).

## Ticket 13: furniture becomes a genuine custom shape type, `mtg-zone` (2026-08-08)

Implements the rewrite buoyed alongside ticket 02 (`.scratch/tabletop-physics/
issues/03-what-furniture-is.md`) for the same "one shared type, several meanings" reason: the
playmat, library, graveyard, exile, and the Stack were stock, locked `geo`/`image` shapes tagged
with a freeform `meta.zone` string — indistinguishable at the type level from a stray dropped
JPEG. Ticket 13 gives furniture its own type: `apps/tabletop/src/shared/mtgZoneShape.ts`
(`MtgZoneShapeProps` — a closed `zone` enum, `seatId`, `label` — plus the `TLGlobalShapePropsMap`
registration, same pattern as `mtgCardShape.ts`) and `apps/tabletop/src/client/shapes/
MtgZoneShapeUtil.tsx` (`BaseBoxShapeUtil<MtgZoneShape>`).

- **Confirms, rather than introduces, the KB's core patterns** — a good sign the patterns
  generalize. The four-step registration recipe (watch point 6) applied cleanly to a second shape
  type with no new gotcha, except that step 4 (the `.tl-image-container` pointer-events fix)
  turned out to be *conditional*: it only matters for a clickable shape, and `mtg-zone` isn't one,
  so `MtgZoneShapeUtil.component()` correctly skips it.
- **New concrete example, not just an abstract claim**: `MtgZoneShapeUtil` defines no
  `onClick`/`onTranslateEnd`/`onDragShapesOver` at all. Confirmed safe during `-review`, by
  reading tldraw source rather than assuming: zones are always `isLocked: true`, `SelectTool`'s
  `Idle` state gates on `isLocked` before a shape ever reaches `PointingShape` (so watch point 1's
  quirk is structurally unreachable — even a future `onClick` on a locked shape wouldn't reopen
  it, since the quirk's own gate sits behind the same `isLocked` check), and
  `Editor.getDraggingOverShape` filters `!isLocked` before checking drag-over hooks (so a
  target-side hook on the zone could never fire regardless). New watch point 7 records this.
- **Card-side `zoneAt()` upgraded** (`MtgCardShapeUtil.tsx`): from scanning any shape for a bare
  `meta.zone` string to filtering `candidate.type === "mtg-zone"` and reading the validated
  `candidate.props.zone`. Also newly resolves overlapping zones — previously undefined — by
  picking the greatest `index` (an `IndexKey`; plain string comparison already reflects z-order
  for tldraw's fractional-indexing scheme, confirmed against `@tldraw/utils`'s
  `fractionalIndexing.ts` source during `-review`, not just the docs), i.e. topmost-drawn wins.
  `meta.zone` on the *card* survives only as the zone-entry dedup value, unchanged in role.
- **Server-side** (`tableFurniture.ts`): `zoneShape()` builds real `mtg-zone` records; the old
  `RegionStyle`/`DEFAULT_REGION_STYLE`/`PLAYMAT_REGION_STYLE` machinery is deleted — visual
  treatment (dashed vs. playmat's solid border) now lives in `MtgZoneShapeUtil.component()`,
  branching on `props.zone`. The playmat/library background *pictures* remain stock `image`
  shapes, unaffected.
- **Two incidental bug fixes landed in the same pass** (recorded in `architecture.md`, not
  specific to `mtg-zone` itself but surfaced while touching this code): `ensureStackStripWidth`
  was minting a fresh top-of-z-order `index` on every call, silently promoting the Stack over
  other shapes every time a new seat joined — fixed to reuse the existing shape's `.index` when
  present. The seat name label's `isLocked` was `false`, letting any player drag/delete another
  player's name — fixed to `true`.

Full detail in `architecture.md` ("Ticket 13: furniture becomes a genuine custom shape type,
`mtg-zone`") and `interactions.md` (zone-detection section, watch point 6's item-4 caveat, new
watch point 7).

## What Was Tried and Abandoned

Nothing yet beyond the above. If a future fix attempt for a similar quirk is tried and reverted,
record it here so the next person doesn't repeat it.
