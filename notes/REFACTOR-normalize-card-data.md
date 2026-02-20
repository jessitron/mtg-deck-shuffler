# Card Data Normalization Refactoring

**Status: Steps 1 & 2 COMPLETE ✅**

- Step 1 (Enrich the adapters): ✅ Complete - All tests passing (109 tests)
- Step 2 (Card Repository): ✅ Complete - Verified with real deck imports
- Step 3 (Reference cards from game state): ⏸️ Deferred - Requires db wipe

## Problem Statement

Currently, `CardDefinition` is denormalized - every card's full definition is stored in:

- `PersistedGamePrep.deck.cards[]` and `deck.commanders[]`
- `PersistedGameState.gameCards[].card`

This causes issues:

1. **Adding new fields breaks old data** - All existing games/preps lack new fields
2. **No way to enrich old data** - Can't retroactively add universal card properties
3. **Data duplication** - Same card stored hundreds of times across games

## Plan

Three steps. Steps 1 and 2 are additive (no breaking changes, no db wipe). Step 3 is destructive (db wipe required).

### Step 1: Enrich the adapters

Expand `CardDefinition` with the additional fields we want (`manaCost`, `cmc`, `oracleText`), and make `oracleCardName`, `colorIdentity`, and `set` required. Update both adapters to populate them. Include tests.

This is self-contained: existing game state still works, just has more data available on newly-loaded decks.

### Step 2: Card Repository

Create a `cards` table and a CardRepository port. On deck load, upsert all cards from the deck into the repository. Verify by re-importing decks and checking the table is populated.

This is additive: new table, no changes to existing tables. Existing data unaffected.

### Step 3: Reference cards from game state (later)

Replace embedded `CardDefinition` in game state and game prep with `scryfallId` references. Hydrate card data from the repository on load.

This is the hard part — touches game state versioning, persistence, and event structure. Requires a db wipe. Deferred until Steps 1 & 2 are solid.

---

## Step 1 Detail: Adapter Changes

### CardDefinition Changes

Current `CardDefinition`:

```typescript
export interface CardDefinition {
  name: string;
  scryfallId: string;
  multiverseid: number;
  twoFaced: boolean;
  oracleCardName?: string; // make required
  colorIdentity?: string[]; // make required
  set?: string; // make required
  types: string[];
  // ADD:
  manaCost?: string;
  cmc: number;
  oracleText?: string;
}
```

### MTGJSON Adapter

Needs to additionally populate:

- `oracleCardName` ← `name` (always set)
- `manaCost` ← `mtgjsonCard.manaCost`
- `cmc` ← `mtgjsonCard.manaValue`
- `oracleText` ← `mtgjsonCard.text`

### Archidekt Adapter

Needs to additionally populate:

- `manaCost` ← `archidektCard.card.oracleCard.manaCost`
- `cmc` ← `archidektCard.card.oracleCard.cmc`
- `oracleText` ← `archidektCard.card.oracleCard.text`

### Testing

- Unit tests for each adapter: given sample source data, verify the new fields are populated
- Verify existing fields still work

---

## Step 2 Detail: Card Repository

### Card Identity

