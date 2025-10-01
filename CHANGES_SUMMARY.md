# Modal Auto-Close Feature Implementation

## Summary
Implemented auto-close functionality for library search and table modals when the player clicks 'reveal' or 'put in hand' buttons.

## Changes Made

### 1. Library Search Modal (`src/view/deck-review/deck-review-page.ts`)
- Added `hx-on::after-request` attribute to both "Reveal" and "Put in Hand" buttons
- The attribute triggers an HTMX AJAX call to `/close-modal` after the button action completes
- This automatically closes the modal after the player performs either action

**Modified buttons:**
- Reveal button: Now closes modal after revealing a card
- Put in Hand button: Now closes modal after putting a card in hand

### 2. Table Modal (`src/view/play-game/game-modals.ts`)
- Added `hx-on::after-request` attribute to the "Return" button
- The attribute triggers an HTMX AJAX call to `/close-modal` after the button action completes
- This automatically closes the modal after the player returns a card from the table

**Modified button:**
- Return button: Now closes modal after returning a card to hand

## Technical Implementation

The implementation uses HTMX's `hx-on::after-request` event handler to trigger a modal close action after the primary button action completes successfully. The syntax used is:

```html
hx-on::after-request="htmx.ajax('GET', '/close-modal', {target: '#modal-container', swap: 'innerHTML'})"
```

This approach:
1. Waits for the primary action (reveal/put in hand/return) to complete
2. Then triggers a GET request to `/close-modal`
3. Swaps the content of `#modal-container` with the response (empty content)
4. Effectively closes the modal

## Testing

All tests pass successfully:
- ✅ Regular unit tests: 66 tests passed
- ✅ Snapshot tests: 21 tests passed
- ✅ Updated snapshots to reflect the new HTML structure

## Files Modified

1. `src/view/deck-review/deck-review-page.ts` - Library modal implementation
2. `src/view/play-game/game-modals.ts` - Table modal implementation
3. `dist/view/deck-review/deck-review-page.js` - Compiled JavaScript
4. `dist/view/play-game/game-modals.js` - Compiled JavaScript
5. Test snapshots updated to reflect new HTML structure

## User Experience Impact

**Before:** Players had to manually close the modal after clicking "Reveal" or "Put in Hand" buttons.

**After:** The modal automatically closes after the action completes, providing a smoother user experience.
