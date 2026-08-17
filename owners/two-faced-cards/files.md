# Two-Faced Cards Files

_All paths below are relative to `apps/shuffler/` — e.g. `src/app.ts` is `apps/shuffler/src/app.ts`._

## Core Types

| File | Role |
|---|---|
| `src/types.ts` | `CardDefinition` with `twoFaced` flag, `cardTypes` (union of all faces' types), and optional `imageUris`/`backImageUris` (`CardImageUris`); no `CardFace`/`backFace` |
| `src/types.ts` | `getCardImageUrl(card, format, face)` — prefers stored URL; `constructCardImageUrl(scryfallId, format, face)` — fallback construction |
| `src/port-persist-state/types.ts:72-78` | `GameCard` with `currentFace: "front" \| "back"` |
| `src/port-persist-state/persisted-types.ts:24-30` | `PersistedGameCard` with `currentFace` |

## State Mutation

| File | Role |
|---|---|
| `src/GameState.ts:593-611` | `flipCard()` — toggles `currentFace`, validates card is two-faced |
| `src/GameState.ts:100` | `newGame()` sets `currentFace: "front"` for all cards |
| `src/GameState.ts:147-186` | v3→v4 migration defaults `currentFace` to `"front"` |

## Routes (in `src/app.ts`)

| Route | Lines (approx) | Role |
|---|---|---|
| `POST /flip-card/:gameId/:gameCardIndex` | ~1234-1261 | Inline flip — returns `formatFlippingContainer()` |
| `POST /flip-card-modal/:gameId/:gameCardIndex` | ~1264-1377 | Modal flip — returns full card modal with navigation |
| `GET /card-modal/:gameId/:cardIndex` | ~580-696 | Card modal — shows flip button if `twoFaced` |
| `GET /prep-card-modal/:prepId/:cardIndex` | ~698-804 | Prep card modal — flip via `?face=` query param |
| `GET /prep-flip-card/:prepId/:cardIndex` | ~886-919 | Prep inline flip (commander on the prepare screen) — stateless, `?face=` query param, returns the whole card container via `renderCommanderCard()` so its modal URL carries the face |
| `GET /library-modal/:gameId` | ~500-542 | Game library modal — maps `cardTypes` (already unioned) |
| `GET /prep-library-modal/:prepId` | ~807-845 | Prep library modal — maps `cardTypes` (already unioned) |

## View Rendering

| File | Role |
|---|---|
| `src/view/common/shared-components.ts` | `FlipRequest` type — `{page:"game"; gameId; expectedVersion?}` \| `{page:"prep"; prepId}` |
| `src/view/common/shared-components.ts` | `formatCardContainer()` — branches on `twoFaced`; optional `flipRequest` (defaults to game) |
| `src/view/common/shared-components.ts` | `formatFlippingContainer(gameCard, flipRequest)` — builds 3D flip HTML structure and the flip button per `flipRequest` (including its swap target: flip container in game, whole card container in prep) |
| `src/view/common/prep-view-helpers.ts` | `renderPrepCommanderCard()` — passes `flipRequest: {page:"prep", prepId}` and rewrites `/card-modal/` → `/prep-card-modal/` |
| `views/partials/card-modal.ejs` | Card modal template — receives `currentFace`, renders flip button, and emits it as `data-current-face` on `.card-modal-overlay` (added 2026-08-07, the strong face observable for tests) |

## Styling

| File | Role |
|---|---|
| `public/game.css:104-143` | Flip animation CSS for game page |
| `public/prepare.css:221-276` | Flip animation CSS and button styling for prep page |
| `public/playmat.css:463` | `.modal-action-button.flip-button` styling in card modal |

## Image Fetch (Ingestion)

| File | Role |
|---|---|
| `src/scryfall-http.ts` | **One door for every outbound Scryfall request.** `SCRYFALL_USER_AGENT` + `fetchScryfall(url, init?, fetchFn?)`. Node's default `User-Agent: node` gets a 400 from Scryfall's Cloudflare front end (API *and* image CDN), so never use bare `fetch` for Scryfall. Used by `/proxy-image`, `ScryfallCardImagesGateway`, and `scryfallSetNames` |
| `src/port-card-images/types.ts` | `CardImagesPort`, `FetchedCardImages` (`{front, back?}`) |
| `src/port-card-images/ScryfallCardImagesGateway.ts` | Batches `POST /cards/collection`; pure `mapScryfallCardToImages` reads `card_faces[0/1].image_uris` for DFCs, top-level `image_uris` for single-faced |
| `src/port-card-images/FakeCardImagesGateway.ts` | Test fake (synthesizes/seeds image URLs) |
| `src/port-card-images/enrichDeckWithImages.ts` | Attaches `imageUris` to all cards, `backImageUris` only to `twoFaced` cards |

## Deck Adapters (Ingestion)

| File | Role |
|---|---|
| `src/port-deck-retrieval/twoFacedLayouts.ts` | **Shared source of truth**: `DOUBLE_SIDED_LAYOUTS` + `isDoubleSidedLayout()`. Distinguishes real two-faced layouts from single-image multi-face layouts (split/adventure/prepare/...) |
| `src/port-deck-retrieval/archidektAdapter/ArchidektDeckToDeckAdapter.ts` | Optional injected `imagesPort`; enriches deck with Scryfall images in `retrieveDeck` (best-effort) |
| `src/port-deck-retrieval/archidektAdapter/ArchidektDeckToDeckAdapter.ts:84-110` | `twoFaced = faces.length===2 && isDoubleSidedLayout(layout)`; `cardTypes` = union of all faces' types |
| `src/port-deck-retrieval/archidektAdapter/archidektTypes.ts` | `ArchidektCard.oracleCard.layout?: string` (read for classification) |
| `src/port-deck-retrieval/mtgjsonAdapter/MtgjsonDeckAdapter.ts:66-100` | `twoFaced = isDoubleSidedLayout(layout)` (shared helper); `cardTypes` = union of card + `otherFaceIds` faces' types |
| `src/port-deck-retrieval/mtgjsonAdapter/mtgjsonTypes.ts:16` | `side` field used to identify back face ("b") |
| `src/scripts/inspect-archidekt-card.ts` | Diagnostic: dumps raw Archidekt `oracleCard` (layout, faces) — `npm run card:inspect -- <deckId> <nameSubstring>` |

## Persistence

| File | Role |
|---|---|
| `src/port-card-repository/SqliteCardRepositoryAdapter.ts` | Stores `card_types`/`image_uris`/`back_image_uris` as JSON, `two_faced` as integer; rebuilds the cache table on old schema, adds image columns via `ALTER TABLE` |
| `src/port-card-repository/hydration.ts:80-123` | Hydrates/dehydrates `currentFace` (and `cardInstanceId`) between GameCard and PersistedGameCard |
| `src/port-tabletop/types.ts` | `buildCardPlayedEvent` — the ONE place a GameCard becomes a card.played payload; sends `face: currentFace` (which face is up on arrival) + `frontImageUrl: string` + `backImageUrl: string \| null` (derived from `card.twoFaced`, landed ticket 12, 2026-08-08) + `owner: string` + `isCommander: boolean` (table-layout ticket 18, 2026-08-09) + `gameCardIndex: number` (required TS field, populated from `gameCard.gameCardIndex`, `let-gamecardindex-out`, 2026-08-10). Since cards-come-and-go ticket 05 (2026-08-09) all of these are real, validated properties on `contracts/payloads/card.played.v1.json`, not off-schema scaffolding |
| `contracts/payloads/card.played.v1.json` | Payload schema, amended in place at ticket 05 (2026-08-09): dropped the unused `seat: integer` field; `frontImageUrl`/`backImageUrl`/`cardName` are now `required` schema properties (`backImageUrl` typed `["string","null"]`, required, never omitted), alongside `owner`/`isCommander` (ticket 18). **`let-gamecardindex-out` (2026-08-10)** added optional top-level `gameCardIndex: integer` (a sibling of `card`, not nested in it). **`owner.minLength` fixed 8→1 (2026-08-16)** — was a stale short-GUID assumption; the real value is a bare 1-char seat number. See [contract.md](contract.md) |
| `contracts/payloads/seat.joined.v1.json` | Payload schema: each commander requires `card`/`cardName`/`frontImageUrl`/`backImageUrl`; `backImageUrl` is present as string or null and commanders remain faceless. Ticket 02's Spine join added optional URI `gameUrl`. **`let-gamecardindex-out` (2026-08-10)** added optional top-level `gameCardIndex: integer` for symmetry with `card.played` — nothing populates it |
| `apps/tabletop/src/server/contractValidation.ts` | New at ticket 05 (2026-08-09): `validateIncomingEvent()` — loads `contracts/envelope.v1.json` and every known `payloads/*.v*.json` at module load, compiles them with `Ajv2020`+`ajv-formats`, and validates a whole posted request body (envelope + nested payload) in one call. Replaces the hand-rolled JES-128 `if`-chain `validationError` that used to live in `cardArrival.ts`/`seatJoined.ts` |
| `src/port-spine/types.ts:~12` | `cardBackImageUrl()` — the standard Magic card back as an absolute URL, sent in the Spine join request's seat decoration; also consumed by the Tabletop's library furniture image. Per table-layout ticket 11 (decided 2026-08-08, not built): becomes optional when a seat has a `sleeveColor`; its "until sleeve selection exists" comment should point at that ticket when implemented |
| `src/port-spine/types.ts` | **Moved here from `port-tabletop/types.ts` (spine-in-the-middle ticket 03, 2026-08-16), logic unchanged.** `SeatJoinedCommander` + `buildSeatJoinedCommander()` — maps a commander `GameCard` to the `seat.joined` commander entry (`card`+`cardName`+`frontImageUrl`+`backImageUrl`, no `face`; same `card.twoFaced`-derived `backImageUrl`, same `getCardImageUrl` calls). `SeatJoinedPayload` also moved here (gained an optional `gameUrl` field) and its builder was **renamed** `buildSeatJoinedEvent` → `buildSeatJoinedPayload` — it no longer builds an `EventEnvelope`; it now returns a flat decoration payload (`deckName`, `playmatImageUrl?`, `cardBackImageUrl?`, `sleeveColor?`, `primaryColor?`, `secondaryColor?`, `commanders?`, `gameUrl?`) that the Shuffler POSTs to the Spine's `/join`, which mints the `seat.joined` envelope server-side. `SpineJoinRequest extends SeatJoinedPayload` (adds `gameId`/`name`/`playerName`) is the actual `/join` request body |
| `src/port-tabletop/types.ts` | **Ticket 03**: `TabletopPort` now declares only `sendCardToTable` — `sendSeatJoined` was deleted, along with `SeatJoinedEvent` and `SEAT_JOINED_EVENT_NAME` (seat.joined no longer travels Shuffler→Tabletop directly; the Spine's `/join` notifies the Tabletop itself). `CardPlayedPayload`/`buildCardPlayedEvent` (this owner's other sender site) are unaffected — still here, still unchanged |
| `src/port-tabletop/sendToTable.ts` | `sendCardToTableFirst` (send-then-commit) + `zoneHintForPlay` (reads `cardTypes` for land vs nonland) |
| `src/port-tabletop/HttpTabletopGateway.ts`, `FakeTabletopGateway.ts` | Real/fake gateways behind `TabletopPort` — **ticket 03**: both lost their `sendSeatJoined` method along with the interface |
| `src/port-spine/sendToSpine.ts` | `joinSpineBestEffort()` calls `buildSeatJoinedPayload()` and POSTs the result (plus identity) to the Spine's `/join` as a `SpineJoinRequest`; `sendCardPlayedToSpineBestEffort()` sets `owner: String(game.spineSeatNumber)` — a bare seat number ("1"-"4"), the thing `card.played.v1.json`'s `owner.minLength` was mismatched against until 2026-08-16 |
| `test/port-spine/contractValidation.ts` | **New (2026-08-16).** `assertValidatesAsSpineEvent(event)` — ajv-based validator loading the committed `contracts/envelope.v1.json` + `contracts/payloads/card.played.v1.json`, mirroring `apps/tabletop/src/server/contractValidation.ts`'s pattern. The Shuffler's first contract-conformance check on an *outbound* event |
| `test/port-spine/cardPlayedContract.test.ts` | **New (2026-08-16).** Builds real `card.played` events (directly via `buildCardPlayedEvent` with a realistic short numeric seatId, and end-to-end via `sendCardPlayedToSpineBestEffort` + `FakeSpineGateway` after a real `joinSpineBestEffort`) and validates both against the schemas. Regression guard for the `owner.minLength` bug — see [contract.md](contract.md) |

## Spine Rich Join (repo-root paths)

| File | Role |
|---|---|
| `services/spine/app.rb` | `POST /join` extracts the submitted decoration and maps contract violations to 422 before delivery |
| `services/spine/models/table.rb` | Validates draft `seat.taken`/`seat.joined` envelopes before writes, persists decoration unchanged, and returns the original persisted join on `gameId` replay |
| `services/spine/models/event.rb` | Reconstructs the persisted envelope, including canonical `{seatId, playerName}` initiator, without rebuilding payload fields |
| `services/spine/lib/tabletop_notifier.rb` | Forwards the persisted `seat.joined` after commit; adapts only `tableId` and transient trace context |
| `services/spine/views/admin/tables/show.html.erb` | Displays the persisted event payload in the admin log |

## Tests

| File | Role |
|---|---|
| `test/GameState.test.ts` | `flipCard` tests: flip two-faced card, error on non-existent, error on single-faced |
| `test/generators.ts` | `cardDefinition` generator (`cardTypes` + boolean `twoFaced`); `nicolBolas` fixture is two-faced with `cardTypes` `[Legendary, Creature, Planeswalker]` |
| `test/generators.ts:342-360` | `nicolBolas` fixture — ready-made two-faced card |
| `test/port-deck-retrieval/archidekt-deck-adapter.test.ts` | Two-faced card extraction tests |
| `test/port-deck-retrieval/mtgjson-deck-adapter.test.ts` | Two-faced card extraction tests |
| `test/port-card-repository/InMemoryCardRepositoryAdapter.test.ts` | Persistence round-trip tests |
| `test/port-card-repository/SqliteCardRepositoryAdapter.test.ts` | Persistence round-trip tests |
| `test/verification/verify-library-grouping.spec.ts` | E2E: flip preserves group-scoped navigation (game + prep). Both flip loops now assert `data-current-face` on `.card-modal-overlay` actually changed to `"back"`, in addition to the unchanged-position-indicator assertion under test — a swallowed click now fails instead of passing silently. See interactions.md watch point 16 |
| `test/verification/verify-prep-commander-flip.spec.ts` | E2E: inline flip of a two-faced commander on the prepare screen (JES-90 regression guard). The good pattern: asserts `.card-flipped` plus the back-face image, so a swallowed click fails |
| `test/scryfallHttp.test.ts` | `fetchScryfall` sends our User-Agent, not Node's default; preserves caller headers (fake fetch, no network) |
| `test/verification/verify-proxy-image.sh` | Live-CDN check that `/proxy-image` returns real image bytes for **front and back** faces (Archangel Avacyn `485211cd…` is the two-faced case). A shell script, not jest, because it needs network — a unit test can prove we *send* a UA, not that Scryfall *accepts* it |
| `test/port-tabletop/cardPlayedEvent.test.ts` | F0: payload sends the CURRENT face + `frontImageUrl`/`backImageUrl` (ticket 12, 2026-08-08 — was a single face-specific `imageUrl`); asserts `backImageUrl` null for non-twoFaced, populated for twoFaced (including when `backImageUris` is unset, proving derivation from `twoFaced` not stored-URI presence); never leaks gameCardIndex |
| `test/port-tabletop/gateways.test.ts`, `sendToTable.test.ts` | Gateways record/fail; send-then-commit sending half. **Ticket 03 (2026-08-16)**: the commander-building coverage that used to live here (`"buildSeatJoinedEvent commanders"`) moved to `test/port-spine/sendToSpine.test.ts` (below), adapted to assert on `FakeSpineGateway`'s recorded join request instead of a Tabletop-bound event. `gateways.test.ts` gained a one-line regression guard instead: `HttpTabletopGateway.prototype.sendSeatJoined` is `undefined` |
| `test/port-spine/sendToSpine.test.ts` | **Ticket 03**: `joinSpineBestEffort` tests, including the commander-building case moved from `gateways.test.ts` — "carries 0-2 commanders as `{card:{scryfallId,instanceId}}` plus scaffolding `cardName`/`frontImageUrl`/`backImageUrl`", asserting on `fake.joinRequests[0].commanders` (0/2 commanders, `backImageUrl` null for non-twoFaced, populated for twoFaced) — same convention `cardPlayedEvent.test.ts` established, now against the Spine's `/join` request instead of a direct Tabletop `seat.joined` send |
| `test/GameState-cardInstanceId.test.ts` | Instance ids: minted in newGame, mint-on-load durable across saves |
| `apps/tabletop/test/verification/verify-drag-identity.spec.ts`, `verify-card-drag-identity.spec.ts` | E2E: drags two non-overlapping played cards in sequence, asserts the second drag moves only the second card (regression guard for the `959831c` selection-clearing fix, ported forward to `MtgCardShapeUtil` in ticket 12 — not a two-faced-cards feature per se, but the ShapeUtil it guards is tracked here — see tabletop.md) |
| `apps/tabletop/src/client/CardContextMenu.tsx` | **New, physics ticket 17 (2026-08-09).** The Tabletop's first custom tldraw `ContextMenu` (`TableContextMenu`, wired via `TLComponents.ContextMenu` in `TablePage.tsx`). Owns "Flip" (`props.face` swap, gated on `backImageUrl !== null`) and "Turn face down"/"Turn face up" (convergent `props.faceDown` toggle) — the first writers of either field anywhere in the Tabletop. Also hosts Tap/Untap (not this owner's territory — see `tabletop-shape-mechanics`) |
| `apps/tabletop/src/client/shapes/cardTap.ts` | New (ticket 17): `tapPartial` pulled out of `MtgCardShapeUtil.onClick` so the context menu's Tap item can share the same rotation math. Not this owner's territory (card mechanics), but the extraction happened alongside the flip/faceDown work |
| `apps/tabletop/test/cardArrival.test.ts` | Gained ticket-17 cases: `cardBackImageUrl` baked from a sleeved seat → `null`, from an unsleeved seat with a URL → populated, from a seat with no data → `null` default |
| `apps/tabletop/test/verification/verify-flip-face-down.spec.ts` | New (ticket 17): two-client sync of flip AND face-down toggle; "Flip" menu-item gating on `backImageUrl`; unsleeved face-down render shows the table's card back and restores the front image on toggle-back; library-entry resets both axes; a stale-selection regression guard (flipping card A via the menu must not hijack a later drag of card B) |
| `services/spine/test/integration/join_test.rb` | Rich join preservation: order and unknown nested extensions, string/null `backImageUrl`, no synthesized `face`, omitted vs empty commanders, 422 before side effects, and replay of the original payload |
| `services/spine/test/integration/admin_screen_test.rb` | Parses the admin row and proves the full persisted `seat.joined` payload is displayed |

## Fleet-Wide Domain Docs (repo root, not `apps/shuffler/`)

| File | Role |
|---|---|
| `CONTEXT-MAP.md` | New (2026-08-10). Fleet-wide bounded-context index + translations table. Its "Flip / Face-down" entry is the authoritative fleet-wide copy of the ship-comparison table (sourced from this owner's `tabletop.md`) |
| `notes/GLOSSARY.md` | Gained a "Face-down" entry (2026-08-10) — the two-axis model (face vs. concealment), authoritative source other docs point to instead of re-explaining inline |

## Test Data

| File | Role |
|---|---|
| `test/decks/` | Local deck files — some contain two-faced cards |
