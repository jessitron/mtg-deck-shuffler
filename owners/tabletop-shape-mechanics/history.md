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

## Ticket 14: zone appearance, dashed at rest / glow when armed (2026-08-08)

`.scratch/tabletop-physics/issues/14-*.md` gave zones a live "armed" visual state on top of
ticket 13's dashed-at-rest look: a glow while a dragged card hovers over them. This is the first
change in this KB's history driven purely by a *rendering* need that nonetheless required new
*mechanics* — a live, drag-in-progress hit test, not just the existing drag-*settle* one.

- **`topmostZoneAt()` extracted** from `MtgCardShapeUtil.zoneAt()`'s inline scan into new
  `apps/tabletop/src/client/shapes/zoneHitTest.ts`, confirming watch point 8's prediction that a
  second consumer of the topmost-zone-wins tie-break would show up. `zoneAt()` now just calls it.
- **New reactive-signal pattern**: `zoneHitTest.ts` also exports `useIsZoneArmed(editor, zoneId)`,
  backed by one `computed()` per `Editor` instance (a lazy `WeakMap`, not one `computed` per zone
  shape — avoiding O(zones²) rescanning during a drag, since tldraw's `Translating` state updates
  position on every raw pointer-move, unthrottled). The computed checks
  `editor.isIn("select.translating")` — confirmed against tldraw source
  (`PointingShape.ts`'s `startTranslating` transitions into exactly that state string) and against
  a live Playwright drag, not assumed from the name.
- **First "read reactively, write nothing" hook in this KB.** `MtgZoneShapeUtil.component()` calls
  `useIsZoneArmed` unconditionally at the top, purely to drive rendering — no store write, no undo
  entry, no sync traffic. Confirmed via a two-browser-context Playwright test
  (`verify-zone-armed.spec.ts`) that the armed state is genuinely local: client A's drag never
  shows armed styling on client B's copy of the same zone. Every prior hook in this KB (`onClick`,
  `onTranslateEnd`) writes to the store; this is the first one that doesn't.
- `MtgZoneShapeUtil` still defines no `onClick`/`onTranslateEnd`/`onDragShapesOver` — the whole
  feature lives inside `component()`, consistent with watch point 7.

Full detail in `architecture.md`'s "Ticket 14" section and `interactions.md` (watch point 8's
tie-break language repointed at `topmostZoneAt`, new watch point 9, and a new `Depends On` note
about `"select.translating"`).

### Correction, same day (`05235aa`): armed zone is one, keyed on the pointer, not one per selected shape

A code-review finding on the first cut of `useIsZoneArmed` argued the single-shape version missed
multi-card drags, and pushed the signal toward computing a *set* of armed zone ids — one per
`editor.getSelectedShapeIds()` entry. Jess corrected that directly: selecting several cards and
dragging one moves the whole group together to **one** destination ("select six cards, drag one to
the graveyard — I want all of them to go to the graveyard"), so arming multiple zones during a
multi-select drag was wrong, not a missed edge case. The review finding optimized for "handles more
inputs" without checking that against what the app is actually supposed to do.

- Reverted to a single armed zone id, but re-derived how it's found: instead of reading each
  selected shape's own bounds (which also depended on `getSelectedShapeIds()`'s iteration order to
  mean anything when there were several), `armedZoneIdSignal` now resolves `topmostZoneAt` against
  **`editor.inputs.currentPagePoint`** — the pointer's own page-space position, confirmed
  atom-backed/reactive at `node_modules/@tldraw/editor/src/lib/editor/managers/InputsManager/
  InputsManager.ts:90`. This is robust regardless of selection size: single-card and six-card drags
  both arm exactly one zone, the one under the cursor.
- New regression test in `verify-zone-armed.spec.ts`: "dragging a multi-card selection arms only
  the one zone under the pointer, not one per card" — shift-clicks two cards into a selection,
  drags the group toward the graveyard, and asserts only the graveyard arms while a second zone
  (exile) that one of the other selected card's own unmoved bounds would otherwise have overlapped
  does not. Uses `zoneHint: "battlefield"`, not `"stack"`, so the two cards land at distinct grid
  positions rather than stacking exactly on top of each other — same-position stacking made
  click-selecting the second card ambiguous in the test.
- The O(zones²)-avoidance rationale for one shared `computed()` per editor (rather than one per
  zone shape) is unchanged by this correction — only what the computed resolves *against* changed.

Full detail in `architecture.md`'s "Corrected, 2026-08-08" subsection and `interactions.md`'s watch
point 9 (rewritten to describe the pointer-based approach, not the per-selected-shape one).

