# Concurrent Game Access with Optimistic Concurrency Control

Status: implemented

## Problem

Multiple users can access the same game simultaneously (multiple browser tabs, multiple players sharing a game URL). Without concurrency control, race conditions can occur:

1. Browser A and B both load game state at version 5
2. Browser A performs an action (state becomes version 6)
3. Browser B performs an action based on stale state (version 5)
4. Browser B's action could corrupt state or produce incorrect results

## Solution: Optimistic Concurrency Control

We use **optimistic locking** with version numbers to detect stale state. When a client attempts to mutate state, we verify that their expected version matches the current version. If not, we reject the operation with a 409 Conflict status.

## Implementation

### Version Derivation

The state version is **derived from the event log length**, not stored as a separate field.

**File**: `src/GameState.ts:196-198`

```typescript
public getStateVersion(): number {
  return this.eventLog.getEvents().length;
}
```

**Benefits**:
- No separate version field to manage or persist
- Version automatically increments with every state change
- Immune to serialization/deserialization issues
- Event log is already the source of truth

### Version Transmission to Client

The current version is embedded in the HTML response in **three ways** depending on interaction type:

#### 1. Hidden Form Input (Traditional POST forms)

**File**: `src/view/deck-review/deck-review-page.ts:44`

```typescript
<input type="hidden" name="expected-version" value="${game.getStateVersion()}" />
```

Used in: Start Game button

#### 2. HTMX hx-vals Attribute (AJAX requests)

**File**: `src/view/play-game/active-game-page.ts:102`

```typescript
<button hx-post="/undo/${game.gameId}/${eventIndex}"
        hx-vals='{"expected-version": ${game.getStateVersion()}}'
        ...>
```

Used in: Draw, Shuffle, Undo, Card actions (reveal, play, move)

#### 3. Data Attribute (Game container)

**File**: `src/view/play-game/active-game-page.ts:43`

```typescript
<div id="game-container"
     data-expected-version="${game.getStateVersion()}"
     ...>
```

This allows JavaScript to read the version if needed for custom interactions.

### Version Validation

All mutation routes validate the version before performing the operation.

**File**: `src/app.ts:34-59`

```typescript
function validateStateVersion(
  req: express.Request,
  game: GameState
): { valid: true } | { valid: false; errorHtml: string } {
  const expectedVersionStr = req.body["expected-version"];
  if (expectedVersionStr === undefined) {
    // Backward compatibility: allow if no version provided
    return { valid: true };
  }

  const expectedVersion = parseInt(expectedVersionStr);
  const currentVersion = game.getStateVersion();

  if (expectedVersion !== currentVersion) {
    // Version mismatch - return error HTML
    const errorHtml = `<div class="stale-state-error">
      <h3>⚠️ Please Refresh</h3>
      <p>The game state has changed since you loaded this page.</p>
      <p>Expected version: ${expectedVersion}, Current version: ${currentVersion}</p>
      <button onclick="location.reload()" class="refresh-button">Refresh Page</button>
    </div>`;
    return { valid: false, errorHtml };
  }

  return { valid: true };
}
```

### Routes with Validation

All mutation routes call `validateStateVersion()` and return 409 Conflict if validation fails:

- `/start-game` - Start the game from deck review
- `/draw/:gameId` - Draw a card
- `/shuffle/:gameId` - Shuffle the library
- `/reveal/:gameId/:gameCardIndex` - Reveal a card from library
- `/put-in-hand/:gameId/:gameCardIndex` - Move revealed card to hand
- `/put-on-top/:gameId/:gameCardIndex` - Return card to top of library
- `/put-on-bottom/:gameId/:gameCardIndex` - Put card on bottom of library
- `/play-card/:gameId/:gameCardIndex` - Play a card from hand
- `/move-hand-card/:gameId` - Rearrange cards in hand
- `/flip-card/:gameId/:gameCardIndex` - Flip a two-faced card
- `/undo/:gameId/:gameEventIndex` - Undo an action

### Error Response

**HTTP Status**: 409 Conflict (standard status for version conflicts)

**Response Body**: User-friendly HTML modal with:
- Clear warning icon and "Please Refresh" heading
- Explanation that state has changed
- Debug info showing expected vs. current version
- Refresh button to reload the page

The 409 response replaces the target element (typically `#game-container`), showing the error in context.

### Backward Compatibility

If `expected-version` is not present in the request (older client, direct API call), the operation is **allowed**. This prevents breaking existing integrations while enabling concurrency control for supported clients.

## Flow Diagram

```
1. CLIENT LOADS GAME
   └─> Server renders page with version=5 embedded in forms

2. USER A DRAWS CARD (while User B's page is still open)
   ├─> Request: expected-version=5
   ├─> Server validates: 5 === 5 ✓
   ├─> Server executes draw (new event added)
   ├─> Server saves state (now 6 events)
   └─> Response: Updated HTML with version=6

3. USER B TRIES TO DRAW (still has stale state)
   ├─> Request: expected-version=5
   ├─> Server validates: 5 !== 6 ✗
   ├─> Server rejects operation
   └─> Response: 409 Conflict with refresh modal

4. USER B REFRESHES
   ├─> Server loads current state (6 events)
   └─> Response: Fresh HTML with version=6

5. USER B DRAWS SUCCESSFULLY
   ├─> Request: expected-version=6
   ├─> Server validates: 6 === 6 ✓
   └─> Success
```

## Testing

End-to-end verification test: `notes/verification/verify-optimistic-concurrency.spec.ts`

This Playwright test simulates two browsers accessing the same game:
1. Browser A starts game and draws (version increments)
2. Browser B (with stale state) attempts to draw
3. Verifies Browser B receives 409 Conflict
4. Verifies error message contains "Please Refresh"
5. Browser B refreshes and can now act successfully

**Run**: `npx playwright test notes/verification/verify-optimistic-concurrency.spec.ts`
**Requires**: App running on port 3001 (`PORT=3001 ./run`)

## Design Rationale

### Why Optimistic Locking?

**Alternative considered**: Pessimistic locking (lock game state during operations)

**Rejected because**:
- Requires lock management infrastructure
- Complicates server architecture
- Poor user experience (waiting for locks)
- Overkill for this use case (conflicts are rare)

**Optimistic is better because**:
- Simple implementation (just version comparison)
- No performance overhead
- Graceful degradation (clear error message)
- Natural fit for stateless HTTP

### Why Event Count as Version?

**Alternatives considered**:
- Separate numeric version field
- Timestamp-based versioning
- Content hash

**Event count is best because**:
- Already exists (event log is source of truth)
- Monotonically increasing
- No storage overhead
- Can't get out of sync with actual state

### Why 409 Conflict?

**HTTP 409** is the standard status for version conflicts. Other options:
- **428 Precondition Required**: Implies client should have sent precondition (but it did)
- **412 Precondition Failed**: For If-Match/ETag headers (different mechanism)
- **409 Conflict**: Specifically for "request conflicts with current state" ✓

## Future Enhancements

1. **Client-side conflict detection**: Check `data-expected-version` before sending request to fail fast
2. **Auto-refresh on conflict**: Optionally reload and retry operation automatically
3. **Optimistic UI updates**: Show action immediately, rollback on 409
4. **Conflict counter**: Track how often conflicts occur (telemetry)

## See Also

- `@notes/FEATURE-store-session-state.md` - Persistence layer that stores game state
- `@notes/DESIGN-state.md` - GameState architecture and event log
- `@notes/STRUCTURE-event-tracking.md` - Event log implementation
