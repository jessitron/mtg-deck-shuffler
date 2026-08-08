# Physics — cards and furniture are real shapes

Mountain: tabletop-replaces-mural
Ship: tabletop
Status: ready-for-agent

## Problem Statement

On the Tabletop today, a card is a stock tldraw `image` shape wearing a costume
(`MtgCardImageShapeUtil extends ImageShapeUtil`), identified only by a `meta.instanceId` that
tldraw never validates or migrates. Furniture (playmat, library, graveyard, exile, the Stack) is
stock locked `geo`/`image` shapes tagged with a freeform `meta.zone` string. This footing cannot
express what a Magic table needs: a card can't flip, can't sit face-down, can't hold counters or
notes that travel with it, can't tuck behind another card, and a resize handle silently breaks
the tap toggle by reading tapped-ness back out of a rotation angle. Furniture can't recognise
what's dragging over it because it isn't a real shape type, just a tagged rectangle. Players who
are used to doing all of this freely on Mural (the tool this app is replacing) lose it the moment
they move to the Tabletop.

This is the foundational gap the rest of Mountain 1 ("The Tabletop replaces Mural") sits on top
of: [Table layout](../tabletop-table-layout/map.md) — the square, the command zone, life totals —
wants furniture that already behaves, and building that geometry on top of today's inert
rectangles is expensive to redo later.

## Solution

Give cards and furniture real identity as custom tldraw shape types (`mtg-card`, `mtg-zone`,
`mtg-counter`), with validated, migratable state living in `props` instead of freeform `meta`.
Once cards and zones are genuine shapes, the physical gestures a Magic player already does on
Mural become native: tap that survives a resize, flip and face-down, counters and notes that
ride along with a card, one card tucked behind another, and furniture that lights up when a card
is dragged over it. Every one of these gestures was already decided, ticket by ticket, against
`.scratch/tabletop-physics/map.md`; this spec turns those eleven resolved decisions into one
buildable unit of work.

