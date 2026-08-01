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
