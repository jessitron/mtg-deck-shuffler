# Two-Faced Cards — Tabletop component

The Tabletop (`apps/tabletop/`) renders cards it is told about; it never interprets
them. Its whole face knowledge in v0:

> **Read "What a card will be" below before advising on anything Tabletop-side.** Ticket 02
> (`.scratch/tabletop-physics/issues/02-what-a-card-is.md`, resolved 2026-08-07, commit
> `c956949`) decided the card's whole shape, and **the sections describing today's `image`
> shape are now a description of what is about to be replaced.** No code has changed yet.

**JES-140 (2026-08-01) moved the card-placement code but not the face logic.**
`apps/tabletop/src/server/cardArrival.ts` (`handleCardArrival`) still builds the
card's image shape and its `meta` exactly as below — untouched. What moved: the
shared shape-building helpers (`regionShape`, `nextIndex`, `pageIdOf`, and the new
`ensurePlayerArea`) live in `apps/tabletop/src/server/tableFurniture.ts` now, and
geometry (playmat/library/graveyard/exile/Stack bounds) lives in
`apps/tabletop/src/server/cardLayout.ts` — a full rewrite of that file's old
row-based functions (`rowOrigin`, `battlefieldPosition`, `graveyardPosition`,
`GRAVEYARD_X`, `EXILE_X`, `STACK_AREA` are gone; see `apps/tabletop/DESIGN.md` for
the geometry they were replaced with). A new endpoint,
`apps/tabletop/src/server/seatJoined.ts` (`POST /api/tables/:tableName/events`,
`seat.joined`), draws a seat's whole player area before any card arrives — the
card image shape and its `meta`/dedup rules this file describes are unaffected by
that new arrival trigger.

## Arrival renders the played face

- The card-arrival payload (`POST /api/tables/:tableName/cards`, frozen in F0/JES-128)
  carries `face: "front" | "back"` beside `card: { scryfallId, instanceId }`.
- The Shuffler computes the face-specific `imageUrl` (a blessed scaffolding
  convenience) from `currentFace` via `getCardImageUrl(card, "normal", face)`. An MDFC
  played on its back face arrives showing its back face.
- **The Tabletop does NOT store `face`.** `cardArrival.ts:50` *validates* it
  (`face must be "front" or "back"`) and then drops it on the floor: nothing in the
  shape record, `props`, `meta`, or the asset carries it. The face reaches the canvas
  only as baked-in pixels inside `imageUrl`. **Consequence: the Tabletop cannot change
  a card's face today** — it doesn't know which face is showing, and it has no URL for
  the other one. (This file previously claimed the Tabletop "stores `face` for later."
  It never did; corrected 2026-08-07.)
- The tldraw shape's `meta` is `{ instanceId, scryfallId, cardName }` — identity,
  not face. Face is state; if a future gesture flips the card on the table, the
  shape's image swaps but its identity does not change. **(Ticket 02 moves all of this
  into `props`; `meta` empties out entirely. See "What a card will be" below.)**

## Rotation has a custom ShapeUtil now (JES-144, 2026-08-01) — being replaced

`apps/tabletop/src/client/shapes/MtgCardImageShapeUtil.tsx` extends tldraw's
built-in `ImageShapeUtil` (cards stay `type: "image"` — no new shape type) and
overrides only `onClick`: if `shape.meta?.instanceId` is present (an MTG card,
not a furniture image like the playmat/library background, which are also
`type: "image"` but `isLocked: true` and never reach `onClick`), it rotates the
shape 90° and returns the partial; otherwise it returns `undefined` and tldraw's
default behavior applies. Registered via `shapeUtils={[MtgCardImageShapeUtil]}`
on `<Tldraw>` in `TablePage.tsx`. `rotation` is a base tldraw shape-record field
(already present, hardcoded to `0` at arrival) — this didn't need a schema or
contract change. Verified by `test/verification/verify-card-rotate.spec.ts`
(bounding-box width/height swap after click).

