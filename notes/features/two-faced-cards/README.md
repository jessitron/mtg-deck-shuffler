# Two-Faced Cards

## Why This Feature Exists

Many Magic: The Gathering cards have two faces (transform, modal double-faced, reversible). In remote play via Mural/Discord, players need to see both sides of these cards. This feature flags such cards (`twoFaced`), shows a flip button backed by a flip animation, and tracks which face is currently showing. The back image is fetched from Scryfall on demand (same `scryfallId`, `face=back`) — no back-face data is stored.

## Who Uses It and How

Players encounter two-faced cards throughout the app:
- **Prep page**: Flip the commander in place on the prepare screen, and flip any two-faced card in the card modal to inspect both sides. Flip state is not persisted here (yet) — both surfaces carry the face in the URL.
- **Game page**: Two-faced cards display with a flip button both inline (command zone, hand, etc.) and in the card modal. Flip state persists across page reloads.
- **Library search**: Multi-face cards appear in type groups for every face's/part's types, so a Creature//Planeswalker card shows up under both "Creature" and "Planeswalker." This is driven by `CardDefinition.cardTypes` (the union of all faces' types), not by a flip flag.

## Design Philosophy

- **Flip is a UI concern, not a game event.** The app tracks where cards are (Library, Hand, Table, etc.) but doesn't model battlefield state. Flipping doesn't change where a card is, so it's not recorded in the event log. (An earlier attempt to record `FlipCardEvent` was added and removed.)
- **Same Scryfall ID, both faces' URLs stored.** Both faces of a two-faced card share one Scryfall ID. Image URLs are now **fetched from Scryfall at ingestion and stored** on the card (`imageUris` front, `backImageUris` back) — because bare constructed URLs 404 for freshly-released cards. `getCardImageUrl` prefers the stored URL and falls back to constructing `face=front`/`face=back` paths when absent.
- **The card image is the source of truth; we store almost no card text.** `CardDefinition` carries only identity/grouping data (`name`, `scryfallId`, `twoFaced`, `cardTypes`, `colorIdentity`, `set`, …). The old `backFace`/`CardFace` and `manaCost`/`cmc`/`oracleText` fields were removed (commit `f76b49c`) — they were never displayed. The only face data any feature consumes is `cardTypes`, the union of all faces' types, used by library-search grouping. A future "is this hand worth keeping?" feature should read canonical card data from MTGJSON/Scryfall rather than re-storing it.
- **Prep page flip may gain persistence.** Currently prep page flip uses a query parameter (`?face=back`) and doesn't persist. When we need it to persist, we'll save flip state in the prep.

## Quick Reference

| Aspect | Details |
|---|---|
| Data type | `CardDefinition.twoFaced` flag, `CardDefinition.cardTypes` (union of all faces' types), `GameCard.currentFace` |
| Type definitions | `src/types.ts` (CardDefinition), `src/port-persist-state/types.ts` (GameCard) |
| State mutation | `GameState.flipCard()` in `src/GameState.ts` |
| Game routes | `POST /flip-card/:gameId/:gameCardIndex`, `POST /flip-card-modal/:gameId/:gameCardIndex` |
| Prep routes | `GET /prep-card-modal/:prepId/:cardIndex?face=back` (modal), `GET /prep-flip-card/:prepId/:cardIndex?face=back` (inline commander) — both stateless |
| View rendering | `formatFlippingContainer(gameCard, flipRequest)` in `src/view/common/shared-components.ts`; `FlipRequest` says which page is asking (game POST vs prep GET) |
| CSS (game) | `public/game.css` lines 104-143 |
| CSS (prep) | `public/prepare.css` lines 221-276 |
| Image URLs | `getCardImageUrl(card, format, face)` (prefers stored) + `constructCardImageUrl(scryfallId, format, face)` (fallback) in `src/types.ts`; stored in `CardDefinition.imageUris`/`backImageUris` |
| Image fetch | `src/port-card-images/` (`ScryfallCardImagesGateway`, `enrichDeckWithImages`) — fetches Scryfall image URLs at ingestion |
| Adapters | `src/port-deck-retrieval/archidektAdapter/`, `src/port-deck-retrieval/mtgjsonAdapter/` |
| Persistence | `SqliteCardRepositoryAdapter` stores `card_types`, `image_uris`, `back_image_uris` as JSON (no back_face column); `PersistedGameCard.currentFace` |

## Other Docs

- [Architecture](architecture.md) - Data flow and technical details
- [History](history.md) - How the feature evolved
- [Interactions](interactions.md) - Dependencies and watch points
- [Files](files.md) - Every file involved
