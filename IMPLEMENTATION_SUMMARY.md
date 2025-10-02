# Implementation Summary: Fix Modal Closing Behavior

## Issue
When a user opened the library search modal, clicked on a card to open the card modal, and then pushed an action button, only the card modal would close. The library search modal would remain open, creating a confusing user experience.

## Solution Implemented

### 1. Modified Action Button Behavior
**File**: `/workspaces/mtg-deck-shuffler/src/view/play-game/game-modals.ts`

Changed the `formatModalActionButton` function to close both modals when an action button is clicked:

**Before**:
```typescript
hx-on::after-request="htmx.ajax('GET', '/close-card-modal', {target: '#card-modal-container', swap: 'innerHTML'})"
```

**After**:
```typescript
hx-on::after-request="htmx.ajax('GET', '/close-card-modal', {target: '#card-modal-container', swap: 'innerHTML'}); htmx.ajax('GET', '/close-modal', {target: '#modal-container', swap: 'innerHTML'})"
```

This ensures that when any action button is clicked in a card modal:
1. The card modal closes (via `/close-card-modal`)
2. The underlying library/table modal also closes (via `/close-modal`)

### 2. Added Test Coverage
**File**: `/workspaces/mtg-deck-shuffler/test/snapshot/card-modal-html.snapshot.test.ts`

Created a new test file to verify the fix:
- Tests that library card modals include both close calls
- Tests that revealed card modals include both close calls
- Verifies both close calls are in the same `hx-on::after-request` attribute

### 3. Updated Snapshots
Updated all snapshot files to reflect the current state of the HTML output:
- `library-modal-multiple-cards.html`
- `library-modal-single-card.html`
- `game-active-state.html`
- `game-not-started-state.html`
- `game-page-active-game.html`
- `game-page-not-started.html`
- `deck-test-1.html`
- `deck-test-2.html`
- `deck-subset.html`

These updates include:
- Card names now use modal links instead of Gatherer links
- Card links target `#card-modal-container` instead of `#modal-container`
- Action buttons include both modal close calls

## Impact

### Affected Components
All action buttons in card modals are affected:

**Library Cards**:
- "Reveal" button
- "Put in Hand" button

**Revealed Cards**:
- "Play" button
- "Put in Hand" button
- "Put on Top" button
- "Put on Bottom" button

**Hand Cards**:
- "Play" button
- "Put down" button

**Table Cards**:
- "Return" button

### User Experience Improvements
1. **Cleaner workflow**: Both modals close automatically after an action
2. **Immediate feedback**: User can see the updated game state right away
3. **No manual cleanup**: User doesn't need to manually close the library modal
4. **Consistent behavior**: All action buttons behave the same way

### Safety
The fix is safe because:
- If the library/table modal isn't open, closing it has no effect
- If it is open, it will be closed as expected
- The behavior is consistent across all card modal interactions
- All existing tests pass

## Testing

### Automated Tests
✅ All unit tests pass (66 tests)
✅ All snapshot tests pass (23 tests)
✅ New card modal tests verify the fix

### Manual Testing
See `MANUAL_TEST.md` for step-by-step manual testing instructions.

## Files Changed
1. `/workspaces/mtg-deck-shuffler/src/view/play-game/game-modals.ts` - Modified `formatModalActionButton`
2. `/workspaces/mtg-deck-shuffler/test/snapshot/card-modal-html.snapshot.test.ts` - Added new test
3. Multiple snapshot files updated to reflect current HTML output

## Verification
To verify the fix is working:
1. Run `npm test` - all tests should pass
2. Run `npm run test:snapshot` - all snapshot tests should pass
3. Follow the manual test steps in `MANUAL_TEST.md`

## Conclusion
The fix successfully addresses the issue where the library modal remained open after clicking an action button in the card modal. Both modals now close properly, providing a better user experience.
