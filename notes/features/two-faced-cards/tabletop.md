# Two-Faced Cards — Tabletop component

The Tabletop (`apps/tabletop/`) renders cards it is told about; it never interprets
them. Its whole face knowledge in v0:

## Arrival renders the played face

- The card-arrival payload (`POST /api/tables/:tableName/cards`, frozen in F0/JES-128)
  carries `face: "front" | "back"` beside `card: { scryfallId, instanceId }`.
- The Shuffler computes the face-specific `imageUrl` (a blessed scaffolding
  convenience) from `currentFace` via `getCardImageUrl(card, "normal", face)` — so
  in v0 the Tabletop just renders `imageUrl` and stores `face` for later. An MDFC
  played on its back face arrives showing its back face.
- The tldraw shape's `meta` is `{ instanceId, scryfallId, cardName }` — identity,
  not face. Face is state; if a future gesture flips the card on the table, the
  shape's image swaps but its `meta` identity does not change.

## Future: the flip gesture (Mountain 2)

When the custom CardShape lands, flipping on the table becomes a physical event the
Spine can hear (`card.flipped` or similar, carrying the new `face`). The back image
URL is derivable from `scryfallId` (or sent along); do NOT bake "front-ness" into
shape identity.

## Watch points

- Any new Tabletop rendering path for cards must honor the payload's `face` — never
  assume front.
- Dedup is on `instanceId` (the card exists once on the table), NOT on
  scryfallId+face — two Forests are two instances; one MDFC flipped is still one
  instance.