**Watch point:** `onClick` is spoken for — by rotate today, by tap once ticket 04 lands
either way. The flip gesture needs a different trigger; that's ticket 06's remaining
question, with menu placement scoped by `no-doubleclick-crop` in the repo-root `TODO.md`.
Note this whole util is being replaced by `mtg-card extends BaseBoxShapeUtil` (ticket 02),
which keeps `onClick` as a base hook — so the trigger constraint survives the rewrite.

## Face and face-down are two axes (decided 2026-08-07)

Jess, while resolving `.scratch/tabletop-physics/issues/02-what-a-card-is.md`:

> In our domain model, "Face Down Card" will be a real thing, and it looks like a card
> back (in the future: a card sleeve) _even if the card itself is two-faced_.

Two independent pieces of state, never collapsed into one:

| Axis | Values | Means | Image shown |
|---|---|---|---|
| **face** | `front` \| `back` | which **printed side** of this card is chosen | that side's Scryfall image |
| **face-down** | yes \| no | **concealment** — the card's identity is hidden | the generic card back / sleeve |

- `face` ranges over **printed sides only**. So `face: "back"` is *unreachable* on a
  one-faced card — a one-faced card turned over is `faceDown`, not `face: "back"`.
- The axes are independently reachable in **normal play**, not just in a rules corner
  (manifest/morph): a two-faced card can be *played* face down. A face-down MDFC shows a
  card back; the `face` it would reveal is still carried underneath.
- **A one-bit "which side is up" model was proposed and rejected.** Don't re-derive it.
  It cannot express "two-faced card, face down" (which side is up? neither is visible),
  and it makes concealment indistinguishable from transformation.

## The two ships mean different things by "flip" — deliberately

Jess: *"in Deck Shuffler, a one-faced card cannot be flipped. On Tabletop, it can. We
need to be very clear on that."* This is a `CONTEXT-MAP.md`-shaped divergence — the word
does not translate between the ships (there is no `CONTEXT-MAP.md` in the repo yet; when
one is written, "flip" belongs in it, sourced from here).

| | Shuffler | Tabletop |
|---|---|---|
| What "flip" is | **inspection** of a two-faced card | **turning over a physical object** |
| One-faced card | **cannot** flip — nothing to flip to, and no flip affordance is rendered (`formatCardContainer()` branches on `card.twoFaced`; `GameState.flipCard()` throws on a single-faced card) | **can** be turned over — every card on a table has two sides |
| Turning over a one-faced card | not a thing | shows the card back → **the card is now face down**, a real domain event in game terms |
| Turning over a two-faced card | swaps `currentFace`; not persisted on prep, persisted in game; **not** an event | a **transform** — the other printed face. NOT face-down |
| Recorded as an event? | no — flip is a UI concern (see README's design philosophy) | yes, intended: turning over on the table is physical, so the Spine can hear it |

The Shuffler's behavior is **unchanged** by this decision; the asymmetry is the point.
So: a Tabletop gesture that "flips" a card has to decide *which* axis it moves, and for a
one-faced card only the face-down axis exists.

The Shuffler has **no face-down concept at all** today — nothing in `CardDefinition`,
`GameCard`, or the contract expresses concealment. A "Play Face-Down" button for the
Shuffler was considered and **dropped** (2026-08-07) onto the Mural-parity list as a
buoy; `notes/DESIGN-tabletop-replaces-mural.md` already lists "flip a card over (MDFC,
and face-down)" as parity work and puts playing from the library face-down out of scope.
Don't confuse this with the "Card Back" note in [interactions.md](interactions.md) — the
Shuffler's `CARD_BACK` image is *library stack decoration*, not modeled concealment. When
face-down becomes real, that constant is the picture it should use, but concealment is
state and the card back is only its rendering.

## What a card will be — decided, ticket 02 (2026-08-07, commit `c956949`)

**No code changed yet.** This is the shape the implementation must take; read the ticket's
§ Answer for the full reasoning before implementing.

