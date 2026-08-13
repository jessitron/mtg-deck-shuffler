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
  square's top-left. **Superseded same day — see the "stack cards land on their seat's side"
  correction below**; the parameter came back, and the top-left cascade (and its ~23rd-card
  overflow quirk) is gone.
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

### Stack cards land on their seat's side of the square (same day, worktree `stack-card-per-seat-side`)

Per Jess's request, `stackCardPosition` changed again — the `seatIndex` parameter is back:
`stackCardPosition(seatIndex, stackCount)` (`cardLayout.ts`). A stack card now lands on the
Stack square's side **facing its player's mat** — S seat on the bottom edge, N top, E right,
W left — centered on that side, so everyone can see at a glance who played it. A seat's
cascade walks *along* its side (+36/card) and *inward* off its edge (+14/card), keeping
earlier arrivals visible. Purely placement territory, but three record-keeping consequences:

- **The cascade count is per-seat now, not per-room.** `cardArrival.ts`'s module-level
  `stackCountByRoom` map is deleted; the count lives as `PlayerArea.stackCount` in `rooms.ts`,
  alongside the existing `landCount`/`graveyardCount` — one uniform pattern for all three
  per-seat card counters.
- **Same throw backstop as `playerAreaOrigin`**: `SLOT_ORDER[seatIndex]` undefined (a seat
  past `MAX_SEATS`) throws rather than placing a card off the map — unreachable in practice
  because `seatJoined.ts`/`cardArrival.ts` already 409 first (`96159be`), but consistent with
  the disjointness backstop watch point 8 records.
- **The ~23rd-card overflow note above no longer applies in that form**: a long cascade now
  walks along its seat's side, and containment inside the square is asserted per seat in
  `test/cardLayout.test.ts` (at cascade depth 3). Still cosmetic either way — stack cards are
  *placed* there, not zone-detected there.

Tests: 5 new cases in `apps/tabletop/test/cardLayout.test.ts` (one per compass side asserting
the centered-on-the-facing-edge landing, plus a four-seat cascade test asserting each seat's
inward direction and containment), replacing the old single top-left cascade test. 51 unit +
19 Playwright pass. `DESIGN.md`'s square section updated to match.

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

## Zone label band: card-holding zones grow headroom for their titles (2026-08-09, `0d61890`)

Worktree `worktree-zone-label-band`, plan at `.scratch/zone-label-band/plan.md`. **Pure
placement/geometry — no ShapeUtil hooks, no zone detection, no `zoneHitTest.ts` changes.** This
owner reviewed the plan beforehand; recorded here because the geometry it changes is what watch
point 8's disjointness invariant is asserted over, and because two files in this owner's file
list were touched.

The bug: zone titles (fontSize 24, drawn inside the box's top-left) were unreadable — Library and
Command Zone were exactly one card tall (238) so a card covered the title, and Exile was 225,
shorter than a card outright. Jess floated "smaller cards" as an alternative; rejected because
card size anchors the table's physical scale and every zone derives from it, so shrinking cards
leaves the titles exactly as covered.

- **New shared constant** `ZONE_LABEL_BAND = 40` in `src/shared/mtgZoneShape.ts` (next to
  `LIBRARY_PILE_INSET`, shared for the same reason: server geometry and client sleeve-pile
  rendering must agree on where content starts). Pure headroom — nothing draws the band. This
  also makes `cardLayout.ts` import from `shared/mtgZoneShape.ts` for the first time.
- **`cardLayout.ts`**: `LIBRARY_H` and `EXILE_H` are now `CARD_H + ZONE_LABEL_BAND` (278);
  `COMMAND_ZONE_H` is defined as `LIBRARY_H` with a comment making the coupling explicit — the
  graveyard spans the column's full width at `column.y + LIBRARY_H + GAP`, so its GAP from the
  command zone's bottom edge exists only while the two top boxes match heights. `GRAVEYARD_H` is
  the remainder (356; the old two-thirds/one-third split is gone — exile gets card+band, graveyard
  fills the rest, still the biggest box). `graveyardCardPosition` starts the cascade at
  `box.y + ZONE_LABEL_BAND + 10`.
- **Content insets below the band**: `tableFurniture.ts` insets the library card-back image
  `ZONE_LABEL_BAND` from the top (12 from the other three sides), and
  `MtgZoneShapeUtil.component()`'s sleeve pile does the same — the one client-side file touched,
  and only its rendering; still no interaction hooks (watch point 7 intact).
- **Tests** (`test/cardLayout.test.ts`): the hardcoded 449/225 assertions became 278/356, plus new
  invariants — every card-holding zone ≥ `CARD_H + ZONE_LABEL_BAND`, `COMMAND_ZONE_H ===
  LIBRARY_H` (guards the graveyard-gap coupling above), graveyard pile starts below the band. The
  pairwise ≥ `GAP` disjointness assertion (watch point 8) passes unchanged across all four seats
  and the Stack — the column still exactly matches the playmat's height, so no other zone moved.
- **Known consequence, buoyed**: the shorter graveyard means its +6/card cascade walks out of the
  box at ~32 cards (was ~53) — `TODO.md` buoy `graveyard-cascade-overflow` (`1c26469`). Turned out
  not purely cosmetic — zone detection is center-based, so a card whose cascade step pushed its
  center outside the box misread as a different zone. **Resolved 2026-08-10, `7823a39`** — see the
  "Graveyard cascade wrap-bound" entry below.

## A ridden counter didn't animate along with its host's tap (2026-08-10)

TODO.md bug: "the counter didn't participate in the tap animation, when the counter was on
the card." `MtgCardShapeUtil`'s tap catch-up (ticket 15's WAAPI counter-rotate-then-ease-to-0,
`65276e6`) is a purely local DOM illusion scoped to the card's own `.tl-image-container`, keyed
off `props.tapped` changing. A hosted `mtg-counter` passenger has no `props.tapped` of its own —
tldraw composes the host's rotation into the counter's page transform for free (ticket 18's
ride-along visual, so the *position* was never wrong), but the counter's own DOM node just
snapped to the new angle a frame before the card's div started easing back — visually
disconnected mid-swing.

- **Fix**, in `apps/tabletop/src/client/shapes/MtgCounterShapeUtil.tsx`: a `useValue` computed
  reads the counter's own current shape record and its host's `props.tapped` back out of the
  editor *inside the selector*, then a `useLayoutEffect` keyed on that value replays the
  identical WAAPI catch-up (500ms, ease-out, counter-rotate then ease to 0) on the counter's own
  `.tl-image-container`.
- **New reactivity gotcha for this KB, worth its own watch point**: reading `shape.parentId`
  directly off the `shape` argument passed into `component()` is NOT reactive to reparenting.
  tldraw only re-invokes a shape's `component()` with a fresh `shape` object when that shape's
  OWN `props` change — a bare `parentId`/x/y/rotation write (drag-attach, or nothing at all for
  a plain tap of the host) is applied to the wrapping transform outside React and never
  re-renders. A `useValue` selector that closes over `shape.parentId` from the outer scope would
  therefore freeze at whatever value the last props-triggered render saw, missing every later
  attach/detach/tap. The fix is to call `this.editor.getShape(shape.id)` **inside** the
  `useValue` selector for a fresh, reactively-tracked `parentId` on every store change, then
  chain a second `this.editor.getShape(parentId)` read for the host's `props.tapped` — both are
  genuine signal reads through the store, so `useValue` correctly re-runs on reparent OR host
  tap. Found by adding a temporary `window.__editor` debug hook and confirming via
  `editor.getShapeAtPoint`/direct prop reads that the naive closure-based version's effect only
  ever fired once, at mount. New watch point 20 in `interactions.md`.
- **Red herring, recorded for the testing-conventions section**: clicking a card's exact
  geometric center to tap it, when a counter is attached nearby and the camera is zoomed way out
  (e.g. after Shift+1 `zoomToFit` on the whole table), can resolve to the COUNTER instead of the
  card in tldraw's own hit-test (`editor.getShapeAtPoint`/`getHoveredShapeId`) — even though
  `document.elementFromPoint` and a standalone `getShapeAtPoint` call both correctly say "card."
  The counter's hit-test margin (`hitTestMargin / zoomLevel`) grows in page-space at low zoom and
  can reach the card's center. `verify-counter.spec.ts` already has a `topGrip()` helper for
  exactly this reason (grab the card's top 12% instead of center); the same pattern was added to
  the new test. Folded into watch point 13's Playwright-facts list.
- **Test**: `apps/tabletop/test/verification/verify-tap-animation.spec.ts`'s "a counter riding a
  tapped card animates along with it" — attaches a counter, taps and untaps the host via
  `topGrip`, asserts the counter's own `.tl-image-container` plays the 500ms WAAPI animation each
  time, and that attaching alone (no tap) does not animate it.

Full detail in `architecture.md`'s `MtgCounterShapeUtil` section (new "Ride-along tap catch-up"
subsection) and `interactions.md` watch point 20 (reactivity gotcha) plus watch point 13's
Playwright-facts extension (hit-test-margin-vs-passenger).
- Old tables keep old furniture (`ensurePlayerArea` never redraws) — same graceful degradation
  already recorded for the command-zone redraw.

## Ticket 16: multi-untap — clicking one selected card taps the whole selection, one undo entry (2026-08-09, `626ab6f`)

`.scratch/tabletop-physics/issues/16-multi-untap.md` (plan in `plan-16.md`, worktree
`ticket-16-multi-untap`). With a marquee selection, clicking one card propagates its NEW tapped
state to every other selected `mtg-card` — a **state push, not a per-card toggle**, so a mixed
selection converges. All inside `MtgCardShapeUtil.onClick`; no new hooks.

