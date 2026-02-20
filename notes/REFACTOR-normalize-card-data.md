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

## Step 3 Notes (for later)

When we're ready to tackle game state normalization:

- Replace `CardDefinition` in `Deck` with `scryfallId[]`
- Replace embedded card in `GameCard` with `scryfallId` reference
- Hydrate card data from repository on game load
- Consider how game events and state versions interact
- Database wipe required

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
