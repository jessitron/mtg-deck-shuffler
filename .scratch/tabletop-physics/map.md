# Physics — cards and furniture are real shapes

Mountain: tabletop-replaces-mural
Type: wayfinder:map

**Map 1 of six.** The chart above this one is
[The Tabletop replaces Mural](../../apps/tabletop/notes/DESIGN-tabletop-replaces-mural.md) — read it first
for the whole parity list, the other five maps, and why they're split this way.

## Destination

**Decided: what a card is, and what furniture is, on the Tabletop.** A card that can flip, sit
face-down, hold counters and notes that travel with it, tuck behind another card, and stay
tapped when someone brushes a resize handle. Furniture that recognises what lands on it instead
of being an inert rectangle a card measures itself against.

Done when those are designed and decided, not built. This map blocks
[Table layout](../tabletop-table-layout/map.md): the square, the command zone, and life totals
all want furniture that behaves, and rebuilding the shape layer under finished geometry is the
expensive way round.

## Notes

- Skills every session should consult: `/grilling`, `/domain-modeling`. Read
  `docs/agents/issue-tracker.md` before writing into the tracker.
- **Consult the `two-faced-cards` owner** before deciding anything about flip, face-down, or
  how a card's face is chosen — it's fleet-scoped and explicitly covers the Tabletop's card
  rendering and the contract's card/face fields. **Consult `animations`** before deciding tap
  motion, and **`shuffler-looks-like-itself`** before any visual decision.
- `apps/tabletop/CLAUDE.md` has this ship's architecture, commands, and gotchas.
- The floor, verified in code 2026-08-06: `MtgCardImageShapeUtil` is **not a custom shape
  type** — it extends tldraw's stock `ImageShapeUtil` and overrides `onClick` (tap) and
  `onTranslateEnd` (zone detect), so cards are plain tldraw `image` shapes marked only by
  `meta.instanceId`. Furniture is stock locked `geo`/`image` shapes tagged with `meta.zone`.
  Flip, face-down, counters, notes, and stacking do not exist and none is a small addition.
- Cards can be freely resized and rotated by tldraw's selection handles today, which silently
  breaks the tap toggle — `UNTAPPED_EPSILON` reads any hand-rotation as "tapped."

## Decisions so far

- **Zone entry is detected card-side, deliberately** — [Tabletop cards report zone entry as
  named events](../tabletop-card-shape/issues/01-zone-entry-events.md), implemented 2026-08-06.
  `onTranslateEnd` on the card scans the page for shapes carrying `meta.zone` and tests
  `Box.containsPoint`; debounce state rides on the card's own `meta.zone`. The ticket chose this
  over target-side hooks (`onDragShapesOver`/`onDropShapesOver`) **because zones aren't custom
  shapes** — "which felt like a bigger change than this ticket needed." That bigger change is
  exactly what this map is for, so expect to revisit the choice, not inherit it.
- Notification is a bare `console.log`, an explicit descope, flagged for whoever builds a real
  consumer. Not this map's job to wire it — see map 5.
- [What does tldraw 5.2.5 actually require of a custom shape
  type?](issues/01-tldraw-custom-shape-facts.md) — resolved 2026-08-06, full findings in
  [research/tldraw-custom-shapes.md](research/tldraw-custom-shapes.md). Declaring a custom shape
  is cheap (four methods, no tool or toolbar entry needed); **syncing one is a mandatory
  three-place change** and `TLSocketRoom` *disconnects* a client that pushes an unknown type
  rather than dropping it. The sharpest finding: one util serves **every** `image` shape, so
  cards, locked furniture, and stray dropped JPEGs all run through `MtgCardImageShapeUtil` today,
  separated only by an `if` on `meta.instanceId`. Migrations are free now but bite when two
  deploys share a room — earlier than persistence does. Tap is free either way; don't let it
  argue the case.
