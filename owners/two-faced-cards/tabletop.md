# Two-Faced Cards — Tabletop component

The Tabletop (`apps/tabletop/`) renders cards it is told about; it never interprets
them. Its whole face knowledge in v0:

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
  shape's image swaps but its `meta` identity does not change.

## Rotation has a custom ShapeUtil now (JES-144, 2026-08-01)

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

**Watch point:** `onClick` is now spoken for by rotate. The future flip gesture
(below) needs a different trigger — a context-menu action, per the menu-curation
scoping now carried by `no-doubleclick-crop` in the repo-root `TODO.md` — not
`onClick`.

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

## Still open — do NOT record as decided

Ticket 02 (`.scratch/tabletop-physics/issues/02-what-a-card-is.md`, map
`.scratch/tabletop-physics/map.md`) is still deciding:

- Whether these two axes live in the shape's `props` (schema'd, validated, migratable) or
  `meta` (freeform).
- Whether the card renders its own image (so it can pick a face client-side) — which
  implies **both** image URLs crossing the wire, a contract-shaped change.
- How a genuinely concealed card avoids **leaking its identity through synced tldraw
  props** — every client gets the whole shape record, so a face-down card whose record
  carries `scryfallId` or a face image URL is concealed only in the rendering, not in the
  data. This is the same class of problem as `gameCardIndex` being a decodable secret
  (see [contract.md](contract.md)).

**Decided so far in ticket 02:** the card **will** become a genuine custom tldraw shape
type (`mtg-card`-ish) rather than continuing to extend `ImageShapeUtil`. Syncing a custom
type is a mandatory three-place change and `TLSocketRoom` *disconnects* a client that
pushes an unknown type — see `.scratch/tabletop-physics/research/tldraw-custom-shapes.md`.

## Future: the flip gesture (Mountain 2)

When flip lands it rides on the custom shape type ticket 02 has now chosen (superseding
this file's earlier "reuse `MtgCardImageShapeUtil`" advice — the util is being replaced,
not extended), and via a context-menu action, not `onClick` (that's rotate's). Flipping on
the table becomes a physical event the Spine can hear (`card.flipped` or similar) — and it
must say **which axis** moved: a transform to the other printed `face`, or a change of
concealment (face-down). See "the two ships mean different things by flip" above.

Do NOT bake "front-ness" into shape identity. And do not assume the back image URL is
derivable from `scryfallId`: bare constructed Scryfall URLs 404 for freshly-released cards
(that's the whole reason `backImageUris` is stored on `CardDefinition` — see
[interactions.md](interactions.md)). If the Tabletop needs the other face, the URL has to
be **sent**, which is a contract change, not a client-side derivation.

## Watch points

- Any new Tabletop rendering path for cards must honor the payload's `face` — never
  assume front.
- Dedup is on `instanceId` (the card exists once on the table), NOT on
  scryfallId+face — two Forests are two instances; one MDFC flipped is still one
  instance.