- **The KB's first documented microtask-vs-undo case, confirmed empirically**:
  `PointingShape.onPointerUp` calls `markHistoryStoppingPoint('shape on click')` then
  `updateShapes([change])` AFTER `onClick` returns, so a `queueMicrotask` write from inside
  `onClick` lands *after* the mark and coalesces into the *same new* undo entry as the clicked
  card's own change. One Ctrl+Z (`ControlOrMeta+z`) reverts the whole multi-tap gesture and
  leaves an earlier unrelated tap untouched. The code comment warns never to change
  `queueMicrotask` to `setTimeout` (macrotasks can interleave with input events).
  `verify-multi-untap.spec.ts` is the standing tripwire for a tldraw upgrade reordering this.
- **The clicked card's own partial is still RETURNED synchronously** — that early-returns
  `PointingShape.onPointerUp` and is what lets the marquee selection survive the click at all
  (returning `undefined` collapses the selection to the clicked card).
- **The microtask batch is defensive per card**: fresh `getShape` re-fetch (the clicked card's
  update, and possibly remote changes, applied in between), skip non-`mtg-card` shapes and
  deleted shapes, and skip cards already at the target state — rotation is a delta (watch
  point 4), so a redundant ±90° would corrupt free rotation.
- **`tapPartial(shape, tapped)` extracted** — the center-fixed pivot math formerly inline in
  `onClick`, now used by both the synchronous return and the microtask batch.
  `onDragShapesIn` keeps its own inline copy (counter rotation-zeroing); three conceptual call
  sites of the pivot solve, two via `tapPartial`.
- **Two-client undo independence verified** (third test in the spec): a remote peer's Ctrl+Z
  after another player's multi-untap is a no-op (remote sync changes never enter the local
  `HistoryManager`); the acting player's own Ctrl+Z still reverts and syncs out.
- **Watch point 5's named gap closed**: "multi-select interacting with `onClick`" is now
  covered by `verify-multi-untap.spec.ts` (3 Playwright tests; full suite 27 Playwright + 64
  vitest green at landing). The shift-click observation from the `-context` consult was NOT
  investigated (out of scope) — still unconfirmed-but-likely that shift-click taps instead of
  extending the selection, per `PointingShape.ts` ~line 93 ordering.
- **Gesture-order consequence, by design**: watch point 1's drag-settle
  `setSelectedShapes([])` is untouched, so multi-untap only works marquee-then-click — a drag
  clears the selection first.
- **New Playwright facts** (added to watch point 13): marquee-select by brushing from a point
  over locked furniture (`Idle` gates `isLocked` before `PointingShape`, so pointer-down on
  the playmat starts a brush); the ~500ms double-click cooldown also applies after a marquee
  mouse-up; assert tapped state as bounding-box orientation (portrait card: width > height
  means tapped), which is camera-scale-proof. The unrelated-tap control card is placed with
  `zoneHint: "stack"` so the battlefield marquee can't catch it.

Full detail in `architecture.md`'s "Ticket 16" section; `interactions.md` watch point 5
rewritten, watch point 13 extended, watch point 14 new, and a new `Depends On` note on
`PointingShape.onPointerUp`'s ordering.

## Ticket 17: flip and turn face-down — first custom `ContextMenu`, third stale-selection entry point (2026-08-09, `eb24a4f`/`ff5d58a`)

`.scratch/tabletop-physics/issues/17-flip-and-face-down.md` (plan in `plan-17.md`). Mostly
`two-faced-cards` territory (what `face`/`faceDown` mean, the seat's `cardBackImageUrl`, the
library-entry reset mirroring the Shuffler's `mulligan()`) — but it landed the app's **first
custom tldraw `ContextMenu`**, `apps/tabletop/src/client/CardContextMenu.tsx`, wired via
`TLComponents.ContextMenu` in `TablePage.tsx`, and that's squarely this owner's mechanics.

- **New UI surface, new selection hazard.** `DefaultContextMenu`'s `children` replace its default
  content rather than append to it, so `TableContextMenu` re-declares a trimmed stock menu
  (`ReorderMenuSubmenu` + `ClipboardMenuGroup`) alongside the new `mtg-card-actions` group
  (Flip/Turn face down-up/Tap-Untap) — Jess's explicit call to drop `EditMenuSubmenu`
  (Lock/Unlock — the *only* unlock affordance this KB has on record for `mtg-zone`'s
  locked-and-stays-locked furniture), `ArrangeMenuSubmenu`, `MoveToPageMenu`,
  `ConversionsMenuGroup`, `SelectAllMenuItem`, and `CursorChatItem`.
- **Right-clicking selects a card, and — unlike a locked shape — an unlocked card's selection
  survives the menu closing.** That reopens watch point 1's stale-selection hazard through a
  third gesture (after drag-settle and the multi-untap click-batch): a lingering selection would
  let the next drag of a *different* card silently move this one. Fixed the same way as watch
  point 1's original fix, but at the menu's exit instead of the drag's: every menu action funnels
  through a `commit(partials, label)` helper (`markHistoryStoppingPoint` → `updateShapes` →
  `editor.setSelectedShapes([])`, the clear unconditional and always last). New watch point 15
  records this as the general pattern for any future menu/toolbar/UI surface that mutates a card.
  Regression test: `verify-flip-face-down.spec.ts`'s "flipping card A does not leave a stale
  selection that hijacks a later drag of card B."
- **`tapPartial` extracted from `MtgCardShapeUtil` into a standalone pure function**,
  `apps/tabletop/src/client/shapes/cardTap.ts`, because the new Tap/Untap menu item needs the
  same center-fixed pivot math (watch point 4) but has no `this.editor`/ShapeUtil instance to
  call a private method on. Verified pure during review (only reads `shape.rotation`/
  `shape.props.{w,h}`, module-level `TAP_ANGLE`, imported `Vec`) — no behavior change; both
  `onClick`'s synchronous return and its ticket-16 `queueMicrotask` batch now call the imported
  function.

Full detail in `architecture.md`'s new "Ticket 17" section; `interactions.md` gained watch point
15; `files.md` gained `CardContextMenu.tsx` and `cardTap.ts`.## The playmat's picture folds into `mtg-zone`'s own props/render, not a second shape (2026-08-11)

**A new pattern for this KB, not just a feature tweak.** Every prior custom shape addition
(`mtg-card`, `mtg-zone`, `mtg-counter`, `mtg-life-counter`) was a brand-new *registered type*. This
change is the first time a stock-image concern gets folded into an *existing* locked shape's own
`props`/`component()` instead of layering a second shape on top of it.

The playmat's background picture used to be a separate stock `image` shape (`matImageId`, plus an
`AssetRecordType` record) drawn on top of the `mtg-zone` playmat outline — the same pattern the
library's card-back picture still uses today. That meant the picture was a plain square photo sitting
underneath the zone's own rounded-corner border (`border-radius: h * 0.05` on the bordered `<div>`),
never clipped to it. Fixed by giving `mtg-zone` a new `imageUrl: string | null` prop (same pattern as
the existing `sleeveColor` prop: set once at mint time in `tableFurniture.ts`'s `ensurePlayerArea`,
never mutated by a player action) and rendering it inside `MtgZoneShapeUtil.component()`'s own
bordered `<div>`, with `overflow: hidden` on that div doing the clipping.

- **`MtgZoneShapeUtil.tsx`**: the bordered div gets `position: relative; overflow: hidden` (playmat
  branch only), and when `playmat && imageUrl`, an `<img>` renders inside it with
  `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover`. **Deliberately not
  tldraw's `.tl-image` class** — that class is `position: absolute; inset: 0` relative to
  `.tl-image-container` (a *different* wrapper than this div), so using it here would make the image
  escape this div's own `overflow`/border clip entirely — the exact same "escapes the wrapper" bug
  the sleeve-pile ring hit once (see the comment inline). The fix reaches for a plain inline-styled
  `<img>`, not a reused tldraw class.
- **`mtgZoneShape.ts`**: `MtgZoneShapeProps` gains `imageUrl: string | null` (validated `T.string
  .nullable()`), documented as "set only on the `playmat` zone, null everywhere else" — same shape as
  `sleeveColor`'s doc comment.
- **`tableFurniture.ts`**: `ZoneShapeArgs`/`zoneShape()` gain the same `imageUrl` field, threaded
  through from `ensurePlayerArea`'s `look.playmatImageUrl`. The old `matImageId`/`AssetRecordType`/
  `imageAsset()`/`imageShape()` call sequence for the playmat is **deleted outright** — it no longer
  mints a second shape at all for the playmat's picture. The library's card-back picture is
  **untouched** — still a separate stock `image` shape, still minted via `libraryImageId`/
  `imageAsset`/`imageShape` exactly as before. This ticket did not touch the library.
- No new ShapeUtil hooks, no new interaction behavior, `isLocked: true` unchanged, no new registered
  shape type. `mtg-zone` still defines none of `onClick`/`onTranslateEnd`/`onDragShapesOver` — watch
  point 7 is untouched.
- **Test-visible consequence**: every Playwright spec that counted furniture `image` shapes at seat-
  join time drops by one per seat (`verify-seat-joined.spec.ts`: 2→1 at one seat, 4→2 at two seats;
  `verify-life-counter.spec.ts`'s stale-selection-immunity assertion's comment updated to match) —
  the playmat picture no longer registers as a `[data-shape-type="image"]` element at all, since it's
  not a shape of its own anymore. `seatJoined.test.ts`'s sleeve-vs-card-back-image assertion comment
  was updated to note the playmat is now irrelevant to that check (it was never testing the playmat,
  but the old comment implied it still existed as an image shape).

