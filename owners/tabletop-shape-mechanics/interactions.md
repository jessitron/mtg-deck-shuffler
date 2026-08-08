# Interactions

## Depends On

### tldraw's `SelectTool` state machine (read-only dependency)
- `PointingShape` and `Translating` (`node_modules/tldraw/src/lib/tools/SelectTool/childStates/`)
  own selection and drag-start behavior; this owner's ShapeUtil hooks react to tldraw's
  decisions, never override tldraw's own state machine.
- tldraw ships its TypeScript source in `node_modules` — read it when behavior surprises you,
  same as `architecture.md`'s drag-bug writeup did. Don't guess from the compiled output or from
  the docs site; the actual guard conditions (e.g. `startTranslating`'s
  `!this.didSelectOnEnter && !this.editor.getSelectedShapeIds().length`) are the ground truth.
- **A tldraw version bump can change these internals without a major-version signal** — this
  owner has no test that would catch tldraw changing `PointingShape`'s logic; only the
  regression test (`verify-drag-identity.spec.ts`) would notice the *symptom* resurfacing, not
  the cause changing. If a tldraw upgrade is ever done, re-read `PointingShape.ts`/
  `Translating.ts` for this class of change.

### Shape identity (`props.instanceId`)
- Minted once in `apps/tabletop/src/server/cardArrival.ts` at shape creation, never elsewhere, now
  directly in the shape's validated `props` (moved out of `meta` by ticket 12, 2026-08-08).
- No hook needs a defensive identity guard anymore: `mtg-card` is its own exclusive tldraw shape
  type (registered via the `TLGlobalShapePropsMap` augmentation in
  `apps/tabletop/src/shared/mtgCardShape.ts` — see `architecture.md`), so every instance of it is
  a real card by construction. The old `if (!shape.meta?.instanceId) return undefined` guard,
  needed only because cards/furniture/stray-drops used to share `type: "image"`, was removed.
- `meta` still exists on the *card* shape but now carries *only* `zone` (zone-entry dedup, see
  `onTranslateEnd`) — this is the card's own "what zone was I last known to be in," not a copy of
  anything on the zone shape. Ticket 13 (landed 2026-08-08) upgraded the *other* half — how
  `zoneAt()` finds the zone in the first place — from scanning any shape's bare `meta.zone` string
  to matching real `mtg-zone` shapes' validated `props.zone`; see the next section.

## Depended On By

### `two-faced-cards` (card rendering, not mechanics)
- Shares one file today (`MtgCardShapeUtil.tsx`) but a different concern: that owner cares what
  image/face renders, this owner cares whether the right shape responds to the pointer. See
  `owners/two-faced-cards/interactions.md` watch point 16 and `architecture.md`'s "How to tell
  this owner's territory from `two-faced-cards`'s" section.
- **Ticket 12's `mtg-card` rewrite landed as a joint change** (2026-08-08): the
  `setSelectedShapes([])` selection-cleanup was carried forward into the new ShapeUtil unchanged
  (any ShapeUtil with `onClick` inherits the tldraw quirk — watch point 1 below), and
  `two-faced-cards`'s props-based flip/identity model landed alongside it (flip is now a pure
  `props.face` write, no per-instance tldraw asset). Both owners' territory changed in the same
  commit; consult `owners/two-faced-cards/` for anything about *which face renders*, this owner
  for anything about *what responds to the pointer*.

### Zone detection (`tableFurniture.ts`, `MtgZoneShapeUtil.tsx`, `cardLayout.ts`)
- Furniture is now `mtg-zone`, a genuine custom shape type (ticket 13, landed 2026-08-08;
  `apps/tabletop/src/shared/mtgZoneShape.ts` + `apps/tabletop/src/client/shapes/
  MtgZoneShapeUtil.tsx`) — no longer stock, locked `geo`/`image` shapes stamped with a bare
  `meta.zone` string. `zoneAt()` in `MtgCardShapeUtil.tsx` now filters
  `candidate.type === "mtg-zone"` and reads the validated `candidate.props.zone`, instead of
  scanning every shape for a truthy `meta.zone`.