## "The Square" — design decided, `zoneAt()` risk flagged (2026-08-08)

`.scratch/tabletop-table-layout/issues/10-the-square.md` resolved the wayfinder ticket "Design
the square — seats around the Stack instead of a row." **Design only — no code changed.**
`apps/tabletop/src/server/cardLayout.ts` and `tableFurniture.ts` are untouched; building this is
separate future work. Decision recorded in `apps/tabletop/DESIGN.md`'s new "The square" section:
player areas move from a row into compass slots (N/E/S/W) around a fixed-size centered Stack, by
join order (1→S, 2→S,N, 3→S,N,E, 4→S,N,E,W). No per-viewer rotation (reconfirmed hard tldraw/
platform limit, out of scope). Every player area stays upright/unrotated in world space — same
internal layout as today, just repositioned.

This owner was consulted during the grilling session (via `-context`) and flagged a real risk for
whoever eventually builds this: `zoneAt()` in `MtgCardShapeUtil.tsx` is first-match-not-
closest-match, with no orientation awareness — it only tests whether a card's center falls
inside a candidate zone's AABB, first match wins in whatever order
`getCurrentPageShapes()` returns. That "wasn't a problem worth naming when zones were spread out
in a row" (gaps between player areas made bounds essentially non-overlapping by construction),
but becomes a live risk once the square packs E/W zones close to the Stack's corners —
overlapping/abutting zone AABBs could cause wrong-zone detection. Recorded as watch point 8 in
`interactions.md` so it's on record before implementation starts, not discovered mid-build.

## Life counters — `mtg-counter` decided, mechanics facts recorded (2026-08-08)

`.scratch/tabletop-table-layout/issues/12-life-totals-and-commander-damage.md` resolved the
wayfinder ticket "Life totals and commander damage." **Design only — no code changed.** (Not to
be confused with `tabletop-physics` ticket 12, the `mtg-card` rewrite above — two maps, two
"ticket 12"s.) Decision: a life counter is a **third custom shape type**, working name
`mtg-counter` — locked furniture whose `component()` renders a number with +/- buttons and a
directly-typeable field; everyone can press anyone's buttons; syncs as ordinary shape props.

This owner was consulted during the grilling session (via `-context`) and its findings — read
from tldraw source, explicitly asked to be recorded here — settled the core design question:

- **Locking gates tldraw's gesture state machine, not DOM events.** `SelectTool`'s `Idle`
  filters `isLocked` before `PointingShape`; `getDraggingOverShape` filters `!isLocked`; neither
  touches DOM dispatch inside `component()`. A locked shape can host working buttons — this fact
  is what made "locked furniture with live controls" viable.