**New reusable precedent for this KB, worth remembering alongside "subclass a stock ShapeUtil"
(ticket 19) and "own custom shape type from scratch" (tickets 12/13/18/20):** when a stock-shape
concern (a picture, in this case) belongs entirely to one existing locked shape and needs to be
visually *composited with* that shape's own border/clipping rather than sit as an independent layer,
extend the existing shape's own `props`/`component()` instead of minting a second shape on top. This
is materially cheaper than either of the other two precedents — no new type, no new registration,
no asset record — and it's the right call specifically when the two "layers" were always meant to be
one visual unit (an image clipped to a border-radius) rather than two shapes that happen to overlap.
The library's card-back picture was deliberately left as a separate `image` shape in this same
change — a case where the picture legitimately still functions as free-floating content rather than
inseparable from the box's own chrome — so this precedent is a judgment call, not a rule that every
stock-image-behind-a-zone should be folded in.

## Table-layout ticket 18: commander arrives with owner and ghost (2026-08-09)

`.scratch/tabletop-physics/issues/18-commander-arrives-with-owner-and-ghost.md`, worktree
`ticket-18-commander-arrives`. `mtg-card` gained two new required, validated `props`: `owner`
(seatId, `T.string`) and `isCommander` (`T.boolean`) — a fact the shape carries, granting no
capability (any player can still move any card). Three consequences land in this KB:

- **A second mint seam, correcting an inaccurate KB claim.** `interactions.md`'s "Shape identity"
  section used to say `props.instanceId` is "minted once ... never elsewhere." False as of this
  ticket: `apps/tabletop/src/server/seatJoined.ts` now mints `mtg-card` shapes directly (commanders
  and their ghosts, on `seat.joined`), inline via `room.updateStore`, same style as
  `cardArrival.ts`. Rewritten to "minted at `cardArrival.ts` on arrival, or `seatJoined.ts` at
  seating for commanders — never a third site."
- **New canonical pattern: `mtgCardShape()` in `tableFurniture.ts`.** Two independent mint seams
  writing their own `store.put({...} as any)` literal is exactly the three-way-drift risk that
  made adding `owner`/`isCommander` painful — both literals plus the props interface would need
  updating, with no compiler check tying them together. Fixed by extracting a shared builder
  (`MtgCardShapeArgs` mirroring `MtgCardShapeProps`) that both `cardArrival.ts` and `seatJoined.ts`
  call. **Future required `mtg-card` props go in `mtgCardShape()`'s signature, not a call site** —
  new watch point 15.
- **The ghost mechanism — this KB's first decoy/shadow-shape example.** A commander mints as two
  `mtg-card` shapes at the identical spot: the real, draggable card, and a `ghost:`-prefixed-
  instanceId, `isLocked: true`, `opacity: 0.3` copy minted *first* (so its `IndexKey` sorts lower
  and the real card paints on top — same topmost-wins mechanism as overlapping-zone resolution,
  watch point 8, applied to two cards). Confirmed safe against `cardArrival.ts`'s
  `instanceAlreadyOnTable` exact-string dedup. `isLocked: true` alone makes the ghost fully inert
  to click/drag/selection/counter-hosting — no new guard needed, per watch point 7's already-
  established `isLocked` gating chain, now confirmed to generalize from `mtg-zone` to a second
  locked `mtg-card` instance. `apps/tabletop/test/seatJoined.test.ts`'s "seat joined —
  commanders" describe block asserts the ghost's data-level facts (isLocked, opacity, index
  ordering, distinct instanceId); it doesn't drive a live pointer at the ghost, so the click-
  transparency claim rests on watch point 7's tldraw-source reading rather than a fresh probe.

Full detail in `architecture.md`'s new "Table-layout ticket 18" section; `interactions.md`'s Shape
identity section rewritten and watch points 15-16 added; `README.md`'s quick-reference table
updated; `files.md`'s `tableFurniture.ts`/`seatJoined.ts`/`mtgCardShape.ts` entries updated.
## Playmat rendered behind another player's dragged card — a second, structurally-enforced index band for furniture (2026-08-10)

TODO.md bug (`playmat-behind-cards`, worktree `playmat-behind-cards`): drag a card onto a
late-joining seat's playmat and the card could disappear *behind* the playmat instead of resting
on top of it. Root cause confirmed exactly as diagnosed beforehand: `nextIndex(tableName)`
(`apps/tabletop/src/server/tableFurniture.ts`) was one monotonically-increasing per-room counter
shared by **both** cards and furniture, chained off `ZERO_INDEX_KEY` via `getIndexAbove`. A
furniture mint that happened *after* a card already existed — the ordinary case of a seat joining
mid-game — could therefore land a higher `IndexKey` than that card, and since `topmostZoneAt()`/
paint order both resolve ties by "greatest index wins" (watch point 8), the late playmat painted
on top of the earlier card.

- **Fix is structural, not a per-move patch.** Chose option 2 over "bump the card to front on
  every move": a second per-room counter, `lowestFurnitureIndexByRoom`, feeding a new
  `nextFurnitureIndex(tableName)` that calls `getIndexBelow(...)` (from `@tldraw/utils`) instead
  of `getIndexAbove`, chained off `null` rather than `ZERO_INDEX_KEY`. Because tldraw's fractional
  indexing is lexicographic, every `getIndexBelow(null)`-chain key sorts strictly below
  `ZERO_INDEX_KEY` ("a0") and everything `nextIndex`'s `getIndexAbove` chain ever builds from it —
  so furniture is guaranteed beneath every card **by construction**, regardless of mint order
  across seats, not reasserted move-by-move.
  - **Two index bands did not exist in this KB before.** Prior tickets (13, 14, table-layout 13/14,
    the ghost mechanism in table-layout 18) all reasoned about z-order within a *single* shared
    `nextIndex` sequence — greatest-index-wins tie-breaks (watch point 8) and paint-order decoys
    (watch point 17) both assumed one counter. This fix splits that into two disjoint bands that
    never need to compare against each other for correctness, because one band is defined to
    always sort below the other.
- **Every furniture-minting call site in `ensurePlayerArea` and `ensureStackDrawn`** — playmat
  outline, playmat image, library zone/image, command zone, graveyard, exile, the seat name label,
  and the Stack — was switched from `nextIndex` to `nextFurnitureIndex`. `nextIndex` itself is
  untouched and is now used **only** for cards: `cardArrival.ts`'s ordinary arrivals and
  `seatJoined.ts`'s commander/ghost mints already only called it for `mtg-card` shapes, so those
  two seams needed no code change — only the furniture side did.
- **New watch point 21** recorded in `interactions.md`: any future furniture-minting call site
  added outside `ensurePlayerArea`/`ensureStackDrawn` must call `nextFurnitureIndex`, not
  `nextIndex`, or the "furniture is always beneath everything" invariant silently breaks for that
  shape — nothing else enforces it, since there's no runtime assertion tying a shape's `type` to
  which band its `index` came from.
- **Test**: `apps/tabletop/test/furnitureZOrder.test.ts` — seats an early player, plays a card for
  them, then seats a second (late) player, and asserts the late seat's playmat index is below the
  card's, plus a blanket check that no `mtg-zone` shape's index ever exceeds the card's. Confirmed
  red without the fix (temporarily reverting the furniture call sites back to `nextIndex`) and
  green with it.

Full detail: new watch point 21 in `interactions.md`; `files.md`'s `tableFurniture.ts` entry
updated to describe the two-band index scheme.

## Ticket 19: notes ride along like counters — subclassing a stock ShapeUtil to add a missing hook (2026-08-10)

`.scratch/tabletop-physics/issues/19-notes.md`. Generalized `MtgCardShapeUtil`'s counter-hosting
into a "passenger" concept covering both `mtg-counter` and tldraw's own stock `note` shape:
`canReceiveNewChildrenOfType`/`canRemoveChildrenOfType` are now keyed on `PASSENGER_TYPES = new
Set(["mtg-counter", "note"])`, and the counter-only `evictCounters` became `evictPassengers`. This
owner's `-review` (invoked on the plan before implementation) caught a real gap before it shipped:
adding the stock `note` type to the accept-list **reopened the drag-identity/stale-selection bug**
(watch point 1) for notes, because stock tldraw's `NoteShapeUtil` has no `onTranslateEnd` to clear
its own selection after a drag settles — exactly the hazard watch point 1 already generalized to
"any unlocked draggable shape sharing a canvas with an `onClick`-bearing shape," just for a shape
this KB doesn't own the source of.

- **Fix: subclass the stock ShapeUtil to add the missing hook, not fork it.**
  `apps/tabletop/src/client/shapes/SelectionClearingNoteShapeUtil.ts` extends tldraw's own
  `NoteShapeUtil` (imported from `"tldraw"`) and overrides only `onTranslateEnd` to call
  `this.editor.setSelectedShapes([])` — same one-line cleanup `MtgCounterShapeUtil` already
  carries. Everything else (rendering, editing, growY sizing, migrations) stays exactly as tldraw
  ships it. **New reusable precedent for this KB**: when a *stock* tldraw shape needs one of this
  owner's cleanup obligations and tldraw gives no other extension point, subclass the stock
  `ShapeUtil` and override just the hook that's missing — cheaper and safer than reimplementing the
  shape.
