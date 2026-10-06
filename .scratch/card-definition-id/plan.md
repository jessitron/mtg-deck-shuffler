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

## Contracts: v2, readers accept v1 and v2

Payloads carrying `card.scryfallId`: `card.played`, `card.played-face-down`, `card.discarded`,
`card.returned`, `seat.joined` (commanders). Each gets a `.v2.json` with `cardDefinitionId`
(required, `format: uuid`). Also check `contracts/requests/join.v1.json` / responses.

Per `contracts/README.md`, a version-bumped file replaces the old one — **but** the Spine
replays stored v1 events (SSE `Last-Event-ID` replay in `services/spine/lib/sse_stream.rb`,
join retries re-sending stored `seat.joined` in `services/spine/models/table.rb`). So:

- Readers must still accept v1 and translate `scryfallId` → `cardDefinitionId` at the
  boundary (Tabletop `src/server/contractValidation.ts`, Shuffler
  `src/port-spine/events/incomingEventValidation.ts`). Decide whether the v1 schema files
  stay in `contracts/payloads/` (needed by the Spine's `event_contract.rb`, which validates
  on append by filename, and by readers) — record the decision in `contracts/README.md`.
- The Spine stamps `seat.joined` with a hardcoded `"schemaVersion" => 1`
  (`services/spine/models/table.rb` ~166-182). It must stamp v2 for new joins.
- Writers send v2.

### Deploy safety (two phases)

Each ship is both a writer and a reader, so a single-step switch breaks during a deploy
(new Shuffler sends v2 `card.played` to an old Tabletop; new Tabletop sends v2
`card.returned` to an old Shuffler). Land it as two separately-deployable steps:

1. **Readers accept v1 and v2** (Spine knows v2 schemas; Shuffler & Tabletop validate and
   translate both). Writers still send v1.
2. **Writers send v2** (Shuffler, Tabletop, Spine's `seat.joined` stamp).

Separate commits so Jess can deploy between them.

## Tabletop

- `mtg-card` shape prop `scryfallId` → `cardDefinitionId` (`src/shared/mtgCardShape.ts`,
  `client/shapes/MtgCardShapeUtil.tsx` defaults, `server/tableFurniture.ts`,
  `server/cardArrival.ts`, `server/seatJoined.ts`, `client/shapes/cardSwallow.ts`,
  `server/cardReturned.ts`, `server/sendCardReturned.ts`). Rooms are in-memory; no
  snapshot migration. Server and client ship in the same build.
- Span attributes `card.scryfall_id` → `card.definition_id` (`cardArrival.ts`,
  `cardRemoval.ts`, `cardReturned.ts`, `client/useCardArrivalSpans.ts`).

## Shuffler

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
- New tests: each reader accepts a v1 payload (with `scryfallId`) and a v2 payload, and
  the domain sees `cardDefinitionId` in both cases.
- `grep -rn scryfallId` afterwards hits only the Scryfall/MTGJSON edges, v1 schema files,
  v1 compatibility translation, and history docs.
