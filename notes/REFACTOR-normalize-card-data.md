# Card Data Normalization Refactoring

State: revised plan, phased approach. Phase 1 is the current focus.

## Problem Statement

Currently, `CardDefinition` is denormalized - every card's full definition is stored in:

- `PersistedGamePrep.deck.cards[]` and `deck.commanders[]`
- `PersistedGameState.gameCards[].card`

This causes issues:

1. **Adding new fields breaks old data** - All existing games/preps lack new fields
2. **No way to enrich old data** - Can't retroactively add universal card properties
3. **Data duplication** - Same card stored hundreds of times across games

## Revised Strategy (Feb 18)

Instead of normalizing everything at once (which gets tangled in game state schema issues), take a phased approach:

### Phase 1: Card Repository (current focus)

Create a `cards` table and populate it on deck load. This gives us a single source of truth for card definitions, independent of game state.

- Game state JSON blob stays as-is (still contains embedded card data)
- Decks and game preps keep their current structure
- The card repository is populated as a side effect of loading decks
- Views can look up enriched card data from the repository when needed

**Why this works**: Once cards are in their own table, we can add fields (like `types`) as a simple migration. Old games still work because they have their own embedded card data. New features (like type-based sorting) can pull from the card repository.

### Phase 2: Denormalize game state from card definitions (later)

Replace embedded `CardDefinition` in game state with `scryfallId` references. This is the harder problem because it touches game state versioning and persistence.

Deferred because:
- The game state JSON blob schema is tricky (games, events, versions)
- Event sourcing in a relational DB is its own problem
- Phase 1 gives us most of the value without this complexity

## Phase 1 Design

### Card Identity

- **Primary Key:** `scryfallId` (unique per printing)
- **Grouping:** `oracleCardName` (for grouping different printings of same card)
- **Display:** `name` (what's printed on the card)

### Fields to Store

- `scryfallId` (PK)
- `name` (display name)
- `oracleCardName` (always populated, even if same as name)
- `colorIdentity` (array)
- `set` (set code)
- `twoFaced` (boolean)
- `types` (array)
- `manaCost` (string, optional)
- `cmc` (number)
- `oracleText` (string, optional)
- `multiverseid` (number) - for images on gatherer

### Card Repository Pattern

- Adapters return card data with all fields (as they already do)
- On deck load, upsert cards into the repository
- Game state continues to embed card data for now
- Views that need enriched data (e.g., type sorting) query the repository

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
export interface Card {
  scryfallId: string;
  name: string;
  oracleCardName: string; // Always populated
  colorIdentity: string[];
  set: string;
  twoFaced: boolean;
  types: string[];
  manaCost?: string;
  cmc: number;
  oracleText?: string;
  multiverseid: number;
}

export interface CardRepositoryPort {
  saveCard(card: Card): Promise<void>;
  saveCards(cards: Card[]): Promise<void>;
  getCard(scryfallId: string): Promise<Card | null>;
  getCards(scryfallIds: string[]): Promise<Map<string, Card>>;
}
```

### Phase 1 Implementation Plan

1. **Create Card Repository**
   - Define types in `src/port-card-repository/types.ts`
   - Implement `SqliteCardRepositoryAdapter.ts` with `cards` table
   - Implement `InMemoryCardRepositoryAdapter.ts`

2. **Populate on Deck Load**
   - When a deck is loaded (from any adapter), upsert its cards into the repository
   - This happens at the route/service level, not inside adapters themselves
   - Adapters continue returning `CardDefinition` as before

3. **Wire Up**
   - Create card repository instance in server initialization
   - Pass to the deck-loading flow

4. **Use It**
   - Features that need enriched card data (type sorting, etc.) query the repository
   - Existing game state code is untouched

### What This Doesn't Change

- `CardDefinition` interface stays
- `Deck` type keeps `CardDefinition[]` for cards and commanders
- `PersistedGameState` keeps embedded card data in JSON blob
- Game state versioning is not affected
- No database wipe needed (new table only)

## Phase 2 Notes (for later)

When we're ready to tackle game state normalization:

- Replace `CardDefinition` in `Deck` with `scryfallId[]`
- Replace embedded card in `GameCard` with `scryfallId` reference
- Hydrate card data from repository on game load
- Consider how game events and state versions interact
- This will require a database wipe or migration

## Adapter Changes (already done)

The `types` field has already been added to `CardDefinition` and both adapters populate it.
