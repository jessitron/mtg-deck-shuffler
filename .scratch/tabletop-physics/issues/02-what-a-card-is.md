# Decide what a card is

Mountain: tabletop-replaces-mural
Type: grilling
Status: resolved
Blocked by: 01

## Question

The root decision of this map. Today a card is a stock tldraw `image` shape whose behaviour is
overridden by `MtgCardImageShapeUtil extends ImageShapeUtil`, and whose card-ness is a single
`meta.instanceId`. Everything the parity list wants from a card — flip, face-down, counters and
notes that travel with it, tucking behind another card, tap that survives the handles — is
either awkward or impossible on that footing.

Decide:

- **Custom shape type, or keep extending `ImageShapeUtil`?** If custom: what is the type called,
  and does it render the card image itself?
- **What lives in `props`** (schema'd, validated, migratable) **versus `meta`** (freeform)? Today
  `instanceId`, `scryfallId`, `cardName`, and `zone` are all `meta`. Which of those are really
  identity, which are state, and which are cache?
- **What state does a card carry?** Tapped. Face (which side is up). Face-down or not. What
  counters and notes are attached. What it's tucked behind. Is each of these a card prop, or a
  relationship between shapes?
- **Migration and blast radius.** `cardArrival.ts` creates cards, `cardLayout.ts` positions them,
  `MtgCardImageShapeUtil` behaves them, and the zone-entry Playwright test asserts on them. What
  changes, and does anything need to keep working during the change? (Note: nothing is persisted
  today, so there are no old boards to migrate — this is the cheapest this decision will ever be.)
- **The Shuffler's assumption.** Card arrival posts `imageUrl` with the face already baked in
  (`types.ts` calls `getCardImageUrl(..., currentFace)`), and `face` is validated then ignored.
  If a card is going to flip on the table, that assumption has to change or be worked around.
  Consult the `two-faced-cards` owner — this is squarely its territory.

## Answer

Resolved 2026-08-07 by grilling with Jess. Prior input: the
[tldraw custom-shape research](01-tldraw-custom-shape-facts.md) and the `two-faced-cards` owner
(which recorded its own half of this in commit `0337e00`).

### A card is a genuine custom tldraw shape type

Stop extending `ImageShapeUtil`. Declare `mtg-card` extending `BaseBoxShapeUtil` (which supplies
`getGeometry` and `onResize`, cutting the abstract surface to `getDefaultProps`, `component`,
`getIndicatorPath`, plus `static override type = 'mtg-card' as const`). The card **renders its own
image**.

Jess's reasoning for taking the expensive road: *"this is core work, it's the core of this whole
project, and so there is no incentive to shortcut. We want what's expressive and conceptually
correct."*

The decisive technical argument is **not** crop and **not** tap — tap is free either way (`onClick`
is a base hook), and crop is merely annoying. It is **"one util, three meanings"**: because the
subclass keeps `type === 'image'`, a single util instance serves every image shape on the page —
cards, the locked playmat/library furniture, and any JPEG a player drags in — separated only by an
`if (shape.meta.instanceId)` convention. Every future capability override (`canCrop`, `canResize`,
`isAspectRatioLocked`) would have to be conditioned on that `if`, inside methods whose entire
purpose is to answer per-type. A free cleanup falls out of the fix: once our util stops claiming
`'image'`, furniture and stray images go back to stock `ImageShapeUtil`.

Secondary, and real: `DefaultImageToolbar` gates only on `shape.type !== 'image'`, so on a subclass
the crop button appears on every selected card and the aspect-ratio dropdown writes `props.crop`
via `editor.updateShape` **without ever consulting `canCrop`** — i.e. `override canCrop = () =>
false` does not remove the crop surface. Cards also inherit flip-horizontal/vertical menu actions
and `handledAssetTypes = ['image']`, which makes our util the handler for dropped images.

### Face and face-down are two independent axes

Rejected: a single "which side is up" bit that resolves to the printed back face for a two-faced
card and to the generic card back otherwise. It's tempting (every card has another side; one
gesture; no flippability check; no 404s) but it cannot express the case Jess named:

