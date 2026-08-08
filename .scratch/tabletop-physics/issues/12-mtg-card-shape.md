# 12 — Replace card with the `mtg-card` custom shape

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: ready-for-agent

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

- [ ] `mtg-card` is a genuine `BaseBoxShapeUtil` subclass with the props above, `meta` empty
- [ ] Tap toggles `props.tapped` and applies a ±90° rotation delta; resizing or free-rotating a
      tapped card no longer flips its apparent tapped state
- [ ] Resize (aspect-ratio locked) and free rotation both still work; crop is gone
- [ ] Card arrival sends `frontImageUrl` + `backImageUrl: string | null` instead of `imageUrl`,
      with `backImageUrl` derived from `card.twoFaced`
- [ ] No per-instance tldraw image asset is minted for cards
- [ ] `mtg-card` is registered in `useSync`, `<Tldraw shapeUtils>`, and the server's
      `createTLSchema` in the same change
- [ ] Existing zone-entry and drag-identity Playwright specs pass against the new shape
