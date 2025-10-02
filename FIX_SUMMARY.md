# Fix Summary: Close Library Modal When Action Button is Clicked from Card Modal

## Problem
When a player:
1. Opens the library search modal
2. Clicks on a card to open the card modal
3. Pushes an action button (e.g., "Reveal", "Put in Hand")

The card modal would close, but the library modal would remain open. This was confusing UX behavior.

## Root Cause
The action buttons in the card modal were only closing the card modal itself via:
```javascript
hx-on::after-request="htmx.ajax('GET', '/close-card-modal', {target: '#card-modal-container', swap: 'innerHTML'})"
```

They were not closing the underlying library modal (or table modal) that might have been used to open the card modal.

## Solution
Modified the `formatModalActionButton` function in `/workspaces/mtg-deck-shuffler/src/view/play-game/game-modals.ts` to close both modals:

```javascript
hx-on::after-request="htmx.ajax('GET', '/close-card-modal', {target: '#card-modal-container', swap: 'innerHTML'}); htmx.ajax('GET', '/close-modal', {target: '#modal-container', swap: 'innerHTML'})"
```

This ensures that when an action button is clicked:
1. The card modal closes (via `/close-card-modal` targeting `#card-modal-container`)
2. The library/table modal also closes (via `/close-modal` targeting `#modal-container`)

## Impact
This change affects all action buttons in card modals, including:
- Library card actions: "Reveal", "Put in Hand"
- Revealed card actions: "Play", "Put in Hand", "Put on Top", "Put on Bottom"
- Hand card actions: "Play", "Put down"
- Table card actions: "Return"

The fix is safe because:
- If the library/table modal isn't open, closing it has no effect
- If it is open, it will be closed as expected
- The behavior is now consistent across all card modal interactions

## Files Changed
1. `/workspaces/mtg-deck-shuffler/src/view/play-game/game-modals.ts` - Modified `formatModalActionButton` function
2. `/workspaces/mtg-deck-shuffler/test/snapshot/card-modal-html.snapshot.test.ts` - Added test to verify the fix

## Testing
Created a new snapshot test that verifies:
1. Card modals for library cards include both close calls
2. Card modals for revealed cards include both close calls
3. Both close calls are in the same `hx-on::after-request` attribute

All tests pass successfully.
