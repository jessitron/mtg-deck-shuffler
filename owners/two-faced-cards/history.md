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

## The Shuffler Sends Faces (JES-127, Tabletop v0 Part B, 2026-07-27)

- `POST /play-card` and the new `POST /discard-card` now send `card.played` to the Tabletop in table mode (send-then-commit), via `src/port-tabletop/sendToTable.ts` → `buildCardPlayedEvent` — **the CURRENT face and its face-specific imageUrl** (`getCardImageUrl(card, "normal", currentFace)`), exactly as contract.md prescribes.
- **Discard does NOT reset `currentFace`**: a flipped MDFC goes to the graveyard as the face it was. Contrast `mulligan()`, which resets to front on return-to-library. TableLocation keeps the face.
- `GameCard`/`PersistedGameCard` gained optional `cardInstanceId` (GUID; minted in `newGame` beside `gameCardIndex`, mint-on-load in `fromPersistedGameState`, durable on next save) — the optional-field exception, **no version bumps** (game state stays 11, prep stays 3). It lives on the *game card*, never `CardDefinition` — the SQLite card cache is untouched.
- Solo Discard buttons carry `data-current-face` too, so clipboard copy uses the current face, same as Play.

## Contract Lands (JES-128 / JES-129)

- **`9e3ca60`** - Event contract v0 written as JSON Schema in `contracts/` — `card.played.v1.json` carries `card: {scryfallId, instanceId}` + required sibling `face: "front"|"back"`, exactly the shape this owner's contract.md specified
- **`2fa5f30`** - The Spine (services/spine/, Ruby on Rails) ingests and validates `card.played` against the schema, failing loudly on unknown name/version; `card.instance_id`/`card.scryfall_id` go onto the ingestion span

## The Table Got a Real Geography, Face Logic Untouched (JES-140, 2026-08-01)

- The Tabletop's player-area geometry was rewritten per `apps/tabletop/DESIGN.md`:
  a playmat/library/graveyard/exile/Stack per seat, drawn at a new `seat.joined`
  event (Shuffle Up) instead of lazily on a seat's first card. This owner's only
  stake — the card-arrival payload's `face`/`imageUrl` handling and the card
  shape's identity-only `meta` — was verified unchanged before the rewrite
  (`tabletop.md`'s watch points) and confirmed unchanged after: `handleCardArrival`
  still renders whatever `face`/`imageUrl` arrives and dedups on `instanceId`.
  Only *where* a card lands (geometry) changed, not *how* its face renders.
- `cardLayout.ts`'s old row-based functions were deleted outright (no
  back-compat shim) since nothing outside the Tabletop imports them.
- No `CardDefinition`, contract, or persistence-version changes.

## Card Copy Was Broken by a User-Agent (JES-136, 2026-07-31)

Found from telemetry, not a bug report: 400s on `GET /proxy-image` in the `local` Honeycomb
environment. The trace made the diagnosis — the error was on the **outbound client span** to
`cards.scryfall.io`, not in our handler — so `/proxy-image` was faithfully passing through a
400 that Scryfall gave *us*.

- **Cause**: `app.ts` fetched the image with bare `fetch`, so Node sent its default
  `User-Agent: node`, which Scryfall's Cloudflare front end answers with **400 BAD REQUEST**.
  The stored image URL was perfectly good — `curl` and a browser both got 200 for it, which is
  what made this read like our bug. Reproduced in one line: `curl -A node <url>` → 400,
  any other UA → 200. **Every** card copy was failing, both faces.
- **Fix**: new `src/scryfall-http.ts` (`SCRYFALL_USER_AGENT`, `fetchScryfall`) — one door for
  outbound Scryfall calls, setting the header. All three call sites now go through it:
  `/proxy-image` (the actual fix) plus `ScryfallCardImagesGateway.fetchBatch` and
  `scryfallSetNames`, which had each duplicated the UA string inline and so were unaffected.
- **Why the duplication mattered**: this owner's `interactions.md` already recorded "Scryfall
  requires `User-Agent` + `Accept` headers (else 400)" — but scoped the note to
  `ScryfallCardImagesGateway`. The knowledge existed and the newest call site never got it.
  That's why the constant is now shared rather than re-noted.
- **No face logic changed**: `getCardImageUrl`, `constructCardImageUrl`, `backImageUris`, and
  the `face=front|back` param handling are untouched.
- **Tests**: `test/scryfallHttp.test.ts` (fake fetch, asserts the UA goes out) and
  `test/verification/verify-proxy-image.sh` (live CDN, front + back). The script exists because
  the unit test can only prove we *send* a User-Agent, not that Scryfall *accepts* it — which
  is exactly the gap the bug lived in.

## Face and Face-Down Are Two Axes; the Two Ships Differ (design decision, 2026-08-07)

**No code changed.** Jess made this call while resolving
`.scratch/tabletop-physics/issues/02-what-a-card-is.md` (map
`.scratch/tabletop-physics/map.md`), which this owner had been consulted on.

- **Two-axis model confirmed and sharpened.** This owner had argued `face` (`front`|`back`,
  which printed side) and face-down (concealment, generic card back) are orthogonal, on the
  strength of manifest/morph. Jess gave a better reason: **a two-faced card can be _played_
  face down** — so both axes are reachable in ordinary play, not just in a rules corner.
  Her words: *"In our domain model, 'Face Down Card' will be a real thing, and it looks like
  a card back (in the future: a card sleeve) even if the card itself is two-faced."*
