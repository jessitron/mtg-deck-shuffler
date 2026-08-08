# Two-Faced Cards Architecture

## Data Model

### CardDefinition (`src/types.ts`)
Every card has:
- `twoFaced: boolean` — whether the card has a separate back image (drives the flip button)
- `cardTypes: string[]` — the union of every face's/part's types (e.g. `["Legendary","Creature","Planeswalker"]`)

Plus identity fields: `name`, `scryfallId`, `multiverseid?`, `oracleCardName`, `colorIdentity`, `set`. There is **no** `CardFace`/`backFace` and no `manaCost`/`cmc`/`oracleText` — those were removed (commit `f76b49c`) since the card is displayed as a Scryfall image and nothing read them. The flip button needs only `twoFaced` + `scryfallId`; library grouping needs only `cardTypes`.

### GameCard (`src/port-persist-state/types.ts:72-78`)
Runtime game state tracks:
- `currentFace: "front" | "back"` — which face is currently showing

### PersistedGameCard (`src/port-persist-state/persisted-types.ts:24-30`)
Persisted version also stores `currentFace`. On hydration, the full `CardDefinition` is loaded from the card repository, and `currentFace` comes from the persisted game card.

## What Counts as Two-Faced (layout allowlist)

**`twoFaced` means "two separate physical faces, each with its own image" — NOT "two entries in the source data's faces array."** Many single-image layouts (split, adventure, aftermath, flip, and Strixhaven's `prepare`) print both halves on one front face. They have two `faces` in the data but no back image, so a flip button would request a nonexistent Scryfall `face=back` image.

The single source of truth is `src/port-deck-retrieval/twoFacedLayouts.ts`:
- `DOUBLE_SIDED_LAYOUTS = ["transform", "modal_dfc", "reversible_card", "double_faced_token"]`
- `isDoubleSidedLayout(layout)` — true only for those layouts

Both adapters use it, so they agree on what's flippable.

## Data Flow: Ingestion

### Archidekt Adapter (`src/port-deck-retrieval/archidektAdapter/ArchidektDeckToDeckAdapter.ts:84-110`)
- `multiFace = faces.length === 2` — card has two faces in the data (any layout)
- `twoFaced = multiFace && isDoubleSidedLayout(layout)` — only genuinely double-sided layouts
- `cardTypes = multiFace ? union(faces[].types) : oracleCard.types` — every face's types, deduped. (Top-level types for split-layout cards are unreliable, so use the per-face arrays.)
- Reads `layout` from `archidektCard.card.oracleCard.layout` (`layout?: string` in `archidektTypes.ts`)

### MTGJSON Adapter (`src/port-deck-retrieval/mtgjsonAdapter/MtgjsonDeckAdapter.ts:66-100`)
- `twoFaced = isDoubleSidedLayout(mtgjsonCard.layout)` (shared with Archidekt)
- `cardTypes = union(card.types + every otherFaceIds face's types)`, resolved from `cardsByUuid`, **regardless of layout** — this captures the second part of adventure/split cards (e.g. `Eiganjo Dynastorian // Replenish` → `[Creature, Sorcery]`).
- Throws if a genuine double-sided card's other face can't be resolved (AllIdentifiers missing) — message "no other face found".

### Card Repository Storage (`src/port-card-repository/SqliteCardRepositoryAdapter.ts`)
- `card_types` column stores JSON-serialized `string[]`; `two_faced` stores 0/1
- `image_uris` / `back_image_uris` columns store JSON-serialized `CardImageUris` (nullable). Added via non-destructive `ALTER TABLE ADD COLUMN` (existing rows get NULL → fallback to constructed URLs).
- No `back_face`/`mana_cost`/`cmc`/`oracle_text` columns. The table is a gitignored cache; on startup an old-schema table (one lacking `card_types`) is DROPped and recreated.

## Data Flow: Flip in Game

```
User clicks "Flip" button
  → POST /flip-card/:gameId/:gameCardIndex  (inline flip)
  → POST /flip-card-modal/:gameId/:gameCardIndex  (modal flip)
    → loadGameFromParams middleware loads GameState
    → requireValidVersion middleware checks optimistic lock
    → GameState.flipCard(gameCardIndex) toggles currentFace
    → persistStatePort.save() persists new face state
    → Response: updated HTML fragment
      - inline: formatFlippingContainer() (just the flip container)
      - modal: full card-modal partial (with image, actions, navigation)
    → HX-Trigger: "game-state-updated" refreshes game container
```

### Inline Flip (`/flip-card/`)
- Returns the `formatFlippingContainer()` HTML, which replaces the `#card-N-outer-flip-container-with-button` element
- The flip button uses `hx-swap="outerHTML"` and `hx-target` pointing at its own container
- Uses `onclick="event.stopPropagation()"` to prevent the card click (which opens the modal) from firing

### Modal Flip (`/flip-card-modal/`)
- Returns the full card modal partial, replacing `#card-modal-container` contents
- Preserves navigation context: reads `navList` from request body and passes it through to the new flip button and nav arrows
- This was a hard-won design — earlier attempts tried to flip within the modal without a full re-render, which caused the modal to close

## Data Flow: Flip on Prep Page

There are two prep flip surfaces, both stateless:

```
User clicks "Flip" in prep card modal
  → GET /prep-card-modal/:prepId/:cardIndex?face=back(&navList=...)
    → Reads prep from persistence
    → Uses ?face query param to determine which face to show
    → Constructs image URL with face parameter
    → Flip button links back with opposite face value
    → No state mutation — purely URL-driven
```

```
User clicks "Flip" under the commander on the prepare screen (inline)
  → GET /prep-flip-card/:prepId/:cardIndex?face=back
    → Reads prep from persistence (404 if absent)
    → Finds the card via createPrepViewHelpers — same commanders-then-library-cards
      indexing as /prep-card-modal (404 unknown index, 400 single-faced)
    → Response: renderCommanderCard() — the WHOLE card container for that face
    → hx-swap="outerHTML" onto #card-N-container
    → No state mutation, nothing persisted
```

**Why prep swaps the whole container and game swaps only the flip container.** The
container carries the card-modal URL. In a game that URL needs no face — the modal route
reads `currentFace` off the game — so only the inner flip container is replaced. On the
prepare screen the face is *page state*, so the container's URL carries `?face=` and must
be re-rendered on every flip to stay truthful. Hence two different `hx-target`s from the
same function, chosen by `FlipRequest.page`.

**The rejected alternative, worth not re-deriving:** put `hx-vals='js:{face: …classList.contains("card-flipped") …}'`
on the container to read the face at click time. It fails. `hx-vals` is inherited by
descendants, the flip button is a descendant, and htmx appends GET params to an existing
query string (`R.indexOf("?") < 0 ? "?" : "&"`), so the button would request
`?face=back&face=front`. Express reads a repeated key as an **array**, so
`req.query.face === "back"` is false and the route silently serves the front face —
breaking Flip in the same invisible way as the original JES-90 bug.

Key difference from game flip: prep flip is stateless. The face is a query parameter, not persisted. On a page reload the card shows the front face again.

The two prep surfaces are deliberately one-way: the page tells the modal which face to open on (via `?face=` in the container's modal URL), but flipping *inside* the modal changes only the modal. That's intended — the modal is its own view of the card, not a controller for the page.

**Never point a prep surface at a game flip route.** `prepId` and `gameId` come from independent SQLite sequences (`game_preps` vs `game_states`), so a prepId handed to `/flip-card/:gameId/...` either finds no game or finds an unrelated one — and `validateStateVersion` allows a missing `expected-version`, so the unrelated game would be mutated and saved. This was the JES-90 bug.

## View Rendering

### `formatCardContainer()` (`src/view/common/shared-components.ts`)
Branches on `gameCard.card.twoFaced`:
- **Two-faced**: wraps card in `formatFlippingContainer()` with flip animation structure
- **Single-faced**: simple `<img>` tag

Takes an optional `flipRequest?: FlipRequest` that says how the flip button should ask for the other face. It defaults to `{ page: "game", gameId, expectedVersion }`, so game call sites pass nothing and get the POST behavior; the prepare screen passes `{ page: "prep", prepId }`.

### `FlipRequest` (`src/view/common/shared-components.ts`)
```typescript
type FlipRequest =
  | { page: "game"; gameId: number; expectedVersion?: number }  // POST, mutates state
  | { page: "prep"; prepId: number };                           // GET ?face=, stateless
```
This exists so the page asking for the flip is explicit rather than inferred from a numeric id — the two id spaces are not interchangeable (see the prep flip data flow above).

### `formatFlippingContainer()` (`src/view/common/shared-components.ts`)
Signature is `(gameCard: GameCard, flipRequest: FlipRequest)`. Builds the 3D CSS flip structure:
```
div.flip-container-with-button
  div.flip-container-outer [.card-flipped if back face showing]
    div.flip-container-inner
      img.two-sided-back  (back face image)
      img.two-sided-front (front face image)
  button.flip-button (per flipRequest: POST /flip-card/ in game, GET /prep-flip-card/?face= in prep)
```
Both face images are always in the DOM. CSS 3D transforms with `backface-visibility: hidden` show only the current face. The `.card-flipped` class triggers a 180-degree Y rotation.

### Image URLs (`src/types.ts`)
Two functions now exist:
- **`getCardImageUrl(card: CardDefinition, format, face)`** — the one views call. Prefers the **stored** Scryfall URL on the card (`card.imageUris` for front, `card.backImageUris` for back), falling back to construction when absent.
- **`constructCardImageUrl(scryfallId, format, face)`** — the old by-hand construction (`https://cards.scryfall.io/{format}/{face}/{id[0]}/{id[1]}/{scryfallId}.{ext}`), kept as the fallback. The `face` (`"front"`/`"back"`) is part of the path.

**Why stored URLs:** the bare constructed `normal` URL 404s for very recently released cards (e.g. Arcane Signet, set ECC) — Scryfall only serves them at the **versioned** URL (`...jpg?<timestamp>`). The stored URLs are copied verbatim from Scryfall (so they carry the `?<version>` tag).

`CardDefinition` carries two **optional** fields for this: `imageUris?: CardImageUris` (front/only face) and `backImageUris?: CardImageUris` (present only when `twoFaced`). `CardImageUris = Partial<Record<ImageFormat, string>>`, storing only the formats the app uses (`normal`, `large`, `png`, `art_crop`). Both faces still share **one** `scryfallId`; the back is no longer derived by path-swapping the same id at render — it comes from `card_faces[1].image_uris` at ingestion. The fields are optional with a graceful fallback, so legacy data (no stored URLs) still renders via construction.

### Image enrichment at ingestion (`src/port-card-images/`)
A new port fetches Scryfall image URLs by scryfallId:
- `CardImagesPort` / `FetchedCardImages` (`{front, back?}`) — `types.ts`
- `ScryfallCardImagesGateway` — batches `POST https://api.scryfall.com/cards/collection` (75 ids/request, caches across calls, sends `User-Agent`+`Accept` headers Scryfall requires). Pure mapper `mapScryfallCardToImages`: single-faced reads top-level `image_uris`; genuine DFCs read `card_faces[0].image_uris` (front) and `card_faces[1].image_uris` (back).
- `FakeCardImagesGateway` — test fake (synthesizes deterministic versioned URLs, or seed specific ids).
- `enrichDeckWithImages(deck, port)` — collects unique scryfallIds, fetches, attaches `imageUris` to every card and `backImageUris` only to `twoFaced` cards. Best-effort: cards Scryfall doesn't return are left unset → fallback.

Enrichment runs: Archidekt adapter (optional injected `imagesPort`, wired in `server.ts` + `download-deck` script), and the `fetch-mtgjson-precons` script after conversion. The MTGJSON adapter's `convertMtgjsonToDeck` stays synchronous (enrichment is a separate post-pass).

## CSS Animation

Two separate CSS files define flip styles:

### `public/game.css` (lines 104-143)
- Card dimensions: 200px × 278px
- `perspective: 1000px` on outer container
- `transition: transform 0.8s` on inner container
- `transform: rotateY(180deg)` when `.card-flipped`
- `translateX(-100px)` offset for centering

### `public/prepare.css` (lines 221-276)
- Same flip mechanics but with prep-page-specific styling
- Additional `.flip-button` styling (positioned below card)
- `.flip-container-with-button` layout container

### `public/playmat.css` (line 463)
- `.modal-action-button.flip-button` — styles the flip button inside the card modal

## How to Tell Which Face Is Showing (observables for tests)

Face state is observable in the DOM, differently on each surface.

**Inline (game and prep pages)** — the strong one:
- `.flip-container-outer` gains the class **`.card-flipped`** when `currentFace === "back"`
  (`formatFlippingContainer`, `shared-components.ts:104`). Assert on the class, not the
  animation — the 0.8s transition is the animations owner's territory and `.card-flipped`
  is applied server-side, present the instant the swap settles.
- Both face images are always in the DOM (`.two-sided-front` / `.two-sided-back`), so image
  presence proves nothing; only the class distinguishes.

**Card modal (game and prep)** — the strong observable here too:
- **`.card-modal-overlay` carries `data-current-face="<%= currentFace %>"`** (added to
  `views/partials/card-modal.ejs`; `currentFace` was already passed into the template, just
  never rendered). Assert `data-current-face` equals `"front"`/`"back"` — this works
  identically on both the game and prep modals, closing the gap where the game modal
  previously had no reliable face observable. `verify-library-grouping.spec.ts` uses this.
- The older indirect observables still work and remain useful when the attribute isn't
  convenient to check:
  - **`img.modal-card-image`'s `src`** — `getCardImageUrl(card, "large", currentFace)`, so it
    differs between faces on both pages. With stored URLs the two faces are different Scryfall
    files (`card_faces[0]` vs `[1]`); with the constructed fallback the path segment is
    `/large/front/` vs `/large/back/`. Same URL also appears in the Copy button's `onclick`.
  - **Prep only: the flip button's own `hx-get`** carries the *target* face —
    `/prep-card-modal/:prepId/:i?face=<other>` (`app.ts:945-951`). Showing the front ⇒ the
    button reads `?face=back`, and vice versa. The **game** flip button is a `hx-post` to a
    toggling route, byte-identical on both faces, so it was never usable as an observable —
    `data-current-face` is the fix for that gap specifically.

## Type Merging for Library Search

In both game and prep library modal routes (`src/app.ts`), when mapping cards for the library search template:
```typescript
cardTypes: gc.card.cardTypes
```
`cardTypes` is already the deduplicated union of all faces' types (computed at ingestion), so a transform card appears in all relevant type groups with no per-request merge. (Before commit `f76b49c` this merged `card.types` with `card.backFace?.types` here.)
