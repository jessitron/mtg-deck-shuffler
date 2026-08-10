# Plan — ticket 18: commander arrives with owner and ghost

## Contracts (`contracts/payloads/`)

- `card.played.v1.json`: add required `owner` (string, seatId) and `isCommander` (boolean),
  same way `face` was added — edit v1 in place, no version bump.
- `seat.joined.v1.json`: add optional `commanders`, array (0-2 items) of
  `{ card: { scryfallId, instanceId } }` (required inside each entry, no `face`).

## Shuffler (`apps/shuffler/`)

- `src/port-tabletop/types.ts`
  - `buildCardPlayedEvent`: add `owner: initiator.seatId`, `isCommander: gameCard.isCommander`
    to `CardPlayedEvent` and the builder.
  - `buildSeatJoinedEvent`: convert to an options-object param (already 5 positional args);
    add optional `commanders: GameCard[]` → each mapped to
    `{ card: {scryfallId, instanceId}, cardName, frontImageUrl,
       backImageUrl: card.twoFaced ? getCardImageUrl(card,"normal","back") : null }`
    (off-schema scaffolding fields, same rule as `buildCardPlayedEvent`).
- Call sites (`src/app.ts:562, 680, 1664`): pass `game.listCommanders()` into
  `sendSeatJoinedBestEffort`/`buildSeatJoinedEvent`.
- Tests: extend `test/port-tabletop/cardPlayedEvent.test.ts` (owner/isCommander fields,
  including the twoFaced-derivation case) and `gateways.test.ts`/`sendToTable.test.ts`
  (commanders array shape, backImageUrl derivation, 0/1/2 commander cases).

## Tabletop shared shape (`apps/tabletop/src/shared/mtgCardShape.ts`)

- `MtgCardShapeProps`: add `owner: string`, `isCommander: boolean`.
- `mtgCardShapeProps` T-validator: add `owner: T.string`, `isCommander: T.boolean`.

## Tabletop client (`apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx`)

- `getDefaultProps()`: add `owner: ""`, `isCommander: false`.
- No interactivity changes needed — ghost is `isLocked: true`, which per
  tabletop-shape-mechanics owner fully suppresses click/drag/selection/counter-hosting
  with zero new guard code.

## Tabletop server

- `src/server/cardArrival.ts`: every `store.put({type:"mtg-card", ...})` call supplies
  `owner` (from the arrival payload) and `isCommander` (from the arrival payload) —
  required props, must be set on ordinary land/spell arrivals too (not just commanders),
  else `TLSocketRoom` validation disconnects the client.
- `src/server/cardLayout.ts`: add `commandZoneCardPosition(seatIndex, slot: 0|1, count: 1|2)`
  alongside `landPosition`/`graveyardCardPosition`/`stackCardPosition`. Below the 40px
  label band; 2 commanders side by side (`x`, `x + CARD_W + GAP`); 1 commander centered
  (`x + (COMMAND_ZONE_W - CARD_W)/2`).
- `src/server/seatJoined.ts`: after `ensurePlayerArea(...)` returns `PlayerArea`
  (has `seatIndex`), for each of `payload.commanders` (0-2):
  1. Mint the **ghost** first (so its z-index/IndexKey is lower, real card paints on top):
     `store.put({ id: createShapeId(`ghost-${instanceId}`), type:"mtg-card",
     isLocked:true, opacity:0.3, index: nextIndex(tableName), props:{
     instanceId: `ghost:${instanceId}`, scryfallId, cardName, frontImageUrl,
     backImageUrl, face:"front", faceDown:false, tapped:false,
     sleeveColor: playerArea.sleeveColor, owner: seatId, isCommander:true, w, h }})`
  2. Mint the **real commander card** at `nextIndex(tableName)` (called after the ghost's,
     so it's strictly greater — paints on top), same fields, real `instanceId`,
     position offset by `slot` (0 or 1) if 2 commanders, centered if 1.
  - Both use `commandZoneCardPosition(playerArea.seatIndex, slot, commanders.length)`.
- Dedup: unaffected — this only runs on the first-seating path (before
  `entry.seats.has(seatId)` dedup returns early on reseat), matching how sleeveColor
  etc. are baked once at seating.

## Tests

- `apps/tabletop/test/seatJoined.test.ts`: POST a `seat.joined` with 0/1/2 commanders;
  assert real commander shape has `owner`, `isCommander:true`, correct position,
  `isLocked:false`, `opacity:1`; assert ghost shape exists, `isLocked:true`,
  `opacity:0.3`, distinct `instanceId`, same image/sleeve, correctly under the real
  card in z-order.
- `apps/tabletop/test/cardArrival.test.ts`: existing card.played payloads gain
  `owner`/`isCommander` fields in the test builder; assert they land on the shape.
- `apps/tabletop/test/cardLayout.test.ts`: unit test for `commandZoneCardPosition`
  (1-commander centered, 2-commander side-by-side, both below label band).

## Open implementation choices (ticket leaves to implementer)

- Ghost identity: distinct `instanceId` (`ghost:${instanceId}`) rather than a new
  `isGhost` prop — minimal, ticket only asks for `owner`/`isCommander` as new props,
  and `instanceAlreadyOnTable`'s exact-string dedup check makes the prefix safe.