Two things this solution deliberately does **not** do: it doesn't send anything to the Spine
(map 5's job — physics only decides what's worth announcing, not how it travels), and it doesn't
place furniture on a table layout (map 2's job — this only decides what furniture *is*).

## User Stories

1. As a player, I want to click a card to tap or untap it, so that I can mark it as used without
   reaching for a keyboard shortcut or a menu.
2. As a player, I want a tapped card's tapped-ness to survive me resizing it, so that the game
   state stays correct even when I'm adjusting a card's size for readability.
3. As a player, I want a tapped card's tapped-ness to survive me free-rotating it, so that
   angling a card to show it's attacking doesn't get confused with tapping it.
4. As a player, I want to resize a card, so that I can make creatures visually bigger than lands
   the way I already do on Mural.
5. As a player, I want to freely rotate a card to any angle, so that I can angle an attacking
   creature the way physical players do.
6. As a player, I want tapping a card to animate as a quick rotation rather than snapping
   instantly, so that the change reads clearly during a fast-moving turn.
7. As a player, I want to select several cards and click one of them to make the whole selection
   match its new tapped state, so that I can untap my whole board at once at the start of my turn.
8. As a player watching someone else's client, I want their multi-card untap to arrive as one
   undoable action on their side and a clean sync on mine, so that neither of us gets a corrupted
   undo history.
9. As a player, I want to flip a two-faced card (MDFC, transforming, reversible) to its other
   printed face from a context-menu item, so that I can play and later flip a modal double-faced
   card without leaving the table.
10. As a player, I want the "Flip" menu item to be absent (or disabled) on a card that has no
    printed back face, so that I can't attempt an action that makes no sense for that card.
11. As a player, I want to turn any card face-down from a context-menu item, showing the table's
    generic card back, so that I can represent effects that conceal a card's identity.
12. As a player, I want a card that returns to my hand or library to automatically go back to its
    front face and face-up state, so that I don't have to manually reset it every time it leaves
    the battlefield.
13. As a player, I want to drag a small counter shape onto a card and have it visually attach, so
    that moving the card later brings its counters with it.
14. As a player, I want to drag a counter off a card to detach it, so that I can remove or
    relocate a counter without deleting and re-adding it.
15. As a player, I want to see a card visually highlight (or the counter to visibly hover-attach)
    while I'm dragging a counter over it, so that I get feedback before I drop it.
16. As a player, I want a counter's text to be freely editable (blank by default), so that I can
    label it "+1/+1", a number, or anything else without a rigid numeric field.
17. As a player, I want counters on a card to automatically detach and stay on the table
    (nudged near the zone's edge) the instant that card leaves the battlefield for any reason
    (graveyard, exile, hand, library), so that dead counters don't silently follow a card where
    they no longer apply.
18. As a player, I want to drag a sticky note onto a card and have it attach the same way a
    counter does, so that I can leave myself reminders that travel with a card.
19. As a player, I want a note that's meant to survive a zone change to simply not be attached, so
    that I don't need a special "permanent note" mode.
20. As a player, I want to drag one card onto another so it lands on top by default, so that
    tucking things under a card is a deliberate second step, not an accidental default.
21. As a player, I want a "Send backward" (or "Send to back") context-menu command on a tucked
    card, so that I can make it read as underneath its host, whether I want a partial peek
    (equipment) or a full cover (a card set aside "under" a permanent).
22. As a player, I want a card tucked behind another to stay independently selectable, tappable,
    and draggable, so that I can still interact with it directly when I need to.
23. As a player, I want dragging the host card to carry every card, counter, and note tucked
    behind it, so that moving a permanent moves its whole stack.
24. As a player, I want a tucked-behind card or counter to *not* visually rotate when its host
    taps, so that an aura or equipment doesn't look like it's attacking along with its creature.
25. As a player, I want everything tucked behind a host to auto-detach (and stay put, unattached)
    the instant that host leaves the battlefield, so that the table doesn't guess at rules
    knowledge it doesn't have (where an equipment or aura "should" go).
26. As a player, I want furniture (playmat, library, graveyard, exile, the Stack) to stay locked
    by default, so that I don't accidentally drag or resize it while reaching for a card.
27. As a player, I want to unlock and move a piece of furniture on purpose (via tldraw's own
    Lock/Unlock), so that I can rearrange my play area when I want to.
28. As a player, I want the library or another zone to visually light up while I'm dragging a card
    over it, so that I know where the card will land before I drop it.
29. As another player at the same table, I want to *not* see someone else's armed-zone highlight
    on my own screen, so that the highlight only ever describes what the dragging player sees.
30. As a player, I want a card dropped where it overlaps two zones to unambiguously land in the
    topmost-drawn one, so that overlapping furniture (like a command zone sitting on the playmat)
    behaves predictably.
31. As a player, I want dropping a card back onto the Stack to be recognised as entering a zone
    (same as any other zone), so that returning something to the stack behaves consistently.
32. As a player, I want another player's name label to be locked, so that I can't accidentally
    drag or delete someone else's seat label.
33. As a developer of the Interpreter (a future consumer), I want physics to name a fixed
    vocabulary of gestures it understands (`card.tapped`/`untapped`, `card.flipped`,
    `card.turnedFaceDown`, `card.zoneMoved`, `counter.attached`, `card.attachedBelow`/
    `noteAttached`) plus a generic fallback (`shape.moved`/`created`/`changed`) for everything
    else, so that a future consumer has a stable, extensible surface to build on.
34. As a developer, I want every physics occurrence recorded as a Honeycomb span (via `inSpan()`)
    rather than lost to a bare `console.log`, so that gesture activity is observable in
    production today, before any real downstream consumer exists.
35. As a developer, I want the detection of each gesture to stay local to the shape whose hook
    computes it (a card's own `onTranslateEnd`, `onClick`, drop handler), while the
    *announcement* of all of them is centralized in one `store.listen()`, so that adding a new
    named gesture later doesn't mean adding a new emitter.
36. As a developer, I want tldraw's own undo-caused mutations to surface as ordinary vocabulary
    events (since tldraw gives no `'undo'` change-source), so that I don't have to build
    undo-detection that tldraw doesn't support.
37. As a developer syncing this shape data, I want `mtg-card`, `mtg-zone`, and `mtg-counter` all
    registered in the same deploy (client `useSync` `shapeUtils`, `<Tldraw shapeUtils>`, and the
    server's `createTLSchema`), so that a client on an old bundle disconnects cleanly rather than
    corrupting a shared room.
38. As a developer, I want the card-arrival payload to carry `frontImageUrl` and
    `backImageUrl: string | null` (derived from `card.twoFaced`, not from whether
    `backImageUris` happened to be populated) instead of one baked `imageUrl`, so that the table
    can flip a card without asking the Shuffler for a new image.
39. As a developer, I want a card with no printed back face to make `face: 'back'` structurally
    unreachable (`backImageUrl === null`), so that "flip" can never be offered on a card it
    doesn't apply to.
40. As a player, I want the divergence where a table-flipped card may show its pre-flip face on
    the Shuffler's screen after being discarded to be an accepted, known limitation — not
    something that silently corrupts my game state — so that I understand what to expect without
    the table pretending to synchronize something it doesn't.

## Implementation Decisions

### Shape types and where state lives

- **`mtg-card`** replaces `MtgCardImageShapeUtil extends ImageShapeUtil`. It is a genuine custom
  shape type extending `BaseBoxShapeUtil` (which supplies `getGeometry`/`onResize`), rendering its
  own `<img>` rather than pointing at a shared tldraw asset. `props`:

  ```ts
  'mtg-card': {
    w, h,                          // from BaseBoxShapeUtil
    instanceId: string,            // this card in this game; the dedup key, never composite
    scryfallId: string,            // the printing (all faces)
    cardName: string,              // rendering: alt text / a11y
    frontImageUrl: string,
    backImageUrl: string | null,   // the *printed* back face. null = no printed back exists
    face: 'front' | 'back',
    faceDown: boolean,
    tapped: boolean,
  }
  ```

  `meta` is empty. No seat/owner/controller field (the Tabletop has no ownership model — see
  Principles below). No `zone` field — zone membership is computed, not stored, on the card.
  The card carries nothing about attached counters/notes/cards; a passenger knows its own parent,
  the card doesn't know it has passengers.

- **`mtg-zone`** replaces furniture's stock locked `geo`/`image` shapes tagged `meta.zone`. One
  registration covers playmat, library, graveyard, exile, the Stack, and (when map 2 builds it)
  the command zone:

  ```ts
  'mtg-zone': {
    w, h,
    zone: 'playmat' | 'library' | 'graveyard' | 'exile' | 'stack' | 'command',
    seatId: string | null,   // null = shared. The Stack is the only shared zone today.
    label: string,           // '' for the playmat, which is unlabelled
  }
  ```

  The playmat's and library's background *pictures* stay separate stock `image` shapes layered
  over the `mtg-zone` box (not folded into it) — keeps them in tldraw's asset machinery for
  `toSvg` export. `canReceiveNewChildrenOfType` stays `false`: a zone notices what lands in it but
  never becomes its parent. `isLocked: true` by default; tldraw's own context-menu Lock/Unlock is
  the sole unlock affordance — no custom pinning logic. The seat name label is not a zone (nothing
  lands on it); it stays a stock `text` shape but gains `isLocked: true` (fixes a live bug where
  any player can drag/delete another player's name).

- **`mtg-counter`** is its own custom shape type — a genuine `ShapeUtil`, not a stock geo circle
  and not a prop on the card. Carries free editable text, blank by default (not a numeric field).
  No domain identity of its own beyond its text.

- Notes stay tldraw's stock `note` shape type — never folded into `mtg-counter` — but the card's
  drag-attach accept-list includes `note` alongside `mtg-counter`. "Attached" is purely "currently
  has a parent"; there is no separate attached/unattached shape variant.

### Sync registration (mandatory, three places, same deploy)

`mtg-card`, `mtg-zone`, and `mtg-counter` all ship together, registered in all three places at
once — splitting them across deploys doubles the white-screen window for no gain, since a client
on an old bundle hits `assert(shapeUtil)` inside tldraw's shared rendering computation, which
kills the whole canvas, not one shape:

1. `TablePage.tsx` — `useSync` must receive `shapeUtils` (giving `<Tldraw>` them alone does not
   fix the client store's schema).
2. `TablePage.tsx` — `<Tldraw shapeUtils={...}>`.
3. `rooms.ts` — `TLSocketRoom`'s `schema: createTLSchema({ shapes: { ...defaultShapeSchemas,
   'mtg-card': {...}, 'mtg-zone': {...}, 'mtg-counter': {...} } })`. Without this the server
   disconnects any client that pushes one of these shapes (`INVALID_RECORD`), and it does so on
   first push, not at connect.

Nothing is persisted today (a redeploy wipes every room), so there is no migration to write for
this change — the cheapest this refactor will ever be.

### Tap

`props.tapped: boolean` is the single source of truth and is never read back out of a rotation
angle (`UNTAPPED_EPSILON` and the whole read-back approach are removed). The *visual* stays
tldraw's own `rotation`, written as a **delta**, not an absolute: tap adds +90° clockwise relative
to the card's current angle, untap subtracts 90° — using the existing centre-preserving
`Vec.Add`/`Vec.Rot` math, no `baseRotation` prop needed. A player free-rotating a card to any
angle (e.g. to indicate "attacking") composes on top of the tap delta with no interaction between
the two. Resize stays available, aspect-ratio locked (`isAspectRatioLocked = () => true`) — free
from `BaseBoxShapeUtil`. Crop disappears for free (it only existed because the old util subclassed
`ImageShapeUtil`).

CSS-only rotation (render tapped state as a transform inside the component, storing only the
boolean) was considered and explicitly rejected: it desyncs the hit-test box, selection indicator,
and resize handles from the drawn rotation, producing dead zones on the ends of a tapped card —
unacceptable on the most-repeated gesture in the game. Do not re-derive it.

**Multi-untap**: clicking one selected card (multi-select via marquee) propagates that card's
*new* tapped state to every other selected `mtg-card` — not a per-card toggle. The clicked card's
own state change returns synchronously from `onClick`; the other selected cards' writes are
deferred via `queueMicrotask`, because tldraw's `PointingShape.onPointerUp` calls
`markHistoryStoppingPoint()` and `updateShapes()` *after* `onClick` returns — writing the others
synchronously lands them in the *previous* undo entry. This dependency on undocumented tldraw
internal ordering is accepted, on the explicit condition (from Jess) that a Playwright regression
test for the undo grouping is part of this implementation, not optional — it's what catches a
tldraw upgrade silently breaking the grouping.

**Tap animation**: a 0.5s ease-out local counter-rotation catch-up (matching the Shuffler's
card-motion timing, not its 0.8s flip), keyed off `props.tapped` changing — never off sniffing a
±90° rotation delta, which would misfire on a card free-rotated through 90°. Initialize the
"previous tapped" ref to the first-seen value, not `false`, so a card arriving already-tapped
doesn't swing on mount or on a store reconnect. Because the trigger is a prop change, remote peers
animate identically for free.

### Flip and face-down

Two independent axes on every card: `face: 'front' | 'back'` (which printed side; `'back'` is
structurally unreachable when `backImageUrl` is null) and `faceDown: boolean` (concealment,
orthogonal to `face`). A two-faced card can be turned face-down (rendering the table's generic
back) without that being `face: 'back'`; a one-faced card turned over sets `faceDown`, never
`face`. Face-down is **depicted, not enforced** — a face-down card's real identity stays in
`props`, readable by any client (tldraw sync broadcasts whole shape records), because the Tabletop
has no ownership or permission model and no gesture should be gated on "only the controller may."

Trigger: "Flip" and "Turn face down" are two separate context-menu items (the same surface as
furniture's Lock/Unlock), each shown/enabled per the card's own state — no combined "turn over"
gesture, no hover affordance, no keyboard modifier. `faceDown` renders as a plain image swap to
the table's `cardBackImageUrl` (the same asset the sleeve picker will reuse) with no additional
visual treatment — matches the Shuffler's own precedent for concealment.

A card returning to hand or library (any zone-entry into `hand`/`library`) resets both axes to
`face: 'front'`, `faceDown: false`, mirroring the Shuffler's own `mulligan()` reset. Which
mechanism performs the reset (the same zone-entry detection that already tracks zone crossings) is
an implementation detail.

**Authority divergence, accepted knowingly**: `currentFace` on the Shuffler's own `GameState`
stays whatever it was before a table-side flip — there is no inbound Spine→Shuffler event path
today for anything, so "table becomes authoritative" would mean building that channel for the
first time, which is out of scope. A table-flipped Table-zone card later discarded may show its
pre-flip face on the Shuffler's screen/clipboard. This is a known, accepted limitation, not a bug
to fix in this spec.

**Arrival payload change** (Shuffler-side, `apps/shuffler/src/port-tabletop/types.ts` and
`apps/tabletop/src/server/cardArrival.ts`): `imageUrl` is replaced by `frontImageUrl` +
`backImageUrl: string | null` (sent, not derived client-side — constructed Scryfall back-image
URLs 404 for freshly-released cards). `buildCardPlayedEvent` must derive `backImageUrl` from
`card.twoFaced`, not from whether `card.backImageUris` happens to be populated — `getCardImageUrl`
always returns a string via its `constructCardImageUrl` fallback, so gating on `twoFaced` is safe;
gating on the stored URIs would silently make a two-faced card whose Scryfall fetch missed arrive
unflippable. No `twoFaced` boolean is added to the payload — `backImageUrl !== null` says it
precisely, and `twoFacedLayouts.ts` stays the single decider of two-facedness. `face` stays in the
contract (`card.played.v1.json` is unaffected — `imageUrl`/`frontImageUrl`/`backImageUrl` are
scaffolding fields, not contract), but its meaning shifts from "which face was baked into the
image" to "which face is up on arrival." The per-instance tldraw image asset that `cardArrival.ts`
mints today goes away entirely — the card renders its own image from its own props, so flip is a
pure prop write with no asset mutation.

### Counters and notes

Attach is **card-hosted, native tldraw drag-and-drop** — `mtg-card` implements
`canReceiveNewChildrenOfType`/`onDropShapesOver` so attaching a counter or note gives a live
hover-highlight during the drag. This is a deliberate, narrow exception to "the card carries
nothing about its passengers": the card's `ShapeUtil` mediates the drop, but the resulting parent
relationship is what carries the state, not a list on the card's own props. Detach is dragging the
passenger off the card's bounds, reparenting it to the page wherever it's dropped. No auto-spacing
when a card already has multiple counters/notes — they can overlap, same as physical cardboard.

**Battlefield-exit rule, uniform across counters and notes**: the instant a host card's own
zone-transition detection (`onTranslateEnd`/zone-scan) fires a move to any non-battlefield zone
(graveyard, exile, hand, library), every counter and note parented to that card detaches and stays
on the table, nudged to an open spot near the zone's edge — not just reparented in place. This
can't be the passenger watching for its own zone transition (a parented shape's own
`onTranslateEnd` never fires when only its parent moves) — it must be driven from the host card's
own zone-transition code path. The concrete open-spot-finding/collision algorithm is
implementation's job, not specified further here; whether it animates is also implementation's
call.

Loose, player-level counters (poison, energy, experience — not attached to any card) are
explicitly out of scope for this spec.

### Cards behind cards

Same attachment mechanism as counters: card-hosted native drag-and-drop parenting. A tucked card
stays independently selectable, tappable, and draggable — plain parenting, not grouping. Dragging
the host carries every passenger for free (page transform composition); dragging a passenger
directly does not auto-detach it. Depth/stacking among multiple passengers on one host is free via
tldraw's own sibling `index` order.

Dropping anything (card, counter, or note) onto a host lands it wherever dropped, on top by
default — there is no "cards tuck behind by default" rule, because the Tabletop has no card-type
prop to decide a default with (an aura that neuters a creature should read as *on top*, not
behind; the physics layer can't distinguish it from an equipment that should read *under*).
Getting a passenger to read as tucked-under is an explicit "Send backward"/"Send to back"
context-menu command — the same surface tap/flip/lock use. The same drop-position + send-backward
combination covers both a partial peek (equipment under a creature) and a full cover (a card set
"under" a permanent by a more literal effect) — the physics layer draws no distinction between the
two; the table narrative does.

Face/faceDown state is unaffected by tucking — being hidden under another card is pure z-order,
not a third concealment mechanism.

**Rotation compensation**: unlike everything else in this section, this one is not free. tldraw
composes rotation through parenting unconditionally, so tapping a host would otherwise visibly
rotate every passenger with it — rejected (an aura shouldn't appear to tap with its creature). An
explicit counter-rotation compensation must be applied to each passenger at the moment the host's
tap toggles, written alongside the host's own tap-delta, and reconciled back to zero at detach
time (or the passenger visibly snaps to a new angle the instant it's dragged off). The exact
mechanism is implementation's job.

A host leaving the battlefield auto-detaches every passenger (card, counter, or note), which stays
behind on the battlefield, unattached, exactly where it was — never auto-routed to a "correct"
destination (equipment doesn't follow its dying creature to the graveyard; an aura doesn't follow
its host anywhere). This is deliberate: the destination is rules knowledge the physics layer
doesn't have and shouldn't guess at.

### Furniture behavior and z-order

Furniture stays locked by default. The load-bearing tldraw fact: `Editor.getDraggingOverShape`
filters out locked shapes *before* checking for `onDragShapesOver`/`onDropShapesOver`, so a locked
shape can never be a drag target — target-side hooks are permanently unavailable for furniture.
Consequently:

- **Zone entry detection stays card-side**, in the card's own `onTranslateEnd`, upgraded from
  matching a freeform `meta.zone` string to matching `type === 'mtg-zone'` and reading validated
  `zone`/`seatId` props.
- **The armed/drag-over highlight lives inside the zone's own `component()`**, computed reactively
  (e.g. `useValue` over shapes currently being translated), never written to the store — avoids
  per-frame synced writes and an undo trail that a stateful hook approach would require. The armed
  highlight is visible **only to the player doing the dragging** — not synced to other clients.

When a card's centre sits inside more than one zone, the **topmost-drawn** (highest `index`) zone
wins — matching tldraw's own top-down `getShapesAtPoint` convention. This makes `nextIndex` a
precedence declaration, not cosmetic z-ordering: furniture must be drawn least-specific-first (the
playmat before a command zone that sits on it), and any code that re-places an existing zone
(e.g. `ensureStackStripWidth`) must preserve its existing index rather than minting a fresh one on
every call.

The Stack is a zone in the enum (`seatId: null`, shared) — dropping a card on it is recognised
like any other zone entry, fixing today's gap where it carries no zone tag at all.

### Zone appearance

At rest: `.commander-placeholder`'s dashed "empty receptacle" pattern, ported and retokenized —
`2px dashed var(--dark-pink)`, radius `0`. Armed: a `--armed-glow` token (`#e6a33d`) drives a
`box-shadow` ring plus a background tint, uniform across every zone type — including the playmat
and library, where the tint is invisible (they sit under an opaque picture layered over the zone
box) but the ring still shows; accepted rather than forking the treatment by zone kind. The
playmat's border is plain `black`, matching the Shuffler's mats exactly (`10px solid black`,
untokenized on purpose) — not `--dark-pink` — so the two ships' playmats read as one identity. The
playmat's corner radius is computed at render time as a proportion (5%) of the shape's own
`props.h`, applied equally to both axes — not a fixed pixel value (drifts out of proportion on a
zoomable canvas) and not a bare CSS percentage (draws an ellipse on a non-square box, since CSS
percentage radii resolve width and height separately). The Stack gets no distinct visual
treatment — same dashed-at-rest/glow-armed family as graveyard/exile/command.

Both dependencies this decision needed (a place for Tabletop CSS tokens, and Orbitron loading in
`apps/tabletop`) are already resolved by `packages/design-tokens` and its Vite import plus the
Google Fonts `<link>` in `index.html` — nothing here is blocked on plumbing.

### What a shape knows and announces

A fixed vocabulary names gestures physics has semantics for: `card.tapped`/`card.untapped`,
`counter.attached`, `card.attachedBelow`/`noteAttached` (the shared tuck-behind mechanism),
`card.zoneMoved`, `card.flipped`, `card.turnedFaceDown`. Everything else that constitutes a
completed motion — in-zone repositioning, freeform doodles, any custom shape physics has no name
for — announces as generic `shape.moved`/`shape.created`/`shape.changed`. The bar for inclusion is
"a completed motion happened," not "physics judges it interesting" — this is deliberately not a
curated shortlist. Never announce per-frame drag positions, only settled motions.

Only cards (`instanceId`) and zones (`zone`/`seatId`) carry identity in an announcement; counters
and notes carry their text as a plain attribute, with no identity tracked across time. A
duplicated card (e.g. a future copy gesture) announces `shape.created` plus a `copiedFrom`
attribute pointing at the source `instanceId` — no new named word, no token semantics beyond that,
since duplication's real domain meaning isn't designed yet.

Every announcement carries `actor` = tldraw's own ephemeral per-session sync id — an explicit
stand-in for real seat/player identity, which doesn't exist on the client today.

**Mechanism**: detection stays exactly where each gesture's own hook already computes it (a
card's `onTranslateEnd` for zone crossings, `onClick` for tap, a drop handler for
counter/note attachment) — each hook writes its conclusion into the shape's own record.
Separately, the *announcement* is centralized in one `store.listen()` (sitting beside or extending
`useCardArrivalSpans.ts`) that watches the whole document store for the resulting mutations and
translates each into the vocabulary above via `inSpan()` — a short-lived span per occurrence, per
the `fleet-is-observable` owner's guidance for a browser gesture with no ambient parent span.
tldraw's store mutation source is only ever `'user'` or `'remote'` (never `'undo'`), so an
undo-caused change surfaces as an ordinary vocabulary event, indistinguishable from a fresh
action — no distinct "this was an undo" marker is built.

**Destination for this spec is Honeycomb telemetry only.** The `card.moved` contract payload, the
Tabletop→Spine sender, and `contracts/` validation are explicitly out of scope (map 5's job) —
this spec only decides what physics is willing to say, not how it travels further.

## Testing Decisions

- **Seam**: prefer the existing Playwright verification seam at `apps/tabletop/test/verification/`
  — it already exercises tap (`verify-card-rotate.spec.ts`), zone entry
  (`verify-zone-entry.spec.ts`), card arrival (`verify-card-arrival.spec.ts`), and drag identity
  (`verify-card-drag-identity.spec.ts`, `verify-drag-identity.spec.ts`) against the real running
  app and a real synced canvas, across two browser clients where cross-client behavior matters
  (undo, sync). New specs for new gestures (flip, face-down, counter attach/detach, tuck, zone
  armed state, multi-select untap) should follow this same pattern: drive the real UI, assert on
  rendered/synced shape state, not on internal function calls.
- Only external behavior is tested — what a shape ends up looking like and what state it holds
  after a gesture — never internal call sequences or the specific tldraw hook that fired.
- **The multi-select untap undo grouping is a required regression test**, not optional — this
  spec's implementation leans on an undocumented tldraw internal (the `markHistoryStoppingPoint` →
  `updateShapes` → return ordering inside `PointingShape.onPointerUp`), and Jess's condition for
  accepting that dependency was an explicit Playwright test that would catch a tldraw upgrade
  silently breaking the grouping (one Ctrl+Z reverts every card tapped/untapped together, and
  leaves an earlier unrelated tap alone).
- Two-client sync should be verified for: multi-select untap (each client's undo stack stays
  independent), zone armed highlight (only the dragging player's client shows it), and flip/
  face-down (both clients see the same resulting face).
- Unit-test candidates (fast, no browser needed) for pure logic extracted during implementation:
  the tap rotation-delta math (`rotateAboutCenter`-style helper), the zone-overlap "topmost index
  wins" resolution given a set of candidate zone bounds, and the vocabulary-translation function
  that maps a store mutation to a named occurrence (or the generic fallback).
- Prior art: `apps/tabletop/test/verification/verify-zone-entry.spec.ts` (asserts a card's zone
  membership after a drag, keyed on the same detection mechanism this spec upgrades) and
  `verify-card-rotate.spec.ts` (asserts tap's rotation behavior) are the closest existing
  precedent and should be extended/adapted rather than replaced.

## Out of Scope

- **Geography** — the square, the command zone's placement, life totals as furniture. That's
  [map 2, Table layout](../tabletop-table-layout/map.md); this spec decides what furniture *is*,
  not where it goes.
- **Sending anything to the Spine** — the `card.moved` contract payload, a Tabletop→Spine sender,
  and making `contracts/` actually validate physics occurrences. That's map 5. This spec only
  decides what physics knows and is willing to announce (to Honeycomb, for now).
- **Curating the tldraw UI** — killing the crop tool globally, trimming the toolbar, curating the
  context menu beyond adding this spec's own items (Flip, Turn face down, Send backward). That's
  map 4. The one exception already folded in here is where stock tldraw handles actively break
  physics (tap surviving resize/rotate) — that's in scope because it's a physics bug, not a UI
  curation choice.
- **Undo as a board-wide concern** — general undo/redo behavior, distinguishing an undo-caused
  change from a fresh action for any purpose beyond "don't build a marker that doesn't exist."
  That's map 4. This spec accepts that tldraw gives no `'undo'` change-source signal.
- **Player-level loose counters** (poison, energy, experience, not attached to any card) — a
  sticky note is an adequate stand-in today; nobody needs to build a mechanism for these.
- **Pre-made preset counters** (a stock "+1/+1" counter droppable from a tray) — a real future
  want, not built here. `mtg-counter` supports only blank free-text counters.
- **Real actor/seat identity on the Tabletop.** `actor` is stubbed with tldraw's ephemeral
  per-session sync id; giving the Tabletop durable player/seat identity is a separate,
  not-yet-designed piece of work that likely touches how seats work on the canvas more broadly.
- **What a duplicated card is**, beyond the cheap `shape.created` + `copiedFrom` fallback named
  above — token semantics for what a copy inherits aren't designed.
- **Fixing the Shuffler/table `currentFace` divergence** described in the Flip and face-down
  section — accepted as a known limitation, not solved here. Building a real inbound
  Spine→Shuffler event channel is a much larger piece of infrastructure than this spec's scope.
- **Shared (multi-client) armed-zone highlighting.** Local-only for now; revisit only if tldraw
  exposes a presence lane that would make shared arming cheap without per-frame document writes.

## Further Notes

- Every decision above was reached via `/grilling` with Jess against
  `.scratch/tabletop-physics/map.md`, several with input from the `two-faced-cards`,
  `tabletop-shape-mechanics`, `shuffler-looks-like-itself`, and `animations` owners, and one
  (zone appearance) via a staged `/design` comparison rather than argued in prose. Consult those
  same owners' `-review` skills before implementing anything this spec touches on their
  territory — flip/face-down (`two-faced-cards`), tldraw `ShapeUtil` hooks and drag/drop
  (`tabletop-shape-mechanics`), any visual/CSS decision (`shuffler-looks-like-itself`), and tap's
  animation timing (`animations`).
- The full research trail behind "what does tldraw 5.2.5 actually require of a custom shape type"
  is in `.scratch/tabletop-physics/research/tldraw-custom-shapes.md` — read it before writing any
  `ShapeUtil` registration code; it documents the exact three-place sync requirement and the
  disconnect-not-drop failure mode.
- `.scratch/tabletop-physics/map.md` § "Not yet specified" lists three genuinely-fog items
  (shared armed highlighting, preset counters, real actor identity) that are intentionally not
  promoted into this spec — they're future work, not gaps in this one.
- This spec supersedes `MtgCardImageShapeUtil.tsx` and the `meta.zone`-based furniture in
  `tableFurniture.ts` entirely; there is no migration path to preserve because nothing is
  persisted and a redeploy wipes every room today.

## Comments
