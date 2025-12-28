# Feature: Game Prep State

## Goal

Separate game preparation (deck review, future configuration) from active gameplay, fixing the browser back button and enabling future prep-specific features.

## Problem with Current Implementation

Currently, Deck Review and Active Game share the same URL (`/game/:gameId`), differentiated only by `GameStatus.NotStarted` vs `GameStatus.Active`. This causes:

1. **Broken browser back button**: From Active Game, browser back goes to Deck Selection, skipping Deck Review entirely
   - History: `/choose-any-deck` → `/game/123` → `/game/123` → `/game/123`
   - Only first redirect creates history entry, same-URL updates don't
2. **Conflated concerns**: Deck Review is preparation, not gameplay, but lives in GameState
3. **Future limitations**: No clear place for prep-specific features (playmat selection, card backs, etc.)

## Solution: Game Prep State

Introduce a separate **GamePrep** concept representing game preparation phase, distinct from GameState which represents active gameplay.

### Flow

**Before:**
```
Deck Selection → /game/:gameId (Deck Review, NotStarted)
              → /game/:gameId (Active Game, Active)
```

**After:**
```
Deck Selection → /prepare/:prepId (Deck Review)
              → /game/:gameId (Active Game)
```

### Type Definitions

**PersistedGamePrep** (new):
```typescript
export type PrepId = number;

export interface PersistedGamePrep {
  version: number;         // For optimistic concurrency control
  prepId: PrepId;
  deck: Deck;              // Full deck with id, name, totalCards, provenance, cards, commanders
  createdAt: Date;
  updatedAt: Date;

  // Future fields (not implemented yet):
  // playmapUrl?: string;
  // cardBackUrl?: string;
}
```

**PersistedGameState** (updated):
```typescript
export interface PersistedGameState {
  version: typeof PERSISTED_GAME_STATE_VERSION;
  gameId: GameId;
  status: GameStatus;       // Only Active and Ended (NotStarted removed)

  // NEW: Reference to the prep this game came from
  prepId: PrepId;
  prepVersion: number;      // Version of prep when game was created (for reference/auditing)

  // Existing fields:
  deckProvenance: DeckProvenance;
  deckName: string;
  deckId: number;
  totalCards: number;
  gameCards: GameCard[];
  events: GameEvent[];
}
```

### GameStatus Changes

Remove `GameStatus.NotStarted`. GameState only has:
- `Active` - Game in progress
- `Ended` - Game finished

**Rationale**: "Not started" is no longer a game state, it's a prep state.

## URL Structure

- `/choose-any-deck` - Deck Selection
- `/prepare/:prepId` - Deck Review (NEW)
- `/game/:gameId` - Active Game (simplified, only shows active games)

## Route Changes

### POST /deck (updated)
**Before**: Creates GameState with NotStarted → redirects to `/game/:gameId`

**After**: Creates GamePrep → redirects to `/prepare/:prepId`

### GET /prepare/:prepId (new)
Loads GamePrep and renders Deck Review page.

### POST /start-game (updated)
**Before**: Updates GameState from NotStarted → Active → redirects to `/game/:gameId`

**After**: Creates new GameState from GamePrep → redirects to `/game/:gameId`

**Implementation**:
1. Load prep by prepId
2. Create new GameState with:
   - Cards initialized from prep.deck
   - Status = Active
   - prepId and prepVersion stored as reference
3. Shuffle library (as before)
4. Persist game
5. Redirect to `/game/:gameId`

### GET /game/:gameId (simplified)
**Before**: Loads game, renders Deck Review OR Active Game based on status

**After**: Loads game, renders Active Game only (requires status === Active)

### POST /restart-game (updated)
**Before**: Re-fetches deck from Archidekt → creates new game

**After**:
1. Look up current game's `prepId`
2. Retrieve prep (gets current version, not the version used when game was created)
3. Create new GameState from latest prep
4. Redirects to `/game/:newGameId`

**Rationale**: User gets latest deck/settings, matching current behavior of re-fetching from source.

