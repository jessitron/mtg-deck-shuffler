# Two-Faced Cards — Tabletop component

The Tabletop (`apps/tabletop/`) renders cards it is told about; it never interprets
them. Its whole face knowledge in v0:

> **Read "What a card is" below before advising on anything Tabletop-side.** Ticket 02
> (`.scratch/tabletop-physics/issues/02-what-a-card-is.md`, resolved 2026-08-07, commit
> `c956949`) decided the card's whole shape, and **ticket 12 (2026-08-08) implemented it.**
> The card is now a genuine `mtg-card` tldraw shape; the sections below describing the old
> borrowed `image` shape are historical record of what was replaced, not current behavior.

**JES-140 (2026-08-01) moved the card-placement code but not the face logic; ticket 12
(2026-08-08) later changed the face logic itself.** JES-140's geometry move: shared
shape-building helpers (`regionShape`, `nextIndex`, `pageIdOf`, `ensurePlayerArea`) live
in `apps/tabletop/src/server/tableFurniture.ts`, and geometry (playmat/library/
graveyard/exile/Stack bounds) lives in `apps/tabletop/src/server/cardLayout.ts` — a full
rewrite of that file's old row-based functions (`rowOrigin`, `battlefieldPosition`,
`graveyardPosition`, `GRAVEYARD_X`, `EXILE_X`, `STACK_AREA` are gone; see
`apps/tabletop/DESIGN.md` for the geometry they were replaced with). `seatJoined.ts`
(`POST /api/tables/:tableName/events`, `seat.joined`) draws a seat's whole player area
before any card arrives — unaffected by ticket 12's shape-type change. What ticket 12
changed, still in `cardArrival.ts` (`handleCardArrival`): the shape it builds is now
`type: "mtg-card"` with identity/face/image-URLs in `props` and an empty `meta`, not the
old `type: "image"` shape with identity in `meta` and a minted per-card asset — see
"Arrival renders the played face" below for the current shape.

## Arrival renders the played face

- The card-arrival payload (`POST /api/tables/:tableName/cards`, frozen in F0/JES-128)
  carries `face: "front" | "back"` beside `card: { scryfallId, instanceId }`, plus (since
  ticket 12, 2026-08-08) `frontImageUrl: string` and `backImageUrl: string | null`
  (replacing the old baked `imageUrl`).