- **A card is a genuine custom shape type, `meta` is empty, and face-down is depicted not
  enforced** — [Decide what a card is](issues/02-what-a-card-is.md), resolved 2026-08-07. `mtg-card`
  extends `BaseBoxShapeUtil` and renders its own image; the deciding argument was "one util, three
  meanings," not crop and not tap. Nine `props` (`instanceId`, `scryfallId`, `cardName`,
  `frontImageUrl`, `backImageUrl | null`, `face`, `faceDown`, `tapped`, plus `w`/`h`), nothing in
  `meta`, no `zone` (left unplaced for ticket 03), no owner/seat field. The per-instance image asset
  goes away, so flip is a pure prop change. The arrival payload unbakes the face into two URLs —
  zero contract churn, since `imageUrl` was never contract.
- **Two axes, not one: `face` is which printed side, `faceDown` is concealment** — same ticket. A
  two-faced card can't be *turned* face down but can be *played* face down, which is why one bit
  won't do. A turned-over one-faced card is `faceDown`, not `face: 'back'`. The ships differ on
  purpose: the Shuffler can't flip a one-faced card; the Tabletop can turn over anything.
- **The Tabletop has no ownership or permission model** — same ticket, and now a fleet principle in
  `notes/DESIGN-the-table-vision.md` § Principles: *"everything that can be done by one player is
  doable by any player."* Binding on the rest of this map: **never design a gesture around "only
  the controller may…"**, and don't build concealment — a face-down card's identity stays readable
  because any player could just turn the card over anyway.

- **Furniture is one custom `mtg-zone` type; zones notice what lands on them but never hold it** —
  [Decide what furniture is, and who owns zone membership](issues/03-what-furniture-is.md), resolved
  2026-08-07. One registration covers playmat/library/graveyard/exile/Stack/command with a `zone`
  prop, `seatId` (naming, not gating), and `label`; the playmat and library *pictures* stay separate
  stock `image` shapes; the seat name label isn't a zone but does get locked (it isn't today —
  a live bug). `canReceiveNewChildrenOfType` stays `false`: a zone carries nothing about its
  contents, mirroring ticket 02's card that carries nothing about its passengers. Frame-likeness
  rejected — `getClipPath` clips children and the playmat would parent every permanent.
- **Furniture stays locked by default, and that decided the mechanism** — same ticket. Jess:
  *"adjustable by the players if they want to move it, but locked by default because I don't want to
  move it by accident."* tldraw's context-menu Lock/Unlock **is** the affordance. The discovery that
  forced everything else: `getDraggingOverShape` filters `!s.isLocked` **before** checking for
  `onDragShapesOver`/`onDropShapesOver`, so **a locked shape can never be a drag target** — the
  target-side hooks are unavailable, permanently, and there is no `canMove`/`canDrag` on `ShapeUtil`
  to substitute. So the two jobs split: **zone entry stays card-side** in `onTranslateEnd` (but
  matching `type === 'mtg-zone'`, not a freeform `meta.zone` — the old choice's reason is gone and
  the choice is re-made on a new one), and the **armed highlight is derived reactively inside the
  zone's `component()`**, never written to the store. Strictly better than the hook route:
  `onDragShapesOver` fires every frame, so a prop-writing hook meant per-frame synced writes and an
  undo trail.
- **Overlap: topmost index wins, so draw order is now a precedence declaration** — same ticket.
  Matches tldraw's own top-down convention. Two constraints follow: furniture must be drawn
  least-specific-first (playmat before the command zone that sits on it), and re-putting a zone must
  **preserve** its index — `ensureStackStripWidth` mints a fresh one on every seat join, a latent
  precedence bug. Behaviour is unchanged today; it's deliberate now rather than accidental.
- **Appearance was deliberately split out, not decided** — same ticket, on the
  `shuffler-looks-like-itself` owner's advice. Today's dashed-grey-serif is *stock tldraw*, i.e.
  scaffolding nobody chose. The implementer reproduces it **loosely and deliberately without
  chasing fidelity** — "verbatim" is unimplementable, since the look comes from tldraw's prop enums
  rendered through its own stroke geometry, and an implementer told "verbatim" will approximate
  while believing they copied. So: comment that it is provisional, and that its literal values are
  a **knowingly-untokenized placeholder exempt from the Layer-1 token rule**, or a design-lint
  sweep will promote the placeholder into a decision. The real treatment is
  [what a zone looks like](issues/11-what-a-zone-looks-like.md), to be staged on `/design` rather
  than argued in prose.