> *"A two-faced card cannot be turned face down, but — here's a complication — it can be_played_
> face down. In our domain model, 'Face Down Card' will be a real thing, and it looks like a card
> back (in the future: a card sleeve) **even if the card itself is two-faced**."*

So:

- **`face: 'front' | 'back'`** — which *printed* side is up. Ranges over sides that **exist**, so
  `'back'` is unreachable when the card has no printed back. Only `transform`, `modal_dfc`,
  `reversible_card`, `double_faced_token` have one (`twoFacedLayouts.ts`); `split`/`adventure`/
  `aftermath`/`flip`/`prepare` have two faces in the source data and **no back image**.
- **`faceDown: boolean`** — concealment, renders the table's card back. Applies to any card,
  composes with `face`.

A turned-over one-faced card is `faceDown: true`, **not** `face: 'back'` — and in game terms that
is a real domain event, not just a picture. The two ships differ deliberately: **a one-faced card
cannot be flipped in the Deck Shuffler, but any card can be turned over on the Tabletop.**

### Face-down is depicted, not enforced

The concealment question — a face-down card's identity is readable by every client, because tldraw
sync broadcasts whole shape records — is **not a problem**, per a principle Jess stated here and
which is now recorded in `notes/DESIGN-the-table-vision.md` § Principles:

> *"I don't mind if people can cheat here. If people wanna cheat, it's their game."* … and,
> sharpened: **"everything that can be done by one player is doable by any player."**

That is symmetry of capability, not publicity: **the Tabletop has no ownership or permission
model.** Consequences taken here, and binding on tickets 05–09: identity stays in `props` on a
face-down card; guarding it would be theatre anyway since any player can simply turn the card over;
"let a player peek at a face-down card" needs no feature; and **never design a gesture around
"only the controller may…"**. A card may record where it came from, but provenance grants no rights.

(Related, decided in the same breath and outside this map: Jess reversed the `gameCardIndex`
boundary guard — *"I don't want you to have to reason about what is hidden and what isn't."*
Buoy `let-gamecardindex-out` in `TODO.md`.)

### `meta` is empty; everything is `props`