- **Primary Key:** `scryfallId` (unique per printing)
- **Grouping:** `oracleCardName` (for grouping different printings of same card)
- **Display:** `name` (what's printed on the card)

### Schema

```sql
CREATE TABLE IF NOT EXISTS cards (
  scryfall_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  oracle_card_name TEXT NOT NULL,
  color_identity TEXT NOT NULL,  -- JSON array
  set_code TEXT NOT NULL,
  two_faced INTEGER NOT NULL,    -- SQLite boolean (0/1)
  types TEXT NOT NULL,            -- JSON array
  mana_cost TEXT,
  cmc REAL NOT NULL,
  oracle_text TEXT,
  multiverseid INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Types

```typescript
// src/port-card-repository/types.ts
export interface CardRepositoryPort {
  saveCards(cards: CardDefinition[]): Promise<void>;
  getCard(scryfallId: string): Promise<CardDefinition | null>;
  getCards(scryfallIds: string[]): Promise<Map<string, CardDefinition>>;
}
```

### Implementation

1. Define port in `src/port-card-repository/types.ts`
2. Implement `SqliteCardRepositoryAdapter.ts` with `cards` table
3. Implement `InMemoryCardRepositoryAdapter.ts`
4. On deck load, upsert cards into the repository
5. Wire up in server initialization

### Verification

- Re-import some decks (precon + archidekt)
- Query the cards table to confirm it's populated
- Check card count matches expected

---

## Step 3 Detail: Normalize Card References

**Status:** ⏸️ Ready to implement (requires db wipe)

### Overview

Replace embedded `CardDefinition` objects with `scryfallId` string references throughout the persistence layer. Card data will be hydrated from the `CardRepository` when loading game state and game prep.

### Key Changes

#### 1. Type Changes

**Current Structure:**

```typescript
// Deck stores full card objects
interface Deck {
  commanders: CardDefinition[];
  cards: CardDefinition[];
  // ...
}

// GameCard stores full card object
interface GameCard {
  card: CardDefinition;
  location: CardLocation;
  // ...
}
```

**New Structure:**

```typescript
// PersistedDeck stores only scryfallIds
interface PersistedDeck {
  version: typeof PERSISTED_DECK_VERSION; // increment to 2
  id: number;
  name: string;
  totalCards: number;
  commanderIds: string[]; // scryfallIds
  cardIds: string[]; // scryfallIds
  provenance: DeckProvenance;
}

// PersistedGameCard stores only scryfallId
interface PersistedGameCard {
  scryfallId: string; // reference to card in repository
  location: CardLocation;
  gameCardIndex: number;
  isCommander: boolean;
  currentFace: "front" | "back";
}

// Runtime Deck (hydrated) keeps CardDefinition for in-memory use
interface Deck {
  version: typeof PERSISTED_DECK_VERSION;
  id: number;
  name: string;
  totalCards: number;
  commanders: CardDefinition[]; // hydrated from repository
  cards: CardDefinition[]; // hydrated from repository
  provenance: DeckProvenance;
}

// Runtime GameCard (hydrated) keeps CardDefinition for in-memory use
interface GameCard {
  card: CardDefinition; // hydrated from repository
  location: CardLocation;
  gameCardIndex: number;
  isCommander: boolean;
  currentFace: "front" | "back";
}
```

**Key Insight:** We'll have **two representations**:

- **Persisted types** (`PersistedDeck`, `PersistedGameCard`) - stored in DB with only scryfallIds
- **Runtime types** (`Deck`, `GameCard`) - used in memory with full `CardDefinition` objects

#### 2. Version Bumps

- `PERSISTED_DECK_VERSION`: 1 → 2
- `PERSISTED_GAME_STATE_VERSION`: 6 → 7
- `PERSISTED_GAME_PREP_VERSION`: Add constant, set to 2 (was implicit 1)

#### 3. Hydration Functions

Create utility functions to convert between persisted and runtime representations:

```typescript
// src/port-card-repository/hydration.ts

async function hydrateDeck(
  persistedDeck: PersistedDeck,
  cardRepo: CardRepositoryPort,
): Promise<Deck> {
  const allIds = [...persistedDeck.commanderIds, ...persistedDeck.cardIds];
  const cardMap = await cardRepo.getCards(allIds);

  const commanders = persistedDeck.commanderIds.map((id) => {
    const card = cardMap.get(id);
    if (!card) throw new Error(`Card ${id} not found in repository`);
    return card;
  });

  const cards = persistedDeck.cardIds.map((id) => {
    const card = cardMap.get(id);
    if (!card) throw new Error(`Card ${id} not found in repository`);
    return card;
  });

  return {
    version: persistedDeck.version,
    id: persistedDeck.id,
    name: persistedDeck.name,
    totalCards: persistedDeck.totalCards,
    commanders,
    cards,
    provenance: persistedDeck.provenance,
  };
}

function dehydrateDeck(deck: Deck): PersistedDeck {
  return {
    version: PERSISTED_DECK_VERSION,
    id: deck.id,
    name: deck.name,
    totalCards: deck.totalCards,
    commanderIds: deck.commanders.map((c) => c.scryfallId),
    cardIds: deck.cards.map((c) => c.scryfallId),
    provenance: deck.provenance,
  };
}

async function hydrateGameCards(
  persistedGameCards: PersistedGameCard[],
  cardRepo: CardRepositoryPort,
): Promise<GameCard[]> {
  const scryfallIds = persistedGameCards.map((gc) => gc.scryfallId);
  const cardMap = await cardRepo.getCards(scryfallIds);

  return persistedGameCards.map((pgc) => {
    const card = cardMap.get(pgc.scryfallId);
    if (!card)
      throw new Error(`Card ${pgc.scryfallId} not found in repository`);

    return {
      card,
      location: pgc.location,
      gameCardIndex: pgc.gameCardIndex,
      isCommander: pgc.isCommander,
      currentFace: pgc.currentFace,
    };
  });
}

function dehydrateGameCards(gameCards: GameCard[]): PersistedGameCard[] {
  return gameCards.map((gc) => ({
    scryfallId: gc.card.scryfallId,
    location: gc.location,
    gameCardIndex: gc.gameCardIndex,
    isCommander: gc.isCommander,
    currentFace: gc.currentFace,
  }));
}
```

#### 4. GameState Changes

**Current:**

- `GameState.fromPersistedGameState(psg)` - loads from `PersistedGameState` with embedded cards
- `GameState.toPersistedGameState()` - saves with embedded cards

**New:**

- `GameState.fromPersistedGameState(psg, cardRepo)` - loads and hydrates cards from repository
- `GameState.toPersistedGameState()` - saves with only scryfallIds (dehydrated)

The `GameState` class internally still works with full `CardDefinition` objects (no changes to game logic), but persistence layer uses references.

#### 5. Persistence Adapter Changes

**SqlitePersistStateAdapter:**

- `retrieve(gameId)` - After loading JSON, hydrate cards from repository
- `save(psg)` - Before saving JSON, dehydrate cards to scryfallIds
- `getAllGames()` - Needs to hydrate cards to extract commander names

**InMemoryPersistStateAdapter:**

- Same changes as SQLite adapter

**SqlitePersistPrepAdapter:**

- `retrievePrep(prepId)` - After loading JSON, hydrate deck from repository
- `savePrep(prep)` - Before saving JSON, dehydrate deck to scryfallIds

**InMemoryPersistPrepAdapter:**

- Same changes as SQLite adapter

#### 6. App.ts Route Changes

Routes that load game state or prep need to pass `CardRepository` to hydration:

```typescript
// Before
const persistedGame = await persistStatePort.retrieve(gameId);
const game = GameState.fromPersistedGameState(persistedGame);

// After
const persistedGame = await persistStatePort.retrieve(gameId);
const game = await GameState.fromPersistedGameState(
  persistedGame,
  cardRepository,
);
```

Routes affected:

- `loadGameFromParams` middleware
- `loadGameFromParamsWithErrorPage` middleware
- `/game/:gameId` (GET)
- `/game/:gameId/restart` (POST)
- `/game/import` (POST)
- Any other route that loads game state

For prep:

- `/prepare/:prepId` (GET)
- `/prepare/:prepId/start-game` (POST)

#### 7. Migration Strategy

**No migration path** - this is a breaking change requiring database wipe:

1. Delete `data.db`
2. All existing games and preps are lost
3. Fresh start with new schema

**Why no migration?**

- Old data has embedded cards without scryfallIds in a consistent format
- Card repository is new, so old cards aren't in it
- Complexity of extracting and upserting all cards from old games isn't worth it for a local dev app

#### 8. Testing Strategy

**Unit Tests:**

- Test hydration/dehydration functions with various card combinations
- Test GameState with mocked CardRepository
- Test persistence adapters with in-memory CardRepository

**Integration Tests:**

- Create deck → save prep → load prep → verify cards match
- Start game → save state → load state → verify cards match
- Test with commanders, two-faced cards, various card types

**Manual Verification:**

1. Delete `data.db`
2. `npm run build && npm test` - all tests pass
3. `PORT=3344 ./run`
4. Import a precon deck
5. Import an Archidekt deck
6. Start games from both
7. Verify cards display correctly
8. Perform game actions (draw, shuffle, etc.)
9. Reload game, verify state persists
10. Check database: `sqlite3 data.db "SELECT COUNT(*) FROM cards"`

### Implementation Order

1. **Create new types** - `PersistedDeck`, `PersistedGameCard` in new file `src/port-persist-state/persisted-types.ts`
2. **Create hydration utilities** - `src/port-card-repository/hydration.ts`
3. **Update version constants** - Bump versions in `src/types.ts` and `src/port-persist-state/types.ts`
4. **Update GameState** - Add `cardRepo` parameter to `fromPersistedGameState`, update `toPersistedGameState`
5. **Update persistence adapters** - Both state and prep adapters
6. **Update app.ts** - Pass `cardRepository` to all hydration points
7. **Update test generators** - Create helpers for persisted vs runtime types
8. **Fix all tests** - Update to use new structure
9. **Manual verification** - Delete DB and test end-to-end

### Risks & Considerations

**Risk: Missing cards in repository**

- If a card is referenced but not in repository, hydration fails
- Mitigation: Ensure all deck imports upsert cards first (already done in Step 2)
- Add error handling with clear messages

**Risk: Performance**

- Hydrating 100-card decks requires 100+ repository lookups
- Mitigation: `CardRepository.getCards(ids[])` uses batch lookup (already implemented)
- SQLite query with `WHERE scryfall_id IN (...)` is fast

**Risk: Circular dependencies**

- GameState needs CardRepository, but we don't want domain logic to depend on ports
- Mitigation: Hydration happens at persistence boundary, not in domain
- GameState internally still uses `CardDefinition` objects

**Benefit: Future-proof**

- Can add new card fields without breaking old games
- Can enrich card data retroactively
- Reduces storage size (100-card game: ~500KB → ~50KB)

### Files to Modify

**New files:**

- `src/port-persist-state/persisted-types.ts` - Persisted type definitions
- `src/port-card-repository/hydration.ts` - Hydration utilities

**Modified files:**

- `src/types.ts` - Bump `PERSISTED_DECK_VERSION` to 2
- `src/port-persist-state/types.ts` - Bump `PERSISTED_GAME_STATE_VERSION` to 7, update interfaces
- `src/port-persist-prep/types.ts` - Add `PERSISTED_GAME_PREP_VERSION = 2`
- `src/GameState.ts` - Update `fromPersistedGameState` and `toPersistedGameState`
- `src/port-persist-state/SqlitePersistStateAdapter.ts` - Add hydration/dehydration
- `src/port-persist-state/InMemoryPersistStateAdapter.ts` - Add hydration/dehydration
- `src/port-persist-prep/SqlitePersistPrepAdapter.ts` - Add hydration/dehydration
- `src/port-persist-prep/InMemoryPersistPrepAdapter.ts` - Add hydration/dehydration
- `src/app.ts` - Pass `cardRepository` to hydration points
- `test/generators.ts` - Add generators for persisted types
- All test files that create `Deck` or `GameCard` objects

### Success Criteria

✅ All tests pass (109+ tests)
✅ Can import precon deck and see cards in repository
✅ Can import Archidekt deck and see cards in repository
✅ Can start game from prep
✅ Can perform game actions (draw, shuffle, move cards)
✅ Can reload game and see correct state
✅ Database size is smaller (check with `ls -lh data.db`)
✅ No embedded `CardDefinition` objects in `game_states` or `game_preps` tables

---

## Completion Summary

### Step 1: Enrich the adapters ✅

**Completed:** 2026-02-20

**Changes:**

- Updated `CardDefinition` interface in `src/types.ts`:
  - Made `oracleCardName`, `colorIdentity`, `set` required
  - Added `manaCost?: string`, `cmc: number`, `oracleText?: string`
- Updated MTGJSON adapter to populate new fields from MTGJSON data
- Updated Archidekt adapter to populate new fields from Archidekt API
- Updated all test generators and test files to work with new structure
- All 109 tests passing

**Commits:**

- "Enrich CardDefinition with new fields (manaCost, cmc, oracleText) and make oracleCardName, colorIdentity, set required - auggie"

### Step 2: Card Repository ✅

**Completed:** 2026-02-20

**Changes:**

- Created `CardRepositoryPort` interface in `src/port-card-repository/types.ts`
- Implemented `SqliteCardRepositoryAdapter` with cards table schema
- Implemented `InMemoryCardRepositoryAdapter` for testing
- Added comprehensive tests for both adapters (17 tests)
- Wired up card repository in `src/app.ts` to upsert cards on deck load
- Wired up card repository in `src/server.ts` with environment-based adapter selection
- Verified with real deck imports:
  - Precon deck: 88 cards saved
  - Archidekt deck: 75 cards saved (163 total)
  - Upsert verified: Re-importing same deck kept count at 163

**Database Schema:**

```sql
CREATE TABLE cards (
  scryfall_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  oracle_card_name TEXT NOT NULL,
  color_identity TEXT NOT NULL,
  set_code TEXT NOT NULL,
  two_faced INTEGER NOT NULL,
  types TEXT NOT NULL,
  mana_cost TEXT,
  cmc INTEGER NOT NULL,
  oracle_text TEXT,
  multiverseid INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Commits:**

- "Add CardRepository port with SQLite and in-memory adapters, including comprehensive tests - auggie"
- "Wire up card repository in app and server - cards are now upserted on deck load - auggie"

**Environment Variables:**

- `PORT_CARD_REPOSITORY` - Set to "in-memory" for in-memory adapter, otherwise uses SQLite
- Falls back to `PORT_PERSIST_STATE` if not set
- `SQLITE_DB_PATH` - Database file path (default: "./data.db")