- **Tap is a stored boolean, but rotation stays the visual, written as a delta** — [Make tap a state
  the card holds](issues/04-tap-is-state.md), resolved 2026-08-07. `props.tapped` is the truth and is
  never read back out of an angle (`UNTAPPED_EPSILON` dies); tap writes `rotation ± 90°` clockwise
  relative to the card's own angle, keeping the centre-preserving math, so no `baseRotation` prop is
  needed. The `animations` owner's first recommendation — CSS-only rotation, invisible to tldraw —
  was **withdrawn by the owner itself** once resize stayed: a tapped card would draw landscape with
  its hit-test box, indicator and resize handles still portrait. Don't re-derive it.
- **Resize and free-rotate both stay; crop leaves for free** — same ticket. Jess resizes cards in
  Mural deliberately (*"bigger creatures than lands"*) and wants angling kept (*"to indicate that
  it's attacking"*). Both cost nothing: `BaseBoxShapeUtil` supplies `onResize`, and tap-as-delta
  composes on top of any player angle. Resize is aspect-ratio locked. The design owner's
  "`CARD_W` defines the coordinate system" argument against resize was **not accepted** — the playmat
  is 9.6 *default* cards wide. Crop disappears by construction once the card stops being an `image`
  subclass.
- **Tap keeps its click trigger; the animation is a 0.5s catch-up, not a new gesture** —
  [Rotate a card 90° to tap it, and animate it](issues/05-rotate-to-tap.md), resolved 2026-08-07.
  `onClick` stays the trigger — tldraw's rotate handle stays reserved for free-rotation
  ("attacking"), never repurposed for tap, so the two gestures stay visually distinct exactly as
  ticket 04 required. Duration is 0.5s `ease-out`, matching the Shuffler's card-motion slides
  rather than its 0.8s flip — Jess's call, against the `animations` owner's lean toward the flip,
  because tap happens often mid-turn and reads better snappier. The counter-transform mechanism
  itself was already fully specified by the `animations` owner and just gets applied here.
- **Untap-many is "click one card in a selection and the whole selection follows"** — same ticket,
  prototyped in Playwright and confirmed, including two-client sync. The clicked card's *new* state
  propagates (not a per-card toggle). Needs no turn concept and no ownership concept. **The other
  cards must be written in a `queueMicrotask`** — measured: writing them synchronously puts them in
  the *previous* undo entry, so one Ctrl+Z reverted only the clicked card and the next welded the
  rest onto an unrelated earlier action. This leans on undocumented tldraw ordering, which Jess
  accepted on condition of a **Playwright undo regression test**. Undo is per-client; nobody can
  rewind your board.

- **A counter is a genuine custom shape, card-hosted, blank-text, and non-self-detecting** —
  [Decide what a counter is, and how it rides a card](issues/07-counters-that-ride-along.md),
  resolved 2026-08-07. `mtg-counter` is its own `ShapeUtil`; attach is native tldraw
  drag-and-drop on the card (`canReceiveNewChildrenOfType`/`onDropShapesOver`, live hover
  highlight during drag) — a deliberate, narrow exception to ticket 02's "the card knows nothing
  about its passengers," accepted for the free feedback. Detach is dragging off; multiple
  counters on one card can overlap with no auto-spacing, same as physical cardboard. A counter
  carries free editable text, blank by default — not a number field — clicked into place to
  edit. Leaving the battlefield (graveyard, exile, hand, or library, uniformly) detaches every
  counter from the card and nudges it to an open spot near the zone's edge — "so it feels
  real" — which needs real open-spot-finding logic, not a bare reparent; the `tabletop-shape-mechanics`
  owner confirmed this can't be counter-side self-detection (a parented shape's own
  `onTranslateEnd` never fires when only its parent moves), so it has to be driven from the
  card's own zone-transition code or a store-level side effect. Player-level loose counters
  (poison, energy, experience) are explicitly out of scope — see below.