- `zoneAt()` also now resolves overlapping zones — previously undefined behavior — by picking
  whichever candidate has the greatest `index` (an `IndexKey`; plain string `>` comparison already
  reflects z-order for tldraw's fractional-indexing scheme), i.e. the topmost-drawn zone wins.
- `MtgZoneShapeUtil` defines **no** `onClick`/`onTranslateEnd`/`onDragShapesOver` — see
  `architecture.md`'s "Ticket 13" section for why that's provably safe rather than just
  convenient: zones are always `isLocked: true`, `SelectTool`'s `Idle` state gates on `isLocked`
  before a locked shape ever reaches `PointingShape` (so watch point 1's quirk can't apply to it,
  even if it grew an `onClick` later), and `Editor.getDraggingOverShape` filters out locked shapes
  before checking drag-over hooks (so a target-side hook on the zone could never fire regardless).
  This is now the KB's concrete working example of "a locked shape needs no interaction hooks at
  all" — previously only asserted in the abstract (see watch point 7, new, below).

## Watch Points

1. **Any ShapeUtil that defines `onClick` inherits the selection-deferral quirk.** If a new
   custom shape type defines `onClick` (tap, a button, anything), its equivalent of
   `onTranslateEnd`/drag-settle must also call `this.editor.setSelectedShapes([])` — otherwise
   the drag-picks-up-the-wrong-shape bug reopens for that shape type. This is the single most
   important watch point in this KB; it already bit — and was correctly ported forward into —
   ticket 12's `mtg-card` rewrite (see `architecture.md`). Any *next* new custom shape type with
   `onClick` needs the same treatment.

2. **The selection-clear must run before any early return in the drag-settle hook.** In
   `onTranslateEnd`, the zone-equality check (`if (zone === previousZone) return undefined`) is
   hit by ordinary same-zone drags (e.g. rearranging two lands on one playmat). The
   `setSelectedShapes([])` call is placed *before* that early return specifically so those drags
   still clear selection. Moving it after, or adding a new early return above it, silently
   reopens the bug for whatever drags hit that return.

3. **`mtg-card` is now its own exclusive tldraw shape type — no identity guard needed, but don't
   assume that generalizes.** Since ticket 12, every `mtg-card` shape is a real card by
   construction, so hooks no longer guard on `props.instanceId` before acting. If a *future*
   shape type is ever added that shares a tldraw `type` string across meanings again (unlikely,
   but it's exactly how the old `image`-sharing bug happened), that guard pattern needs to come
   back for it.

4. **Rotation pivots around `x,y` (top-left), not the shape's center.** Any new hook that moves
   or rotates a card must recompute `x`/`y` to hold the center fixed under the new rotation (see
   `98f8bea`'s fix and the `halfExtent`/`center`/`topLeft` math in `onClick`) — a naive
   `rotation` write alone swings the card around its corner.

5. **This ShapeUtil currently has no tests for the tldraw-quirk class of bug beyond
   `verify-drag-identity.spec.ts`.** That test covers exactly the reported symptom (drag A, then
   drag B, B should move). It would NOT catch a regression in, say, shift-click multi-select
   interacting with `onClick`-bearing shapes, or a tldraw upgrade changing the guard conditions
   themselves. Treat new drag/select/tap behavior as needing its own explicit test, not coverage
   by association.

6. **Registering a new custom shape type needs FOUR separate steps, and missing any one fails
   differently.** (1) The `declare module "@tldraw/tlschema" { interface TLGlobalShapePropsMap`
   augmentation — miss it and `BaseBoxShapeUtil<Shape>` fails to *typecheck*, caught at build
   time. (2) Client `useSync({ shapeUtils: [...defaultShapeUtils, MyUtil] })` in `TablePage.tsx`
   — miss the `defaultShapeUtils` spread and *furniture* silently fails client-side validation,
   not the new shape. (3) Server `createTLSchema({ shapes: { ...defaultShapeSchemas, ... } })` in
   `rooms.ts` — miss the `defaultShapeSchemas` spread and the *server* schema rejects furniture,
   disconnecting clients outright. (4) The ShapeUtil's `component()` must wrap interactive content
   in `.tl-image-container`/`.tl-image` (or otherwise defeat `.tl-html-container`'s
   `pointer-events: none`) or clicks silently never land, which Playwright will report as "element
   intercepts pointer events" rather than anything shape-specific. See `architecture.md`'s
   Registration sections for all four. This bit on ticket 12's implementation (item 4, the
   pointer-events trap, broke every click-based Playwright spec until traced). **Item 4 is
   conditional on the component's content being interactive — NOT on the shape being unlocked**:
   ticket 13's `mtg-zone` generalized steps 1-3 cleanly (see `architecture.md`) but didn't need
   step 4 at all, because nothing ever clicks a zone — `MtgZoneShapeUtil.component()` renders a
   plain `<div>` with no `.tl-image-container` treatment and that's correct, not an oversight.
   The decided-but-unbuilt `mtg-counter` (see `architecture.md`) is the counterexample that
   forced this precision: it will be *locked* yet its `component()` hosts buttons and an input,
   so it pays step 4 in full — locking gates tldraw's gesture state machine, not DOM events.

7. **A locked shape needs no interaction hooks — now demonstrated, not just asserted.**
   `MtgZoneShapeUtil` (ticket 13, `apps/tabletop/src/client/shapes/MtgZoneShapeUtil.tsx`) defines
   none of `onClick`/`onTranslateEnd`/`onDragShapesOver`, and that's correct by construction:
   zones are minted `isLocked: true` and stay that way (tldraw's context-menu Lock/Unlock is the
   sole unlock path), `SelectTool`'s `Idle` state gates on `isLocked` before a shape ever reaches
   `PointingShape` (so watch point 1's `onClick`-selection-deferral quirk is structurally
   unreachable for it), and `Editor.getDraggingOverShape` filters `!isLocked` before checking
   drag-over hooks (so a target-side hook could never fire either). **If `mtg-zone` ever grows an
   `onClick`** (e.g. a future custom unlock affordance), it still would NOT reopen watch point 1's
   quirk, because that quirk's gate (`PointingShape.onEnter`) sits behind the very same
   `isLocked` check — a locked shape with `onClick` never reaches the code path that defers
   selection in the first place. This distinction (locked-with-onClick vs. unlocked-with-onClick)
   is worth remembering exactly because it looks like it should matter and doesn't. **"No
   interaction hooks" does not mean "no interactivity"**: locking gates ShapeUtil hooks (the
   gesture state machine), not DOM events inside `component()` — a locked shape can still host
   working buttons via the `HyperlinkButton` pattern (see watch point 9 and `architecture.md`'s
   `mtg-counter` section).

8. **`zoneAt()` is first-match-not-closest-match, with no orientation awareness — a new risk
   once zones cluster around a shared center.** `zoneAt()` (`MtgCardShapeUtil.tsx`, see
   `architecture.md`) walks `getCurrentPageShapes()` and returns the *first* candidate shape
   whose `meta.zone` bounds contain the dragged card's center — not the closest, not the
   smallest, not the one the player was visually dropping into. That was never a problem worth
   naming while zones (playmat/library/command-zone/graveyard/exile per seat) sat spread out in
   a row with clear gaps between player areas — bounds essentially never overlapped, so "first
   match" and "correct match" were the same thing by construction of the layout, not the code.
   **"The square"** (`.scratch/tabletop-table-layout/issues/10-the-square.md`, decided
   2026-08-08, not yet built — see `apps/tabletop/DESIGN.md`'s "The square" section) moves player
   areas from the row into compass slots (N/E/S/W) packed around a fixed-size centered Stack. If
   that packing puts E/W zones close to the Stack's corners, overlapping or abutting zone AABBs
   become possible for the first time, and `zoneAt()`'s first-match iteration order (whatever
   `getCurrentPageShapes()` happens to return) — not proximity, not which zone visually contains
   more of the card — would decide the winner. Flagged during the grilling session for "the
   square" as a risk worth recording before implementation starts, not yet a bug (no code has
   changed for this ticket; `cardLayout.ts`/`tableFurniture.ts` are untouched). Whoever builds
   "the square" should re-check `zoneAt()` against the actual N/E/S/W geometry once it's drawn,
   and consider closest-match-by-distance or smallest-containing-zone as a tiebreak if AABBs do
   end up overlapping.

