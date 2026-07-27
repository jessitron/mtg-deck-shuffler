# Two-Faced Cards History

## Initial Implementation

- **`f42fb5d`** - Implement flip functionality for two-faced cards (first implementation)
- **`546b20f`** - Implement animation for flip card feature (CSS 3D transforms)
- **`9e03881`** - Fix flip animation to properly show both faces during flip
- **`9ae10ef`** - Carefully get the flip to work (iteration on the animation)
- **`453d7b5`** - Remove 'flipped' from wrapper (cleanup)
- **`3fe7618`** - Approve flip-card changes

## Commander Display

- **`0ea1616`** - Update commander display to show both faces for two-faced commanders
  - Commanders in the command zone now use the flip container

## Event Recording (Added then Removed)

- **`10c1ba9`** - Add FlipCardEvent type and recording for card flips
- **`dbd9929`** - Remove FlipCardEvent recording — card flips no longer generate events
  - **Decision**: Flipping is a UI concern, not a game action. The app tracks card locations, not battlefield state. Recording flip events cluttered the history without adding value.

## Modal Flip Challenges

This was one of the hardest parts. Multiple attempts to make flip work inside the card modal without closing it:

- **`a857fde`** - Fix flip button in modal to not close modal (first attempt)
- **`359a645`** - Revert: Add HTMX event-driven refresh after modal flip
- **`57c0ad8`** - Add HTMX event-driven refresh after modal flip
- **`27b8808`** - Fix flip button in modal closing modal
- **`ffd15a9`** - Revert fix flip button in modal
- **`d87236e`** - Add flip-card-modal endpoint to prevent modal closing on flip
  - **Solution**: A dedicated `/flip-card-modal/` route that re-renders the entire modal HTML. This avoids the HTMX swap target issues that caused the modal to close. The inline `/flip-card/` route swaps just the flip container; the modal route replaces the whole modal.

## Card Data Enrichment

- **`8effcf5`** - Add CardFace type and backFace field to CardDefinition
- **`9d157f1`** - Update SQLite CardRepository to persist/retrieve backFace (JSON column)
- **`26a0ae6`** - Update test generators with CardFace and two-faced card support
- **`20b9149`** - Add two-faced card tests for CardRepository adapters

## Adapter Back-Face Extraction

- **`faa16ee`** - Extract back-face data in Archidekt adapter (uses `faces[1]`)
- **`d87f17e`** - Extract back-face data in MTGJSON adapter (uses `otherFaceIds` + side "b")
- **`3af3b01`** - Error on missing back face, download AllIdentifiers for lookups
  - MTGJSON precon files don't include back-face cards inline. The adapter needs AllIdentifiers.json to look up back faces by UUID.
- **`329baf5`** - Regenerate precon decks with back-face data from AllIdentifiers
- **`5b3e5b5`** - Stream-parse AllIdentifiers.json in precon fetch script
  - AllIdentifiers.json outgrew Node's max string length (~512MB), so `fs.readFile` threw `RangeError: Invalid string length` when building the back-face lookup database. `loadCardDatabase()` now uses a `stream-json` pipeline (`chain` → `parser` → `pick({filter: "data"})` → `streamObject`) to build the UUID→card Map one entry at a time. Resulting Map and back-face resolution are unchanged. Required adding the `stream-json` dependency and switching `tsconfig.json` `moduleResolution` to `"bundler"` (so TS honors stream-json's package `exports` map; runtime emit unchanged).
  - Added 15 new precons (Marvel MSC, Strixhaven SOC, TMNT) via `--convert --skip-existing`, 0 conversion errors.

## Type Merging for Library Search

- **`037dd01`** - Merge back-face types into Library Search type grouping
- **`7c51713`** - Deduplicate merged back-face types in library search grouping

## Bug Fixes

- **`e904a8c`** - Fix being-played animation for two-faced cards by targeting nested flip container images
  - The "being played" animation wasn't reaching the actual `<img>` elements inside the flip container's nested divs.
- **`bea77cf`** - Fix two-faced card copying by adding face support to Play button
- **`7800fb3`** - Fix play button for single-faced cards (regression fix after two-faced changes)
- **`ab05cfb`** - Fix TypeScript errors in flip-card-modal route

## Navigation Integration

- **`9338358`** - Fix prep flip button losing navList, add prep flip E2E test
  - Bug: prep card modal flip button wasn't passing `navList` through in `hx-get` URL
- **`66644e2`** - E2E test: flip two-faced card preserves group-scoped navigation
- **`1ff418a`** - Update library search feature owner docs with navList and flip fixes

## Test Infrastructure