- **Flip and turn-face-down are two separate context-menu items; `currentFace` divergence between
  table and Shuffler is accepted, not fixed** — [Decide how a card flips, and how it sits
  face-down](issues/06-two-faces-and-face-down.md), resolved 2026-08-07. Each gesture is its own
  entry in tldraw's right-click menu (same surface as furniture's Lock/Unlock), shown/enabled per
  the card's own state — no combined "turn over" gesture, no hover affordance, no keyboard
  modifier. The `two-faced-cards` owner confirmed the Shuffler has **no inbound path from the
  table at all today** — it only ever sends `card.played`; nothing consumes events back into
  `GameState`. Building "table authoritative for `currentFace`" would mean standing up that
  channel for the first time, so Jess chose the cheaper path: flip-on-table stays table-local, and
  a table-flipped Table-zone card later discarded may show its pre-flip face on the Shuffler's
  screen/clipboard — known, not a bug. `faceDown` is a plain image swap to `cardBackImageUrl`
  (same asset the sleeve picker will reuse), matching the Shuffler's own precedent of zero extra
  visual treatment for concealment. **Leaving the table resets both axes** — a card returning to
  hand or library goes back to `face:'front'`, `faceDown:false`, mirroring the Shuffler's
  `mulligan()` reset; which zone-entry mechanism performs it is implementation, not decision.

- **A card tucks behind another card via the same card-hosted parenting counters use, defaults to
  the front on drop, and is explicitly reordered backward when it needs to read as underneath** —
  [Decide how a card tucks behind another card](issues/09-cards-behind-cards.md), resolved
  2026-08-07. No card-type-aware default (the Tabletop has no card-type prop to key one on):
  dropping any passenger — counter, note, or card — lands wherever dropped, on top by default;
  reading as tucked-under is a "send backward" context-menu command, the same surface as tap/
  flip/lock, and the same drop-position + send-backward combo covers both a partial peek
  (equipment) and a fully solid cover (an ability's more literal "put it under this card") — the
  Tabletop draws no distinction between the two, the table does. Rotation does **not** ride along
  with the host's tap (Jess rejected that — an aura shouldn't visibly tap with its creature),
  which costs an explicit counter-rotation compensation ticket 04's free tap-delta didn't need,
  reconciled back to zero at detach. A host leaving the battlefield auto-detaches every passenger,
  which stays behind, unattached, wherever it was — never routed to a "correct" destination
  (graveyard, exile, back to the battlefield), because that destination is rules knowledge the
  physics layer doesn't have: *"let the players sort that out."*