**A card becomes a genuine custom tldraw shape type**, `mtg-card` extending
`BaseBoxShapeUtil`, and **it renders its own image**. `MtgCardImageShapeUtil extends
ImageShapeUtil` is being *replaced*, not extended — the deciding argument was "one util,
three meanings" (one `type: "image"` util today serves cards, locked furniture, and any
JPEG a player drags in, separated only by `if (shape.meta.instanceId)`). Syncing a custom
type is a mandatory three-place change and `TLSocketRoom` *disconnects* a client that
pushes an unknown type — see `.scratch/tabletop-physics/research/tldraw-custom-shapes.md`
and the ticket's "Blast radius".

**`meta` empties out; both axes live in `props`** (validated, migratable — `meta` is only
"is it JSON", and `createShapePropsMigrationSequence` cannot touch it):

```ts
'mtg-card': {
  w, h,                          // from BaseBoxShapeUtil
  instanceId: string,            // this card in this game; the dedup key, never composite
  scryfallId: string,            // the printing (all faces)
  cardName: string,              // rendering: alt text / a11y
  frontImageUrl: string,
  backImageUrl: string | null,   // the PRINTED back face. null = no printed back exists
  face: 'front' | 'back',
  faceDown: boolean,
  tapped: boolean,               // ticket 04 owns how this relates to rotation
}
```

Three consequences this owner cares about:

- **The per-instance tldraw image asset goes away.** `cardArrival.ts:137` mints one asset
  per card (`AssetRecordType.createId(instanceId)`) and the shape points at it via
  `props.assetId`. Since the card holds both URLs and renders its own `<img>`, **flip
  becomes a pure shape-prop change** — no asset mutation, clean undo. This was this
  owner's argument and it carried.
- **`backImageUrl` is the printed back only, and `null` means "no printed back exists."**
  There is deliberately **no `twoFaced` flag** on the shape or the payload: Jess declined
  one on the grounds that `backImageUrl !== null` says it precisely, `twoFacedLayouts.ts`
  stays the single decider of flippability, and two fields that must agree is a bug waiting
  to happen. Accepted — but see the sharp edge in "Watch points" below, which the sender
  must honour for that equivalence to hold.
- **The generic card back is NOT a card property.** Rendering resolves `faceDown` against
  the **table's** `cardBackImageUrl` (already arriving on `seat.joined`, already used by the
  library furniture). Reason: sleeves are coming
  (`.scratch/tabletop-table-layout/issues/09-sleeve-and-playmat-picker.md`), and a sleeve
  belongs to a player or a table, not to a card — bake it per-card and changing your sleeve
  rewrites every shape on the board. This honours this owner's rule that concealment is
  *state* and the card back is only its *rendering*, arriving from a different direction
  than we proposed.

Also decided, and outside this owner's territory but worth not re-deriving: the card knows
nothing about its counters, notes, or what it's tucked behind (the passenger knows its
parent, not the reverse); there is **no seat/controller/owner field**; and `zone` is left
deliberately *unplaced* so ticket 03 can decide it rather than inherit it.

## The arrival payload unbakes the face — decided, ticket 02

Exactly as this owner recommended, with **zero contract churn** (`imageUrl`/`cardName` are
blessed scaffolding, not contract — `card.played.v1.json` carries only `card`, `face`,
`initiator`, `occurredAt`):

- **`imageUrl` → `frontImageUrl` + `backImageUrl: string | null`** — *replacing* it, not
  coexisting. A baked-face field left lying around is the bug being removed.
- **`face` stays contract**, but its meaning shifts from "which face I baked in" to
  "**which face is up on arrival**."
- The back URL must be **sent, not derived**: bare constructed Scryfall URLs 404 for
  freshly-released cards, which is the whole reason `backImageUris` is stored on
  `CardDefinition` (commit `eb48f4f`).

Two edit sites, both known: `buildCardPlayedEvent` in
`apps/shuffler/src/port-tabletop/types.ts` (keep its field-by-field comment block in sync —
it is the de-facto spec of F0) and the hand-rolled `validationError` in
`apps/tabletop/src/server/cardArrival.ts`.