Today `instanceId`, `scryfallId`, `cardName` and `zone` all live in `meta`, which means **the
identity of a card is currently unvalidated and unmigratable** — tldraw validates `props` from
`static props` and migrates them, while `meta` is checked only as "is it JSON" and
`createShapePropsMigrationSequence` cannot touch it. The documented criterion is *does the shape's
own rendering or behaviour depend on this?* Once the card renders itself, that's everything.

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
  tapped: boolean,               // ticket 04 owns how this relates to rotation
}
```

Three decisions inside that record:

1. **The generic card back is not a card property.** It's the *table's* — `cardBackImageUrl`
   already arrives on `seat.joined` and is used by the library stack. Rendering resolves `faceDown`
   against the table's back image. Reason: **sleeves are coming**
   (`.scratch/tabletop-table-layout/issues/09-sleeve-and-playmat-picker.md`), and a sleeve belongs
   to a player or a table, not to a card. Bake it per-card and changing your sleeve means rewriting
   every shape on the board.
2. **The card knows nothing about its counters, notes, or what's tucked behind it.** Those are the
   attached thing's business — a passenger knows which card it's parented to; the card doesn't know
   a die is sitting on it, exactly as at a physical table. This keeps the card's props closed
   against tickets 07/08/09, and parenting is free (no custom type, children ride the parent
   transform because page transforms are derived, not written).
3. **No seat, controller, or owner field** — per the symmetry principle above.

`zone` is deliberately **left out rather than placed**: it's debounce state today, and ticket 03 may
turn zone membership into real parenting, at which point storing it on the card is wrong.
Grandfathering `meta.zone` in would decide ticket 03 by accident.

### Drop the per-instance image asset

`cardArrival.ts` currently mints one tldraw image asset per card (`AssetRecordType.createId(
instanceId)`) and the shape points at it via `props.assetId`. Since the card holds its own URLs and
renders its own `<img>`, that indirection goes: **flip becomes a pure shape-prop change** instead of
mutating a shared asset record with awkward undo. Cost: cards stop participating in tldraw's asset
machinery (`inlineAssets` in `TablePage.tsx`), and `toSvg` would need hand-writing if canvas export
is ever wanted.

### The arrival payload unbakes the face

`imageUrl` and `cardName` are **scaffolding, not contract** — `card.played.v1.json` carries only
`card`, `face`, `initiator`, `occurredAt` — so this is two hand-edits and **zero contract churn**.

- **`imageUrl` → `frontImageUrl` + `backImageUrl: string | null`.** Replace, don't keep both; a
  baked-face field left lying around is the bug being removed. The back URL must be **sent, not
  derived** — bare constructed Scryfall URLs 404 for freshly-released cards, which is exactly why
  the Shuffler stores `backImageUris` (commit `eb48f4f`).
- **No `twoFaced` flag**, though the owner suggested one. `backImageUrl !== null` says it precisely,
  `twoFacedLayouts.ts` stays the single decider, and two fields that must agree is a bug waiting to
  happen.
- **`face` stays**, still contract, but its meaning shifts from "which face I baked in" to "which
  face is up on arrival."

Two edit sites: `buildCardPlayedEvent` in `apps/shuffler/src/port-tabletop/types.ts` (keep its
field-by-field comment block in sync — it's the de-facto spec of F0) and the hand-rolled
`validationError` in `apps/tabletop/src/server/cardArrival.ts`.

### Blast radius: nothing has to keep working

Nothing is persisted and a redeploy wipes every room, so there is no old data and **no migration to
write**. This is the cheapest this decision will ever be; the cost is deferred to the day the
Tabletop gains persistence *and* the day two clients on different deploys share a room — the second
bites sooner, and it bites as a disconnect.

**Three changes are mandatory together or it fails at runtime:**

1. `TablePage.tsx:65` — `useSync` must receive `shapeUtils` (it currently does not; `<Tldraw>`
   having them does **not** fix the store schema). Without it the client store rejects the shape
   locally at `Store.put`.
2. `TablePage.tsx:82` — `<Tldraw shapeUtils={...}>`, already done.
3. `rooms.ts:49` — `TLSocketRoom` needs `schema: createTLSchema({ shapes: { ...defaultShapeSchemas,
   'mtg-card': { props, migrations } } })`. Without it **the server disconnects any client that
   pushes a card** (`INVALID_RECORD`) — and it does so on first push, not at connect, which is a
   nasty signature to debug. Note `'mtg-card': {}` is a documented valid server-side minimum.

Also touched: `cardArrival.ts` (shape creation, asset minting), `cardLayout.ts` (positioning — works
off `w`/`h`, should be unaffected), the zone-entry Playwright test (asserts on card shapes), and
`tableFurniture.ts` only insofar as its hand-rolled `as any` shape literals are schema commitments
the compiler won't check — the sync validator will, at runtime, by disconnecting somebody.

**Deploy hazard:** a browser holding an old bundle hits `assert(shapeUtil)` on the first `mtg-card`
it sees, and that assert lives in the shared rendering computation — so it white-screens the entire
canvas, not one shape. Mitigation is "reload after deploy"; since redeploy wipes the room there is
no board to lose.

### Not decided here

The tap/rotation relationship (ticket 04), how the flip gesture is triggered — `onClick` is spoken
for by tap, so flip needs a different trigger (ticket 06) — and whether the Shuffler's own
`currentFace` remains authoritative for Table-zone cards once the table can flip (ticket 06; the
owner flagged that a table-flipped card discarded to the graveyard would show the pre-flip face on
the Shuffler's screen).