- The Shuffler always sends `frontImageUrl` (`getCardImageUrl(card, "normal", "front")`)
  and sends `backImageUrl` only when `card.twoFaced` (else `null`) —
  `apps/shuffler/src/port-tabletop/types.ts`'s `buildCardPlayedEvent`. `face:
  currentFace` still says which face is up on arrival.
- **The Tabletop now stores everything it's given, directly in shape `props`.**
  `cardArrival.ts`'s `handleCardArrival` writes `frontImageUrl`, `backImageUrl`, and
  `face` straight onto the new `mtg-card` shape (`type: "mtg-card"`) — no baking, no
  dropping. **Consequence: flip is now structurally a pure `props.face` write** — the
  shape already holds both URLs, so a future flip gesture needs only to change one enum
  field. (This file previously said the Tabletop "does NOT store `face`" and "cannot
  change a card's face today." That was true through ticket 02; ticket 12 changed it. No
  gesture writes `props.face` yet, though — see "Still open" below.)
- The shape's `meta` is now `{}` at arrival — genuinely empty, not `{ instanceId,
  scryfallId, cardName }` as before. Identity moved into validated `props` (`instanceId`,
  `scryfallId`, `cardName`, alongside the image URLs and face state); `meta` is reserved
  for zone membership, written later by `onTranslateEnd` (`meta.zone`) — see "What a card
  is" below.

## Rotation and tap: `MtgCardImageShapeUtil` was replaced by `MtgCardShapeUtil` (ticket 12, 2026-08-08)

`apps/tabletop/src/client/shapes/MtgCardImageShapeUtil.tsx` (JES-144, 2026-08-01,
`extends ImageShapeUtil`) is **gone** — deleted outright, not deprecated. Its
`onClick` tap/untap behavior now lives on
`apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` (`extends BaseBoxShapeUtil`),
registered the same way (`shapeUtils={[MtgCardShapeUtil]}` on `<Tldraw>` in
`TablePage.tsx`) but for the new `type: "mtg-card"` shape instead of a borrowed
`type: "image"`. Semantics are unchanged: a toggle (`props.tapped`), rotation applied
as a delta around the card's center (not its corner) so it composes with any free
rotation already applied, not read back out of `rotation` itself. Still verified by
`test/verification/verify-card-rotate.spec.ts`.

**Watch point, updated:** `onClick` is spoken for — by tap. Ticket 06 (resolved
2026-08-08) chose the flip trigger accordingly: **two separate context-menu items**
("Flip" / "Turn face down"), not any pointer gesture on the card — see "Resolved:
ticket 06" below. Menu placement remains map 4's business (`no-doubleclick-crop` in
the repo-root `TODO.md`). The prediction in this section (when it described
`MtgCardImageShapeUtil`) that the `BaseBoxShapeUtil` rewrite would "keep `onClick` as
a base hook" held — it did.

## Drag picked up the wrong card after a previous drag — fixed (2026-08-07, `959831c`), ported forward (ticket 12, 2026-08-08)

**Bug** (original, on `MtgCardImageShapeUtil`): play two cards, drag one, then drag the
*other* (still-unmoved) card — the first card silently moved again instead of the one
under the pointer.

**Root cause**: any `ShapeUtil` with an `onClick` makes tldraw's `SelectTool` defer
selecting the pointed-at shape until pointer-up (`PointingShape.onEnter` in
`node_modules/tldraw/src/lib/tools/SelectTool/childStates/PointingShape.ts` skips
select-on-enter whenever `getShapeUtil(shape).onClick` is truthy). The drag-start
safety net (`startTranslating`) only force-reselects the actually-hit shape when
*nothing* is currently selected, and tldraw leaves the just-dragged card selected after
a drag ends — so the guard is false on the next drag, and translating kept acting on
the stale selection instead of the shape under the pointer.

**Fix, and where it lives now**: `onTranslateEnd` calls
`this.editor.setSelectedShapes([])` **unconditionally**, right after the empty-selection
guard and *before* the zone-equality early return, so every drag settle leaves
selection empty and the next drag correctly re-selects whichever card the pointer lands
on. **This was ported forward into `MtgCardShapeUtil.onTranslateEnd` when ticket 12
replaced the util** (`apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx`), exactly as
the porting note below (written when ticket 02 was only decided) required. The
`959831c` fix on the old `MtgCardImageShapeUtil` is now historical — the live copy is on
the new util.

**Verified by** `apps/tabletop/test/verification/verify-drag-identity.spec.ts` (and its
renamed/updated sibling `verify-card-drag-identity.spec.ts`): plays two non-overlapping
lands, drags the first, then drags the second, and asserts the second moved while the
first stayed put.

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
buoy; `apps/tabletop/notes/DESIGN-tabletop-replaces-mural.md` already lists "flip a card over (MDFC,
and face-down)" as parity work and puts playing from the library face-down out of scope.
Don't confuse this with the "Card Back" note in [interactions.md](interactions.md) — the
Shuffler's `CARD_BACK` image is *library stack decoration*, not modeled concealment. When
face-down becomes real, that constant is the picture it should use, but concealment is
state and the card back is only its rendering.

## What a card is — decided ticket 02 (2026-08-07, `c956949`), implemented ticket 12 (2026-08-08)

Read the ticket's § Answer for the full reasoning. **This is now live code**, not a plan.

**A card is a genuine custom tldraw shape type**, `mtg-card` extending
`BaseBoxShapeUtil` (`apps/tabletop/src/shared/mtgCardShape.ts` for the validated
`props` schema, `apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` for the util),
and **it renders its own image**. `MtgCardImageShapeUtil extends ImageShapeUtil` **was
replaced**, not extended, and deleted outright — the deciding argument was "one util,
three meanings" (the old `type: "image"` util served cards, locked furniture, and any
JPEG a player drags in, separated only by `if (shape.meta.instanceId)`). Syncing a custom
type was a mandatory three-place change (`TLSocketRoom` *disconnects* a client that
pushes an unknown type) — see `.scratch/tabletop-physics/research/tldraw-custom-shapes.md`
and the ticket's "Blast radius" — and it landed clean; no disconnects reported.

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
  sleeveColor: string | null,    // the seat's sleeve, baked at mint (table-layout ticket 17); null = unsleeved
}
```