## Face-down is depicted, not enforced — and no gesture may be gated on control

**This is a standing constraint on this owner's territory.** The concealment/leak finding
this owner raised (a face-down card's identity is readable by every client, since tldraw
sync broadcasts whole shape records) was resolved by **not guarding it**, on a principle
Jess stated and which now lives in `notes/DESIGN-the-table-vision.md` § Principles:

> *"everything that can be done by one player is doable by any player"* — there is no
> privileged actor. The Tabletop has **no ownership or permission model**.

So, binding on all future Tabletop face work:

- Identity (`scryfallId`, `cardName`, both image URLs) **stays in `props`** on a face-down
  card. Guarding it is theatre: any player can just turn the card over.
- **Never gate a flip / turn-over / peek gesture on who controls the card.** This kills a
  whole class of design before it starts — "only the controller may reveal" is not
  available. A card may record *where it came from*; provenance grants no rights.
- "Let a player peek at a face-down card" needs no feature.

Related, and a softening of this owner's own framing: Jess **reversed** the rule that
`gameCardIndex` never leaves the Shuffler — *"I don't want you to have to reason about what
is hidden and what isn't."* Buoy `let-gamecardindex-out` in the repo-root `TODO.md`. The
*reason* the guard existed (SEAMAP's "hand counts but never hands") still holds — it just
belongs on **payload design**, not as a boundary check on every door. See
[contract.md](contract.md).

## Still open — narrowed to ticket 06

`.scratch/tabletop-physics/issues/06-two-faces-and-face-down.md` was narrowed to exactly
two questions, both of which this owner must be consulted on:

1. **The trigger gesture.** `onClick` is spoken for by tap (ticket 04), so flip and
   turn-over each need a different gesture — context menu, hover affordance, one "turn
   over" that does the right thing per card, or two separate actions. Menu *placement* is
   map 4's business; the gesture is decided here.
2. **Who is authoritative about `currentFace` for Table-zone cards.** Written into ticket 06
   as a must-decide, from this owner's watch point: the Shuffler keeps `currentFace` on a
   card at `{type:"Table"}`, and **discard keeps `currentFace`** — so a table-flipped card
   sent to the graveyard shows the **pre-flip** face on the Shuffler's screen. Either the
   table becomes authoritative for Table-zone cards and the Shuffler stops trusting its
   copy, or flip-on-table is table-local and the divergence is accepted knowingly.

When flip lands, turning a card over on the table is a physical event the Spine can hear
(`card.flipped` or similar) — and it must say **which axis** moved: a transform to the other
printed `face`, or a change of concealment (`faceDown`). See "the two ships mean different
things by flip" above. Do NOT bake "front-ness" into shape identity.

## Watch points

- Any new Tabletop rendering path for cards must honor the payload's `face` — never
  assume front.
- Dedup is on `instanceId` (the card exists once on the table), NOT on
  scryfallId+face — two Forests are two instances; one MDFC flipped is still one
  instance.
- **`backImageUrl` must be derived from `card.twoFaced`, never from whether
  `backImageUris` happens to be stored.** This is the one sharp edge in the
  no-`twoFaced`-flag decision, and it lives entirely in `buildCardPlayedEvent`. The
  equivalence "`backImageUrl !== null` ⇔ this card has a printed back" holds only if the
  sender computes the field as `card.twoFaced ? getCardImageUrl(card, "normal", "back") :
  null`. `getCardImageUrl` always returns a string (it falls back to
  `constructCardImageUrl`), so gating on `twoFaced` is safe; gating on
  `card.backImageUris` instead would make a two-faced card whose Scryfall image fetch
  missed arrive as `backImageUrl: null` and be **silently unflippable on the table** —
  exactly the "two fields that must agree" bug the decision was meant to avoid, relocated.
  `twoFacedLayouts.ts` remains the single decider; the payload just has to ask it.
