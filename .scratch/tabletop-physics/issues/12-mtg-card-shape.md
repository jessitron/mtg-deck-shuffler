# 12 — Replace card with the `mtg-card` custom shape

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: done

**What to build:** Today a card is `MtgCardImageShapeUtil extends ImageShapeUtil`, sharing one
util with furniture and stray dropped images. Replace it with a genuine custom shape type,
`mtg-card` extending `BaseBoxShapeUtil`, that renders its own `<img>` and carries validated
`props`:

```ts
'mtg-card': {
  w, h,
  instanceId: string,
  scryfallId: string,
  cardName: string,
  frontImageUrl: string,
  backImageUrl: string | null,
  face: 'front' | 'back',
  faceDown: boolean,
  tapped: boolean,
}
```

`meta` is empty; there's no `zone` field (zone membership stays out of card props — see ticket
13). Drop the per-instance tldraw image asset that `cardArrival.ts` mints today — the card
renders its own URLs, so flip becomes a pure prop write later.

Tap is `props.tapped`, never read back out of a rotation angle — remove `UNTAPPED_EPSILON`
entirely. The visual stays tldraw's own `rotation`, written as a **delta**: tap adds +90°
clockwise relative to the card's current angle, untap subtracts 90°, using the existing
centre-preserving `Vec.Add`/`Vec.Rot` math (no `baseRotation` prop). Resize stays available,
aspect-ratio locked (`isAspectRatioLocked = () => true`); free rotation composes on top of the
tap delta independently. Crop disappears for free once the card stops subclassing `ImageShapeUtil`.

Update the arrival payload: `imageUrl` is replaced by `frontImageUrl` + `backImageUrl: string |
null`, sent from the Shuffler (not derived client-side — constructed Scryfall back-image URLs
404 for freshly-released cards). `buildCardPlayedEvent` in
`apps/shuffler/src/port-tabletop/types.ts` must derive `backImageUrl` from `card.twoFaced`, not
from whether `card.backImageUris` happens to be populated. The contract (`card.played.v1.json`)
is unaffected — these are scaffolding fields, not contract.

Register `mtg-card` in all three required places in the same change: `TablePage.tsx`'s `useSync`
`shapeUtils`, `<Tldraw shapeUtils={...}>`, and `rooms.ts`'s `TLSocketRoom` schema
(`createTLSchema({ shapes: { ...defaultShapeSchemas, 'mtg-card': {...} } })`). Missing any one of
these either silently fails to fix the client store schema or disconnects any client that pushes
a card.

**Blocked by:** None — can start immediately

- [x] `mtg-card` is a genuine `BaseBoxShapeUtil` subclass with the props above, `meta` empty
- [x] Tap toggles `props.tapped` and applies a ±90° rotation delta; resizing or free-rotating a
      tapped card no longer flips its apparent tapped state
- [x] Resize (aspect-ratio locked) and free rotation both still work; crop is gone
- [x] Card arrival sends `frontImageUrl` + `backImageUrl: string | null` instead of `imageUrl`,
      with `backImageUrl` derived from `card.twoFaced`
- [x] No per-instance tldraw image asset is minted for cards
- [x] `mtg-card` is registered in `useSync`, `<Tldraw shapeUtils>`, and the server's
      `createTLSchema` in the same change
- [x] Existing zone-entry and drag-identity Playwright specs pass against the new shape

## Comments

> *Implemented 2026-08-08.*

**Shape:** `apps/tabletop/src/shared/mtgCardShape.ts` defines `MtgCardShapeProps` and
registers `'mtg-card'` into tldraw's own `TLShape` union via `declare module
"@tldraw/tlschema" { interface TLGlobalShapePropsMap { ... } }` — the documented mechanism,
otherwise `BaseBoxShapeUtil<MtgCardShape>`'s generic constraint won't typecheck.
`apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` replaces the deleted
`MtgCardImageShapeUtil.tsx`. The old `meta.instanceId`/`meta.scryfallId`/`meta.cardName`
guard at the top of `onClick`/`onTranslateEnd` is gone — `mtg-card` no longer shares its type
with furniture/stray drops, so every instance is a real card. `meta` is empty at arrival and
still carries only `zone` post-hoc (ticket 13's job to move that into `mtg-zone` props).

**Two registration gotchas found the hard way:**
- `useSync`'s schema-building does **not** fold in tldraw's default shapes the way `<Tldraw>`
  does — passing `shapeUtils: [MtgCardShapeUtil]` alone would silently drop geo/image/text
  validation from the client store, breaking furniture. Fixed by passing
  `[...defaultShapeUtils, MtgCardShapeUtil]` to both `useSync` and `<Tldraw>`. Same shape on
  the server: `createTLSchema({shapes: {...defaultShapeSchemas, 'mtg-card': {...}}})`.
- `.tl-html-container` (tldraw's `HTMLContainer`) is `pointer-events: none` by default, an
  inherited CSS property — a bare `<img>` inside it is unclickable. Fixed by wrapping in
  tldraw's own `.tl-image-container`/`.tl-image` classes (same as stock image/video shapes),
  which re-enable `pointer-events: all`. Found this because every click-based Playwright spec
  timed out with "tl-background intercepts pointer events" until fixed.

**Cross-ship:** `card.played`'s `imageUrl` → `frontImageUrl`/`backImageUrl` required a
matching change in `apps/shuffler/src/port-tabletop/types.ts` (`buildCardPlayedEvent`,
`backImageUrl` derived from `card.twoFaced`, never `backImageUris` presence) — the ticket
names this file directly, so it's not a surprise reach-across, but flagging per both ships'
"stay in this ship" rule since it's a genuine two-ship change.

**Verified:** `npx vitest run` (35/35, tabletop), `npx jest` (287/287, shuffler), `tsc
--noEmit` clean on both ships' tsconfigs, and `./verify.sh`'s
`verify-zone-entry.spec.ts`/`verify-drag-identity.spec.ts`/`verify-card-rotate.spec.ts`/
`verify-card-arrival.spec.ts` all pass against the new shape. `verify-seat-joined.spec.ts`
(pre-existing off-by-one: expects 4 geo shapes, gets 5 — the library outline geo box was
never counted) and `verify-card-drag-identity.spec.ts` (a superseded duplicate of
`verify-drag-identity.spec.ts`, times out on a stock zoom-% button unrelated to card
rendering) both fail for reasons untouched by this change — confirmed by reading
`tableFurniture.ts`/the zoom-button flow, neither of which this ticket modifies.

**Owners consulted:** `tabletop-shape-mechanics` (-context, -review, -update — clean, KB
updated with the two new gotchas above) and `two-faced-cards` (-context, -review, -update —
clean, confirmed the `twoFaced`-not-`backImageUris` derivation rule).
