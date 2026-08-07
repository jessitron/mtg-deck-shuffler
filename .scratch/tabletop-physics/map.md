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

## Not yet specified

- **Which attachment mechanism suits which passenger.** The [research
  ticket](issues/01-tldraw-custom-shape-facts.md) narrowed the field: *parenting* is the cheap
  one (children ride the parent transform, no custom type); *grouping* auto-dissolves at one
  child, so it cannot hold a single counter; *bindings* move nothing by themselves and cost the
  same registration as a shape; only a **custom container** (`BaseFrameLikeShapeUtil` /
  `onDragShapesIn`) gives furniture the target-side hooks. Ticket 02 settled the half that was
  blocking this: the shape architecture is a custom type, and **a card carries nothing about its
  passengers** — a passenger knows which card it's parented to, not the reverse. What's still
  foggy is per-passenger: whether a counter, a post-it, and a tucked card each want parenting or
  a binding, and whether a *card* must itself become frame-like to catch a counter dropped on it
  (`onDragShapesIn` is a frame behaviour). Tickets 07/08/09 will phrase those.
- **Where Tabletop CSS tokens and fonts live.** `apps/tabletop` has **no CSS source file at all**
  (only a built `dist/client/assets/*.css`) and no font `<link>` or `@font-face` anywhere, while the
  fleet's Layer-1 craft rule says "use `var(--…)`, not a literal" applies to the Tabletop today. A
  self-rendering `mtg-zone` hits both the moment it draws its own box with an Orbitron label — and
  the font half **fails silently**, falling back to a system serif. Shared file? A duplicated
  `:root`, à la the deliberately duplicated `log.ts`? (The design owner warns specifically against
  a copied `:root` — a diverged palette fails silently.) It's fleet design plumbing rather than
  physics, and it's entangled with the Tabletop's whole design pass, which is bigger than this map.
  It does **not** block deciding [ticket 11](issues/11-what-a-zone-looks-like.md), which stages on
  `/design` in the Shuffler; it blocks implementing it. Also a `TODO.md` line.
- **Whether the armed highlight should be shared with the whole table.** Decided local-only for now
  (ticket 03) because it's far easier and Jess didn't mind. It becomes worth revisiting *only* if
  tldraw exposes a presence lane — cursors and selections already ride outside the undoable
  document — since that's what would make shared arming cheap without per-frame writes to the
  synced document. Additive, never a reversal.
- **What happens to a counter when its card leaves the table** in ways other than the graveyard
  — exile, back to library, back to hand. Jess named the graveyard case ("they disappear");
  the others follow from whatever mechanism the counter ticket picks.

## Out of scope

- **Geography** — the square, the command zone's placement, life totals as furniture. Those are
  [map 2](../tabletop-table-layout/map.md); this map decides what furniture *is*, not where it goes.
- **Sending anything to the Spine** — map 5. This map may decide what a shape *knows*; the wire
  is somebody else's.
- **Curating the tldraw UI** — killing crop, the toolbar, the context menu — map 4. The one
  exception is where the stock handles actively break physics (tap), which is in scope here.
- **Undo** — map 4, because it's a board-wide question rather than a shape-level one.