- **A note is tldraw's stock note shape, never `mtg-counter`, but it attaches and detaches exactly
  like one** — [Decide how a note attaches to a card, and how it differs from a
  counter](issues/08-notes-on-cards.md), resolved 2026-08-07. Type stays distinct — no
  counter-with-a-text-variant — but the card's drag-attach accept-list is extended to parent the
  stock `note` type alongside `mtg-counter`, and once parented a note inherits ticket 07's
  battlefield-exit rule (detach, nudge to an open spot near the zone's edge) with no per-note
  exception: a note meant to survive a zone change is simply left unattached, never a special
  case on the attached path. Free-floating and attached are the same shape, not two variants —
  "attached" is purely "currently has a parent"; the stock note tool needs no change beyond that
  and stays in the toolbar (map 4's call, not touched here).
- **Built** — [ticket 19](issues/19-notes.md), implemented 2026-08-10. `MtgCardShapeUtil`'s
  passenger accept-list generalized from a bare `"mtg-counter"` check to a
  `PASSENGER_TYPES = new Set(["mtg-counter", "note"])`, covering
  `canReceiveNewChildrenOfType`/`canRemoveChildrenOfType` and the ticket-18 battlefield-exit
  eviction (renamed `evictCounters` → `evictPassengers`). The attach-time rotation-zeroing math
  and the eviction's open-spot `spotSize` switched from reading `props.w/h` (a counter-only prop)
  to `editor.getShapeGeometry(shape).bounds`, which works for any shape regardless of its
  `ShapeUtil` base class — load-bearing, since a stock note has no `w`/`h` prop at all (its size
  comes from a style enum plus `growY`).
  **The `tabletop-shape-mechanics` owner caught a real hazard in review**: extending the
  accept-list to a STOCK shape reopens the ticket 16/18 drag-identity bug, because `mtg-counter`
  dodges it with its own `onTranslateEnd` clearing selection on drag-settle, and a stock note has
  no hook of its own to do the same. Fixed by subclassing — `SelectionClearingNoteShapeUtil`
  (`apps/tabletop/src/client/shapes/SelectionClearingNoteShapeUtil.ts`) extends tldraw's
  `NoteShapeUtil`, overriding only `onTranslateEnd` to clear selection, registered **in place of**
  (not alongside) the stock util in `TablePage.tsx`'s `shapeUtils` array — `useSync`'s schema
  builder throws on a duplicate shape `type` where `<Tldraw>`'s own merge is lenient, so
  `defaultShapeUtils` has to be filtered before the subclass goes in. A dedicated Playwright
  regression test (`verify-note.spec.ts`, "stale-selection regression") proves the product clears
  selection on its own — deliberately no test-side cleanup — confirmed red without the subclass,
  green with it. This is now the owner's recorded precedent for integrating any future stock
  tldraw shape into a hook this app depends on: subclass and swap, don't reach for
  `node_modules`.

- **A shape's vocabulary is generous by default, announcement is centralized, and identity stays
  narrow** — [Decide what a shape knows and announces, without wiring it anywhere](issues/10-what-a-shape-knows.md),
  resolved 2026-08-07. Named words (`card.tapped`/`untapped`, `counter.attached`,
  `card.attachedBelow`/`noteAttached`, `card.zoneMoved`, `card.flipped`, `card.turnedFaceDown`)
  for gestures physics already understands, generic `shape.moved`/`created`/`changed` for
  everything else — Jess's bar is "a completed motion happened," not "physics judges it
  interesting," so in-zone repositioning and unnamed custom shapes announce too, just generically.
  Only cards and zones carry identity; counters/notes carry text as an attribute, tracked across
  no lifetime. Detection stays per-shape-hook exactly as ticket 09 left it; the *announcement* is
  centralized in one `store.listen()` beside `useCardArrivalSpans.ts`, translating mutations
  (including undo's, since tldraw's `ChangeSource` is only `'user'|'remote'`, never `'undo'`) into
  `inSpan()` calls — Honeycomb only, for now; the Spine wire is map 5's. Every announcement carries
  `actor` = tldraw's ephemeral per-session sync id, a stand-in until the Tabletop gets real
  seat/player identity (not decided here, not blocking).
- **Built** — [ticket 21](issues/21-gesture-vocabulary.md), implemented 2026-08-10.
  `apps/tabletop/src/client/usePhysicsAnnouncements.ts`, wired into `TablePage.tsx` beside
  `useCardArrivalSpans.ts`. One `store.store.listen({source: "user", scope: "document"})`
  translates the diffs each gesture's existing hook already produces into the named vocabulary
  via `inSpan()`, `actor: TAB_ID`. `source: "user"` only, deliberately: a remote peer runs this
  same hook locally and announces its own gestures with its own `TAB_ID`, so no cross-client
  attribution logic was needed. The generic `shape.moved`/`shape.changed` fallback is debounced
  300ms per shape id — the `tabletop-shape-mechanics` owner confirmed `Translating.ts` writes
  fresh x/y to the store on every pointer-move with no batching to settle, which named gestures
  don't hit (their writes are already single-shot from `onClick`/`onTranslateEnd`/
  `onDragShapesIn`) but a literal per-diff fallback would have spammed one span per frame.
  Ticket 01's descoped `console.log('zone-entry ...')` in `MtgCardShapeUtil.onTranslateEnd` is
  gone, replaced by `card.zoneMoved`; `verify-zone-entry.spec.ts` now asserts the card's visual
  zone placement instead of that console output. Since ticket 20 (card-behind-card) is wontfix,
  `card.attachedBelow` names a gesture with no code path — only `counter.attached` and
  `noteAttached` fire. `copiedFrom` for a duplicated card is **not** implemented (still "not yet
  specified" below); duplication announces a bare `shape.created`.
  **Not verified against live Honeycomb** — `apps/tabletop`'s server build is currently broken
  for an unrelated, pre-existing reason (`tabletop-server-build-broken` in `TODO.md`), which
  blocked `./verify.sh`. Re-run that check once the build is fixed.

- **A zone at rest ports `.commander-placeholder`'s dashed pattern; armed is a glow ring plus a
  background tint, uniform across every zone type** — [Decide what a zone looks like, armed and
  at rest](issues/11-what-a-zone-looks-like.md), resolved 2026-08-07, staged on `/design`. A new
  `--armed-glow` token drives the armed state; the tint half is invisible on the library and
  playmat (they sit under an opaque picture per ticket 03) and Jess accepted that rather than
  forking the treatment by zone kind. **The playmat's border stays black**, matching the
  Shuffler's mats — one identity across ships, not this page's pink zone family. **The playmat's
  corner radius is a proportion of the shape's own height (5%, picked), computed and applied
  equally to both axes at render time — not a fixed pixel value and not a bare CSS percentage.**
  Both of those were staged first and both were wrong, caught live: a pixel radius drifts out of
  proportion as the object is resized on a continuously-zoomable canvas, and a CSS percentage
  radius uses width and height *separately* for the two axes, drawing an ellipse on this non-
  square shape instead of a round corner. **The Stack reads as the same zone family as
  graveyard/exile/command** — no distinct treatment, no literal "blue." Implementing any of this
  was blocked on the Tabletop having somewhere to put tokens and fonts — resolved 2026-08-07 by
  `4396aea` ("Give the fleet one dictionary: @fleet/design-tokens"), outside this map's own
  tickets. `packages/design-tokens` now holds the shared palette (including `--armed-glow`), the
  Shuffler serves it at `/fleet/tokens.css`, the Tabletop imports it through Vite, and
  Orbitron/Ovo load via a Google Fonts `<link>` in `apps/tabletop/index.html`. Nothing on this map
  blocks building the real `mtg-zone`/playmat shape anymore.

## Not yet specified

- **Whether the armed highlight should be shared with the whole table.** Decided local-only for now
  (ticket 03) because it's far easier and Jess didn't mind. It becomes worth revisiting *only* if
  tldraw exposes a presence lane — cursors and selections already ride outside the undoable
  document — since that's what would make shared arming cheap without per-frame writes to the
  synced document. Additive, never a reversal.
- **Pre-made preset counters** (a "+1/+1" counter, already labeled, droppable from stock)
  are a real want Jess named while resolving ticket 07, but not built now — the shape (ticket
  07) supports blank free-text counters only; a stock tray of common presets is future work.
- **The open-spot-finding algorithm for a detached counter landing near a zone's edge**
  (ticket 07) — the rule ("nudge to an open spot, don't just overlap") is decided; the
  concrete placement/collision logic and whether it animates is implementation's job, not yet
  specified here.
- **What real actor/seat identity looks like on the Tabletop.** Ticket 10 stubbed `actor` with
  tldraw's ephemeral per-session sync id because the client has no durable identity today at
  all — `useSync` passes no `user`, and `seatId` exists only server-side. Jess called this
  important and said she'd find it a home; not designed yet, and it likely touches how seats
  work on the canvas more than physics proper.
- **What a duplicated card is.** Ticket 10 gave the announcement a cheap fallback
  (`shape.created` + `copiedFrom`), but token semantics — what a copy inherits, whether it's a
  "real" independent card — aren't designed. Jess copies cards routinely on Mural and expects
  to eventually here; someday, after sleeves exist.

## Out of scope

- **Geography** — the square, the command zone's placement, life totals as furniture. Those are
  [map 2](../tabletop-table-layout/map.md); this map decides what furniture *is*, not where it goes.
- **Sending anything to the Spine** — map 5. This map may decide what a shape *knows*; the wire
  is somebody else's.
- **Curating the tldraw UI** — killing crop, the toolbar, the context menu — map 4. The one
  exception is where the stock handles actively break physics (tap), which is in scope here.
- **Undo** — map 4, because it's a board-wide question rather than a shape-level one. Ticket 10
  confirmed this reaches further than "who owns the undo stack": distinguishing an undo-caused
  change from a fresh action needs overriding tldraw's default undo action, since the store's
  own `ChangeSource` is only `'user'|'remote'` and the app runs stock `<Tldraw>` UI. Jess doesn't
  like the limit but accepted it for this map.
- **Player-level loose counters** (poison, energy, experience) — [ticket 07](issues/07-counters-that-ride-along.md).
  Jess: *"out of scope for now, I'll use a sticky note."* A stand-in already exists; nobody
  needs to build a mechanism for these.