## Persistence Architecture

### Separate Persistence for Different Lifecycles

Create **PersistPrepPort** (separate from PersistStatePort) because:

1. **Different lifecycles**: Games are ephemeral (delete after days), preps are longer-lived
2. **Different query patterns**: Need `retrieveLatestPrepByDeck()` for "remember last settings"
3. **Independent optimization**: Can use different storage strategies, retention policies
4. **Single Responsibility**: Each port manages one concern

### PersistPrepPort Interface

```typescript
export interface PersistPrepPort {
  savePrep(prep: PersistedGamePrep): Promise<PrepId>;
  retrievePrep(prepId: PrepId): Promise<PersistedGamePrep | null>;

  // For future "remember last settings for this deck" feature:
  retrieveLatestPrepByDeck(deckId: number): Promise<PersistedGamePrep | null>;

  newPrepId(): PrepId;
}
```

### SqlitePersistPrepAdapter

New table:
```sql
CREATE TABLE IF NOT EXISTS game_preps (
  id INTEGER PRIMARY KEY,
  prep TEXT NOT NULL,
  version INTEGER NOT NULL,
  deck_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

Index on `deck_id` for `retrieveLatestPrepByDeck()` queries.

## View Changes

**Deck Review** (`src/view/deck-review/deck-review-page.ts`):
- Change signature: `formatDeckReviewHtmlPage(prep: PersistedGamePrep)`
- Update forms to use `prep-id` instead of `game-id`
- Access deck info via `prep.deck.name`, `prep.deck.cards`, etc.

**Active Game** (`src/view/play-game/active-game-page.ts`):
- No changes needed, still works with GameState

## Future Extensibility

This design makes it easy to add prep-specific features:

1. **Playmat selection**: Add `playmapUrl` to PersistedGamePrep, dropdown in Deck Review
2. **Card back selection**: Add `cardBackUrl` to PersistedGamePrep
3. **Named prep templates**: "Tournament Setup", "Casual Friday"
4. **User-specific preps**: When auth is added, link preps to users
5. **Deck-specific defaults**: Load last prep used for this deck
6. **Prep sharing**: Export/import configurations

## Implementation Steps

1. Create `src/port-persist-prep/types.ts` with PrepId, PersistedGamePrep, PersistPrepPort
2. Implement `src/port-persist-prep/SqlitePersistPrepAdapter.ts`
3. Implement `src/port-persist-prep/InMemoryPersistPrepAdapter.ts`
4. Update `src/port-persist-state/types.ts`:
   - Add `prepId` and `prepVersion` to PersistedGameState
   - Remove `GameStatus.NotStarted`
5. Update `src/server.ts` to instantiate prep persistence adapters
6. Update routes in `src/app.ts`:
   - POST /deck → create prep, redirect to /prepare/:prepId
   - GET /prepare/:prepId → render Deck Review
   - POST /start-game → create game from prep
   - POST /restart-game → recreate game from prep
   - GET /game/:gameId → require Active status only
7. Update `src/view/deck-review/` to work with PersistedGamePrep
8. Update `src/GameState.ts` to remove NotStarted handling
9. Update tests to use GamePrep flow
10. Update documentation:
    - notes/DESIGN-application-flow.md
    - notes/GLOSSARY.md (add GamePrep definitions)
    - CLAUDE.md (update application flow description)

## Migration Considerations

Existing games with `NotStarted` status:
- Add startup check to mark them as `Ended` or delete them
- Or: One-time migration script to convert to Active

## Design Rationale

**Why not just use different URLs with same state?**
- Conflates preparation config (future: playmat) with game state
- No clear place for prep-specific features
- Different lifecycles need different persistence strategies

**Why separate PrepId from GameId?**
- Clearer semantics (prep ≠ game)
- Future: multiple games can be created from same prep
- Easier to reason about relationships

**Why store prepVersion in GameState?**
- Auditing: know which prep version was used
- Future: could compare current prep vs game's prep to show what changed
- Debugging: understand game's configuration lineage
