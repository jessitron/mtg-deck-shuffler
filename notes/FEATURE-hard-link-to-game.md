# Make the URL in the browser point back to the game

Status: planned

When we create a game, we want the URL in the browser to reflect that. For instance, if the game ID is 12345, we want the URL to be https://librarytron.com/game/12345

Likewise, when we end the game, we want the URL to revert to the default.

If the player copies the URL to a different browser, it should load all the state for that game, and let them continue playing.

Please put an implementation plan here:

## Implementation Plan

### Phase 1: URL Structure Design

- **URL pattern**: `https://librarytron.com/game/{gameId}` for active games
- **Default URL**: `https://librarytron.com/` when no game or game ended
- **Game ID**: Use UUIDs (e.g., `550e8400-e29b-41d4-a716-446655440000`) for uniqueness and security

### Phase 2: Server-Side Routing Changes

1. **Add game persistence layer**: Already have `GameState` interface and adapters - will use these
2. **New GET route**: `app.get('/game/:gameId', async (req, res) => {...})`
   - Retrieve game state from storage using existing `GameStateAdapter`
   - Render full HTML page with game state or redirect to home if game not found
3. **Modify existing POST routes**:
   - `/start-game`: Generate unique game ID, persist game state, respond with redirect info
   - `/end-game`: Update game status to 'ended', respond with redirect to home
4. **Add game state storage**: Use existing `gameStateInMemory.ts` or `gameStateSqlite.ts` adapters

### Phase 3: Client-Side URL Management

1. **Update HTMX responses** to include URL changes:
   - Use `HX-Push-Url` header in responses to update browser URL without page reload
   - `/start-game` response: `HX-Push-Url: /game/{gameId}`
   - `/end-game` response: `HX-Push-Url: /`
2. **Handle direct navigation**: New GET route serves full page for direct links

### Phase 4: Game State Persistence Integration

1. **Integrate existing GameState system**:
   - Use `startGame()`, `retrieveGame()`, `updateGame()`, `endGame()` methods
   - Store deck ID, library card order, and game metadata
2. **Data to persist**:
   - Game ID (UUID)
   - Deck ID (Archidekt ID)
   - Library card order (for consistent shuffled state)
   - Game status ('active' | 'ended')
   - Start date, last updated

### Phase 5: Implementation Steps

1. **server.ts modifications**:

   - Import GameStateAdapter (choose in-memory or SQLite based on requirements)
   - Add `app.get('/game/:gameId')` route handler
   - Modify POST handlers to generate game IDs and set HX-Push-Url headers
   - Add game persistence calls to existing game lifecycle

2. **HTMX integration**:

   - Server responses include `HX-Push-Url` header
   - No client-side JavaScript changes needed (HTMX handles URL updates)

3. **Error handling**:
   - Invalid game IDs redirect to home page
   - Expired/ended games show appropriate message with option to start new game

### Technical Considerations

- **Security**: UUIDs prevent game ID guessing
- **Performance**: In-memory storage for development, SQLite for production
- **SEO**: Full HTML pages served for direct navigation (not just HTMX fragments)
- **Backwards compatibility**: Existing functionality unchanged, new URLs additive
