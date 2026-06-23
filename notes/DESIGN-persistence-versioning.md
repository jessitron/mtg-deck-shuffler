# Persistence Versioning

Runbook for the persisted-format version constants: what each guards, **when to bump**, and **how**. Reach for this whenever you change the shape of something that gets persisted (a `CardDefinition` field, a `Deck`, a `PersistedGameState`, a `PersistedGamePrep`).

## The four version constants

| Constant | Defined in | Current | Stamped on | Validated (fails) at |
|---|---|---|---|---|
| `PERSISTED_DECK_VERSION` | `src/types.ts` | 3 | every `Deck` (adapters + `hydrateDeck`) | `LocalFileAdapter.retrieveDeck` → `DeckVersionMismatchError` |
| `PERSISTED_GAME_STATE_VERSION` | `src/port-persist-state/types.ts` | 10 | `PersistedGameState` (`toPersistedGameState`) | `GameState.fromPersistedGameState` → `IncompatibleStateVersionError` |
| `PERSISTED_GAME_PREP_VERSION` | `src/port-persist-prep/types.ts` | 3 | `PersistedGamePrep` | `/prepare` + `/start-game` routes → `IncompatiblePrepVersionError` |
| `PersistedDeck.version` | `src/port-persist-state/persisted-types.ts` | 2 | `PersistedDeck` (`dehydrateDeck`) | not validated on load (dehydrated form) |

### What each actually stores (this is the key to knowing which to bump)

- **`decks/*.json`** (read by `LocalFileAdapter`) embed full `Deck` objects with full `CardDefinition`s. Guarded by `PERSISTED_DECK_VERSION`.
- **`PersistedGameState`** (a saved game) stores cards as **scryfallId references** (`PersistedGameCard`) and rehydrates full `CardDefinition`s from the **card repository** at load. So a game is sensitive to *both* its own envelope shape *and* the `CardDefinition` shape (via the repo).
- **`PersistedGamePrep`** (a saved prep) **embeds a full `Deck`** (with `CardDefinition`s). Sensitive to its envelope shape *and* the `CardDefinition` shape.
- **`PersistedDeck`** (the dehydrated deck inside persisted game state) stores **only scryfallIds + provenance**. It is *insensitive* to `CardDefinition` field changes — which is why it stayed at 2 through the cardTypes change.
- **Card repository** (`SqliteCardRepositoryAdapter`, gitignored `data.db`) is a cache of `CardDefinition`s keyed by scryfallId. Not version-stamped; instead it **rebuilds its table** when it detects an old schema (a column it no longer recognizes / lacks `card_types`).

## When to bump which

Find the change you made in the left column; bump everything in the right column.

| You changed… | Bump |
|---|---|
| A **`CardDefinition` field** (add/remove/rename/retype) | **All three of** `PERSISTED_DECK_VERSION`, `PERSISTED_GAME_STATE_VERSION`, `PERSISTED_GAME_PREP_VERSION` — because decks embed cards, preps embed cards, and games resolve cards from the repo. Also update the SQLite card-repo schema and **regenerate all decks**. (`PersistedDeck` is scryfallIds-only → leave it.) *This is what the cardTypes change did (commit `f76b49c`/`ef75759`).* |
| The **`Deck` / deck-file structure** (not card fields) | `PERSISTED_DECK_VERSION`; regenerate decks |
| The **`PersistedGameState` envelope** (gameCards shape, locations, new fields) | `PERSISTED_GAME_STATE_VERSION` |
| The **`PersistedGamePrep` envelope** | `PERSISTED_GAME_PREP_VERSION` |
| The **`PersistedDeck` (dehydrated) shape** | `PersistedDeck.version` |

When unsure, ask: *"Does the old persisted bytes, read back by the new code, produce a correct object?"* If no, bump.

## How to bump

1. **Increment the constant.** It's a literal type (`: N = N`) — change both occurrences. Leave a comment saying what break it marks.
2. **Decide migrate vs. reject:**
   - **Migrate** if old data can be transformed to new cheaply and losslessly (e.g. defaulting a new field). Add a branch in the load path that upgrades then proceeds.
   - **Reject (fail loudly)** if old data can't be salvaged — e.g. the `CardDefinition` shape changed underneath, so a saved game's scryfallId refs point at incompatible/absent cache rows. Don't let it crash deep in hydration with a cryptic "card not found"; reject at the validation point. *(The cardTypes change rejected, because there was no migration path.)*
3. **Wire the loud failure** (reject case):
   - Add or reuse a typed error in the relevant port's `types.ts` (`IncompatibleStateVersionError`, `IncompatiblePrepVersionError`, `DeckVersionMismatchError`).
   - Throw it at the validation point (table above).
   - In the load route's `catch`, `instanceof`-check it and render `formatErrorPageHtmlPage(...)` with **HTTP 410** and a clear message — not a generic 500.
4. **If card data or deck structure changed:** regenerate `decks/*.json` (`npm run precons:fetch-mtgjson -- --convert`, then re-download Archidekt decks with `npm run deck:download -- <id>`), and let the card cache rebuild itself (it drops+recreates on stale schema in `SqliteCardRepositoryAdapter.initializeDatabase`).
5. **Update tests:** bump version literals; add a test that an old version is rejected (or migrated). See `test/GameState-conversion-simple.test.ts` ("rejects a game saved in an older, incompatible format").
6. **`data.db` is a gitignored local cache** — fine to delete. In production the card cache rebuilds on deploy; *old saved games/preps fail loudly per step 3* (that's the intended outcome, not a regression).

## Gotchas

- **Bumping `PERSISTED_GAME_PREP_VERSION` interacts with the prep optimistic-lock check.** `prep.version` doubles as the optimistic-concurrency token in `/start-game` (`expected-version` vs `prep.version`). Preps are immutable, so this is fine: a current prep renders its own version into the form. The format-version guard rejects old preps *before* that check.
- **Prep adapters cast the stored version** (`stored.version as typeof PERSISTED_GAME_PREP_VERSION`) so the *real* stored value survives to the route guard. Don't replace it with the constant, or old preps would masquerade as current.
- **Removing a migration branch is fine** when the new reject path supersedes it (e.g. the v3→v4 game migration was deleted once all pre-cardTypes games became unloadable anyway).

## Feature owners with this in scope

- **two-faced-cards** (`notes/features/two-faced-cards/`): the most cross-cutting feature; card-data shape changes ripple into all three versions. Its `interactions.md` watch points #8 (deck regeneration) and #9 (game/prep state version) point here.
- **library-search**: consumes persisted card data (`cardTypes`) but doesn't own version bumping; tangential.