- **The canonical control pattern is tldraw's own `HyperlinkButton`**: `pointer-events: all` on
  the control + `editor.markEventAsHandled(e)` in `onPointerDown`/`onPointerUp` (`Editor.ts:10876`,
  checked by `useCanvasEvents`' `wasEventAlreadyHandled`), preferred over the older
  `stopEventPropagation` util.
- **tldraw sync is last-writer-wins, not a CRDT** — simultaneous prop writes can lose an
  increment. Accepted for counters; also why story-quality life-change records need an event per
  press (parked at `.scratch/tabletop-replaces-mural/parked/life-change-events.md` for Map 5).

KB consequences: new `architecture.md` section ("`mtg-counter`: decided, not built"), new watch
point 9 in `interactions.md`, and a precision fix to watch point 6's item-4 caveat — its
condition was restated from "the shape is clickable" (which `mtg-zone`'s writeup had justified
with "locked shapes are never clicked") to "the component's content is interactive," since
`mtg-counter` will be locked *and* clicked. Watch point 7 gained the matching clarification that
"no interaction hooks" never meant "no interactivity." Forward-looking cautions recorded for the
implementer: full four-step registration cost including the pointer-events step `mtg-zone` never
exercised, and keystroke shielding for the typeable field.

## Table-layout ticket 13: command-zone redraw — `zone: "command"` becomes placed furniture, zone AABBs strictly disjoint by tested invariant (2026-08-08)

**Ticket-number collision warning**: this is `.scratch/tabletop-table-layout/issues/13-*.md`
(commits `1046b93` + `b18bd16`), NOT the `tabletop-physics` ticket 13 above that created
`mtg-zone`. Same two-maps-two-numbers trap as the two "ticket 12"s. This one is mostly
*placement* territory (`cardLayout.ts` geometry — normally this owner's "Not Related To" list),
but two of its consequences land squarely in this KB's charge:

- **`zone: "command"` went from enum-only to placed furniture.** The enum value existed since
  the `mtg-zone` rewrite but nothing ever drew one; `ensurePlayerArea` (`tableFurniture.ts`)
  now puts a locked `mtg-zone` per seat (id `region-command-<table>-<seatId>`, label
  "Command Zone", `seatId` set, `nextIndex()` at creation — same recipe as the other zones).
  **No interaction hooks added** — consistent with watch point 7; a new zone instance costs
  nothing mechanically. The stale "command isn't placed yet" comments in `tableFurniture.ts`
  and `mtgZoneShape.ts` were deleted. Geometry: the right-hand column widened 425→550
  (Library + 20 gap + a 360-wide two-card Command Zone beside it, for partner commanders);
  Exile moved below Graveyard (Graveyard 550×449 top two-thirds, Exile 550×225 bottom third).
- **Zone AABBs are now strictly disjoint by *asserted invariant*, not by accident of layout.**
  Every pair of zone bounding boxes — within a seat's column and between neighboring player
  areas — has a 20-unit gap (`GAP`, newly exported from `cardLayout.ts` along with a `Bounds`
  interface), asserted pairwise in `apps/tabletop/test/cardLayout.test.ts` with a comment
  naming the reason: an overlapping point would resolve via `topmostZoneAt()`'s draw-order
  tiebreak — deterministic but semantically meaningless. This upgrades watch point 8's premise
  from "bounds essentially never overlapped, by construction of the layout, not the code" to a
  tested guarantee — *for the row layout*. The "square" risk in watch point 8 is unchanged:
  whoever builds it inherits both the risk and now a test that will fail loudly if their
  geometry breaks disjointness.
- **Known gap, degrades gracefully** (flagged by this owner's `-review`): `ensurePlayerArea`
  never redraws — it's idempotent on seatId — so pre-existing tables keep old-geometry
  furniture and get no Command Zone. Zone detection just never reports `command` there;
  nothing breaks.

## Table-layout ticket 14: "the square" built — watch point 8's risk resolved by geometry, not a new tiebreak (2026-08-08, `5eeac70`)

Implements the design recorded above ("The Square — design decided"). `.scratch/tabletop-table-layout/issues/14-build-the-square.md`, worktree `ticket-14-the-square`. Placement territory (`cardLayout.ts`/`tableFurniture.ts` geometry), but it discharges this KB's biggest open question and changes two things zone detection leans on:

- **Watch point 8's "square" risk is closed — the tiebreak question never had to be answered.**
  The row layout is gone: seats take compass slots (S, N, E, W by join order) around a fixed
  1000×1000 Stack square centered on the board origin (`STACK_SIZE`, `stackBounds()`,
  `playerAreaOrigin(seatIndex)` in `cardLayout.ts`; `playerAreaX`/`stackStripBounds` deleted).
  `STACK_SIZE = 1000` was chosen specifically to exceed `PLAYMAT_H` (952), so the E/W areas —
  vertically centered on the origin, y in [-476, 476] — stay inside the Stack's vertical band and
  can never overlap the N/S areas (which sit beyond ±600). The disjointness invariant is now
  asserted **across all four seats AND the Stack**, and strengthened from "no overlap" to "at
  least a `GAP`-wide (20-unit) empty band between every pair of zone AABBs" — a `separation()`
  helper in `apps/tabletop/test/cardLayout.test.ts` ("keeps every zone AABB at least a GAP apart,
  across all four seats and the Stack"), per this owner's `-review` ask. `topmostZoneAt()`'s
  first-match-by-z-order semantics are unchanged and still fine, because geometry keeps first
  match and correct match identical.
- **Most furniture now sits at negative page coordinates.** `topmostZoneAt` was verified
  sign-agnostic during this owner's `-review` (it compares page bounds, no assumption of positive
  coords). The camera risk the review flagged — tldraw opens with page (0,0) at the viewport's
  top-left, so a centered-on-origin layout is mostly off-screen, breaking Playwright's
  actionability checks — is handled in `TablePage.tsx`'s `aimCameraAtTheTable()`. *As first
  landed* (`5eeac70`) it zoomed-to-fit current content at mount, or listened on the store for the
  first **remote** shape arrival on an empty table — **superseded the same day; see the `96159be`
  correction below.** It now does one deterministic `editor.zoomToBounds(TABLE_EXTENT,
  { inset: 24 })` at mount and never moves the camera on its own again. A tldraw deep link
  (`?d=` in the URL) still suppresses it.
- **`ensureStackStripWidth` is now `ensureStackDrawn`** (`tableFurniture.ts`): draws the fixed
  Stack square once, guarded by `store.get(stackId)` existence rather than seat count; later seat
  joins are a no-op. This makes the z-order-promotion bug tabletop-physics ticket 13 fixed
  (Stack silently jumping to top of z-order on every seat join) unreproducible **by construction**
  — there is no longer a "widen the existing Stack" code path at all.
- `stackCardPosition(stackCount)` lost its `seatIndex` parameter — stack cards cascade from the
  square's top-left. The cascade walks out of the square around the ~23rd simultaneous stack
  card; cosmetic only (cards are *placed* there, not zone-detected there).
- All 15 Playwright verification specs pass with the new layout, including
  `verify-drag-identity` and `verify-zone-armed`; `verify-seat-joined.spec.ts` was rewritten
  (Stack fixed instead of widening; zone counts now include the Command Zone: 6 after one seat,
  11 after two).

Full detail: watch point 8 rewritten in `interactions.md`; `files.md`'s `cardLayout.ts`/
`tableFurniture.ts`/`TablePage.tsx` entries updated.

### Code-review fixes, same day (`96159be`)

Three fixes off the ticket's code review, all touching things this KB leans on:

- **The camera is now deterministic, not reactive** (the correction promised above).
  `aimCameraAtTheTable()` (`TablePage.tsx`) no longer zooms-to-fit current content or listens on
  the store for the first remote shape arrival — that reactive design raced Playwright
  measurements (a zoom firing on an async remote arrival could land *between* a spec measuring a
  bounding box and acting on it) and flaked across `verify.sh` runs. It now does exactly one
  `editor.zoomToBounds(TABLE_EXTENT, { inset: 24 })` at mount, where
  `TABLE_EXTENT = new Box(-2802, -1612, 5604, 3164)` — the fixed four-compass-slots-plus-Stack
  extent mirroring `cardLayout.ts` (provisional geometry; tweak it alongside the layout). The
  camera never moves on its own after mount; `?d=` deep links still suppress the framing.
  **Lesson worth keeping: reactive camera moves triggered by remote arrivals are a flake source
  for any spec that measures screen coordinates — deterministic mount-time framing is the stable
  shape.** Related fact: tldraw CULLS off-viewport shapes from the DOM, so Playwright counts of
  `.tl-shape` elements are only reliable when the camera has everything in view — another reason
  the framing must be deterministic and total.
- **`playerAreaOrigin(seatIndex)` now throws past `MAX_SEATS`** (new export from `cardLayout.ts`,
  = 4) instead of wrapping seat 4 back onto S — a wrapped fifth area would have landed exactly on
  the S seat's AABBs, silently breaking the disjointness invariant watch point 8 guards. Both
  entry points refuse first, so the throw is a backstop: `handleSeatJoined` (`seatJoined.ts`)
  returns 409 `"table is full: 4 seats"` when every compass slot is taken, and
  `handleCardArrival` (`cardArrival.ts`) returns the same 409 for a card from an *unseated* seat
  at a full table (its defensive `ensurePlayerArea` would otherwise need a fifth slot). Tested at
  the seam in `apps/tabletop/test/seatJoined.test.ts`.
- **Zone-AABB disjointness is now also asserted at the event-handler seam**, over the
  actually-drawn `mtg-zone` shapes at a full 4-seat table (21 zones: five per seat + the Stack),
  in `apps/tabletop/test/seatJoined.test.ts` — not just over the pure geometry in
  `cardLayout.test.ts`. If `tableFurniture.ts` ever drifts from `cardLayout.ts`'s geometry, this
  test fails where the pure-geometry one can't.

## Ticket 18: `mtg-counter` — counters ride on cards (2026-08-08, `4c64ef2`)

`.scratch/tabletop-physics/issues/18-counters.md` (worktree `ticket-18-counters`). A third
custom shape type, `mtg-counter` (`apps/tabletop/src/shared/mtgCounterShape.ts` +
`src/client/shapes/MtgCounterShapeUtil.tsx`): an **unlocked, draggable, text-editable disc**
(props `{w, h, text}`) a player drops onto a card. Attachment is tldraw drag-and-drop
*parenting* (the counter's `parentId`), mediated by new drag hooks on `mtg-card`; detach is
dragging it off, or automatic eviction when the host card enters graveyard/exile/library.

- **NAME COLLISION resolved in ticket 18's favor**: table-layout ticket 12's
  decided-but-unbuilt life counter had used `mtg-counter` as its working name. This ticket
  claimed the type string per the tabletop-physics spec; the life counter needs a new name when
  built (buoyed in `TODO.md` as `life-counter-needs-own-name`). The KB's old `mtg-counter`
  cautions (locked furniture, `HyperlinkButton` buttons, LWW increments) describe *that* shape
  — `architecture.md`'s life-counter section now says so explicitly.
- **Watch point 1's cleanup obligation generalized beyond `onClick`-bearing utils.**
  `MtgCounterShapeUtil` deliberately has no `onClick` (editing is stock double-click-to-edit
  via `canEdit()`), yet its `onTranslateEnd` unconditionally calls `setSelectedShapes([])` —
  a stale counter selection would defeat the card's `startTranslating` safety net and make the
  next card drag silently move the counter. This owner's `-review` flagged it; implemented and
  covered by `verify-counter.spec.ts`'s drag-counter-then-drag-card test. Watch point 1
  rewritten: any unlocked draggable shape sharing a canvas with an `onClick`-bearing shape
  needs the drag-settle cleanup.
- **New drag-hook facts** (watch points 11-12): defining any drag hook makes every card a drag
  target (`getDraggingOverShape` checks only hook existence), so `canReceiveNewChildrenOfType`
  is narrowed to `type === "mtg-counter" && !isLocked` and `canRemoveChildrenOfType` to
  `type === "mtg-counter"` (its default is `true` for ALL types — without it, dragging card A
  across card B fires `B.onDragShapesOut(B, [cardA])`). And `reparentShapes` preserves *page*
  rotation, so `onDragShapesIn` zeroes each dropped counter's local rotation with the
  center-preserving `halfExtent`/`center`/`topLeft` math (same as `onClick`'s tap pivot) —
  otherwise a counter dropped on a tapped card stays tilted forever after untap.
- **Eviction lives in the card's `onTranslateEnd` zone-change branch** (a parented shape's own
  `onTranslateEnd` never fires when only its parent moves). `NON_BATTLEFIELD_ZONES =
  {graveyard, exile, library}` — **NOT the stack, deliberately**: cards ARRIVE on the Stack
  (`zoneHint`), so their first settled move fires a stack zone-entry and would strip counters
  attached there. Found empirically — the plan's first draft included stack; the Playwright
  test caught it. `evictCounters` reparents to the page and `animateShapes` to spots from
  `findOpenSpotsNearZoneEdge` (new pure seam, `openSpotNearZoneEdge.ts`, unit-tested; occupied
  = only card/counter bounds, furniture is fair ground). `zoneAt()` refactored to return the
  full `ZoneHit` (id+zone), since eviction needs the zone's bounds.
- **New empirical tldraw/Playwright facts** (watch point 13): (a) tldraw's focus management
  beats `autoFocus`, ref-callback focus, and a bare effect for a custom editing input —
  `document.activeElement` ends on `body`; fix is `setTimeout(0)` inside the `isEditing`
  effect. (b) A creation click followed within tldraw's double-click window by a grab at the
  same point classifies as a double-click and opens editing — tests need a ~500ms cooldown
  after creating a shape before dragging (`createCounter` helper). (c) `.nth()` on shape
  testids is paint order and reorders when a shape reparents — drag from known creation points.
- **Editing hotkey shield comes free**: tldraw's `areShortcutsDisabled` is true while
  `getEditingShapeId() !== null` (`useKeyboardShortcuts.ts`) — supersedes the always-live-input
  caution for shapes that edit through tldraw's editing state. Enter/Escape handled in the
  input's own `onKeyDown` (`editor.complete()`); pointer-downs use `markEventAsHandled`.
- **First custom tool**: `MtgCounterTool` (`StateNode`, id `"mtg-counter"`) — click-to-place,
  returns to select. Wired in `TablePage.tsx` via `<Tldraw tools>`, `uiOverrides.tools`, and a
  custom `Toolbar` component; sync registration in the usual three places (`useSync`
  `shapeUtils`, `<Tldraw>`, `rooms.ts` schema).

Full detail in `architecture.md`'s "Ticket 18" section; watch points 1, 6, 10 updated and
11-13 added in `interactions.md`; `files.md` gained the four new files and the two new tests.
(Ticket 18 landed on main in parallel with table-layout ticket 14 above; both are 2026-08-08.)

## What Was Tried and Abandoned

Nothing yet beyond the above. If a future fix attempt for a similar quirk is tried and reverted,
record it here so the next person doesn't repeat it.