- **`b937ea2`** - Add two-faced card game to seed test data
  - The seed script created a game with "From Cute to Brute" precon (many two-faced cards) for testing
  - The seed script (`src/scripts/seed-test-data.ts`) was later removed because it stopped working

## Layout-Gated Classification (single-image multi-face cards)

- **Restrict Archidekt `twoFaced` to genuinely double-sided layouts**
  - **Bug**: "Studious First-Year // Rampant Growth" (Secrets of Strixhaven, a Prepared card, layout `prepare`) got a flip button in hand but has no back image. Clicking flip requested a nonexistent Scryfall `face=back` image.
  - **Cause**: The Archidekt adapter inferred `twoFaced` from `faces.length === 2`. That's true for split/adventure/aftermath/flip/prepare cards too — single physical cards with two halves printed on one front face.
  - **Fix**: Added `src/port-deck-retrieval/twoFacedLayouts.ts` (`DOUBLE_SIDED_LAYOUTS` + `isDoubleSidedLayout()`) as the shared source of truth. Archidekt now uses `twoFaced = faces.length === 2 && isDoubleSidedLayout(layout)`; MTGJSON switched from its inline array to the shared helper (no behavior change). Front-face data is still pulled from `faces[0]` for any 2-face card (top-level fields for split cards are the combined `"{G} // {1}{G}"` mess with empty text), but `backFace` is built only when `twoFaced`.
  - Added `layout?: string` to `ArchidektCard.oracleCard` (`archidektTypes.ts`).
  - **Decision**: These cards are deliberately single-faced — no flip. (At the time, this also dropped their second part from library grouping. That regression was undone by the next change, which unions all parts' types into `cardTypes` — see below.)
  - Tests: added "does not treat a single-image multi-face card (Prepared) as two-faced" to `archidekt-deck-adapter.test.ts`; added `layout` (`transform`/`modal_dfc`) to the existing Nicol Bolas / Esika fixtures so they still classify as two-faced.
  - Added `npm run card:inspect -- <deckId> <nameSubstring>` (`src/scripts/inspect-archidekt-card.ts`) to dump raw Archidekt `oracleCard` data (layout, faces) for diagnosing this class of bug.

## cardTypes Replaces Face Data (data-model simplification)

- **`f76b49c`** - Replace face data with a single `cardTypes` field (union of all faces)
  - Removed `CardFace`, `CardDefinition.backFace`, and the never-displayed `manaCost`/`cmc`/`oracleText`. The card is shown as a Scryfall image; nothing read those fields. They were speculative storage for an unbuilt "is this hand worth keeping?" feature — which should instead read canonical data from MTGJSON/Scryfall.
  - Renamed `types` → `cardTypes` (the word "types" was hopelessly overloaded) holding the UNION of every face's/part's types.
  - **Flip was unaffected**: it never read `backFace` — it refetches the same `scryfallId` with `face=back`. The flip button needs only `twoFaced` + `scryfallId`.
  - Adapters now union all faces' types into `cardTypes`. MTGJSON resolves `otherFaceIds` faces regardless of layout, so adventure/split second parts are captured (e.g. `Eiganjo Dynastorian // Replenish` → `[Creature, Sorcery]`, previously just `[Creature]`) — this restored the grouping the layout-gating change had dropped, and improved it for all split/adventure cards.
  - `app.ts` library grouping simplified from the per-request merge to `gc.card.cardTypes`. `library-modal.ejs` reads `card.cardTypes`.
  - `SqliteCardRepositoryAdapter`: dropped `mana_cost`/`cmc`/`oracle_text`/`back_face` columns, renamed `types`→`card_types`, rebuilds the gitignored cache table when an old schema is detected.
  - **`PERSISTED_DECK_VERSION` 2 → 3.** `PersistedDeck` (scryfallIds only) stays at 2; `PersistedGamePrep` stays at 2 (embeds a Deck that now carries version 3 internally).
- **`ef75759`** - Regenerated all 190 precons (full MTGJSON re-fetch) + the Archidekt example deck for the new format. 0 conversion errors. Verified: app boots, grouped library modal renders, 124 tests pass.

## Mulligan / Opening Hand (state version 9, then 10)

- Added the mulligan / opening-hand feature. First cut bumped `PERSISTED_GAME_STATE_VERSION` **8 → 9** (envelope-only: stored fields `mulliganStage`/`mulliganCount`). Then refactored to **derive** the stage and count from the event log (marker events "deal opening hand" and "mulligan"), removing the stored fields and bumping **9 → 10**. Finally made those events **atomic and carry their `moves`** so a mulligan is one undoable event (**10 → 11**). `PERSISTED_DECK_VERSION` and `PERSISTED_GAME_PREP_VERSION` were NOT touched — no `CardDefinition`/`Deck`/prep change. Old games rejected by the existing `fromPersistedGameState` version guard.
  - **Two-faced touch point**: `GameState.mulligan()` returns the hand to the library, shuffles, and redraws. As each hand card returns to the library it resets `currentFace` to `"front"`, so a redrawn two-faced card starts on its front (matches `newGame`'s default). No `CardDefinition`/`CardFace`/adapter/modal/flip changes; the hand still renders through `formatCardContainer()`, so the two-faced branch is unaffected.

## Stored Scryfall Image URLs (the version-tag 404 fix)

- **`eb48f4f`** - Store Scryfall image URLs on cards instead of always constructing them
  - **Bug**: bare constructed `normal` URLs 404 for freshly-released cards (e.g. Arcane Signet, set ECC, released 2026-01-23). Scryfall only serves the `normal` derivative at the **versioned** URL (`...jpg?<timestamp>`); the `large` size happens to be pre-rendered at the bare path, which is why only the hand view (uses `normal`) broke.
  - **Fix**: `CardDefinition` gained optional `imageUris`/`backImageUris` (`CardImageUris = Partial<Record<ImageFormat,string>>`, storing `normal`/`large`/`png`/`art_crop` copied verbatim from Scryfall with the version tag). `getCardImageUrl` signature changed `(scryfallId,…)` → `(card,…)` and prefers the stored URL; new `constructCardImageUrl(scryfallId,…)` is the fallback. Back face reads `backImageUris`; absent → constructs `face=back` (prior behavior).
  - **New port** `src/port-card-images/`: `CardImagesPort`, `ScryfallCardImagesGateway` (`POST /cards/collection`, batched 75, cached, pure `mapScryfallCardToImages`), `FakeCardImagesGateway`, `enrichDeckWithImages`. DFC mapper reads `card_faces[0/1].image_uris`; single-faced reads top-level `image_uris`. `backImageUris` attached only to `twoFaced` cards.
  - Enrichment at ingestion: Archidekt adapter (optional injected `imagesPort`, wired in `server.ts` + `download-deck`) and the `fetch-mtgjson-precons` script post-convert. MTGJSON adapter stays synchronous. Best-effort — Scryfall failure leaves URLs unset → fallback.
  - **No persistence version bump.** Fields are optional with a graceful fallback, so old decks/games/preps stay valid (litmus passes). SQLite cache gained `image_uris`/`back_image_uris` via non-destructive `ALTER TABLE`. Documented as the "optional fields" exception in `DESIGN-persistence-versioning.md`. Deck regeneration is therefore **optional** (bakes URLs in for fresh cards) — contrast with the `cardTypes` change which mandated regen.
  - Tests: `test/cardImageUrl.test.ts` (stored vs fallback vs back), `test/scryfallCardImages.test.ts` (pure mapper), `test/enrichDeckWithImages.test.ts` (enrichment + fake). Verified against live Scryfall: Arcane Signet `normal` now 200 (was 404), DFC front+back both 200.
- **`b825edc`** - Send `User-Agent`+`Accept` headers to Scryfall (it now 400s requests without them).

## Mulligan Advisor — first consumer of cardTypes-as-land-signal — REMOVED

> **Removed 2026-07-26.** `src/mulligan/recommendMulligan.ts` is gone, so `cardTypes`
> is back to **one** silent dependent on being the full union: library-search grouping.
> Watch point #1 still stands — a future "is this hand worth keeping?" feature should
> read canonical data from MTGJSON/Scryfall rather than re-storing per-face text — but
> that feature will now live in an external recommendation service, not in this repo.
> Kept below as historical record.

- **`1034189`** - Add Mulligan Advisor (Phase 1): land-count recommendation (dev mode)
  - `src/mulligan/recommendMulligan.ts` was the long-anticipated "is this hand worth keeping?" feature (referenced in the `f76b49c` cardTypes simplification and watch point #1). As predicted, it did **not** re-store per-face card text — it read `cardTypes`, the pre-unioned set of all faces' types, via `isLand(card) = card.cardTypes.includes("Land")`.
  - Consequence for two-faced cards: an MDFC whose union included `"Land"` was counted as a land with no special-casing. While it existed, `cardTypes` had **two** silent dependents on being the full union (library-search grouping + mulligan land counts). No `CardDefinition`/adapter/persistence changes.

## Prep Screen Inline Flip (JES-90)

- **`e7e59f1`** - Fix Flip on the prepare screen
  - **Bug**: a two-faced commander on `/prepare/:prepId` rendered its inline flip button pointing at the **game** route — `hx-post="/flip-card/<prepId>/<index>"` — because `renderPrepCommanderCard()` passed `prep.prepId` as `formatCardContainer`'s `gameId`. The route 404s ("Game N not found"), and HTMX doesn't swap non-2xx responses, so **clicking Flip did nothing at all**. Verified live before the fix.
  - **The scarier half**: `prepId` and `gameId` come from independent SQLite sequences (`game_preps` vs `game_states`), and `validateStateVersion` treats a missing `expected-version` as valid. On a numeric collision the prepare screen's Flip would have flipped a card in an unrelated game and persisted it. Nothing in the optimistic lock would have caught it.
  - **Fix**: new stateless route `GET /prep-flip-card/:prepId/:cardIndex?face=front|back` returning `formatFlippingContainer()` for the requested face — the same `?face=` idiom `/prep-card-modal` already used, and the same card indexing (via `createPrepViewHelpers`, commanders then library cards). Nothing persisted.
  - **Design**: `formatFlippingContainer`'s signature changed from `(gameCard, gameId, expectedVersion?)` to `(gameCard, flipRequest: FlipRequest)`, where `FlipRequest` is `{page:"game"; gameId; expectedVersion?} | {page:"prep"; prepId}`. `formatCardContainer` gained an optional `flipRequest` defaulting to the game variant, so every game call site and its emitted HTML are byte-identical (verified by diffing rendered buttons). The asking page is now explicit instead of being inferred from a bare number.
  - Why not extend `renderPrepCommanderCard`'s `/card-modal/` → `/prep-card-modal/` regex rewrite to the flip button: the prep flip URL encodes the **target** face, so it has to be built where `currentFace` is known — a post-hoc string rewrite can't produce it.
  - No `CardDefinition`, persistence, or version changes; prep flip is still stateless (watch point #6 stands). No CSS changes — `public/prepare.css` already had the `.card-flipped` rules, unexercised until now.
  - Test: `test/verification/verify-prep-commander-flip.spec.ts` (From Cute to Brute / Esika) — clicks Flip, asserts `.card-flipped` and the back-face image, then flips back. Failed before the fix, passes after.

- **`285ba5e`** - Open the prep card modal on the face the page is showing (follow-up)
  - **Gap left by `e7e59f1`**: flipping the commander then clicking it opened the modal on the **front** face, because the container's modal URL was rendered once and never updated by the flip (which swapped only the inner flip container).
  - **Decision on scope** (Jess, 2026-07-27): the page should tell the modal which face to open on, but flipping *inside* the modal must **not** change the page — "I actually don't want that to change the state on the page." One-way by design; not a gap to close later. Flip stays **page** state on prep, never server state.
  - **Fix**: the prep flip button now targets `#card-N-container` (was `#card-N-outer-flip-container-with-button`) and `/prep-flip-card/` returns `renderCommanderCard()` — the whole container — so its modal URL is re-rendered with `?face=` on every flip. Game rendering untouched: there the modal reads `currentFace` from the game, so it still swaps just the flip container (verified byte-identical HTML before/after).
  - **Rejected alternative — do not re-derive**: `hx-vals='js:{face: …classList.contains("card-flipped")…}'` on the container, reading the face at click time. `hx-vals` is inherited by descendants (the flip button is one) and htmx appends GET params to an existing query string, so the button would request `?face=back&face=front`; Express reads a repeated key as an array, `req.query.face === "back"` goes false, and Flip breaks invisibly all over again. Verified in the vendored htmx 2.0.7 source, not from memory.
  - Tests: two more cases in `verify-prep-commander-flip.spec.ts` — the modal opens on whichever face the page shows, and flipping in the modal leaves the page as it was (the deliberate one-way behavior, now guarded).

## What Was Tried and Abandoned

- **FlipCardEvent**: Recording flip as a game event was added and removed. It cluttered history without purpose since flipping doesn't change the game's logical state.
- **In-modal flip via HTMX swap**: Multiple attempts to flip a card inside the modal by swapping just the image or flip container. All caused the modal to close due to HTMX's swap mechanism removing the modal overlay. Solution was a dedicated route that re-renders the full modal.

## Contract Lands (JES-128 / JES-129)

- **`9e3ca60`** - Event contract v0 written as JSON Schema in `contracts/` — `card.played.v1.json` carries `card: {scryfallId, instanceId}` + required sibling `face: "front"|"back"`, exactly the shape this owner's contract.md specified
- **`2fa5f30`** - The Spine (services/spine/, Ruby on Rails) ingests and validates `card.played` against the schema, failing loudly on unknown name/version; `card.instance_id`/`card.scryfall_id` go onto the ingestion span
