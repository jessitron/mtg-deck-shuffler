# Rename `scryfallId` → `cardDefinitionId` fleet-wide

Mountain: overhead
Ship: fleet
Status: ready-for-agent

A card's identity in our domain is a **card definition**, not a Scryfall record. Scryfall is
one source of definitions; Archidekt custom cards will be another (later, separate work).
So the identifier we pass around — in code, persistence, contracts, telemetry — is
`cardDefinitionId`. It stays a UUID. For Scryfall cards its value is the Scryfall UUID,
unchanged.

Out of scope: custom cards, a `cardSource` field. Both come later.

## Naming

- TypeScript / JSON / contracts: `cardDefinitionId`
- SQL columns, span attributes: `card_definition_id` (span: `card.definition_id`, replacing
  `card.scryfall_id`)
- **Keep `scryfallId` at the edges where it really is Scryfall's id**, and translate there:
  - `apps/shuffler/src/port-card-images/*` (images port, keyed by Scryfall id)
  - `apps/shuffler/src/port-card-images/ScryfallCardImagesGateway.ts` (Scryfall API request)
  - `constructCardImageUrl` in `apps/shuffler/src/domain-types.ts` (Scryfall CDN URL) —
    its parameter may stay `scryfallId`; callers pass `card.cardDefinitionId`
  - MTGJSON adapter / types (`identifiers.scryfallId` is MTGJSON's field)
  - Archidekt adapter (`card.uid` → `cardDefinitionId`)
  - `decks/precon-mtgjson-*.json` are **our** `Deck` format, not raw MTGJSON — they get rewritten.

## Persistence: clean break (precedent: "saved in an older, incompatible format… start a new game")

- `PERSISTED_GAME_STATE_VERSION` 11 → 12 (`apps/shuffler/src/port-persist-state/types.ts`)
- `PERSISTED_GAME_PREP_VERSION` 3 → 4 (`apps/shuffler/src/port-persist-prep/types.ts`)
- `PERSISTED_DECK_VERSION` 3 → 4 (`apps/shuffler/src/types.ts`); `PersistedDeck` version too
  if it is separate (`port-persist-state/persisted-types.ts`)
- Rewrite all 198 `apps/shuffler/decks/*.json` mechanically (key + version) with a script;
  don't regenerate from MTGJSON.
- Card repository (`SqliteCardRepositoryAdapter.ts`): column `scryfall_id` →
  `card_definition_id`; extend the existing stale-schema drop-and-recreate check so the old
  table is dropped. It's a cache.
- `PersistedGameCard.scryfallId`, `PersistedDeck.commanderIds/cardIds` semantics unchanged,
  key renamed.
- No read-both shim in Shuffler persistence.

## Contracts: v2, clean break (Jess, 2026-10-06)

Payloads carrying `card.scryfallId`: `card.played`, `card.played-face-down`, `card.discarded`,
`card.returned`, `seat.joined` (commanders). Each `.v1.json` is **replaced** by a `.v2.json`
with `cardDefinitionId` (required, `format: uuid`), per `contracts/README.md`. Copy each v1
file and change only the `card` key: keep `face` required on played/played-face-down/discarded,
`"face": false` on `card.returned.v2`, no `zoneHint`, no `face` on `seat.joined` commanders,
`instanceId` optional on `card.returned`.

- Readers (Tabletop `src/server/contractValidation.ts`, Shuffler
  `src/port-spine/events/incomingEventValidation.ts`) know v2 only. A v1 payload is rejected
  cleanly — a recorded validation failure, not a crash.
- Spine: `event_contract.rb` validates by filename, so v1 appends are rejected as unknown.
  `seat.joined` is stamped `schemaVersion: 2` (`models/table.rb` `prepare_seat`); `seat.taken`
  stays v1.
- `join.v1` request/response don't name the id; the request's description points at
  `seat.joined.v2.json`. No bump.
- Stored v1 events in any Spine database are no longer readable on replay. **No Spine data
  is deleted or migrated** — code only. Note this in `contracts/README.md`.
- One change, no two-phase deploy. A deploy window breaks cross-ship play until all three
  ships are out.

## Tabletop

- Add a tldraw shape-props migration (`createShapePropsMigrationIds("mtg-card",
  { RenameScryfallId: 1 })`, up/down rename) in `src/shared/mtgCardShape.ts`, registered in
  both `rooms.ts` and `MtgCardShapeUtil.migrations`, so tabs open across the deploy get a
  schema mismatch instead of broken records (tabletop-shape-mechanics review).
- `cardRemoval.ts` payload type, `sendCardReturned.ts` `schemaVersion: 2`, the 400 message in
  `cardReturned.ts`.
- `mtg-card` shape prop `scryfallId` → `cardDefinitionId` (`src/shared/mtgCardShape.ts`,
  `client/shapes/MtgCardShapeUtil.tsx` defaults, `server/tableFurniture.ts`,
  `server/cardArrival.ts`, `server/seatJoined.ts`, `client/shapes/cardSwallow.ts`,
  `server/cardReturned.ts`, `server/sendCardReturned.ts`). Rooms are in-memory; no
  snapshot migration. Server and client ship in the same build.
- Span attributes `card.scryfall_id` → `card.definition_id` (`cardArrival.ts`,
  `cardRemoval.ts`, `cardReturned.ts`, `client/useCardArrivalSpans.ts`, and the Shuffler's
  `table-sync/cardReturnedDispatch.ts`). No Honeycomb board/trigger/SLO/query uses the old
  attribute (fleet-is-observable review), so no dual emission.

## Shuffler

- Prep adapters (`SqlitePersistPrepAdapter`, `InMemoryPersistPrepAdapter`) hydrate before
  `app.ts` checks `prep.version`, and `hydrateDeck` overwrites the version. Check the stored
  prep version in the adapter before hydrating, so an old prep gets the "older, incompatible
  format" page instead of a "card not found" throw (two-faced-cards review).
- Card repository stale-schema check must test for `card_definition_id` (the old table has
  `card_types`, so today's check would keep it). Keep `card_types`/`color_identity`.
- Deck rewrite script changes only the id key and the version; count non-empty `cardTypes`
  before and after (library-search review).
- Images port (`port-card-images/*`) is a Scryfall edge: keep `scryfallId` there and
  translate in `enrichDeckWithImages`.
- Spots that assume the id is a Scryfall UUID stay as-is for now: `getCardImageUrl` fallback,
  `/proxy-image` (query param `cardId`, length 36), `game.js` `copyCardImageToClipboard`.

All of `src/` (~85 hits / 22 files): `CardDefinition`, `GameCard` uses, hydration, card
repository, persistence adapters, `port-tabletop/types.ts`, `port-spine/join/*`,
`table-sync/cardReturnedDispatch.ts`, views (`game-modals.ts`,
`revealed-cards-components.ts`), `public/game.js` and `views/` templates, `/proxy-image`
route param. Tests and fixtures.

## Docs

Owners' KBs, `notes/`, ship `CLAUDE.md`s, `contracts/README.md`, `notes/GLOSSARY.md` /
`CONTEXT-MAP.md` if they mention the id.

## Verification

- Fleet suite green: `npm test` from root, `npx vitest run` in each ship, Spine Ruby tests.
- New tests: each reader accepts a v2 payload and rejects a v1 payload cleanly (recorded
  failure, no throw). Spine stamps `seat.joined` v2 and rejects a v1 `card.played` append.
- `grep -rn scryfallId` afterwards hits only the Scryfall/MTGJSON edges and history docs.