- **New tldraw fact: `useSync` throws on a duplicate `type`; `<Tldraw shapeUtils={...}>` doesn't.**
  Registering `SelectionClearingNoteShapeUtil` needed it to replace the stock `NoteShapeUtil` in the
  `shapeUtils` array passed to `useSync`, not merely join it — `<Tldraw>`'s own `shapeUtils` prop
  tolerates two entries with the same `type` string (`mergeArraysAndReplaceDefaults`, last-wins),
  but `useSync`'s schema builder does not: it throws `"Shape type 'note' is defined more than
  once"` at runtime if `defaultShapeUtils` is spread in *and* the subclass is added without first
  filtering the stock one out. Fixed in `apps/tabletop/src/client/TablePage.tsx`:
  `[...defaultShapeUtils.filter((Util) => Util.type !== "note"), MtgCardShapeUtil, MtgZoneShapeUtil,
  MtgCounterShapeUtil, SelectionClearingNoteShapeUtil]`. This is a new failure mode for watch point
  6's registration recipe — not just "spread the defaults in," but "filter out anything you're
  replacing, when the two array consumers (`useSync` vs. `<Tldraw>`) don't agree on how lenient to
  be about duplicates."
- **`onDragShapesIn`'s rotation-zeroing and `evictPassengers` generalized to use shape geometry, not
  `props.w/h`.** A stock `note` has no `w`/`h` prop — its size comes from a style enum plus
  `growY` — so the counter-only code that read `shape.props.w/h` doesn't generalize to it.
  `this.editor.getShapeGeometry(shape).bounds` does, for any `ShapeUtil` regardless of base class,
  and is now used in both places.
- **Regression test**: `apps/tabletop/test/verification/verify-note.spec.ts`, "after dragging a
  note, dragging a card moves the card (stale-selection regression)" — mirrors
  `verify-counter.spec.ts`'s Hazard-A test. Drags a note (leaving it selected, deliberately with no
  test-side `deselectAll` cleanup — proving the *product* clears selection, not the test), then
  drags the card, and asserts the card moved, not the note. Confirmed red without
  `SelectionClearingNoteShapeUtil` (the card didn't move; the note absorbed the drag instead), green
  with it.

Full detail in `architecture.md`'s new "Ticket 19" section; `interactions.md` watch points 1 and 6
extended, new watch point 18; `files.md` gained `SelectionClearingNoteShapeUtil.ts` and
`verify-note.spec.ts`.
## Graveyard cascade wrap-bound: `graveyard-cascade-overflow` buoy resolved (2026-08-10, `7823a39`)

**Pure placement/geometry — no ShapeUtil hooks, no `zoneHitTest.ts`, no zone-detection code
touched.** Resolves the buoy the zone-label-band entry above left in `TODO.md`
(`graveyard-cascade-overflow`, `1c26469`): the shorter graveyard (356 tall since that change) made
`graveyardCardPosition`'s unbounded +6-unit diagonal cascade march a card's center outside
`graveyardBounds` past ~32 cards. Zone detection is center-based (`topmostZoneAt`,
`MtgCardShapeUtil.zoneAt()`), so a card past that threshold read as zone `undefined` or `exile` —
logging a spurious exile-entry event and evicting any counters it carried, exactly the failure
mode watch point 8's disjointness reasoning warns about for cards that leave their own zone's box.

- **Fix stays entirely inside `cardLayout.ts`**: `graveyardCardPosition` now computes the last
  cascade step whose card-center still lands inside the box — bounded independently by width and
  height (`maxStepsX`/`maxStepsY`, using the existing `CARD_W`/`CARD_H`/`ZONE_LABEL_BAND`
  constants) — takes the smaller of the two, then wraps `graveyardCount % (maxSteps + 1)`. Past the
  threshold, a large pile restacks visually over the earliest cards instead of continuing to walk
  toward the inter-zone gap. New constants `GRAVEYARD_PILE_INSET` (10) and `GRAVEYARD_PILE_STEP`
  (6) factor the previously-inline magic numbers out, specifically so the wrap-bound math and the
  position math read off the same two numbers and can't drift apart.
- **Confirms, rather than extends, this KB's boundary**: cards are *placed* by `cardLayout.ts`, not
  *zone-detected* there (zone membership still comes from `mtg-zone` shapes via `topmostZoneAt()`)
  — but this fix is the concrete case where a placement-only bug caused a zone-detection-visible
  symptom, because zone detection reads a card's *actual* center, and an unbounded cascade can push
  that center anywhere. **Pattern worth carrying to any future unbounded cascade** (e.g. if
  `stackCardPosition`'s per-seat along/inward cascade, or any new pile function, turns out to have
  the same class of bug): a cascade over a fixed-size box must compute its own wrap bound from that
  box's dimensions, not just place cards indefinitely and hope the box is big enough.
- **Tests**: `apps/tabletop/test/cardLayout.test.ts` gained assertions that graveyard-card centers
  stay inside `graveyardBounds` for counts up to 500, and that the cascade wraps back to step 0 at
  count 32 — the old failure threshold, now a regression pin rather than a live bug.
- Resolves `TODO.md`'s `graveyard-cascade-overflow` buoy — deleted, not left as a tombstone.

No `architecture.md`/`interactions.md`/`files.md` change: no hook, shape type, or file was added,
renamed, or removed, and this doesn't introduce a new watch point (it's the same "cascade must
self-bound against center-based zone detection" lesson the zone-label-band entry already flagged
as a risk — this just confirms it firing and being fixed, not a new class of bug).

## Test-helper extraction: `tabletop-verify-helpers` (2026-08-10, `c025293`)

Pure test refactor — no app code touched, no behavior change. Extracted a shared
`apps/tabletop/test/verification/helpers.ts` module out of five specs (`verify-counter`,
`verify-zone-entry`, `verify-drag-identity`, `verify-tap-animation`, `verify-card-rotate`)
that had each grown their own near-identical copies of `fakeTraceparent()`/`cardPlayed()`,
the goto-and-wait-for-`.tl-canvas` idiom, the Shift+1-zoom-plus-settle idiom, a `placeCard()`
wrapper, and the mouse-drag primitive under different names.

This owner was consulted (`-context`) during the extraction and confirmed two facts worth
recording because they're easy to get wrong when consolidating near-duplicate test code:

- **`verify-drag-identity`'s `zoneHint: "battlefield"` override is load-bearing, not
  incidental** — it must NOT be folded into the shared default (`"stack"`), because `"stack"`
  places both of that spec's cards at the same position, which makes click-selecting the
  second card ambiguous — exactly the setup precondition the `959831c` drag-identity
  regression test depends on. Preserved with a comment at the call site.
- **`steps: 10` is genuinely uniform** across all four drag-using specs' call sites — no
  hidden per-spec calibration was found. The one `steps: 5` in `verify-zone-entry.spec.ts` is
  a small in-zone repositioning nudge, correctly left inline rather than generalized into the
  shared `dragPointTo` primitive.

Full detail in `files.md`'s new `helpers.ts` entry. No `architecture.md`/`interactions.md`
change — no ShapeUtil, hook, or shape type moved; this only reshuffled how existing test
behavior is expressed.

## Counter editing textarea: measured centering, not estimated (2026-08-10)

**Not a selection/drag/click-mechanics fix — filed here only because it touches a file this
owner tracks (`MtgCounterShapeUtil.tsx`), and because the lesson generalizes to any future
geometry-dependent render inside a ShapeUtil `component()`.** TODO.md item, bug reported by
Jess: the counter's editing textarea centered its text using `paddingTop` computed from
`fitCounterFont`'s **estimated** `lineCount` (a conservative character-width heuristic in
`counterTextFit.ts`, necessarily conservative because real width measurement is unreliable
before the webfont loads). Near a wrap boundary the estimate sometimes predicted one more line
than the browser actually rendered — "+1/+1" at the default 44px disc: estimator said
`lineCount: 2`, Orbitron bold renders it on one line — so padding sized to center the taller
*assumed* block left the shorter *actual* block sitting high with visible empty space below.

