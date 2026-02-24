# Two-Faced Cards

## Why This Feature Exists

Many Magic: The Gathering cards have two faces (transform, modal double-faced, reversible). In remote play via Mural/Discord, players need to see both sides of these cards. This feature ensures two-faced cards are ingested with back-face data, displayed with a flip animation, and tracked for which face is currently showing.

## Who Uses It and How

Players encounter two-faced cards throughout the app:
- **Prep page**: Browse a deck and flip two-faced cards in the card modal to inspect both sides. Flip state is not persisted here (yet).
- **Game page**: Two-faced cards display with a flip button both inline (command zone, hand, etc.) and in the card modal. Flip state persists across page reloads.
- **Library search**: Two-faced cards appear in type groups for both their front and back face types, so a Creature//Planeswalker card shows up under both "Creature" and "Planeswalker."

## Design Philosophy

- **Flip is a UI concern, not a game event.** The app tracks where cards are (Library, Hand, Table, etc.) but doesn't model battlefield state. Flipping doesn't change where a card is, so it's not recorded in the event log. (An earlier attempt to record `FlipCardEvent` was added and removed.)
- **Same Scryfall ID, different face parameter.** Both faces of a two-faced card share one Scryfall ID. The image URL is constructed with `face=front` or `face=back` — no separate image URL is stored.
- **Back-face data enriches other features.** `CardDefinition.backFace` stores the back face's name, types, mana cost, CMC, and oracle text. This data is used by library search for type grouping and could be used by future features.
- **Prep page flip may gain persistence.** Currently prep page flip uses a query parameter (`?face=back`) and doesn't persist. When we need it to persist, we'll save flip state in the prep.

## Quick Reference

| Aspect | Details |
|---|---|
| Data type | `CardFace` (back face), `CardDefinition.twoFaced` flag, `GameCard.currentFace` |
| Type definitions | `src/types.ts` (CardFace, CardDefinition), `src/port-persist-state/types.ts` (GameCard) |
| State mutation | `GameState.flipCard()` in `src/GameState.ts` |
| Game routes | `POST /flip-card/:gameId/:gameCardIndex`, `POST /flip-card-modal/:gameId/:gameCardIndex` |
| Prep route | `GET /prep-card-modal/:prepId/:cardIndex?face=back` |
| View rendering | `formatFlippingContainer()` in `src/view/common/shared-components.ts` |
| CSS (game) | `public/game.css` lines 104-143 |
| CSS (prep) | `public/prepare.css` lines 221-276 |
| Image URLs | `getCardImageUrl(scryfallId, format, face)` in `src/types.ts` |
| Adapters | `src/port-deck-retrieval/archidektAdapter/`, `src/port-deck-retrieval/mtgjsonAdapter/` |
| Persistence | `SqliteCardRepositoryAdapter` stores `back_face` as JSON, `PersistedGameCard.currentFace` |

## Other Docs

- [Architecture](architecture.md) - Data flow and technical details
- [History](history.md) - How the feature evolved
- [Interactions](interactions.md) - Dependencies and watch points
- [Files](files.md) - Every file involved
