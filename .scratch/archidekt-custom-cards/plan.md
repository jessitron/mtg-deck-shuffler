# Archidekt custom cards — plan

Archidekt's deck API returns `customCards` (same entry shape as `cards`, but `card` holds
`id, frontName, frontTypes, frontImageUrl, hasBack, backName, backTypes, backImageUrl, setCode, ...`).
Fixture: `apps/shuffler/test/decks/14716273.json` (Squid Sword: custom cards, one with a back;
Jess is adding a custom commander).

## Shuffler
1. `src/types.ts`: `CardSource = "scryfall" | "archidekt-custom"`; optional `cardSource?` on
   `CardDefinition` (absent = scryfall, so no version bump per DESIGN-persistence-versioning).
   `cardSourceOf(card)` helper.
2. `src/uuidv5.ts`: hand-rolled UUIDv5 (node:crypto sha1). No new dependency.
   Custom `cardDefinitionId = uuidv5("archidekt-custom:<card.id>", fixed fleet namespace)`.
3. `ArchidektDeckToDeckAdapter`: read `customCards`, same inclusion rules (category, Commander,
   quantity) as `cards`. Scryfall cards get `cardSource: "scryfall"`. Custom: name=frontName,
   oracleCardName=frontName, twoFaced = hasBack && backImageUrl, cardTypes from front/back
   types, colorIdentity from mana costs, set=setCode, imageUris/backImageUris = the Archidekt
   URL under EVERY ImageFormat.
4. `enrichDeckWithImages`: skip custom cards (never sent to Scryfall).
5. `getCardImageUrl`: for a custom card, never build a Scryfall URL; fall back to any stored URL.
6. `SqliteCardRepositoryAdapter`: `card_source` column + ALTER migration, round-trips cardSource.
7. `public/game.js` copyCardImageToClipboard: take cardDefinitionId + face from the server
   instead of parsing the image URL (fixes custom cards and the TODO back-face bug).
8. Gatherer button: hidden for custom cards.
9. Telemetry: `card.source` next to `card.definition_id` (cardReturnedDispatch); outgoing
   payloads carry `card.cardSource`.

## Contracts
10. Optional `cardSource` enum on the `card` object in card.played / -face-down / discarded /
    returned and seat.joined commanders; reword "for a Scryfall card it is the Scryfall id".

## Tabletop (subagent)
11. Every span that sets `card.definition_id` also sets `card.source` (from payload, default
    "scryfall"); client spans read it from shape props → new optional shape prop + migration.