- **A one-bit "which side is up" model was proposed and rejected.** Consequence now recorded
  in interactions.md watch point 12: `face` ranges over **printed sides only**, so
  `face: "back"` is unreachable on a one-faced card — a one-faced card turned over is
  face-down.
- **The load-bearing new fact: the ships diverge deliberately.** Jess: *"in Deck Shuffler, a
  one-faced card cannot be flipped. On Tabletop, it can. We need to be very clear on that."*
  The Shuffler's flip is *inspection of a two-faced card*; the Tabletop's is *turning over a
  physical object*, and turning over a one-faced card is a real domain event (this card is
  now face down). Turning over a two-faced card is a **transform**, not face-down. A
  `CONTEXT-MAP.md`-shaped divergence in the word "flip"; there is no `CONTEXT-MAP.md` in the
  repo yet, so the translation table lives in tabletop.md. **Shuffler behavior unchanged.**
- **Correction to tabletop.md.** It claimed the Tabletop "stores `face` for later." It never
  did — `apps/tabletop/src/server/cardArrival.ts:50` validates `face` and then drops it;
  nothing in the shape record, `props`, `meta`, or asset carries it, and the face reaches the
  canvas only as baked-in pixels in `imageUrl`. Verified in code. Hence: **the Tabletop cannot
  change a card's face today.** Also corrected the flip-gesture section's claim that the back
  image URL is "derivable from `scryfallId`" — bare constructed URLs 404 for fresh cards,
  which is why `backImageUris` is stored; the URL must be *sent*.