9. **Locked-but-interactive shapes: the `mtg-counter` pattern (decided 2026-08-08, not yet
   built).** A life counter will be a new locked custom shape whose `component()` renders +/-
   buttons and a typeable number field (see `architecture.md`'s "`mtg-counter`: decided, not
   built"). Whoever builds it — or any future locked shape with live controls — has three
   specific hazards on record: (a) each control needs `pointer-events: all` plus
   `editor.markEventAsHandled(e)` in its pointer handlers (tldraw's own `HyperlinkButton`
   pattern; preferred over the older `stopEventPropagation` util) or the canvas swallows the
   press; (b) the typeable field must shield keystrokes from tldraw's tool hotkeys, or typing a
   life total switches tools; (c) tldraw sync is last-writer-wins, so simultaneous presses on
   the same counter can lose one increment — accepted for counters, and the reason
   story-quality life-change records need an explicit event per press (parked at
   `.scratch/tabletop-replaces-mural/parked/life-change-events.md`). Watch point 1 does NOT
   apply to it (locked shapes never reach `PointingShape`), but watch point 6's step 4 does.

## Not Related To

### Card face/image rendering
What image a card shows (front/back, Scryfall URL resolution, `CardDefinition`/`CardFace`) is
`two-faced-cards`'s territory, not this owner's — even though today it's the same source file.
A bug where the wrong *image* shows is that owner's; a bug where the wrong *shape* moves, taps,
or gets dragged is this owner's.

### Fleet visual design (colors, fonts, CSS)
`shuffler-looks-like-itself` owns the Tabletop's visual identity, including its own "tldraw
limits" list (font enum, focus rings, locked-shape drop targets, opaque-image z-order) — those
are *rendering/styling* limits, distinct from this owner's *interaction/selection* limits, even
though both are "things tldraw won't let us do." Consult that owner for appearance; this one for
gesture correctness.

### The Spine's event feed / table furniture placement
Where a card or zone gets *placed* on first arrival (`cardArrival.ts`, `tableFurniture.ts`,
`seatJoined.ts`) is the Tabletop's server-side geography, covered by `DESIGN.md` and the
`tabletop-physics` planning map — not this owner. This owner starts once a shape already exists
on the board and something clicks or drags it.
