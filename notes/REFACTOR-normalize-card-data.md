# Card Data Normalization Refactoring

State: in planning, but the plan isn't right yet.
The relationship between games, game events, game states, and game cards is not correct.

## Problem Statement

Currently, `CardDefinition` is denormalized - every card's full definition is stored in:

- `PersistedGamePrep.deck.cards[]` and `deck.commanders[]`
- `PersistedGameState.gameCards[].card`

This causes issues:

1. **Adding new fields breaks old data** - All existing games/preps lack new fields
2. **No way to enrich old data** - Can't retroactively add universal card properties
3. **Data duplication** - Same card stored hundreds of times across games

## Solution: Normalize Card Data

Create a separate `cards` table with universal card properties, referenced by `scryfallId`.

## Design Decisions

### Card Identity

- **Primary Key:** `scryfallId` (unique per printing)
- **Grouping:** `oracleCardName` (for grouping different printings of same card)
- **Display:** `name` (what's printed on the card)

### Fields to Store

Keep these fields in the normalized card table:

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

- Adapters return card data with all fields
- Card repository ensures cards exist in DB (upsert on scryfallId)
- Decks and games reference cards by scryfallId only

### Dynamic Population

- Cards added to repository as they appear in decks
- No pre-import needed
- Works for both MTGJSON and Archidekt sources

## Type Changes

### New Types

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

### Modified Types

```typescript
// src/types.ts
export interface CardDefinition {
  // REMOVE - all fields moved to Card table
  // This interface will be replaced by Card from card repository
}

export interface Deck {
  version: typeof PERSISTED_DECK_VERSION;
  id: number;
  name: string;
  totalCards: number;
  commanders: string[]; // CHANGED: array of scryfallIds
  cards: string[]; // CHANGED: array of scryfallIds
  provenance: DeckProvenance;
}
```

```typescript
// src/port-persist-state/types.ts
export interface GameCard {
  scryfallId: string; // CHANGED: reference instead of embedded card
  location: CardLocation;
  gameCardIndex: number;
  isCommander: boolean;
  currentFace: "front" | "back";
}
```

```typescript
// src/port-persist-prep/types.ts
export interface PersistedGamePrep {
  version: number;
  prepId: PrepId;
  deck: Deck; // Deck now has scryfallId arrays
  createdAt: Date;
  updatedAt: Date;
}
```

## Schema Changes

### New Table: `cards`

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


### Modified Table: `game_preps`

**JSON structure changes:**

- `deck.cards[]` → array of scryfallId strings
- `deck.commanders[]` → array of scryfallId strings

## Flow Changes

### Deck Loading Flow (Before)

```
Adapter → CardDefinition[] → Deck → Save to DB
```

### Deck Loading Flow (After)

```
Adapter → CardDefinition[] → Card Repository (upsert cards)
                           → Deck (with scryfallIds) → Save to DB
```

### Game Creation Flow (Before)

```
Load Deck → GameState.createNewGame(deck with CardDefinitions)
```

### Game Creation Flow (After)

```
Load Deck (scryfallIds) → Load Cards from repository
                        → GameState.createNewGame(deck, cards)
```

### Game Loading Flow (Before)

```
Load game_states row → Parse JSON blob → GameState (with embedded cards)
```

### Game Loading Flow (After)

```
Load game_states row → JOIN game_cards → JOIN cards → GameState (hydrated)
                     → Load game_events
```

### Game Save Flow (After)

```
GameState → Save game_states row
         → Delete old game_cards rows
         → Insert new game_cards rows
         → Delete old game_events rows
         → Insert new game_events rows
```

## Implementation Plan

1. **Create Card Repository**
   - Define types in `src/port-card-repository/types.ts`
   - Implement `SqliteCardRepositoryAdapter.ts` with `cards` table
   - Implement `InMemoryCardRepositoryAdapter.ts`

2. **Update Adapters**
   - Modify MTGJSON adapter to always set `oracleCardName = name`
   - Modify Archidekt adapter to populate all new fields
   - Update type definitions to include `manaCost`, `cmc`, `oracleText`
   - Adapters now return `Card` objects instead of `CardDefinition`

3. **Update Deck Persistence**
   - Modify deck save to store scryfallId arrays
   - Modify deck load to hydrate cards from repository
   - Update `PERSISTED_DECK_VERSION` to 2

4. **Rewrite Game State Persistence**
   - Create new `game_states` table schema (normalized)
   - Create `game_cards` table with foreign keys
   - Create `game_events` table
   - Rewrite `SqlitePersistStateAdapter.save()` to:
     - Save game_states row
     - Delete/insert game_cards rows
     - Delete/insert game_events rows
   - Rewrite `SqlitePersistStateAdapter.retrieve()` to:
     - Load game_states row
     - JOIN game_cards with cards table
     - Load game_events
     - Construct PersistedGameState
   - Update `InMemoryPersistStateAdapter` to match new structure
   - Update `PERSISTED_GAME_STATE_VERSION` to 7

5. **Update GameState Class**
   - Modify `GameCard` to reference scryfallId
   - Update `GameState.createNewGame()` to accept cards Map
   - Update `GameState.fromPersistedGameState()` to work with new structure
   - Keep in-memory representation similar (GameCard with full Card data)

6. **Update Server Initialization**
   - Create card repository instance
   - Pass to deck adapters
   - Pass to game state persistence adapter
   - Wire up dependencies

7. **Migration**
   - **WIPE DATABASE** - Delete `data.db`
   - New schema will be created on first run
   - No migration needed since we're in prototype phase

## Adapter Changes Required

### MTGJSON Adapter

```typescript
private convertMtgjsonToCard(mtgjsonCard: MtgjsonCard): Card {
  return {
    name: mtgjsonCard.name,
    oracleCardName: mtgjsonCard.name,  // NEW: always set
    scryfallId: mtgjsonCard.identifiers.scryfallId || "",
    multiverseid: parseInt(mtgjsonCard.identifiers.multiverseId || "0", 10),
    twoFaced: twoFacedLayouts.includes(mtgjsonCard.layout),
    colorIdentity: mtgjsonCard.colorIdentity || [],
    set: mtgjsonCard.setCode,
    types: mtgjsonCard.types || [],
    manaCost: mtgjsonCard.manaCost,     // NEW
    cmc: mtgjsonCard.manaValue || 0,    // NEW
    oracleText: mtgjsonCard.text,       // NEW
  };
}
```

### Archidekt Adapter

```typescript
private convertArchidektToCard(archidektCard: ArchidektCard): Card {
  const cardName = archidektCard.card.displayName || archidektCard.card.oracleCard.name;
  const oracleCardName = archidektCard.card.oracleCard.name;

  return {
    name: cardName,
    oracleCardName: oracleCardName,  // CHANGED: always set, even if same as name
    scryfallId: archidektCard.card.uid,
    multiverseid: archidektCard.card.multiverseid,
    twoFaced: (archidektCard.card.oracleCard.faces || []).length === 2,
    colorIdentity: archidektCard.card.oracleCard.colorIdentity.map(this.convertColorNameToCode),
    set: archidektCard.card.edition.editioncode,
    types: archidektCard.card.oracleCard.types || [],
    manaCost: archidektCard.card.oracleCard.manaCost,  // NEW
    cmc: archidektCard.card.oracleCard.cmc,            // NEW
    oracleText: archidektCard.card.oracleCard.text,    // NEW
  };
}
```

## Breaking Changes

- Database wipe required (acceptable in prototype phase)
- `PERSISTED_DECK_VERSION` bumped to 2
- `PERSISTED_GAME_STATE_VERSION` bumped to 7
- All existing games and preps will be lost