Three consequences this owner cares about:

- **The per-instance tldraw image asset is gone.** `cardArrival.ts` no longer calls
  `AssetRecordType.create`/`createId` at all — the old code minted one asset per card and
  the shape pointed at it via `props.assetId`. Since the card holds both URLs and renders
  its own `<img>` in `MtgCardShapeUtil.component()`, **flip is now a pure shape-prop
  change** — no asset mutation, clean undo. This was this owner's argument and it
  carried. (No flip gesture writes `props.face` yet — see "Still open" below — but the
  structural work that makes it a one-field write is done.)
- **`backImageUrl` is the printed back only, and `null` means "no printed back exists."**
  There is deliberately **no `twoFaced` flag** on the shape or the payload: Jess declined
  one on the grounds that `backImageUrl !== null` says it precisely, `twoFacedLayouts.ts`
  stays the single decider of flippability, and two fields that must agree is a bug waiting
  to happen. Accepted — but see the sharp edge in "Watch points" below, which the sender
  must honour for that equivalence to hold.
- **The generic card back is NOT a card property** — *as ticket 02 decided it*: rendering
  resolves `faceDown` against the **table's** `cardBackImageUrl` (arriving on `seat.joined`,
  already used by the library furniture), because a mid-game sleeve change would otherwise
  rewrite every shape on the board. **Amended by table-layout ticket 11 and built by
  ticket 17 (both 2026-08-08 — see "Sleeve color" section below)**: sleeve color was since
  declared a *game constant*, which makes per-card baking legal; `mtg-card` props now carry
  `sleeveColor: string | null`, baked from seat memory at mint time in `cardArrival.ts`,
  and `cardBackImageUrl` remains the rendering for unsleeved seats only. The deeper rule
  survives intact: concealment is *state*, and the card back/sleeve is only its
  *rendering*.