- **Fix: measure, don't estimate.** A new `useLayoutEffect` (deps `[isEditing, text, fontSize,
  h]`) temporarily zeroes the textarea's `paddingTop`, reads its actual `scrollHeight`, restores
  the padding, and computes real centering padding from that measurement — stored in
  `useState` (`measuredPadTop`), **not written straight to the DOM node**. `fitCounterFont`
  itself and `counterTextFit.test.ts` are unchanged (`lineCount` is still returned and tested
  there); the component just no longer uses `lineCount` for centering.
- **Why state, not a direct DOM write** — this is the reusable lesson: a direct
  `ta.style.paddingTop = ...` write from the effect would get stamped back over by the JSX's own
  (stale) style object on any re-render the effect's deps don't fire for — e.g. a drag or
  unrelated shape-record churn re-running `component()`. Routing the measured value through
  React state instead of the DOM survives exactly those re-renders. **Generalizable to any
  future geometry-dependent value computed imperatively inside a ShapeUtil `component()`: land
  it in state, not the DOM, or a re-render silently reverts it.**
- **Declaration-order bug caught in review**: `fontSize` (from `fitCounterFont()`) was originally
  destructured *after* the new effect that references it in its deps array — a TDZ ordering bug
  that failed `tsc --noEmit`. Fixed by moving the `fitCounterFont` call above the effect.
- **Test**: `apps/tabletop/test/verification/verify-counter.spec.ts` gained "text near the wrap
  boundary (e.g. '+1/+1') stays vertically centered while editing" — types "+1/+1", then measures
  (independently, via the same zero-padding/read-`scrollHeight` technique) whether the applied
  padding centers the actual content within 1px. Confirmed red pre-fix (3.512px off-center),
  green post-fix; all 6 tests in the file pass together.

No new watch point: nothing about click/drag/selection changed, `onTranslateEnd`'s Hazard-A
cleanup is untouched, and no new hook was added.

## Pasted/dropped images reopen watch point 1 — fixed like ticket 19's note, with a 1×1-test-image gotcha (2026-08-10)

TODO.md bug: "paste an image in, pick it, move it around, click a card, try to move it — the
image moves instead." Same class as ticket 19's note fix, and the same root cause: stock
tldraw's `ImageShapeUtil` has no `onTranslateEnd` (confirmed by reading
`node_modules/tldraw/src/lib/shapes/image/ImageShapeUtil.tsx`, tldraw 5.2.5), so a dragged image
stays selected and the next card drag silently moves it instead.

- **Fix**: new `apps/tabletop/src/client/shapes/SelectionClearingImageShapeUtil.ts`, structurally
  identical to `SelectionClearingNoteShapeUtil` — subclasses stock `ImageShapeUtil`, overrides
  only `onTranslateEnd` to call `this.editor.setSelectedShapes([])`.
- **Registration**: `TablePage.tsx`'s `shapeUtils` array now filters `"image"` out of the
  `defaultShapeUtils` spread alongside `"note"`, before appending both `SelectionClearing*`
  replacements — the same `useSync`-throws-on-duplicate-type gotcha ticket 19 found (watch point
  6/18), now hit by a second stock type.
- **Not a passenger**: images never join `PASSENGER_TYPES` — this fix is scoped entirely to the
  stale-selection hazard, with no card-hosting behavior added.
- **Test-fixture gotcha, worth remembering**: a 1×1 pixel test image made all four resize handles
  coincide at one point, so a "drag from center" click landed on a resize handle instead of the
  body — the gesture became a RESIZE (`onResizeEnd`), not a TRANSLATE (`onTranslateEnd`), making
  the fix look broken. Confirmed via an isolated debug script driving the editor directly
  (`getSelectedShapeIds()` and `props.w/h`/flip flags before/after): a 1×1 image resizes on drag
  (`w`/`h` jumped to ~908, flip flags flipped); a 100×100 image translates correctly and clears
  selection. Cost real debugging time before being traced to the fixture, not the product.
  **Lesson for future image-shape tests: use a reasonably sized test image (100×100+), never
  1×1.**
- **Test**: `apps/tabletop/test/verification/verify-image-selection.spec.ts` — places a card,
  drops a 100×100 canvas-rendered PNG via a simulated `drop` DOM event (mirroring
  `TablePage.tsx`'s real `inlineAssets.upload` path), drags the image (no test-side
  `deselectAll`), then drags the card and asserts the card — not the image — moved. All 43
  Playwright specs and 100 vitest tests pass.

Full detail in `architecture.md`'s section on it; `interactions.md` watch point 1 gained a fifth
entry point and new watch point 20; `files.md` and `README.md`'s quick-reference table updated.

## Command zones only arm for their owner's commander (2026-08-10)

TODO.md item: "Only your own commanders can land in your command zone. Any other card dragged
over it, it shouldn't light up." Implemented entirely inside `zoneHitTest.ts`, reusing the
`owner`/`isCommander` props table-layout ticket 18 already put on `mtg-card` and the `seatId`
prop `mtg-zone` already carries — no new state.

- **`ZoneHit` widened** from `{id, zone}` to `{id, zone, seatId}` — `topmostZoneAt` now threads
  the candidate `mtg-zone`'s `seatId` through, since the armed-check needs it and `topmostZoneAt`
  is the single scan both `zoneAt()` (drag-settle) and `armedZoneIdSignal` (live-drag) share.
- **New gate inside `armedZoneIdSignal`'s computed body** (ticket 14's shared per-`Editor`
  `computed()`, described in the "Ticket 14" entry above): after `topmostZoneAt` finds a hit, if
  `hit.zone === "command"`, a new private helper `allDraggedCardsAreOwnersCommander(editor,
  hit.seatId)` must return `true` or the signal returns `undefined` (not armed) instead of
  `hit.id`. Every other zone type (playmat, library, graveyard, exile, stack) is untouched — still
  arms card-agnostically, exactly as ticket 14 built it.
- **`allDraggedCardsAreOwnersCommander(editor, seatId)`**: filters `editor.getSelectedShapes()` to
  `shape.type === "mtg-card"`, returns `false` if none are selected, otherwise requires **every**
  selected card to have `props.owner === seatId && props.isCommander`. This deliberately mirrors —
  not overrides — the existing "one destination for the whole rigid group, or none" rule watch
  point 9 already established for multi-card drags: a partial match (some qualifying cards, some
  not) doesn't arm, same as it wouldn't for any other multi-select drag.
- **This owner's `-review` confirmed no selection race**: `editor.getSelectedShapes()` is read
  after tldraw's `PointingShape`/`startTranslating` selection-settling transition has already run,
  so by the time `editor.isIn("select.translating")` is true (the gate `armedZoneIdSignal` already
  checks first), the selection is already the correct dragged set — no different from how the
  existing pointer-keyed hit test already trusted `editor.inputs.currentPagePoint` mid-drag.
- **Consequence for watch point 9's "card-agnostic arming" claim**: no longer universally true.
  Command zones are the first (and so far only) card-aware exception to "every zone arms
  regardless of what's being dragged" — gated on `owner`+`isCommander`, all-selected-cards-must-
  qualify for a multi-drag. See `interactions.md`'s watch point 19 (renumbered from 21 after
  ticket 20's card-tucking watch points were removed on abandonment) and the "Depended On By"
  zone-detection section, both updated.
- **Tests**: 3 new Playwright cases in `test/verification/verify-zone-armed.spec.ts` — own
  commander arms the owner's command zone; a non-commander card does not arm it; another seat's
  commander does not arm this seat's command zone — plus the existing 4 zone-armed cases and the
  full suite (47 Playwright + 97 vitest) green.

## Ticket 21: physics gestures announced to Honeycomb (2026-08-10)

`.scratch/tabletop-physics/issues/21-gesture-vocabulary.md`, landed 2026-08-10. New file
`apps/tabletop/src/client/usePhysicsAnnouncements.ts` (owned by `fleet-is-observable`, not this
owner) adds a `store.listen()` that translates this owner's existing gesture detection into named
Honeycomb spans — `card.tapped`/`card.untapped` (from `props.tapped` changing), `card.flipped`
(from `props.face`), `card.turnedFaceDown` (from `props.faceDown`), `card.zoneMoved` (from
`meta.zone`, all four written by `MtgCardShapeUtil`'s `onClick`/`onTranslateEnd`), plus
`counter.attached`/`noteAttached` (from `parentId` changes via `onDragShapesIn`), with a generic
`shape.moved`/`shape.changed` fallback for anything else.

**This owner's territory changed by exactly one line**: `MtgCardShapeUtil.onTranslateEnd`'s old
`console.log('zone-entry ...')` (the "Descoped 2026-08-06" placeholder from the original
zone-entry-events ticket) was deleted — `card.zoneMoved`, emitted by the new listener, now covers
that notification. **No ShapeUtil hook's detection logic changed** — `onClick`, `onTranslateEnd`,
and `onDragShapesIn` still fire exactly as before; the listener only reads their resulting store
mutations, it never drives them.

This owner's `-context` consult for the ticket surfaced a real gap in this KB: `architecture.md`
and `interactions.md` documented `onTranslateEnd` (settle) but not `Translating.ts`'s per-move
write behavior, which matters to any *new* consumer reading the store directly rather than
through a ShapeUtil hook. Confirmed by reading `onPointerMove`/`moveShapesToPoint` in
`node_modules/tldraw/src/lib/tools/SelectTool/childStates/Translating.ts`: it calls
`editor.updateShapes()` on every raw pointer-move during a drag, a genuine store transaction each
time, not batched to settle. `usePhysicsAnnouncements.ts` worked around this with a 300ms
per-shape-id debounce on its generic fallback branch only — the named gestures are unaffected,
since they come from this owner's existing single-shot hook writes. Recorded as `interactions.md`
watch point 20 and a new "Depends On" bullet; `architecture.md` was left otherwise unchanged since
no ShapeUtil hook or registration mechanic actually moved.

## Table-layout ticket 20: the life counter built, and a new `editor.updateShape` lock gate found (2026-08-10)

**Ticket-number collision, same shape as the two "ticket 12"s and "ticket 13"s above**: this is
`.scratch/tabletop-table-layout/issues/20-*.md` — NOT the `tabletop-physics` "Ticket 20"
(card-tucking) recorded just below in "What Was Tried and Abandoned," which was abandoned the
same day. Two different maps, same number, no relation.

Built the life counter design decided back in the "Life counters" entry above (2026-08-08): a
new locked custom shape type, `mtg-life-counter` — `apps/tabletop/src/shared/
mtgLifeCounterShape.ts` (props `{w, h, value}`) and `apps/tabletop/src/client/shapes/
MtgLifeCounterShapeUtil.tsx` (`BaseBoxShapeUtil`, no interaction hooks, same shape as
`mtg-zone`). Minted at seat-join time (`tableFurniture.ts`'s `ensurePlayerArea`) on the name row,
far right, starting at `value: 40`, via new `lifeCounterPosition()`/`LIFE_COUNTER_W`/
`LIFE_COUNTER_H` in `cardLayout.ts`. Registered through the standard four-step pattern (shared
props file, `TablePage.tsx`'s `shapeUtils` array, `rooms.ts`'s `createTLSchema`).

- **New finding not on record before this ticket, correcting the "decided, not built" section's
  scope**: `editor.updateShape`/`updateShapes` (the public method) silently drops any partial
  targeting a **locked** shape unless the partial itself sets `isLocked: false` or the call is
  wrapped in `editor.run(fn, { ignoreShapeLock: true })`. This is a *separate* gate from the
  already-documented "locking gates the gesture state machine, not DOM events" fact (watch point
  7) — that fact is still true and unchanged (it's about `SelectTool`/`PointingShape`/
  `getDraggingOverShape` never being reached for a locked shape), but it does NOT mean a locked
  shape's props are freely writable through the ordinary editor API once a DOM handler does reach
  them. Found empirically: `setValue`'s first draft called `this.editor.updateShape(...)`
  directly from a button's `onClick`, exactly per the `HyperlinkButton`/`mtg-counter` pattern —
  compiled, ran, threw nothing, but the life total silently never changed. Fixed by wrapping the
  call: `this.editor.run(() => this.editor.updateShape(...), { ignoreShapeLock: true })`. This is
  now THE load-bearing fact for any future locked shape whose own controls mutate its own props
  (not just render/read, the way `mtg-zone`'s armed-glow `computed()` does). New watch point 22;
  `architecture.md`'s life-counter section gained this as fact 4.
- **Second, smaller finding**: reusing tldraw's own `.tl-image-container` class purely to inherit
  `pointer-events: all` (the way `MtgCounterShapeUtil` does) is a trap for a *second* shape doing
  the same thing — `verify-image-selection.spec.ts` has a locator that assumes every non-card
  shape carrying that class IS a pasted image, and adding the life counter with that class broke
  it (2 matches, expected 1) even though the shape worked correctly. Fixed by setting
  `pointerEvents: "all"` inline instead — the class was never load-bearing for the behavior, only
  for this test's assumption about what carries it. New watch point 23.
- Files touched: `mtgLifeCounterShape.ts` (new), `MtgLifeCounterShapeUtil.tsx` (new),
  `TablePage.tsx` (registration), `rooms.ts` (registration), `cardLayout.ts`
  (`lifeCounterPosition`/`LIFE_COUNTER_W`/`LIFE_COUNTER_H`), `tableFurniture.ts` (mint call in
  `ensurePlayerArea`). Tests: `test/cardLayout.test.ts`, `test/seatJoined.test.ts`,
  `test/verification/verify-life-counter.spec.ts` (new).

Full detail in `architecture.md`'s rewritten life-counter section (now "built," not "decided, not
built") and `interactions.md`'s rewritten watch point 10 plus new watch points 22-23.

## Ticket 05: five distributed workaround sites replaced by one centralized listener (2026-08-11)

Research doc: `notes/RESEARCH-stale-selection-bug.md`, referencing tldraw's own upstream issue
tldraw/tldraw#5613. Every prior fix for watch point 1's stale-selection quirk had lived on the
shape being dragged — `MtgCardShapeUtil.onTranslateEnd`, `MtgCounterShapeUtil.onTranslateEnd`,
`CardContextMenu.tsx`'s `commit()`, plus two ShapeUtil subclasses that existed solely to carry the
hook for stock shapes with none of their own (`SelectionClearingNoteShapeUtil`, ticket 19;
`SelectionClearingImageShapeUtil`, the 2026-08-10 pasted-image fix). Jess's report (2026-08-10,
"selecting an image then a card") exposed a gap none of the five could structurally reach:
`onTranslateEnd` only fires when a drag *settles*, so a shape selected by a plain **click with no
drag** (a stock `image`/`note`, selected immediately on pointer-down since neither defines
`onClick`) stays selected into the next drag of a different `onClick`-bearing shape — there's no
drag to settle, so no number of drag-settle sites could ever close it.

- **Fix: one function, registered once at Tldraw mount.**
  `apps/tabletop/src/client/clearStaleSelectionOnPointerDown.ts` listens on `editor.on('event',
  ...)` for every `pointer_down`, hit-tests the canvas, and clears the selection if the hit shape
  (if any) isn't already selected. Registered in `TablePage.tsx`'s `onTldrawMount` (renamed from
  `aimCameraAtTheTable`, which now does two things at mount instead of one). All five old sites
  were deleted outright, along with both `SelectionClearing*` subclasses — nothing replaced them
  in the `shapeUtils` array, which goes back to a plain, unfiltered `...defaultShapeUtils` spread.
- **Key correction, worth recording as the ticket's real gotcha.** The first implementation
  filtered on `info.target === 'shape'` — the `TLPointerEventTarget` union's most obvious-looking
  case. It typechecked, ran, and even passed the new spec against that spec's own test shape, then
  broke `verify-drag-identity.spec.ts`'s drag-then-drag case outright (the second card failed to
  move at all). Root cause, confirmed by console-logging a live gesture and then reading tldraw
  source, not guessed: a real DOM pointer-down is **always** dispatched with `target: 'canvas'`;
  `SelectTool/childStates/Idle.onPointerDown` does its own hit-test on that canvas-target event
  and, when it hits a shape, **recurses into itself** with a locally-constructed `{ ...info,
  target: 'shape', shape }` that never travels back through `Editor.dispatch` — so
  `editor.on('event', ...)` can never observe `target: 'shape'` for a genuine interaction, only
  `'canvas'`. Fixed by doing the same hit-test `Idle` itself does, via the public,
  `@public`-exported `getHitShapeOnCanvasPointerDown(editor)` — which also already honors
  `editor.options.selectLockedShapes` (`false` by default), so locked furniture is never "hit"
  here either, matching `Idle`'s own gate with no separate check needed.
- **Ordering fact confirmed, not assumed**: `editor.on('event', ...)` fires only after
  `Editor.dispatch` has run the event through the whole state chart for that tick
  (`_flushEventForTick` in `@tldraw/editor`), so this listener never fights
  `PointingShape.onEnter`'s own selection decision for the shape just hit on THIS pointer-down —
  it only cleans up staleness left over from a previous gesture.
- **`markEventAsHandled` callers (the life counter's +/- buttons) are immune by construction, no
  special-casing needed**: `useCanvasEvents.ts` checks `wasEventAlreadyHandled` before
  `editor.dispatch` is ever called, so `editor.emit('event', ...)` never fires for a press on one
  of those buttons at all.
- **New Playwright spec**: `apps/tabletop/test/verification/verify-click-then-drag-selection.spec.ts`
  reproduces the click-with-no-drag gap directly — confirmed red before the fix. Existing
  selection-adjacent specs (`verify-drag-identity`, `verify-multi-untap`, `verify-image-selection`,
  `verify-note`'s drag-then-drag case) all pass unmodified; full `./verify.sh` (42/44 — the 2
  failures are the pre-existing, unrelated `seat.joined` 400, confirmed via `git stash` to exist on
  unmodified code too, tracked as the `seat-joined-400` `TODO.md` buoy) and full `npx vitest run`
  (101/101) both green. `verify-life-counter.spec.ts` also gained a targeted regression assertion
  (pressing +/- doesn't clear an unrelated existing selection) confirming the `markEventAsHandled`
  immunity empirically — currently blocked from going green by the same pre-existing
  `seat.joined` 400, not by anything this ticket touched.

Full detail in `architecture.md`'s new "Ticket 05" section; `interactions.md` watch point 1 marked
superseded (with the new mechanism recorded as the KB's forward-looking default for future
`onClick`-bearing shapes) and new watch point 24 for the `target: 'canvas'`-not-`'shape'` gotcha;
`files.md` and `README.md`'s quick-reference table updated; both `SelectionClearing*` files and
their `files.md` entries removed as dead weight.

## Tabletop-architecture ticket 02: `tableFurniture.ts`'s builders lose their `as any` (2026-08-11)

**Type-only change, confirmed out of scope for this owner's mechanics** — no runtime field
values, `isLocked`/`opacity` defaults, index bands, or mint-time call ordering changed, and
no ShapeUtil hook, gesture code, or selection logic was touched. Recorded here only because
`zoneShape()` and `mtgCardShape()` are this owner's own quick-reference entries (`README.md`'s
table, `files.md`) and because the KB had two lingering `as any` mentions (watch point 16,
`architecture.md`'s "Table-layout ticket 18" section) that described the *call sites'* old
inline literals, not these builders' own return type — worth a precise update so a future
reader doesn't conflate the two.

`zoneShape()`, `mtgCardShape()`, and the private `imageShape()` in
`apps/tabletop/src/server/tableFurniture.ts` now declare real return types —
`MtgZoneShape`, `MtgCardShape`, and tldraw's own `TLImageShape` respectively — instead of
casting their object literal to `any`. Each function's `parentId: pageId` picked up an
`as TLPageId` cast (the string-vs-branded-type gap that the old blanket `as any` had been
papering over for the whole object, not just that one field). Both existing mint call sites
— `cardArrival.ts` (ordinary arrivals) and `seatJoined.ts` (commanders and their ghosts,
table-layout ticket 18) — already routed through `mtgCardShape()` before this ticket and are
untouched by it; they were never holding their own `as any` literal, only `tableFurniture.ts`'s
builder functions were. New `apps/tabletop/test/tableFurniture.test.ts` adds direct unit
tests on the three constructors (mint-time record shape: `parentId`/`isLocked`/`opacity`
defaults and the ghost overrides, `zoneShape`'s sleeve-opacity branch) — previously these
builders were exercised only indirectly through `cardArrival.ts`/`seatJoined.ts`'s own
integration tests.

**No KB section needed rewriting** — the strict typing doesn't change any fact this owner
tracks (watch point 15's "one place every required `mtg-card` prop is listed" still holds,
now with a compiler check on the return shape as well as the constructor's own field list).

## What Was Tried and Abandoned

**Ticket 20, card-tucking (2026-08-10, abandoned same day as `ac27a99`).** Two implementations
were built and reverted: real tldraw parenting (a tucked card could never render or reorder
behind its own parent — confirmed against `Editor.getUnorderedRenderingShapes`/
`getReorderingShapesChanges`), then a `meta.tuckedWith` link between sibling cards, which broke
worse in production (cards flying to/away from each other via an unguarded `onDragShapesIn`
hover side effect, with no matching un-tuck). Both were backed out entirely — no tuck link, no
`mtg-card`-as-passenger, nothing remains in the codebase. Full postmortem, plus a group-based
redesign that was discussed but never built, is at
`apps/tabletop/notes/DESIGN-card-tucking-abandoned.md` — read it first if this is ever
revisited; it has real prior art on where a group-based approach would hit tldraw's
click-resolution and selection quirks.

If a future fix attempt for a similar quirk is tried and reverted, record it here so the next
person doesn't repeat it.

## Tabletop-architecture ticket 03: disjointness invariant now enforced at module load, not only in the test suite (2026-08-11)

Entirely
within `apps/tabletop/src/server/cardLayout.ts` and `test/cardLayout.test.ts` — no ShapeUtil,
gesture, or selection code touched, confirming this owner's `-review` call that a pure-geometry
edit to `cardLayout.ts` doesn't need this owner's machinery.

- The pairwise `separation()`-based check watch point 8 already relied on (asserted only in
  `test/cardLayout.test.ts`) is now an exported pure function, `checkZonesDisjoint(zones,
  minGap)`, taking a `Record<string, Bounds>` and throwing (naming the two offending zone keys
  and the actual gap) if any pair is separated by less than `minGap`.
- A new module-level `assertLayoutInvariants()` builds the same 21-zone set watch point 8's
  event-handler-seam test already covers (all four seats' playmat/library/command/graveyard/exile
  plus the Stack) and calls `checkZonesDisjoint(zones, GAP)` — and runs **unconditionally at
  import time**, at the bottom of `cardLayout.ts`. A constant edit that breaks the invariant
  (including watch point 8's own `STACK_SIZE`-vs-`PLAYMAT_H` case) now throws at server boot or
  any module load, not only when someone happens to run `test/cardLayout.test.ts`.
  `test/cardLayout.test.ts`'s pre-existing "keeps every zone AABB apart" test now calls this same
  exported function instead of duplicating the separation logic locally.
- No behavior change for the current valid constants — this raises the invariant's guard count
  from three layers to four (pure-geometry test, event-handler-seam test, the `MAX_SEATS` throw,
  and now module load) without altering what's actually being checked.

Full detail in `interactions.md` watch point 8 (new paragraph) and its "Depended On By → Zone
detection" section (new confirming note).

## Tabletop-architecture ticket 01: `MtgCardShapeUtil.tsx` split by hook, organizational only (2026-08-11)

Worktree `ticket-01-split-cardshapeutil`, branch `worktree-ticket-01-split-cardshapeutil`.
`MtgCardShapeUtil.tsx` (388 lines, 21 commits, holding every hook's full body inline) split into
a thin shell plus four new sibling files, one per hook:

- `apps/tabletop/src/client/shapes/cardRender.tsx` — `component()`'s JSX body (`CardFace({shape})`),
  `getIndicatorPath`'s body (`cardIndicatorPath(shape)`), and the tap catch-up `useLayoutEffect`.
- `apps/tabletop/src/client/shapes/cardTapClick.ts` — `onClick`'s full body
  (`handleCardClick(editor, shape)`), including ticket 16's `queueMicrotask` undo-coalescing trick,
  preserved verbatim with its ordering-hazard comment.
- `apps/tabletop/src/client/shapes/cardPassengers.ts` — `PASSENGER_TYPES`, the two `can*` gates,
  and `onDragShapesIn`/`onDragShapesOut`'s bodies, including the rotation-zeroing math for
  `reparentShapes`' page-rotation-preservation quirk.
- `apps/tabletop/src/client/shapes/cardZoneEntry.ts` — `NON_BATTLEFIELD_ZONES`, `onTranslateEnd`'s
  body, and its two former-private helpers `zoneAt`/`evictPassengers`, now module-level functions.

Every extracted function takes `editor: Editor` and the relevant shape(s) as explicit parameters
instead of reading `this.editor` — the same pattern `cardTap.ts`'s `tapPartial` (ticket 17) already
used. `MtgCardShapeUtil.tsx` itself shrank to 83 lines: still extends `BaseBoxShapeUtil`, still
declares every override (load-bearing regardless of body — see the `onClick`-defers-selection
quirk), each body now a one-line delegation.

- **Not the review's originally-proposed CardPhysics/interop architectural split.** Grilling on the
  ticket found no clean seam of that kind exists in this file — every hook mixes a tldraw quirk
  with a domain rule inseparably (`onClick` = tap/untap + the `queueMicrotask` undo-coalescing
  trick; `onTranslateEnd` = zone-entry + tldraw's settle-once debounce; `onDragShapesIn` =
  counter-attachment + `reparentShapes`' rotation-preservation quirk). Jess's call was explicitly
  organizational: split by hook for navigability, pull out anything genuinely tldraw-free where it
  already existed (`tapPartial`, `topmostZoneAt`, `findOpenSpotsNearZoneEdge` — untouched by this
  ticket), but don't invent a false purity boundary elsewhere.
- **Zero behavior change, confirmed**: 110/110 vitest tests pass before and after; 43/44 Playwright
  `verify.sh` specs pass before and after — the one failure, `verify-life-counter.spec.ts:102`,
  reproduces identically on unmodified `main` (pre-existing flakiness, unrelated).
- **Consequence for the `two-faced-cards` boundary**: before this ticket, one file
  (`MtgCardShapeUtil.tsx`) served both this owner's territory and `two-faced-cards`'s. After the
  split, `two-faced-cards`'s concern (what image/face renders) lives mostly in `cardRender.tsx`'s
  `CardFace`, while this owner's spans the shell plus `cardTapClick.ts`/`cardPassengers.ts`/
  `cardZoneEntry.ts` — except the tap catch-up animation, which stayed in `cardRender.tsx` (it's
  rendering code, even though the gesture it reacts to is this owner's). File location tracks
  concern more closely than before, but still not exactly — don't use it as the sole signal for
  which owner a question belongs to.

Full detail in `architecture.md`'s new "Ticket 01" section (and its rewritten "The ShapeUtil today"
intro and "How to tell this owner's territory from `two-faced-cards`'s" section);
`interactions.md`'s "Depends On" → `two-faced-cards` note rewritten; `files.md` gained the four new
file entries and `MtgCardShapeUtil.tsx`'s entry rewritten; `README.md`'s quick-reference table
gained rows for the four new files.

## Correction: `verify-life-counter.spec.ts:102` was never a flake — furniture images weren't excluded from the count (2026-08-11)

Ticket 01's landing note above wrote off this spec's one failure as "pre-existing flakiness,
unrelated." That was wrong, and the mistake is worth recording precisely because it's the kind of
call this KB exists to get right: a symptom that *looks* like the flake class this KB already knows
about (camera timing, `Editor.getShapeAtPoint` hit-test margins at low zoom — see `history.md`'s
`96159be` entry and watch point 13's counter/passenger hit-test note) was instead a deterministic
count bug, reproducing every run.

- **Root cause**: `seat.joined` draws two locked furniture `image` shapes per seat — the playmat
  picture and the library card back (`tableFurniture.ts`'s `ensurePlayerArea`) — and the spec's
  locator, `.tl-shape[data-shape-type="image"]`, matched all of them plus the one pasted image the
  test actually cares about. Expected 1, got 3. Nothing about this depends on timing or camera
  state; it fails the same way every run.
- **Fix**: `tableFurniture.ts` gained an exported `FURNITURE_IMAGE_ID_MARKER = "furniture-image-"`,
  prefixed onto both furniture image shape ids (`matImageId`, `libraryImageId`); the spec's locator
  narrowed to `.tl-shape[data-shape-type="image"]:not([data-shape-id*="furniture-image-"])`. **New
  naming convention for future furniture images**: any new locked background picture furniture ever
  grows should mint its shape id with this same prefix, so it's excluded from "content someone
  actually dropped on the table" by construction rather than by each spec inventing its own carve-out.
  This generalizes the ad hoc idiom `verify-image-selection.spec.ts` already used
  (`:not([id^="shape\\:card-"])` to skip a card's own face image) into a real, exported marker other
  furniture can adopt.
- **Second, independent finding while verifying the fix — `.tl-selected` never matches, in this
  tldraw version.** The same spec's two "selection still holds" assertions
  (`expect(page.locator(".tl-selected")).toHaveCount(1)`) were *also* silently vacuous: tldraw's
  selection outline/handles now paint on the `tl-canvas-overlays` `<canvas>` (confirmed against
  tldraw's own `ShapeIndicatorOverlayUtil.ts`/`SelectionForegroundOverlayUtil.ts` source, not
  guessed), never as a DOM/SVG element carrying that class — so no CSS locator can ever see it, and
  the assertion always passed regardless of actual selection state. Rewritten using this owner's
  existing behavioral-proxy convention (`verify-click-then-drag-selection.spec.ts` et al.): press
  `ArrowRight` and assert the image's bounding box moved, since an arrow-key nudge only acts on the
  current selection. **Gotcha found doing this**: clicking the life counter's +/- button leaves DOM
  focus on that button, and tldraw's arrow-key nudge handler is attached to `.tl-container`, not the
  document — a bare `page.keyboard.press("ArrowRight")` right after the button click goes nowhere.
  tldraw ships an accessible "Move focus to canvas" skip-link for exactly this handoff, but it's
  off-screen and fails Playwright's actionability checks even with `{ force: true }` or
  `dispatchEvent("click")`. The reliable fix: `page.locator(".tl-container").evaluate(el =>
  el.focus())` before the nudge. **Any future Playwright spec asserting selection persistence after
  a DOM-button click (not a canvas click) needs this same refocus step first**, or the nudge probe
  itself becomes a false negative.
- **Left alone, flagged for a follow-up**: the OTHER `.tl-selected` assertion in this file (line
  ~65, "life counter starts at 40…", checking a locked shape click doesn't select) is equally
  vacuous and wasn't touched — out of scope for this fix. Converting it to the same
  behavioral-proxy pattern is a small follow-up, not done here.

**Lesson for this KB's own judgment, not just the test**: "reproduces identically" is evidence a
failure is deterministic, not evidence it's a flake — the ticket 01 landing note conflated the two.
A test failure earns the "pre-existing flakiness" label only after its root cause is actually
identified as timing/race-dependent (per this KB's established flake taxonomy: reactive camera
moves, off-viewport culling, hit-test margins at low zoom — see `history.md`'s `96159be` entry and
watch point 13), not merely because it fails the same way on unmodified `main`.

Full detail: `apps/tabletop/src/server/tableFurniture.ts` (`FURNITURE_IMAGE_ID_MARKER` export),
`apps/tabletop/test/verification/verify-life-counter.spec.ts` (locator fix + both rewritten
selection-persistence assertions). See `interactions.md` watch point 13's new sub-point and
`files.md`'s `tableFurniture.ts`/`verify-life-counter.spec.ts` entries.

## Copy hint — a toast explaining why ctrl+c does nothing (2026-08-12)

`apps/tabletop/src/client/TablePage.tsx` gained a "Copy doesn't work here. Use duplicate (ctrl-d)
instead." toast, shown whenever a player tries to copy a selected shape. **Not this owner's core
charge** (it's clipboard/keyboard interception, not a ShapeUtil hook or the selection state
machine) — recorded here only because the mechanics behind it are a genuine tldraw quirk in the
same "read the source, don't guess" vein this KB already keeps, and because it landed in
`TablePage.tsx`, a file this owner already tracks (shape/tool registration site).

- **`overrides.actions.copy` never intercepts the ctrl+c/cmd+c keyboard shortcut.** tldraw's
  `useKeyboardShortcuts` hook hardcodes `SKIP_KBDS = ["copy", "cut", "paste", "asset"]` — those
  four action ids are deliberately never wired to keyboard dispatch at all. So
  `uiOverrides.actions.copy` (added here to catch the Edit-menu/context-menu "Copy" item) is a
  menu-only hook; the keyboard path bypasses `overrides.actions` entirely and is handled by
  `<Tldraw>`'s own `useNativeClipboardEvents`, which attaches a bubble-phase
  `document.addEventListener("copy", ...)` listener that reads
  `editor.getSelectedShapeIds()` directly.
- **The fix intercepts the keyboard path with a second, capturing listener**: a new
  `useCopyHint()` hook (mounted from `ToolbarWithCounter`, already inside the tldraw UI context so
  `useEditor()`/`useToasts()` are available) adds `window.addEventListener("copy", handler,
  { capture: true })`. Capture-phase on `window` reliably fires before tldraw's own bubble-phase
  listener on `document`, since `window` is an ancestor of `document` in the event's propagation
  path — confirmed by reasoning about DOM event-phase ordering, not by trial and error. The handler
  checks `editor.getSelectedShapeIds().length > 0 && editor.getEditingShapeId() === null` (mirroring
  tldraw's own no-op guard for the native listener) before calling `preventDefault()` +
  `stopImmediatePropagation()` and showing the toast, so copying real text while mid-edit on a
  counter/note is untouched.
- **Toast uses tldraw's built-in `useToasts().addToast`** — no custom toast component, same
  `COPY_DISABLED_TOAST` object reused by both the menu-action override and the keyboard listener.
- **Test**: `apps/tabletop/test/verification/verify-copy-hint.spec.ts` — selects a card via
  marquee-drag (not a direct click), because a single click on a counter/card enters text-edit mode
  for some shapes and a direct click on this app's `mtg-card` would otherwise conflate this test
  with watch point 1's selection-deferral quirk; marquee-select sidesteps that entirely.

**Not added as a new watch point** — this doesn't touch a ShapeUtil hook, the `SelectTool` state
machine, or shape selection state as this KB defines it; it's tldraw's *clipboard* event wiring,
a sibling gotcha worth having on record next to watch point 24's `editor.on('event', ...)`
targeting quirk, but a different mechanism. If a future change needs to intercept `cut`/`paste`
too, the same `SKIP_KBDS` fact and capture-on-`window` trick apply.

## Editable deck title — a second locked-interactive shape, `mtg-title` (2026-08-12, `96551ef`)

`.scratch/editable-deck-title/plan.md`. The seat name label was a stock, locked `text` shape
(green serif, `richText`), made `isLocked: true` back in ticket 13 to stop players dragging or
deleting each other's labels. That lock left it un-editable too. This change makes the title
editable **without unlocking** by giving it its own custom shape type, `mtg-title` — the
life-counter pattern (watch point 10 / `mtg-life-counter`) applied to a second shape.

- **New files**: `apps/tabletop/src/shared/mtgTitleShape.ts` (`MtgTitleShapeProps = {w, h, text}`,
  the standard `TLGlobalShapePropsMap` augmentation, `mtgTitleShapeProps` validators) and
  `apps/tabletop/src/client/shapes/MtgTitleShapeUtil.tsx` (`BaseBoxShapeUtil<MtgTitleShape>`, no
  interaction hooks — same as `mtg-zone`/`mtg-life-counter`; interactivity lives entirely in
  `component()`'s DOM `<input>`).
- **Replaces the stock `text` label in `tableFurniture.ts`'s `ensurePlayerArea`.** Same `labelId`
  (`name-label-<table>-<seat>`), same `isLocked: true`, same z-index slot (still minted right
  after the life counter via `nextFurnitureIndex`), so the commander-damage counter's
  `getIndexAbove(label.index)` anchoring (`c90d13a`'s z-order fix) is unchanged. The old
  `richText`/`toRichText`/`color`/`font`/`autoSize`/`scale` props are gone; the `toRichText` import
  dropped from `tableFurniture.ts`. Width is now `PLAYMAT_W - LIFE_COUNTER_W - GAP` (the band from
  the playmat's left edge up to the life counter), so `NAME_LABEL_HEIGHT` was exported from
  `cardLayout.ts` and `PLAYMAT_W`/`GAP` imported into `tableFurniture.ts`.
- **The four-step registration recipe (watch point 6) generalized cleanly to a fifth shape type**:
  props file's `TLGlobalShapePropsMap` augmentation; client `shapeUtils` array in `TablePage.tsx`;
  server `createTLSchema` shapes map in `rooms.ts` (`"mtg-title": { props: mtgTitleShapeProps }`);
  and step 4 (pointer-events) satisfied by `pointerEvents: "all"` inline on the `<input>` — set
  inline, not via `.tl-image-container`, following the life counter's watch-point-23 caution.
- **Second real consumer of the `editor.run(..., { ignoreShapeLock: true })` lock gate (watch
  point 22).** `setText` wraps its `updateShape` in `editor.run` with `ignoreShapeLock: true`, or
  the write to the locked shape's own prop is a silent no-op. First non-life-counter instance,
  confirming that finding generalizes to any locked shape whose own DOM controls write to its props.
- **The keystroke-shielding hazard (watch point 10b), flagged as a near-certain bug for an
  always-live input, is now confirmed and fixed on a real second shape.** `onKeyDown` calls
  `e.stopPropagation()` for every key so tldraw's tool hotkeys (r/t/v/d/s…) don't fire mid-word;
  Enter commits + blurs, Escape cancels (discards the draft) + blurs. Verified live in Playwright
  by typing "Reanimator deck" (contains r, t, d, s) and asserting the letters reached the field.
  Unlike `mtg-counter`, which edits through tldraw's own editing state and gets
  `areShortcutsDisabled` for free, this is an always-live input with no editing state — exactly the
  case watch point 10b warned still pays the shield.
- **Draft-buffer edit model**: the `<input>` holds a local React `useState` draft (`value={draft
  ?? text}`), set on focus, updated on change, and flushed to the synced `text` prop only on
  blur/Enter (`commitDraft`) — Escape discards the draft. So the shape prop (and sync traffic)
  updates once per commit, not once per keystroke, and a mid-edit remote view sees the last
  committed title, not every intermediate letter.
- **Watch point 1 does NOT apply** — locked shape, no `onClick`, interactivity is DOM-only; it
  never reaches `PointingShape`, so no drag-settle selection cleanup is needed (and the centralized
  `clearStaleSelectionOnPointerDown` covers it regardless).
- **Appearance is a faithful reproduction of the old green serif** (`#099268`, Georgia/serif, and
  the fleet's one decided `:focus-visible` treatment reproduced verbatim as the life counter does)
  — the on-brand Orbitron treatment is a **separate, unratified appearance decision**, deliberately
  not ridden along on this mechanics/placement change, to be staged for Jess.
- **Tests**: `apps/tabletop/test/deckTitleShape.test.ts` (unit) and
  `apps/tabletop/test/verification/verify-deck-title.spec.ts` (edit syncs to a second browser
  context + survives reload). `test/seatJoined.test.ts` updated for the label's new type/props.
  All 121 vitest pass.
