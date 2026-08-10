# Two-Faced Cards Interactions

This is the most cross-cutting feature in the app. Two-faced cards add complexity to almost every feature that touches card display, data, or persistence.

## Depends On

### Scryfall (image URLs + image API)
- Image URLs are **stored** on the card (`imageUris`/`backImageUris`), fetched from Scryfall at ingestion via `src/port-card-images/` (`ScryfallCardImagesGateway` → `POST /cards/collection`). `getCardImageUrl(card, format, face)` prefers the stored URL; `constructCardImageUrl(scryfallId, format, face)` is the fallback.
- Both faces still share the same `scryfallId`. At render the back is read from `card.backImageUris`; at ingestion it comes from `card_faces[1].image_uris`. When stored URLs are absent (legacy data, Scryfall miss), the back falls back to the constructed `face=back` path — so the old "same id, swap the path segment" behavior still exists as the fallback.
- **Why stored:** bare constructed `normal` URLs 404 for freshly-released cards; Scryfall only serves them at the versioned URL (`...jpg?<timestamp>`).
- Scryfall requires a real `User-Agent` (else 400 — Node's default `User-Agent: node` is rejected by their Cloudflare front end, on the image CDN as well as the API). All outbound Scryfall calls go through `fetchScryfall()` in `src/scryfall-http.ts`, which sets it; `/proxy-image` shipped without one and 400'd every card copy until JES-136. Use `fetchScryfall`, not bare `fetch`, for any new Scryfall request.
- If Scryfall's path scheme changes, the stored URLs still work (verbatim from Scryfall); only the fallback `constructCardImageUrl()` in `src/types.ts` would need updating.

### Card Repository
- `SqliteCardRepositoryAdapter` stores `card_types` as JSON text column (no `back_face`/`mana_cost`/`cmc`/`oracle_text`)
- The cards table is a gitignored cache; on startup an old-schema table (lacking `card_types`) is DROPped and recreated
- Hydration/dehydration in `src/port-card-repository/hydration.ts` preserves `currentFace`

### Deck Adapters
- **Both adapters share `src/port-deck-retrieval/twoFacedLayouts.ts`** (`isDoubleSidedLayout()` / `DOUBLE_SIDED_LAYOUTS`) — the single source of truth for what's flippable
- Archidekt adapter: `twoFaced = faces.length === 2 && isDoubleSidedLayout(layout)`. `cardTypes` = union of all faces' types. Single-image layouts (`prepare`, `adventure`, `split`, `aftermath`, `flip`) are NOT two-faced but still contribute all their parts' types to `cardTypes`.
- MTGJSON adapter: `twoFaced = isDoubleSidedLayout(layout)`; `cardTypes` = union of the card's types + all `otherFaceIds` faces' types (any layout)
- MTGJSON requires AllIdentifiers data to resolve other faces by UUID (for `cardTypes` and the double-sided guard)

### Modal System
- Card modal (`views/partials/card-modal.ejs`) receives `currentFace` and renders the flip button conditionally
- Game flip uses `POST /flip-card-modal/` replacing `#card-modal-container`
- Prep flip uses `GET /prep-card-modal/` with `?face=` query parameter

### Prep vs Game Id Spaces
- `prepId` (`game_preps`) and `gameId` (`game_states`) are **independent** auto-increment sequences — the same number can name both a prep and an unrelated game
- `validateStateVersion` treats a missing `expected-version` as valid, so a stray game-route call is not caught by the optimistic lock
- Therefore prep surfaces must call prep routes. `FlipRequest` (`{page:"game"|"prep"}`) makes the asking page explicit rather than letting a prepId masquerade as a gameId

### Optimistic Locking
- Both flip routes use `requireValidVersion` middleware
- Flip changes state version (via persist), so stale clients get version errors

## Depended On By

### Library Search (tight coupling)
- Type grouping reads `gc.card.cardTypes` directly at `src/app.ts` (game library modal ~lines 523-528 and prep library modal ~lines 825-830) — no per-request merge, since `cardTypes` is pre-unioned at ingestion
- If `cardTypes` stops being the full union (e.g. an adapter only stores the front type), grouping silently loses groups
- Multi-face cards show in multiple type groups (e.g., Creature and Planeswalker)

### Card Display (every card rendering path)
- `formatCardContainer()` branches on `card.twoFaced` to decide between simple `<img>` and `formatFlippingContainer()`
- Any new card display context must handle the two-faced branch
- The flip container has nested divs that affect CSS selectors — animations targeting `.mtg-card-image` need to reach inside `.flip-container-inner`

### Commander Display
- `formatCommandZoneHtmlFragment()` calls `formatCardContainer()` which handles two-faced commanders
- Commander cards can be two-faced (e.g., Nicol Bolas, the Ravager)

### Card Modal Navigation
- Modal flip preserves `navList` for group-scoped navigation
- Game: `navList` passed in POST body, threaded through to new flip button's `hx-vals`
- Prep: `navList` passed as query parameter in flip button's `hx-get` URL
- If navigation changes, both flip routes need updating

### Game State Persistence
- `PersistedGameCard` includes `currentFace`
- `GameState.flipCard()` mutates `currentFace` on the GameCard
- State migration (v3→v4) defaults `currentFace` to `"front"` for legacy data

### Copy-to-Clipboard
- Card copy uses the current face's image URL
- The `copyCardImageToClipboard()` call in the modal receives the face-specific image URL
- The `/proxy-image` route (CORS proxy for copy) now **looks up the card** from `cardRepository` to use its stored URL, falling back to `constructCardImageUrl(cardId, "png", face)` when the card isn't cached
- `/proxy-image` fetches from Scryfall via `fetchScryfall()` — see the Scryfall section above. Covered end-to-end (both faces, live CDN) by `test/verification/verify-proxy-image.sh`

### Being-Played Animation
- CSS animation for cards being played must target images inside the flip container's nested structure
- Fix at `e904a8c` addressed this — regression risk if card container structure changes

### Test Infrastructure
- Test generators (`test/generators.ts`) generate `cardTypes` and a `twoFaced` boolean (no `CardFace`/`backFace`)
- `nicolBolas` fixture in generators is a ready-made two-faced card for tests

### The Tabletop port (card.played sender, JES-127)
- `src/port-tabletop/types.ts` `buildCardPlayedEvent` is the ONE door where a GameCard is serialized for the table. Any new face semantics (a third face? partner backs?) must go through here and the contract (`contracts/payloads/card.played.v1.json` — schemaVersion bump, new file, **unless** the schema still has zero conforming producers/consumers, the ticket-05 in-place-edit exception — see [contract.md](contract.md)).
- **Landed (2026-08-08, ticket 12)**: `imageUrl` is gone, **replaced** by `frontImageUrl: string` (always `getCardImageUrl(card, "normal", "front")`) and `backImageUrl: string | null` (`getCardImageUrl(card, "normal", "back")` when `card.twoFaced`, else `null` — computed from `twoFaced`, never from whether `card.backImageUris` happens to be populated, per the watch point in [tabletop.md](tabletop.md#watch-points)). `face: gameCard.currentFace` is unchanged but now documented as "which face is up on arrival," not "which face I baked in." At the time this was zero contract churn (those fields were scaffolding, not contract) — **superseded 2026-08-09, ticket 05**: `frontImageUrl`/`backImageUrl`/`cardName` are now real, `required` properties on `card.played.v1.json` (promoted in place; `card.played.v1.json` also lost an unused `seat: integer` field, redundant with `envelope.initiator.seatId`). The field-by-field comment block above `CardPlayedEvent` and the interface itself were updated together. **Also landed same day, table-layout ticket 18**: `owner: string` (seatId) and `isCommander: boolean` joined the same payload, `required`, edited in place — no v2. The matching edit is the hand-rolled `validationError` in `apps/tabletop/src/server/cardArrival.ts` (which briefly required `frontImageUrl`/`backImageUrl`/`owner`/`isCommander` all at once) — **ticket 05 then replaced that hand-rolled check entirely** with real ajv validation against the schema (`apps/tabletop/src/server/contractValidation.ts`). `test/port-tabletop/cardPlayedEvent.test.ts` asserts the new shape, including a case with `backImageUris` unset on a `twoFaced` card to prove the derivation is from `twoFaced`, not from stored-URI presence.
- **On the Tabletop side, the payload now lands directly in shape `props`** — no baking, no unbaking. `handleCardArrival` (`cardArrival.ts`) destructures the validated envelope's payload and writes `frontImageUrl`/`backImageUrl`/`face`/`owner`/`isCommander` straight into the `mtg-card` shape's `props` via the shared `mtgCardShape()` builder (`tableFurniture.ts`, table-layout ticket 18 — also used by `seatJoined.ts` for commanders) (see [tabletop.md](tabletop.md)). **Flip and turn-face-down are built** (physics ticket 17, 2026-08-09, `eb24a4f`): `apps/tabletop/src/client/CardContextMenu.tsx` writes `props.face` and `props.faceDown` from a right-click context menu — the first Tabletop code to write either field.
- **Contract validation is now real, not hand-rolled (ticket 05, 2026-08-09)**: both `cardArrival.ts` and `seatJoined.ts` validate the whole posted envelope+payload via ajv (`apps/tabletop/src/server/contractValidation.ts`), loading schemas straight from `contracts/`. `seat.joined.v1.json` also dropped `seatId`/`playerName` (redundant with `envelope.initiator`) in the same pass. **Ticket 18's `commanders` array had shipped the same day carrying `cardName`/`frontImageUrl`/`backImageUrl` off-schema** (its item schema only declared `card`) — merging the two branches surfaced that `additionalProperties: false` would reject those fields the moment ajv validation went live, so it was fixed as part of the merge: the commander item schema now requires `card`/`cardName`/`frontImageUrl`/`backImageUrl`, matching `buildSeatJoinedCommander` exactly. No asymmetry with `card.played` remains. See [contract.md](contract.md)'s ticket-05 section.
- Discard keeps `currentFace` (a flipped card is discarded as the face it was); mulligan resets it. If you add zone-moving operations, decide face-reset explicitly.
- **SETTLED (2026-08-08): the Shuffler is authoritative for `currentFace`; flip-on-table is table-local.** Decided in two halves. Physics ticket 06 (`575416b`): Jess accepted the divergence knowingly — a table-flipped card later discarded shows the pre-flip face on the Shuffler's screen and in copy-to-clipboard; "table becomes authoritative" would have required the Shuffler's first-ever inbound event listener. Cards-come-and-go ticket 02 (`7b7f868`) confirmed it on the wire: **`card.returned.v1` carries no `face` and no `faceDown`** (Jess: "cards removed from play no longer have a face up") — the table resets both axes locally on exit (ticket 06's rule), the Shuffler applies its own face rules on arrival, and the wire says nothing. Don't add a face field to return/removal events, and don't build a table→Shuffler face-sync channel.

## Watch Points

These are specific things that could break two-faced cards if changed elsewhere:

1. **CardDefinition changes**: `CardDefinition` is intentionally minimal — identity fields, `twoFaced`, `cardTypes`, plus the optional `imageUris`/`backImageUris` (Scryfall image URLs). Don't re-add per-face card *text* (`manaCost`/`oracleText`/`cmc`/`backFace`); the card image is the source of truth and a future "is this hand worth keeping?" feature should read canonical data from MTGJSON/Scryfall. Image URLs are the deliberate exception — they're read on every render and *are* the image. If you add a field, both adapters and the SQLite cache schema must populate it. **An optional field with a graceful fallback (like `imageUris`) does NOT require a version bump** — see watch point #9 and the "optional fields" exception in `DESIGN-persistence-versioning.md`.

2. **New card display contexts**: Any new place that renders a card image must handle `twoFaced === true`. Use `formatCardContainer()` rather than building card HTML directly.

3. **CSS selector depth**: The flip container has 3 levels of nesting (`flip-container-outer` → `flip-container-inner` → `img`). CSS rules targeting `.mtg-card-image` or card animations must account for this depth.

4. **Modal re-render on flip**: The modal flip route re-renders the ENTIRE modal. If the card modal template adds new data requirements, the `/flip-card-modal/` route must also provide them.

5. **HTMX swap targets**: The inline flip button's `outerHTML` target differs by page — `#card-N-outer-flip-container-with-button` in a game, `#card-N-container` on the prepare screen (because the container's modal URL carries the face there). Changing either ID scheme, or adding wrapper elements, breaks inline flip on that page. Both come from `formatFlippingContainer`.

6. **Prep flip gaining persistence**: Currently prep flip is stateless (query param) on both surfaces — the card modal (`/prep-card-modal/?face=`) and the inline commander (`/prep-flip-card/?face=`). When this changes, the prep page will need a persistence mechanism for flip state, and **both** prep routes will need to read/write it.

   Note the one-way coupling is **deliberate, not a gap**: the page passes its face to the modal, but flipping in the modal leaves the page alone (Jess, 2026-07-27: "If I flip the card in the card modal, I actually don't want that to change the state on the page"). Don't "fix" it into two-way sync. Guarded by `verify-prep-commander-flip.spec.ts`.

6a. **New prep card surfaces**: Anything new on the prepare screen that renders a two-faced card inline must pass `flipRequest: { page: "prep", prepId }` to `formatCardContainer()`. Omitting it falls back to the game flip route with `gameId` — the JES-90 bug (see "Prep vs Game Id Spaces" above). Note that `renderPrepCommanderCard`'s regex rewrite of `/card-modal/` → `/prep-card-modal/` does **not** cover the flip button, and can't: the flip URL encodes the target face, so it has to be built where `currentFace` is known.

6b. **Don't reach for `hx-vals='js:…'` to pass the face**: it looks like the obvious way to read the `card-flipped` class at click time, and it breaks. `hx-vals` is inherited by descendants (the flip button is one), and htmx appends GET params to an existing query string, producing `?face=back&face=front`. Express reads a repeated key as an array, so a `req.query.face === "back"` check silently falls through to the front face. The face travels in the re-rendered container's URL instead. Full reasoning in [architecture.md](architecture.md#data-flow-flip-on-prep-page).

7. **New deck adapters**: Must determine `twoFaced` via `isDoubleSidedLayout(layout)` (from `twoFacedLayouts.ts`) and set `cardTypes` to the union of ALL faces'/parts' types. Do NOT infer two-faced from "two faces in the data" — split/adventure/prepare cards have two faces but one image (so `twoFaced=false`) yet still contribute both parts' types to `cardTypes`.

8. **Precon deck regeneration**: Required whenever the deck file format changes (bump `PERSISTED_DECK_VERSION` — see [`apps/shuffler/notes/DESIGN-persistence-versioning.md`](../../apps/shuffler/notes/DESIGN-persistence-versioning.md)). When regenerating, AllIdentifiers data must be available for the MTGJSON adapter to resolve other faces. Without it, the adapter throws an error. AllIdentifiers.json now exceeds Node's max string length, so `fetch-mtgjson-precons.ts` stream-parses it with `stream-json` (commit `5b3e5b5`) rather than `fs.readFile` + `JSON.parse`. If you touch `loadCardDatabase()`, keep it streaming — a whole-file read will throw `RangeError: Invalid string length`.

9. **Game/prep state version**: `currentFace` is persisted on `PersistedGameCard`. Persisted state is now version-gated and **rejected** rather than migrated: `PERSISTED_GAME_STATE_VERSION` (now **10**) and `PERSISTED_GAME_PREP_VERSION` (3), and `fromPersistedGameState` / the prep routes throw `IncompatibleStateVersionError` / `IncompatiblePrepVersionError` (clear 410 page) for older versions. (8→9 added `mulliganStage`/`mulliganCount` to the envelope; 9→10 removed them again — the mulligan stage/count are now DERIVED from the event log via "deal opening hand"/"mulligan" events; 10→11 made those events atomic with their `moves` so a mulligan is one undoable event.) **If you change the card-data or persisted shapes again, follow the runbook: [`apps/shuffler/notes/DESIGN-persistence-versioning.md`](../../apps/shuffler/notes/DESIGN-persistence-versioning.md)** — a `CardDefinition` field change normally means bumping all three version constants, **unless** the field is optional with a graceful fallback (like `imageUris`/`backImageUris`), in which case old data stays valid and no bump is needed (see the runbook's "optional fields" exception).

   Also: `GameState.mulligan()` resets each returning hand card's `currentFace` to `"front"` as it goes back to the library, so a redrawn two-faced card starts on its front (matching `newGame`). If you add more zone-moving operations that should "reset" a card, consider whether they too should clear `currentFace`.

10. **Single-image multi-face layouts** (`prepare`, `adventure`, `split`, `aftermath`, `flip`): These are deliberately NOT two-faced (no flip button) but DO contribute all their parts' types to `cardTypes`, so they appear under every relevant group in library search (e.g. a Prepared creature shows under both Creature and Sorcery). If a future feature needs both halves shown as images, that's a display feature, not a flip — don't reach for `twoFaced`.

11. **Stale cached deck files**: `twoFaced`/`cardTypes` are baked into `decks/*.json` at download time. Changing adapter logic does NOT retroactively fix already-downloaded decks — they keep their old values until re-downloaded (`npm run deck:download -- <id>` for Archidekt, `npm run precons:fetch-mtgjson -- --convert` for MTGJSON). The deck-file format is version-gated (`PERSISTED_DECK_VERSION`, currently 3); `LocalFileAdapter` rejects mismatched files, so a format change means regenerating all decks.

12. **Don't collapse `face` and face-down into one bit** (decided 2026-08-07). `face`
    (`front`|`back`) is *which printed side*; face-down is *concealment*, and a two-faced
    card can be played face down — so both axes are reachable in normal play. A one-bit
    "which side is up" model was proposed and **rejected**; don't re-derive it. Corollary
    that catches people: `face: "back"` is **unreachable on a one-faced card** — a
    one-faced card turned over is face-down. If you find yourself wanting `face: "back"`
    for a card with one printed side, you want face-down instead.

13. **"Flip" means different things on the Shuffler and the Tabletop — on purpose.** On the
    Shuffler a one-faced card **cannot** be flipped (no affordance; `GameState.flipCard()`
    throws). On the Tabletop **any** card can be turned over, because it's a physical
    object. Do not "fix" the Shuffler to allow flipping one-faced cards for consistency,
    and do not port the Shuffler's `twoFaced` gate onto a Tabletop turn-over gesture. Full
    translation table now lives in `CONTEXT-MAP.md`'s "Flip / Face-down" section (root of the
    repo, added 2026-08-10); this owner's own copy is in [tabletop.md](tabletop.md).

14. **Face-down is modeled only on the Tabletop — and both the gesture and both
    renderings are now built.** Ticket 02 (2026-08-07, `c956949`) gave it a home:
    `faceDown: boolean` in the `mtg-card` shape's `props`. Table-layout ticket 17
    (2026-08-08, `0a768e6` + `bfdc877`) built the sleeved half:
    `MtgCardShapeUtil.component()` renders a **sleeved + faceDown** card as the bare solid
    `sleeveColor` rectangle, with the color **baked into the shape's props at mint time**
    by `cardArrival.ts` (legal because sleeve color is a game constant — see watch point
    17). **Physics ticket 17 (2026-08-09, `eb24a4f`) built the rest**: the shape gained
    `cardBackImageUrl: string | null`, baked at mint from `playerArea.cardBackImageUrl`
    (same game-constant argument), and the **unsleeved** faceDown branch now renders it
    as an `<img>` — falling back to a flat `#3a3a3a` rectangle when no card back was
    baked in (a seat that predates the prop, or redeploy-wiped seat memory). A new
    tldraw `ContextMenu` (`CardContextMenu.tsx`) provides "Flip" (`props.face` swap,
    gated on `backImageUrl !== null`) and "Turn face down"/"Turn face up" (convergent
    `props.faceDown` toggle across the selection) — the first code anywhere in the
    Tabletop to write either field. `faceDown` is no longer hardcoded `false` after
    arrival; it's still `false` at mint (unchanged). Still nothing on `CardDefinition`,
    `GameCard`, `PersistedGameCard`, or in `contracts/` (concealment-wise) — the gesture
    is entirely table-local; a Shuffler "Play Face-Down" button remains dropped to the
    Mural-parity buoy list.

15. **Concealment is depicted, never enforced — and no gesture may be gated on control.**
    The leak question this owner raised (a face-down card's identity is readable by every
    client through synced tldraw props) was resolved by **not guarding it**, on Jess's
    principle in `notes/DESIGN-the-table-vision.md` § Principles: *"everything that can be
    done by one player is doable by any player."* The Tabletop has **no ownership or
    permission model**. Two standing consequences: identity stays in `props` on a face-down
    card, and **never gate a flip / turn-over / peek on who controls the card** — that
    design space is closed, not unexplored. Related: the old "`gameCardIndex` never leaves
    the Shuffler" rule is **being reversed** (buoy `let-gamecardindex-out` in `TODO.md`) —
    don't cite it as binding. What survives is that payloads should say what happened and no
    more (SEAMAP's "hand counts but never hands"), which is a constraint on payload *design*,
    not a check on every boundary. Full reasoning in [contract.md](contract.md) and
    [tabletop.md](tabletop.md).

16. **Face state in the card modal is now strongly observable — resolved 2026-08-07.**
    Previously there was no `data-face`, no class, and no face-dependent text in the modal (a
    DFC's `card.name` is the whole `"Front // Back"` string, so the modal title and `alt` are
    identical on both faces), which meant a flip test could pass without a flip. Fixed by
    adding `data-current-face="<%= currentFace %>"` to `.card-modal-overlay` in
    `views/partials/card-modal.ejs` — a pure additive attribute, `currentFace` was already
    threaded into the template. Consequences:
    - **Inline surfaces**: still assert `.flip-container-outer.card-flipped`. It's
      server-rendered, so it's true the moment the htmx swap settles — no animation wait.
      `verify-prep-commander-flip.spec.ts` does exactly this.
    - **In the modal**, assert `.card-modal-overlay`'s `data-current-face` attribute — works
      identically on game and prep. The older indirect observables (`img.modal-card-image`'s
      `src` on both pages; on prep only, the flip button's `hx-get` target face) still work
      and are documented in
      [architecture.md](architecture.md#how-to-tell-which-face-is-showing-observables-for-tests)
      but `data-current-face` is now the first choice, and the only strong one available in
      the **game** modal (whose flip button is a `hx-post` to a toggling route, identical on
      both faces).
    - **The gap this closed**: both `foundFlipCard` loops in
      `test/verification/verify-library-grouping.spec.ts` used to click the modal flip button
      and assert only that the position indicator was unchanged — the property genuinely
      under test (flipping must not renumber group-scoped navigation), but also what a
      swallowed click produces. Both loops now additionally assert
      `await expect(cardModal).toHaveAttribute('data-current-face', 'back', { timeout: 3000 })`
      after the click, in both the game and prep flow, so a swallowed click now fails the test
      instead of passing silently.
16. **tldraw shape-selection/drag mechanics moved to its own owner** (2026-08-07). The
    `onClick`-defers-selection quirk found while fixing `959831c` (drag picking up the
    wrong card) is pure tldraw `SelectTool` mechanics, not a card-face concern — it and its
    watch points now live in `owners/tabletop-shape-mechanics/`. Consult that owner, not
    this one, for anything touching click/drag/selection behavior on `MtgCardImageShapeUtil`
    or its successors (including ticket 02's `mtg-card` rewrite).

17. **Sleeve color is a separate prop, never smuggled into `backImageUrl` — decided
    ticket 11, BUILT ticket 17 (table-layout, 2026-08-08, `0a768e6` + `bfdc877`).**
    `sleeveColor` (optional hex) travels as its own field on `seat.joined` player data
    (not a data: URI, not a Shuffler-served image — it's *player identity* and counters
    need the raw hex); the Shuffler's `SeatJoinedEvent`/`buildSeatJoinedEvent` carry it,
    sourced from the prep. `cardBackImageUrl` is **omitted when a sleeve is defined** —
    enforced on both ships (`buildSeatJoinedEvent` on the Shuffler, `tableFurniture.ts`
    on the Tabletop) — and `sleeveColor` wins if both arrive; the Tabletop 400s a
    non-`#rrggbb` value. `contracts/payloads/seat.joined.v1.json` now records all of
    this. At card arrival `cardArrival.ts` bakes the seat's sleeve into the `mtg-card`
    shape's props (`sleeveColor: playerArea.sleeveColor ?? null`) — sleeve never enters
    the `card.played` payload; it comes from **seat memory** — legal because **sleeve
    color is a game constant** (chosen pre-game, immutable mid-game; that immutability
    is what dissolved ticket 02's "never bake per-card" rule). This owner's invariant
    held and stays binding: **`backImageUrl: null` ⇔ no printed back exists** is
    untouched; `sleeveColor` is its own nullable prop, mirroring `backImageUrl`.
    Rendering as decided (three branches in `MtgCardShapeUtil.component()`): sleeved
    face-down / library pile = solid sleeve rectangle; face-up sleeved card = image
    centered inside the sleeve frame (proportional padding `w*0.03`; **square corners**
    since `e53a27e`, 2026-08-09 — Jess: "sleeves are rectangular", the ticket-17
    `w*0.05` radius was removed);
    unsleeved cards keep today's look (unsleeved face-down deferred to ticket 06 —
    watch point 14). The "until sleeve selection exists" comment on `cardBackImageUrl()`
    in `apps/shuffler/src/port-tabletop/types.ts` was updated as this watch point asked.
    **No `card.played` rev** — held. Jess's stated future (not v1): a sleeve may someday
    carry an image URL and two colors (front border vs back).

18. **`face` rides only events that show a card; removal events are faceless — decided,
    not built (cards-come-and-go ticket 02, 2026-08-08).** The event vocabulary sorts
    card events into face-carrying and faceless by one question: does this event reveal
    or choose a face? `card.played` and the new `card.discarded.v1` carry `face` (a
    discard shows the card publicly); `card.returned.v1`, `undo.card.played.v1`,
    `undo.card.discarded.v1`, and the `commanders` entries on `seat.joined` carry
    **none** (commanders always arrive in the command zone face up; table-flipping one
    afterward is table-local). When adding a new card event kind, apply the same
    question — don't cargo-cult `face` onto it. Two corollaries: `card.played.v1`'s
    `zoneHint` narrows to `stack | battlefield` (graveyard traffic moves to
    `card.discarded`), and the commanders' off-schema scaffolding
    (`cardName`/`frontImageUrl`/`backImageUrl`) makes `seat.joined` a **second sender
    site** bound by the `backImageUrl`-derived-from-`twoFaced` rule (see
    [tabletop.md](tabletop.md#watch-points)), with the same test treatment as
    `cardPlayedEvent.test.ts`. **Still off-schema as of ticket 05 (2026-08-09)** — that
    ticket promoted the identical trio to real, `required` schema fields on
    `card.played.v1.json` but deliberately left `seat.joined`'s future `commanders`
    entries as a flagged, unresolved asymmetry rather than contractizing them too. See
    [contract.md](contract.md)'s ticket-05 section for the note left for ticket 10.

19. **The library-entry face/faceDown reset only covers "library" — there is no "hand"
    zone to also cover** (physics ticket 17, 2026-08-09). Ticket 06 phrased the reset
    as "a card returning to hand or library" resets both axes; `MtgCardShapeUtil`'s
    `NON_BATTLEFIELD_ZONES` set (and the wider zone model) has no `hand` zone anywhere
    in this codebase, so the implementation — and the ticket file itself, corrected in
    `ff5d58a` — honestly says "library" only. If a `hand` zone is ever added, this reset
    needs to cover it too; don't assume it already does because the ticket's prose once
    said "hand or library."
20a. **`CONTEXT-MAP.md` now exists at the repo root (2026-08-10) and carries the
    fleet-wide "Flip / Face-down" translation, sourced from tabletop.md.** `notes/GLOSSARY.md`
    gained an authoritative "Face-down" entry (the two-axis model, corrected during review —
    see below) that other docs, including this KB's own README/interactions/tabletop.md
    backreferences, now point to instead of re-explaining the model inline. tabletop.md's copy
    of the ship-comparison table stays as this owner's own source-of-record detail (deliberately
    not deduplicated). **No code changed** — this is domain/glossary work for the
    `face-down-is-a-real-thing` TODO item, not the wire-level `faceDown` field or a Shuffler
    "Play Face-Down" button (both remain out of scope, tracked separately).
    - **Correction caught in review**: the GLOSSARY entry's first draft claimed a two-faced
      card "cannot be turned face down" — wrong. Verified in
      `apps/tabletop/src/client/CardContextMenu.tsx`: "Turn face down"/"Turn face up" applies
      uniformly to any selected card regardless of `backImageUrl`/twoFaced; only "Flip" is
      gated on `backImageUrl !== null`. Fixed wording (now in both GLOSSARY.md and
      CONTEXT-MAP.md): Flip and Turn-face-down/up are two separate gestures — a two-faced card
      cannot turn face down *as its Flip action*, but it absolutely can via the generic
      Turn-face-down/up gesture, same as a one-faced card.
    - `apps/shuffler/src/port-tabletop/types.ts` gained a documentation-only comment after the
      `CardPlayedPayload` doc block, noting no field there models face-down, pointing readers at
      `notes/GLOSSARY.md`/`CONTEXT-MAP.md`, and stating this is Tabletop-side physics-map work,
      not a Shuffler TODO. No field, type, or schema changed.

20. **`mtg-card` gained `owner` and `isCommander` — table-layout ticket 18 (2026-08-09).**
    `mtg-card.props` gained `owner: string` (seatId) and `isCommander: boolean`
    (`apps/tabletop/src/shared/mtgCardShape.ts`) — first-class, schema'd, synced, granting
    **no capability** (any player can still move any card; the arming/hit-testing side of
    this belongs to `owners/tabletop-shape-mechanics/`, not this owner). This resolves the
    tension `tabletop-physics` ticket 02 left open (no owner/seat field at all) — the design
    ticket (`.scratch/tabletop-table-layout/issues/08-commander-in-command-zone.md`)
    explicitly amended that closed decision: owner is real domain state on the card, not a
    derived/local-only rendering value. `card.played.v1.json` gained both as **required**
    fields, edited in place (no v2) — the same posture as `face`/`frontImageUrl`/
    `backImageUrl` in ticket 12, though those weren't `required`; this is the precedent that
    a required-field addition to v1 was accepted without a schemaVersion bump (see
    [contract.md](contract.md)). `buildCardPlayedEvent`
    (`apps/shuffler/src/port-tabletop/types.ts`) sets `owner: initiator.seatId`,
    `isCommander: gameCard.isCommander`.
    - **`seat.joined` is now a second sender site bound by watch point 18's
      `backImageUrl`-derived-from-`twoFaced` rule, not just `card.played`.**
      `seat.joined.v1.json` gained an optional `commanders` array (0-2 entries, in-schema
      `{card:{scryfallId,instanceId}}`); `cardName`/`frontImageUrl`/`backImageUrl` ride
      off-schema as scaffolding, same treatment as `card.played`. **No `face` field on a
      commander entry** — commanders always arrive face up; the Tabletop hardcodes
      `face: "front"`, `faceDown: false` when minting (`seatJoined.ts`), matching the
      vocabulary-ticket table above (`commanders` is faceless).
    - **Test treatment**: `apps/shuffler/test/port-tabletop/gateways.test.ts` gained a
      `"buildSeatJoinedEvent commanders"` describe block (0/1/2 commanders, backImageUrl
      derivation, no `face` on the entry) — the same convention `cardPlayedEvent.test.ts`
      established for `card.played`. Any future field added to one sender site's scaffolding
      should get the equivalent case on both.
    - **Ghost copies are `tabletop-shape-mechanics`' concern, not this owner's** — a locked,
      faded (`opacity: 0.3`) second `mtg-card` minted per commander, with a
      `` `ghost:${instanceId}` `` instance id so it never collides with the real card's dedup
      key (watch point above: dedup is on `props.instanceId`). Noted here only because it
      shares the card shape and the `owner`/`isCommander` props.
## Not Related To

### Sleeve carries to the game screen (`sleeve-carries-to-game`, 2026-08-09)

The `/prepare` picker's sleeve color and playmat image path now ride onto the game itself:
`GameState.newGame()` gained two trailing optional params (`sleeveColor`, `playmatImagePath`),
snapshotted from `prep.sleeveColor`/`prep.playmatImagePath` at both `/start-game` and
`/restart-game` call sites in `src/app.ts`, stored as new optional fields directly on
`GameState`/`PersistedGameState`, and rendered: `formatLibraryStack()` takes an optional
third `sleeveColor` param and (via new helper `formatLibraryCardBack()`) renders a sleeved
back as a flat `background-color` rectangle instead of the `CARD_BACK` `<img>`;
`formatGamePageHtmlPage()` writes the picked playmat as an inline
`style="background-image: url(...)"` on `.playmat.playmat-game`.

**This is orthogonal to two-faced cards, confirmed rather than assumed**: no changes to
`CardDefinition`/`CardFace`, `getCardImageUrl`, or any event-contract face field. The
sleeve/playmat fields live on `GameState`/`PersistedGameState` (game-wide table look), not on
`GameCard`/`PersistedGameCard` (per-card face state) — a two-faced card's `currentFace` and
flip button are untouched, and `formatCardContainer`/`formatFlippingContainer` (the
two-faced-card rendering path) were not touched by this change. `formatLibraryStack()` renders
the library **pile** (three generic card backs), which was already "Not Related To" two-faced
cards' back **face** before this change (see the Card Back section below) — sleeving the pile
doesn't change that.

**No naming collision, confirmed by grep before implementing**: the Tabletop already has an
unrelated `sleeveColor?: string` on `apps/tabletop/src/server/rooms.ts`'s seat-joined player
data (table-layout ticket 17, see [tabletop.md](tabletop.md) watch point 17) — a *different
type*, arriving over the wire from a *different* Shuffler send site
(`buildSeatJoinedEvent`/`SeatJoinedEvent`, not touched by this change). This change's
`sleeveColor` is Shuffler-only, read straight off `prep`/`game` for local rendering; it has no
wire representation and isn't sent anywhere. Same field name, same eventual source (the prep's
sleeve pick), two independent call sites — worth knowing if a future ticket wants to unify
"the Shuffler's own library rendering" with "what the Tabletop was told at seat.joined."

**No persistence version bump** — `PERSISTED_GAME_STATE_VERSION` stayed at **11**. Both new
fields are optional with a graceful fallback (undefined ⇒ render exactly as before), the same
"optional fields" exception already used for `tableName`/`playerName`/`seatId`/`cardInstanceId`
and (in this owner's own history) `imageUris`/`backImageUris`. Confirmed the actual constant
value in code (`src/port-persist-state/types.ts`) before relying on it in tests, rather than
assuming from the last KB entry that mentioned a version number.

**Sleeve-corner CSS rule extended to the Shuffler's library stack**, matching the Tabletop's
square-corner precedent (table-layout ticket 17, `e53a27e`, 2026-08-09 — "sleeves are
rectangular"): `.library-card-back.sleeved` in `public/playmat.css` zeroes `border-radius` and
suppresses the `::before` pseudo-element, so a sleeved library pile reads as flat rectangles
like the Tabletop's sleeve rendering, not like the rounded `CARD_BACK` image it replaces.

Tests: `apps/shuffler/test/GameState-tableLook.test.ts` (round-trip through persist/reload,
and the no-pick case leaves both fields undefined), `apps/shuffler/test/view/active-game-page.test.ts`
(playmat background-image present/absent), and cases added to
`apps/shuffler/test/view/library-components.test.ts` (sleeved vs unsleeved library stack HTML).

### Card Back (library face-down rendering)
The MTG card back image (`/images/mtg-card-back.jpg`, `CARD_BACK` constant) is the generic card back shown for library cards. It is unrelated to two-faced cards' **back face**: don't confuse "card back" (the picture) with "back face" (the second printed side of a two-faced card).

Note the 2026-08-07 nuance: the *concept* of a face-down card **is** this owner's territory (it's the second axis alongside `face` — see watch points 12–15), but `CARD_BACK` today is only library-stack decoration, not modeled state. When face-down becomes real, `CARD_BACK` (or a sleeve image) is what renders it — the picture stays a rendering detail, the concealment is the state.

Ticket 02 settled *where the picture lives* on the Tabletop as "not on the card" — `faceDown` resolving against the seat's `cardBackImageUrl` — because baking per-card would mean rewriting every shape when someone changes sleeves mid-game. **Table-layout ticket 11 (2026-08-08) amended this, and ticket 17 built it the same day**: sleeve color is a game constant (never changes mid-game), so per-card baking is legal — the Tabletop server bakes the seat's `sleeveColor` into the shape's props at mint time (`cardArrival.ts`), dodging the client-side seat-lookup gap. `cardBackImageUrl` remains the rendering for *unsleeved* seats only. See watch point 17.

Also note (KB gap closed 2026-08-08): the **library furniture image is a second consumer of the card back** — whatever renders a seat's face-down cards (sleeve rectangle or standard back) must render its library pile the same way. Ticket 17 honored this: `mtg-zone` props gained `sleeveColor: string | null` (set only on a sleeved seat's library zone), `MtgZoneShapeUtil` renders a sleeved pile as the bare sleeve rectangle, and both renderings share `LIBRARY_PILE_INSET = 12` from `apps/tabletop/src/shared/mtgZoneShape.ts`.

### Deck Selection Search
The text filter on the deck selection page (`deck-selection.js`) is a UI filter for finding decks, not cards. Unrelated to two-faced card display or data.