Also decided, and outside this owner's territory but worth not re-deriving: the card knows
nothing about its counters, notes, or what it's tucked behind (the passenger knows its
parent, not the reverse); there is **no seat/controller/owner field**; and `zone` stays
**deliberately out of `props`** — it's tracked in `meta.zone` instead (written by
`MtgCardShapeUtil.onTranslateEnd`, per ticket 01's zone-entry detection), so ticket 13
(the ownership-boundary/zone-shape-type question) can decide it rather than inherit it.
(This section previously said "ticket 03"; the renumbered spec calls it ticket 13 — see
`mtgCardShape.ts`'s own doc comment.)

## The arrival payload unbakes the face — implemented, ticket 12 (2026-08-08)

Exactly as this owner recommended in ticket 02, with **zero contract churn**
(`frontImageUrl`/`backImageUrl`/`cardName` are blessed scaffolding, not contract —
`card.played.v1.json` carries only `card`, `face`, `initiator`, `occurredAt`):

- **`imageUrl` → `frontImageUrl` + `backImageUrl: string | null`** — *replaced* it, not
  coexisting alongside it. A baked-face field left lying around would have been the bug
  left unfixed.
- **`face` stays contract**, and its meaning has shifted from "which face I baked in" to
  "**which face is up on arrival**" — both the doc comment and the interface reflect this
  now.
- The back URL is **sent, not derived**: `buildCardPlayedEvent` reads
  `getCardImageUrl(card, "normal", "back")`, not a path-swapped `scryfallId` — bare
  constructed Scryfall URLs 404 for freshly-released cards, the whole reason
  `backImageUris` is stored on `CardDefinition` (commit `eb48f4f`).

Two edit sites, both landed: `buildCardPlayedEvent` in
`apps/shuffler/src/port-tabletop/types.ts` (field-by-field comment block kept in sync —
it is the de-facto spec of F0) and the hand-rolled `validationError` in
`apps/tabletop/src/server/cardArrival.ts` (now requires `frontImageUrl: string` +
`backImageUrl: string | null`).

## Sleeve color: how the card back gets its look — decided ticket 11, BUILT ticket 17 (2026-08-08, `0a768e6` + `bfdc877`)

Decided in `.scratch/tabletop-table-layout/issues/11-sleeve-color-to-card-back.md`
§ Answer (graduated out of ticket 09's "sleeves are color-picked in v1"); implemented by
table-layout ticket 17 (plan at `.scratch/tabletop-table-layout/plan-17.md`). Four
decisions, all held in the implementation:

1. **A sleeve is a solid-color rectangle slightly larger than the card** (a few px per side
   at canvas scale). v1 has one color doing both jobs (front border + back). **Sleeve color
   is a game constant** — chosen pre-game, never changed mid-game. That immutability is
   load-bearing: it is what makes per-card baking legal, dissolving ticket 02's
   "never bake per-card" rule (whose whole rationale was mid-game sleeve changes).
2. **It travels as a color, not a URL** — built: optional `sleeveColor` (hex) is on
   `SeatJoinedEvent` / `buildSeatJoinedEvent` (`apps/shuffler/src/port-tabletop/types.ts`;
   the value comes from the prep, `sleeveColor?` on `port-persist-prep/types.ts`) — as data
   because ticket 12 (table-layout) made sleeve color *player identity*, and
   commander-damage counters need the raw hex, which a URL would lock away.
   `cardBackImageUrl` is now **omitted when the seat has a sleeve** — enforced on BOTH
   ships: `buildSeatJoinedEvent` sends `cardBackImageUrl: sleeveColor ? undefined :
   cardBackImageUrl`, and the Tabletop's `tableFurniture.ts` drops it again on receipt.
   `sleeveColor` wins if both ever arrive. No default color: unsleeved seats keep the
   standard Magic card back. The Tabletop's `seatJoined.ts` validates the hex
   (`SLEEVE_COLOR_PATTERN`, exactly six hex digits → 400 on garbage).
3. **No `card.played` rev — held.** Sleeve never enters the `card.played` payload; the
   Tabletop bakes it **from seat memory** at mint (`cardArrival.ts`:
   `sleeveColor: playerArea.sleeveColor ?? null`). The contract work landed too:
   `contracts/payloads/seat.joined.v1.json` now exists, carrying optional
   `cardBackImageUrl` and `sleeveColor` (six-hex pattern) with the wins-over rule in its
   descriptions — converged with the deck-name field as predicted.
4. **Rendering — built, with the appearance choices now made** (design KB commit
   `085262d`; `/design` mock `design-sleeve-specimen`). `MtgCardShapeUtil.component()` has
   **three branches** honoring the two independent axes:
   - **sleeved + faceDown** → the bare sleeve rectangle (flat solid hex, no border/sheen);
     identity and both URLs stay in `props` — concealment depicted, not enforced.
   - **sleeved** (either `face`; image picked per `face` with the `?? frontImageUrl`
     fallback preserved) → the face image centered inside the sleeve frame. Geometry is
     **proportional to the shape's own width** (cards are aspect-locked resizable):
     corner radius `w * 0.05`, padding `w * 0.03`.
   - **unsleeved** → today's bare `<img className="tl-image">`. An unsleeved `faceDown`
     card *should* show the standard Magic back — **deferred to tabletop-physics ticket
     06** (the flip/turn-over gesture; nothing sets `faceDown` yet), marked by a code
     comment on that branch. That branch is ticket 06's obligation.
5. **The library pile followed** (the second consumer of the card back): `mtg-zone` props
   gained `sleeveColor: string | null`, set only on a sleeved seat's library zone
   (`tableFurniture.ts` `zoneShape`, opacity 1 when sleeved vs the usual 0.5).
   `MtgZoneShapeUtil` renders the pile as the bare sleeve rectangle inset
   `LIBRARY_PILE_INSET = 12` — a constant moved into `src/shared/mtgZoneShape.ts` so the
   server (card-back image geometry) and client (sleeve geometry) share it. Unsleeved
   seats keep the card-back image at the same inset.

**Implementation gotcha found live** (fix commit `bfdc877`): tldraw's `.tl-image` class is
`position: absolute; inset: 0` — it anchors to `.tl-image-container` and **escapes a padded
sleeve wrapper entirely**, hiding the sleeve ring on a face-up card. The sleeved branch
therefore styles its `<img>` directly (`display: block; width/height: 100%`) instead of
using `className="tl-image"`. Recorded as a tldraw limit in the design owner's KB too.

Two standing notes, both held: **sleeve data stays out of `backImageUrl`** — `sleeveColor`
is its own prop on `mtg-card` (`T.string.nullable()`, default `null`, mirroring
`backImageUrl`), and `backImageUrl: null` ⇔ "no printed back exists" is untouched. Redeploy
fragility (seat memory wiped → later cards arrive sleeveless) is accepted, same class as
playmat and deck name. Jess's stated future, not v1: a sleeve may someday carry an image
URL and two colors (front border vs back). Tests: `seatJoined.test.ts` (sleeve stored,
wins over card back, bad hex 400) and `cardArrival.test.ts` (sleeveColor baked at mint,
null for an unsleeved seat).

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

## Resolved: ticket 06 — flip gesture and face authority (2026-08-08, `575416b`)

Ticket 12 built the structural foundation — both image URLs and `face` live on the shape —
and ticket 06 (`.scratch/tabletop-physics/issues/06-two-faces-and-face-down.md` § Answer)
then decided the two questions this section used to carry as open. **Decisions only —
nothing writes `props.face` or `props.faceDown` yet**, and ticket 13 (zone ownership
boundary) is still open. Table-layout ticket 17 (2026-08-08) built the *sleeved* face-down
**rendering** (the bare sleeve rectangle branch in `MtgCardShapeUtil.component()`, sleeve
baked into props at mint) — so whoever builds the gesture inherits one extra obligation
beyond the decisions below: the **unsleeved** face-down rendering (standard Magic card
back), deliberately not built yet; a code comment on the unsleeved branch marks it. The
four decisions, all binding on whoever builds flip:

1. **Trigger: two separate context-menu items** — "Flip" and "Turn face down" in tldraw's
   right-click/long-press context menu (the surface furniture Lock/Unlock already uses).
   Not a hover affordance, not a modifier-click, not one combined "turn over." Each item
   shown/enabled from the card's own state: no "Flip" entry when `backImageUrl` is null
   (`face:'back'` unreachable). Menu *placement/curation* is map 4's business.
2. **`currentFace` authority: divergence accepted — flip-on-table is table-local.** The
   Shuffler keeps trusting its own `currentFace`; a table-flipped Table-zone card later
   discarded may show its pre-flip face on the Shuffler's screen/clipboard. Known, chosen
   knowingly. Deciding fact (supplied by this owner): there is no inbound event path into
   `GameState` today — "table authoritative" meant building the Shuffler's first inbound
   listener plus a `card.flipped`-shaped event. **Confirmed on the wire by
   cards-come-and-go ticket 02** (2026-08-08, `7b7f868`): `card.returned.v1` carries no
   `face` and no `faceDown` — Jess: "cards removed from play no longer have a face up."
3. **`faceDown` renders as a plain image swap** — the card-back/sleeve rendering, no
   border/dimming/badge (confirmed with `shuffler-looks-like-itself`: no concealment
   idiom exists anywhere in the fleet).
4. **Leaving the table resets both axes**: a card returning to hand or library goes back
   to `face:'front'`, `faceDown:false`, however it sat on the table. Matches the
   Shuffler's `mulligan()` reset. The reset is performed **table-locally** (mechanism =
   implementation detail); the return event says nothing about faces, and the Shuffler
   applies its own face rules on arrival.

Consequence of decision 2 for the old closing note here: there is **no** `card.flipped`
event toward the Shuffler — that design was considered and declined with the authority
question. If a table-flip event is ever minted for the *Spine's* log, it must still say
**which axis** moved (transform of `face` vs change of `faceDown`) — that rule stands. Do
NOT bake "front-ness" into shape identity.

## Watch points

- Any new Tabletop rendering path for cards must honor the payload's `face` — never
  assume front.
- Dedup is on `instanceId` (the card exists once on the table), NOT on
  scryfallId+face — two Forests are two instances; one MDFC flipped is still one
  instance. **Since ticket 12, `instanceAlreadyOnTable` reads `props.instanceId`**
  (was `meta.instanceId` when identity lived in `meta`) — if a future change moves
  identity again, this dedup check has to move with it. The coming **removal handlers**
  (`card.returned` shuffler-initiated, `undo.card.played`, `undo.card.discarded` — all
  poof the shape, attachments stay detached) will likewise look cards up by
  `props.instanceId`, per cards-come-and-go ticket 02.
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