- **Decided so far in ticket 02** (recorded, since it changes this owner's future advice): the
  card **will** become a genuine custom tldraw shape type rather than continuing to extend
  `ImageShapeUtil`. tabletop.md's old "reuse `MtgCardImageShapeUtil` for flip" advice is
  superseded.
- **Still open, not decided:** props vs `meta`, whether the card renders its own image (which
  would put both image URLs on the wire — a contract change), and how a concealed card avoids
  leaking identity through **synced tldraw props** (every client gets the whole shape record —
  the `gameCardIndex` decodable-secret problem in a new costume).
- A Shuffler **"Play Face-Down" button was dropped** as a buoy onto the Mural-parity list
  (`apps/tabletop/notes/DESIGN-tabletop-replaces-mural.md` already lists "flip a card over (MDFC, and
  face-down)" as parity work, and puts playing from the library face-down out of scope).
- **Face-down remains unmodeled fleet-wide**: no field on `CardDefinition`, `GameCard`,
  `PersistedGameCard`, and nothing in `contracts/`. New watch points 12–14 in interactions.md.

## Ticket 02 Resolved: What a Tabletop Card Is (design decision, 2026-08-07, `c956949`)

**No code changed.** The follow-up to the entry above: the items it correctly recorded as
"still being decided in ticket 02" are now closed. Full reasoning in
`.scratch/tabletop-physics/issues/02-what-a-card-is.md` § Answer.

- **The card becomes a genuine custom tldraw shape type** — `mtg-card` extending
  `BaseBoxShapeUtil`, **rendering its own image**. tabletop.md's old "reuse
  `MtgCardImageShapeUtil` for flip" advice is now definitively superseded. The deciding
  argument was *"one util, three meanings"* (one `type: "image"` util serves cards, locked
  furniture, and stray dropped JPEGs today), not crop and not tap.
- **`meta` empties out; everything moves into validated, migratable `props`** — including
  identity, which was previously unvalidated and unmigratable. `zone` was deliberately left
  *unplaced* so ticket 03 decides it rather than inheriting it.
- **The per-instance tldraw image asset goes away.** This owner argued it and the argument
  carried: since the card holds both URLs, **flip is a pure shape-prop change** — no asset
  mutation, clean undo.
- **`backImageUrl` is the printed back only; `null` means no printed back exists. No
  `twoFaced` flag** — Jess declined the one this owner suggested: `backImageUrl !== null`
  says it precisely, `twoFacedLayouts.ts` stays the single decider, and two fields that must
  agree is a bug waiting to happen. **Accepted, with one recorded sharp edge** (now a
  tabletop.md watch point, flagged for ticket 06): the equivalence only holds if
  `buildCardPlayedEvent` derives the field from `card.twoFaced`, *not* from whether
  `card.backImageUris` happens to be stored. `getCardImageUrl` always returns a string
  (falling back to `constructCardImageUrl`), so gating on `twoFaced` is safe; gating on the
  stored URIs would make an MDFC whose Scryfall image fetch missed arrive `backImageUrl:
  null` and be **silently unflippable on the table** — the same "two fields that must agree"
  bug, relocated to the sender.
- **The generic card back is NOT a card property** — `faceDown` resolves against the
  *table's* `cardBackImageUrl` (already on `seat.joined`), because sleeves are coming and a
  sleeve belongs to a player/table. Honours this owner's "concealment is state, the card
  back is only its rendering" rule from a different direction than we proposed.
- **The arrival payload unbakes the face, as this owner recommended, with zero contract
  churn**: `imageUrl` → `frontImageUrl` + `backImageUrl` (replacing, not coexisting);
  `face` stays contract but now means "which face is up on arrival." Two edit sites:
  `buildCardPlayedEvent` in `src/port-tabletop/types.ts` and the `validationError` in
  `apps/tabletop/src/server/cardArrival.ts`. This owner's point that the back URL must be
  **sent, not derived** (bare Scryfall URLs 404 for new cards, hence `backImageUris`,
  `eb48f4f`) is recorded there as the reason.
- **The concealment/leak finding was resolved by NOT guarding it.** New principle in
  `notes/DESIGN-the-table-vision.md` § Principles: *"everything that can be done by one
  player is doable by any player"* — no ownership or permission model. Now a **standing
  constraint** on this territory (interactions.md watch point 15): identity stays in `props`
  on a face-down card, and **never gate a flip/turn-over/peek gesture on who controls the
  card.** That closes a design space rather than leaving it unexplored.
- **The `gameCardIndex` rule is being reversed** — Jess: *"I don't want you to have to reason
  about what is hidden and what isn't."* Buoy `let-gamecardindex-out` in `TODO.md`. The KB's
  framing was softened from an inviolable boundary rule to "was a rule, being reversed"; the
  *reason* it existed (SEAMAP's "hand counts but never hands") is kept, re-homed onto payload
  *design* rather than a check at every door.
- **Still open, now scoped to exactly two questions in ticket 06**
  (`.scratch/tabletop-physics/issues/06-two-faces-and-face-down.md`): the flip/turn-over
  **trigger gesture** (`onClick` is spoken for by tap), and **who is authoritative about
  `currentFace` for Table-zone cards** — this owner's watch point (a table-flipped card
  discarded to the graveyard shows the pre-flip face on the Shuffler) is written in there as
  a must-decide, not a maybe.

## Face State Is Barely Observable in the Modal (finding, 2026-08-07, `65f12e8`)

**No app code changed.** A verify-suite speedup pass deleted every `networkidle` and fixed
`waitForTimeout` from `test/verification/*.spec.ts` (225s → 106.5s). Routed here by the
animations owner: the finding is about whether a flip
*occurred* (face state), not about the 0.8s `.card-flipped` transition.

- **The gap**: both `foundFlipCard` loops in `verify-library-grouping.spec.ts` (game page and
  prep page) click `.card-modal-overlay .flip-button` and then assert the position indicator
  reads the **same** text as before. That's the property under test — flipping must not
  renumber group-scoped navigation — so a flip that never happened passes identically. It
  matters more now that the suite has demonstrated htmx-swap clicks being swallowed
  (`owners/animations/interactions.md:27`); every other such click got wrapped in
  `expect(async () => {…}).toPass()`, and this one deliberately did not, because no available
  assertion could tell the retry whether it landed. A comment marks each site, flagging
  whether to strengthen or drop them.
- **Answering the question put to this owner — what distinguishes front from back?** Checked
  the code rather than guessing. Inline surfaces are well covered: `.flip-container-outer`
  carries `.card-flipped` server-side (`shared-components.ts:104`), which is why
  `verify-prep-commander-flip.spec.ts` is a sound test. **In the modal there is no class, no
  attribute, and no face-dependent text** — a DFC's `card.name` is the whole `"Front // Back"`
  string, so title and `alt` are identical on both faces. What's left: `img.modal-card-image`'s
  `src` (`getCardImageUrl(card,"large",currentFace)`, differs on both pages), and on **prep
  only** the flip button's own `hx-get?face=<target>`. The **game** modal's flip button is a
  `hx-post` to a toggling route, byte-identical on both faces.
- **The cheap fix, identified but not made** (a second change riding along on a
  wait-removal pass, deliberately deferred): `currentFace` is already passed into
  `card-modal.ejs` and
  never rendered. Emitting `data-current-face` on `.card-modal-overlay` would give the game
  modal its first real face observable and make these two tests verifiable.
- Recorded as interactions.md watch point 16, an architecture.md observables section, and a
  files.md caveat on the spec.
## The Modal's Face Observable Gap Was Closed (2026-08-07)

Follow-up to the finding recorded above (`65f12e8`): added
`data-current-face="<%= currentFace %>"` to `.card-modal-overlay` in
`views/partials/card-modal.ejs` — a pure additive attribute, no route change, since
`currentFace` was already threaded into the template and previously just never rendered.

- Used it to fix the vacuous flip assertion in
  `test/verification/verify-library-grouping.spec.ts`: both the game and prep `foundFlipCard`
  loops now assert the modal's `data-current-face` actually changed to `"back"`
  (`await expect(cardModal).toHaveAttribute('data-current-face', 'back', { timeout: 3000 })`),
  in addition to the pre-existing assertion that the position indicator is unchanged (the
  property genuinely under test — flipping must not renumber group-scoped navigation). A
  flip that never happened (a swallowed click) now fails the test instead of passing
  silently.
- This gives the **game** card modal its first strong face observable — previously its flip
  button was a `hx-post` to a toggling route, byte-identical on both faces, and the only
  indirect signal was `img.modal-card-image`'s `src`. The **prep** modal already had a weaker
  indirect signal (the flip button's `hx-get` target face) but now uses the same strong
  attribute for consistency.
- Architecture.md's "How to Tell Which Face Is Showing" section and interactions.md watch
  point 16 updated to make `data-current-face` the first-choice observable in the modal.
  No `CardDefinition`, persistence, or contract changes.

## Ticket 12 Implemented: mtg-card Becomes a Real Shape, the Payload Unbakes (2026-08-08)

Implements what ticket 02 (2026-08-07, `c956949`, recorded above) only decided. No new
decisions — this is the "now build it" pass, and it landed exactly as specified.

- **Shuffler side**: `buildCardPlayedEvent` (`apps/shuffler/src/port-tabletop/types.ts`) now
  sends `frontImageUrl` (always `getCardImageUrl(card, "normal", "front")`) and
  `backImageUrl` (`getCardImageUrl(card, "normal", "back")` when `card.twoFaced`, else
  `null`) instead of a single `imageUrl` chosen by `currentFace`. `face:
  gameCard.currentFace` is unchanged but its doc comment now says "which face is up on
  arrival" instead of "which face was baked into imageUrl" — the correction this owner
  flagged in ticket 02 finally lands in the code, not just the KB. Both the field-by-field
  comment block above `CardPlayedEvent` and the interface itself were updated together.
  `test/port-tabletop/cardPlayedEvent.test.ts` gained cases for: `backImageUrl` null for a
  non-twoFaced card; both URLs populated for a twoFaced card (back containing `/back/`);
  and — the sharp edge this owner called out — a twoFaced card with `backImageUris`
  *unset* still gets a populated `backImageUrl` via the `constructCardImageUrl` fallback,
  proving the field is derived from `twoFaced`, not from stored-URI presence.
- **Tabletop side**: `cardArrival.ts`'s `CardArrival` interface and `validationError` now
  require `frontImageUrl: string` + `backImageUrl: string | null` instead of `imageUrl`.
  Two new files carry the shape itself: `apps/tabletop/src/shared/mtgCardShape.ts`
  (`MtgCardShapeProps` — `frontImageUrl`, `backImageUrl: string | null`, `face: "front" |
  "back"`, `faceDown: boolean`, `tapped: boolean`, plus `w`/`h`/`instanceId`/`scryfallId`/
  `cardName`; validated via `RecordProps`) and
  `apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` (`extends BaseBoxShapeUtil`,
  replacing `MtgCardImageShapeUtil extends ImageShapeUtil`). `component()` picks
  `frontImageUrl`/`backImageUrl` by `props.face` and renders its own `<img>` — no per-instance
  tldraw image asset is minted anymore (`cardArrival.ts` no longer calls
  `AssetRecordType.create`; the shape is written directly with `type: "mtg-card"`). Dedup
  switched from reading `meta.instanceId` to `props.instanceId` to match.
  `MtgCardShapeUtil` also carries forward: `onClick` (tap/untap, unchanged semantics, now a
  base-hook override instead of the old `ImageShapeUtil` override), and the
  `959831c` selection-clearing fix in `onTranslateEnd` (ported forward exactly as
  `tabletop.md`'s porting note required) plus ticket 01's zone-entry detection (unchanged,
  still keyed on `meta.zone`).
- **What this ticket did NOT do**: no flip gesture writes `props.face` yet — the ticket
  scope was "unbake the URLs," not "build flip." `zone` stays in `meta`, not `props`
  (ticket 13's ownership-boundary question, still open). `faceDown` exists in `props` with
  a default of `false` and is not yet set by anything. Card-facing flip UI and ticket 13
  remain future work.
- Reviewed against this owner's `tabletop.md` ("the arrival payload unbakes the face") and
  the `twoFaced`-derivation watch point before landing — both confirmed correct, no
  deviation.

## Tabletop Drag Picked Up the Wrong Card — Moved Out (2026-08-07, `959831c`)

Fixed 2026-08-07 (`959831c`): dragging a second card after a first silently re-moved the first
instead. Pure tldraw `SelectTool`/selection-state mechanics, unrelated to card faces or
`CardDefinition` — this finding, and the owner that now tracks its territory, moved to
`owners/tabletop-shape-mechanics/history.md` the same day. See that owner if a new
click/drag/selection bug turns up in `MtgCardImageShapeUtil.tsx` or its successors.

## Sleeve Color Decided: Baked Per-Card, as a Color, No card.played Rev (2026-08-08)

Table-layout ticket 11 resolved (`.scratch/tabletop-table-layout/issues/11-sleeve-color-to-card-back.md`
§ Answer) — a wayfinder DECISION, no code changed. What it settled for this owner's territory:

- **Sleeve color travels as a color**: optional `sleeveColor` hex on `seat.joined` player
  data; `cardBackImageUrl` becomes optional (omitted when a sleeve is defined; sleeveColor
  wins if both arrive). Unsleeved seats keep the standard Magic card back.
- **Sleeve color is a game constant** (pre-game choice, immutable mid-game) — which makes
  per-card baking legal and **amends ticket 02's rule** this KB recorded: instead of
  "faceDown renders against the seat/table's `cardBackImageUrl`," the Tabletop server now
  (when built) bakes the seat's sleeveColor into the `mtg-card` shape's props at mint time;
  the renderer reads its own props. The seat-lookup gap this owner flagged in its -context
  consult is dodged by baking, not by syncing.
- **No `card.played` rev** — it already carries `seat`, and its charter keeps derivable
  seat data out. Only contract work is the `seat.joined` schema (converges with
  table-layout ticket 06's deck-name field).
- **Rendering model**: face-down card and library pile = solid sleeve rectangle slightly
  larger than the card; face-up sleeved card = image centered inside the sleeve rectangle.
  Exact margins/radius reserved for `shuffler-looks-like-itself` at implementation time.
- **This owner's watch point held**: sleeve data stays out of `backImageUrl`; `sleeveColor`
  is its own prop, and `backImageUrl: null` ⇔ no printed back is untouched. KB gap closed:
  the library furniture image is a second consumer of the card back.
- Future (not v1), per Jess: a sleeve may someday carry an image URL and two colors
  (front border vs back).

KB files updated: README quick-reference face-down row; interactions watch points 14 + new
17 and the Card Back section; tabletop.md new "Sleeve color" section and the amended
"generic card back" consequence; contract.md seat.joined note. Follow-up for
implementation: update the "until sleeve selection exists" comment on `cardBackImageUrl()`
in `apps/shuffler/src/port-tabletop/types.ts` (~124) to point at the ticket.

## Physics Ticket 06 Resolved: Flip Gesture and Face Authority (design decision, 2026-08-08, `575416b`)

**No code changed** — this closes the two questions this KB had been carrying as "still open,
narrowed to ticket 06" since ticket 02. (KB backfill note: this entry was written a day late,
alongside the cards-come-and-go ticket 02 entry below; the resolution itself landed at
`575416b`.) Full text: `.scratch/tabletop-physics/issues/06-two-faces-and-face-down.md` § Answer.

- **Trigger: two separate context-menu items**, "Flip" and "Turn face down," in tldraw's
  right-click/long-press context menu (same surface as furniture Lock/Unlock) — not a hover
  affordance, not a modifier-click, not one combined "turn over." Each item shown/enabled from
  the card's own state: no "Flip" entry when `backImageUrl` is null.
- **`currentFace` authority: divergence accepted, flip-on-table is table-local.** This owner's
  must-decide (a table-flipped card discarded to the graveyard shows the pre-flip face on the
  Shuffler) is now decided *knowingly*: the Shuffler keeps trusting its own `currentFace`.
  Deciding factor this owner supplied: there is **no inbound event path into `GameState`
  today** — "table becomes authoritative" would have meant building the Shuffler's first-ever
  inbound listener plus a `card.flipped`-shaped event with an axis discriminator. Known
  divergence, not a bug to fix.
- **`faceDown` visual is a plain image swap** — confirmed with `shuffler-looks-like-itself`:
  the fleet has no border/dimming/badge idiom for concealment (the Shuffler's library furniture
  is just `<img src=CARD_BACK>`), so `faceDown` swaps to the card-back/sleeve rendering and
  nothing else.
- **Leaving the table resets both axes**: a card returning to hand or library goes back to
  `face:'front'`, `faceDown:false`, regardless of how it sat on the table. Jess: "if a card
  goes back to the hand or library, it goes to its regular face-up again." Matches
  `mulligan()`'s existing reset. The reset is performed table-locally (mechanism is an
  implementation detail); composes with the wire decision below.

## Sleeves Are Rectangular: Square Corners on Sleeve Renderings (2026-08-09, `e53a27e`)

Small appearance change, Jess-directed, landed on branch `worktree-ticket-16-mat-border`.
The ticket-17 sleeve geometry gave the sleeve rectangle a proportional corner radius
(`w * 0.05`, mirroring the Shuffler card's own 10/200 corner). Jess: "sleeves are
rectangular" — matching issue 09's line that *a sleeve edge gives cards the square
corners the fleet's style wants*. The `borderRadius` was removed from both sites:

- `apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` — the `sleeve` CSSProperties
  used by both the face-up sleeve frame and the sleeved-faceDown bare sleeve rect
- `apps/tabletop/src/client/shapes/MtgZoneShapeUtil.tsx` — the library sleeve pile

The `w * 0.03` padding/overhang stays; only the radius went. **No behavior, face, or
faceDown semantics changed** — purely corner geometry. 69/69 vitest pass.

## Sleeve/Playmat Carries to the Game Screen — Confirmed Orthogonal (2026-08-09)

**No two-faced-cards code changed.** `sleeve-carries-to-game` made the `/prepare` picker's
sleeve color and playmat image path persist onto the game and render there:
`GameState.newGame()`/`PersistedGameState`/`GameState` gained optional `sleeveColor` and
`playmatImagePath`, snapshotted from the prep at both `/start-game` and `/restart-game`;
`formatLibraryStack()` grew an optional `sleeveColor` param (new helper
`formatLibraryCardBack()` renders a sleeved back as a flat-hex rectangle instead of the
`CARD_BACK` image); `formatGamePageHtmlPage()` writes the playmat as an inline
`background-image`. This owner was consulted (per the "orthogonal to two-faced cards" ticket
description) and confirmed before implementation: no `CardDefinition`/`CardFace`/
`getCardImageUrl`/contract face-field touched, and the new fields live on
`GameState`/`PersistedGameState` (game-wide), not `GameCard`/`PersistedGameCard` (per-card
face state) — verified by grep, not assumed. Also confirmed no collision with the Tabletop's
unrelated `sleeveColor` on `seat.joined` player data (different type, different sender site).
**No `PERSISTED_GAME_STATE_VERSION` bump** — stayed at 11, the same "optional field with
graceful fallback" exception this owner's own `imageUris`/`backImageUris` change used;
confirmed the actual constant value in code before writing that into tests. The Shuffler's
sleeve rendering picked up the Tabletop's square-corner rule (table-layout ticket 17,
`e53a27e`) for consistency: `.library-card-back.sleeved` in `public/playmat.css` zeroes
`border-radius`. Full account in [interactions.md](interactions.md#not-related-to).

## Physics Ticket 17 Implemented: Flip and Turn Face-Down (2026-08-09, `eb24a4f` + `ff5d58a`)

Builds what ticket 06 (2026-08-08, `575416b`, recorded above) only decided. First code that
writes `props.face` or `props.faceDown` anywhere in the Tabletop.

- **`MtgCardShapeProps` gained `cardBackImageUrl: string | null`**
  (`apps/tabletop/src/shared/mtgCardShape.ts`) — baked at mint time in `cardArrival.ts` from
  `playerArea.cardBackImageUrl ?? null`, the same "sleeve color is a game constant, legal to
  bake" argument this KB already carried for `sleeveColor`. Default `null` in
  `getDefaultProps()`.
- **`MtgCardShapeUtil.component()`'s unsleeved branch is now `faceDown`-aware.** Previously
  it always rendered `src` regardless of `faceDown` — the KB's "nothing sets `faceDown` yet"
  note is now false. New behavior: unsleeved + `faceDown` renders `cardBackImageUrl` as an
  `<img>` if present, else a flat `#3a3a3a` rectangle (reachable when a seat never got a card
  back, e.g. redeploy-wiped seat memory). Unsleeved face-up and both sleeved branches
  (already `faceDown`-aware since table-layout ticket 17) are unchanged.
- **First gesture ever to write `props.face` / `props.faceDown`**: a new custom tldraw
  `ContextMenu`, `apps/tabletop/src/client/CardContextMenu.tsx` (`TableContextMenu`, wired via
  `TLComponents.ContextMenu` in `TablePage.tsx`). Two menu items in this owner's territory:
  - **"Flip"** — per-card swap of `face` (`front`↔`back`), shown only when at least one
    selected card has `backImageUrl !== null` (exactly ticket 06 decision 1: no "Flip" entry
    when there's nothing to flip to).
  - **"Turn face down"/"Turn face up"** — a convergent toggle of `faceDown` across the whole
    selection (ticket-16-style state push, like the Tap/Untap item beside it): the clicked
    action's target state applies to every selected card, skipping cards already there.
  - A third item, Tap/Untap, is card-mechanics territory, not face territory — it reuses the
    existing tap rotation math, pulled out into a shared `apps/tabletop/src/client/shapes/cardTap.ts`
    (`tapPartial`) so `onClick` and the menu item share one implementation.
  - Every menu action's `commit()` helper ends with `editor.setSelectedShapes([])` —
    right-clicking selects the card, and (unlike a locked shape) an unlocked card's selection
    survives the menu closing, which would otherwise hijack the next drag of a different card
    (the same hazard `MtgCardShapeUtil.onTranslateEnd`'s unconditional `setSelectedShapes([])`
    already guards against for drags).
- **`MtgCardShapeUtil.onTranslateEnd`**: a card entering the **library** zone now resets
  `face: 'front'`, `faceDown: false`, folded into the same returned partial as the existing
  `meta.zone` write (one undo entry, matching ticket 06 decision 4 and the Shuffler's
  `mulligan()` reset). **No `hand` zone exists anywhere in this codebase**
  (`NON_BATTLEFIELD_ZONES` in `MtgCardShapeUtil.tsx` doesn't have one), so the ticket's "hand
  or library" reset is honestly only "library" today — the ticket file itself was corrected
  to say so. **No `card.flipped` event was added** — the Shuffler-sync divergence (ticket 06
  decision 2) is accepted as designed, not a gap.
- Tests: `apps/tabletop/test/cardArrival.test.ts` covers `cardBackImageUrl` baking (sleeved
  seat → `null`; unsleeved seat with a URL → baked in; no seat data → `null` default).
  `apps/tabletop/test/verification/verify-flip-face-down.spec.ts` (new, Playwright): two-client
  sync of BOTH flip and face-down toggle in one test (extended in `ff5d58a` after a
  code-review pass on the ticket's spec found the two-client checkbox only covered flip);
  the "Flip" item's gating on `backImageUrl`; face-down render shows the table's card back and
  toggling back to face-up restores the front image; library-entry resets both axes; a
  regression test that flipping card A via the menu doesn't leave a stale selection that
  hijacks a later drag of card B.
- Reviewed by this owner and `tabletop-shape-mechanics` before landing (per plan
  `.scratch/tabletop-physics/plan-17.md`).

## Cards-Come-and-Go Ticket 02: the Event Vocabulary — Face Decisions (design decision, 2026-08-08, `7b7f868`)

**No code changed** — decisions only; schemas and handlers come at build time. Full text:
`.scratch/tabletop-cards-come-and-go/issues/02-event-vocabulary.md` § Answer. This owner was
consulted before payload shaping. What it settles in this territory:

- **`card.returned.v1` carries NO face and no faceDown** — one kind for both table exits
  (portal drag `occurredIn: "tabletop"`, Shuffler Return button `occurredIn: "shuffler"`),
  payload `card` + `seat` + optional `fromZone`. Jess: "cards removed from play no longer
  have a face up." This is the **wire half of the ticket-06 authority decision**: the table
  is not authoritative for a card's face, the Shuffler keeps its own `currentFace`, and the
  wire says nothing — the table resets its axes locally on exit (ticket 06's rule), the
  Shuffler applies its own face rules on arrival.
- **`card.discarded.v1` splits out of `card.played` and KEEPS `face`** — a discard shows the
  card publicly. Payload: `card`, `face`, `seat` (no `zoneHint`; graveyard *is* its meaning).
  Consequence: `card.played.v1`'s `zoneHint` enum narrows to `stack | battlefield`.
- **Undo kinds carry no face**: `undo.card.played.v1` / `undo.card.discarded.v1`, payload
  `card` + `seat` — deletion neither reveals nor chooses a face. Tabletop effect: poof;
  attachments stay, detached. Removal handlers read `props.instanceId` per this owner.
- **Commanders ride `seat.joined` faceless**: optional `commanders` array (0–2 entries,
  `{ card: { scryfallId, instanceId } }`). Jess: a commander always arrives in the command
  zone face up; flipping it there afterward is table-local ("it isn't in play, people can do
  what they want"). Scaffolding (`cardName`/`frontImageUrl`/`backImageUrl`) rides off-schema
  with this owner's sharp edge honored — `backImageUrl` derived from `card.twoFaced`, never
  from stored-URI presence, same test treatment as `cardPlayedEvent.test.ts`. **This makes
  `seat.joined` the second sender site bound by the twoFaced-derivation watch point.**
- **Contract validation gets real** on every receiver this map touches (ajv-style, loading
  `contracts/`) — retiring the hand-rolled "JES-128" `if`-chains including
  `cardArrival.ts`'s `validationError`.
- Also: `envelope.v1` amended in place (free — zero conforming producers exist yet):
  `tableId` drops `format: uuid` (the table name IS the id pre-Spine), `initiator` becomes
  `{ seatId?, playerName }`.

## Table-Layout Ticket 18 Implemented: `owner`/`isCommander` on the Card, Commanders Ride `seat.joined` (2026-08-09)

Built `.scratch/tabletop-table-layout/issues/18-commander-arrives-with-owner-and-ghost.md`,
whose design source of truth is issue 08's § Answer (2026-08-08 grilling) — the amendment
this owner and `tabletop-shape-mechanics` were consulted on when ticket 02 (tabletop-physics)
left `mtg-card` with no owner field at all.

- **`mtg-card.props` gains `owner: string` (seatId) and `isCommander: boolean`**
  (`apps/tabletop/src/shared/mtgCardShape.ts`) — first-class, schema'd, synced, granting
  **no capability** (Jess: "Owner is a property of the card... It doesn't limit who can
  move it"). `MtgCardShapeUtil.getDefaultProps()` defaults them to `""`/`false`.
- **`card.played.v1.json` gains both fields as `required`, edited in place — no v2.**
  `buildCardPlayedEvent` (`apps/shuffler/src/port-tabletop/types.ts`) sets
  `owner: initiator.seatId`, `isCommander: gameCard.isCommander`. The hand-rolled
  `validationError` in `apps/tabletop/src/server/cardArrival.ts` requires both.
- **`seat.joined.v1.json` gains an optional `commanders` array (0-2)** — in-schema
  `{card:{scryfallId,instanceId}}`, off-schema scaffolding `cardName`/`frontImageUrl`/
  `backImageUrl` (no `face` — commanders always arrive face up, per the vocabulary
  ticket). `buildSeatJoinedEvent` (Shuffler) gained an optional `commanders?: readonly
  GameCard[]` param, mapped through the new `buildSeatJoinedCommander()`. Tested in
  `apps/shuffler/test/port-tabletop/gateways.test.ts`'s new `"buildSeatJoinedEvent
  commanders"` describe block, mirroring `cardPlayedEvent.test.ts`'s convention.
- **Tabletop-side**: `apps/tabletop/src/server/seatJoined.ts` mints each commander as an
  ordinary `mtg-card` in the Command Zone (via a new shared `mtgCardShape()` builder in
  `tableFurniture.ts`, also adopted by `cardArrival.ts` so every mint site stays in sync)
  plus a locked, `opacity: 0.3` ghost with instance id `` `ghost:${instanceId}` `` so it
  never collides with the real card's dedup key. `cardLayout.ts` gained
  `commandZoneCardPosition()` (centered for 1, side-by-side for 2). The ghost's rendering
  and hit-testing (locked, non-interactive, and the Command Zone's owner-aware arming
  rule) are `tabletop-shape-mechanics` territory — this owner's stake is only the shared
  card props and the two contract fields.

## CONTEXT-MAP.md Lands, GLOSSARY Gets an Authoritative Face-Down Entry (2026-08-10)

**No code changed** — domain/glossary documentation for the `face-down-is-a-real-thing` TODO
item. Full details in interactions.md watch point 20a.

- `CONTEXT-MAP.md` created at the repo root (per `docs/agents/domain.md`'s spec — didn't exist
  before). Its "Flip / Face-down" translation entry reproduces the ship-comparison table that
  had lived only in tabletop.md's "The two ships mean different things by 'flip'" section
  (added `0337e00`), plus a new "Face-down modeled at all?" row.
- `notes/GLOSSARY.md` gained a "Face-down" entry — the two-axis model (face vs. concealment) as
  the authoritative source other docs can cite instead of re-explaining it inline.
- **Correction during review**: the first draft of the GLOSSARY entry claimed a two-faced card
  "cannot be turned face down." Verified false against `apps/tabletop/src/client/CardContextMenu.tsx`
  — "Turn face down"/"Turn face up" is ungated (applies to any card); only "Flip" is gated on
  `backImageUrl !== null`. Fixed: Flip and Turn-face-down/up are two separate gestures; a
  two-faced card cannot turn face down as its Flip action, but can via the generic gesture.
- Three backreferences in `owners/two-faced-cards/{README.md,interactions.md,tabletop.md}` that
  previously said "there is no CONTEXT-MAP.md in the repo yet" now point at it, while tabletop.md
  keeps its own detailed copy as this owner's source-of-record (deliberately not deduplicated).
- `apps/shuffler/src/port-tabletop/types.ts` gained a documentation-only comment after the
  `CardPlayedPayload` doc block: no field there models face-down, pointing at
  GLOSSARY.md/CONTEXT-MAP.md, explicitly Tabletop-side physics-map work, not a Shuffler TODO.

## Cards-Come-and-Go Ticket 05: Contract Validation Gets Real (2026-08-09)

Implements the "contract validation gets real" line ticket 02 (above) predicted, plus two
in-place schema amendments. `.scratch/tabletop-cards-come-and-go/issues/05-contract-validation-gets-real.md`.

- **`contracts/payloads/card.played.v1.json` amended in place**: removed the unused `seat:
  integer` field (dead weight since JES-128 — `seat` lives on `envelope.initiator.seatId`).
  Promoted `frontImageUrl`/`backImageUrl`/`cardName` from off-schema scaffolding into real,
  validated payload fields, per this owner's earlier review. `backImageUrl` is typed
  `["string","null"]` and is now **required, never omitted** — `null` means no printed back
  exists, per watch point 17.
- **`contracts/payloads/seat.joined.v1.json` amended in place**: removed `seatId`/`playerName`
  from the payload (now redundant with `envelope.initiator`).
- **Both in-place edits used the same "zero conforming producers/consumers yet" exception
  `envelope.v1` used at JES-128** — recorded explicitly in the ticket file as an exception,
  not left to read as new default policy. The exception evaporates the moment a real
  producer or consumer exists (most likely the Spine's ingestion).
- **`apps/tabletop/src/server/cardArrival.ts` and `seatJoined.ts` now validate the whole
  request body for real**, via new `apps/tabletop/src/server/contractValidation.ts` (ajv
  `Ajv2020` + `ajv-formats`, loading schemas from `contracts/` at module load). This
  retires the hand-rolled JES-128 `if`-chain `validationError` both files used to carry.
  `additionalProperties: false` on every schema means a stray field (e.g. `gameCardIndex`)
  can never arrive undetected.
- **Flagged, then resolved during the ticket-05/ticket-18 merge (2026-08-09, same day)**:
  ticket 18 (above) had already shipped `seat.joined`'s `commanders` array carrying
  `cardName`/`frontImageUrl`/`backImageUrl` — but its JSON schema entry only declared
  `card`, a real gap (`additionalProperties: false` would have rejected the other three
  fields the instant ajv validation went live, breaking commanders in production). Merging
  the two branches surfaced this and it was fixed then: `seat.joined.v1.json`'s commander
  item schema now requires `card`, `cardName`, `frontImageUrl`, `backImageUrl` — the same
  fields `buildSeatJoinedCommander` always sends. No asymmetry with `card.played` remains.
- No `CardDefinition` or `GameCard` shape change — this ticket is entirely in `contracts/`
  and the Tabletop's two receivers (plus the merge-time schema fix above).

## `let-gamecardindex-out` Built: `gameCardIndex` Now Rides `card.played`, For Real (2026-08-10)

The buoy tracked since the 2026-08-07 design decision (recorded above) is no longer just a
reversed rule — it's a populated field.

- **`contracts/payloads/card.played.v1.json`**: added optional integer `gameCardIndex` as a
  top-level sibling of `card`/`face`/`zoneHint`/etc — not required, not nested inside `card`.
  Edited v1 in place per the existing "optional sibling field" precedent (`owner`,
  `isCommander`, `frontImageUrl` et al) — no v2 bump.
- **`contracts/payloads/seat.joined.v1.json`**: same optional top-level `gameCardIndex`
  property added for schema symmetry, but nothing populates it — `seat.joined` has no single
  "the card" concept (asymmetric with `card.played`, consistent with the existing face-field
  asymmetry this KB already tracks for commander entries).
- **`apps/shuffler/src/port-tabletop/types.ts`**: `CardPlayedPayload.gameCardIndex: number` is
  now a **required** TS field, and `buildCardPlayedEvent` populates it from
  `gameCard.gameCardIndex` — so every `card.played` event now actually carries it, not just
  permits it structurally. `SeatJoinedPayload` gained an optional `gameCardIndex?: number`
  field but no builder populates it.
- **`apps/tabletop/src/server/cardArrival.ts` and `seatJoined.ts`**: local payload interfaces
  updated to accept the optional field; the Tabletop does not consume it anywhere — no new
  prop on the `mtg-card` shape, no rendering change.
- Tests inverted (not deleted) on both sides:
  `apps/shuffler/test/port-tabletop/{cardPlayedEvent,gateways}.test.ts` and
  `apps/tabletop/test/{cardArrival,seatJoined}.test.ts` now assert `gameCardIndex` is
  accepted/passed through rather than rejected/absent.
- **Net effect**: the "old ban is reversed" buoy note is no longer just planned —
  `card.played` has a live, populated `gameCardIndex` field with no consumer yet on the
  Tabletop side.
