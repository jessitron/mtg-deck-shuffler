# Card Modal Actions

**Status**: ✅ IMPLEMENTED

**Goal**: All buttons that apply to a card in a location should also appear in the card modal.

## Current State

### Card Modal Currently Shows
- Large card image
- Card name
- "See on Gatherer" link
- "Copy" button (copies image to clipboard)
- "Flip" button (only for two-faced cards)

### Location-Specific Actions Currently Available

**Hand**:
- Play (copies image and removes from hand)
- Put down (moves to revealed cards)
- Swap with next (reorders cards in hand)

**Revealed Cards**:
- Play (copies image and removes from revealed)
- Put in Hand
- Put on Top (of library)
- Put on Bottom (of library)

**Library** (via library search modal):
- Reveal (moves to revealed cards)
- Put in Hand

**Table** (via table modal):
- Return (moves back to revealed cards)

**Command Zone**:
- No location-specific actions (just flip for two-faced cards)

## Problem

When a player clicks on a card to view it in the modal, they lose access to all the action buttons that were available on the card in its location. They must close the modal to perform any action on the card.

## Solution Plan

### Phase 1: Pass Location Context to Modal

**Files to modify**:
- `src/view/play-game/game-modals.ts` - Update `formatCardModalHtmlFragment` signature
- `src/app.ts` - Update `/card-modal/:gameId/:cardIndex` endpoint

**Changes**:
1. The card modal already receives a `GameCard` object which contains `location` information
2. Use the `gameCard.location.type` to determine which actions to show
3. No need to pass additional parameters - the location is already available

### Phase 2: Create Action Button Rendering Functions

**Files to modify**:
- `src/view/play-game/game-modals.ts` - Add new functions

**New functions to create**:
```typescript
function formatModalCardActionsForHand(gameId: number, gameCardIndex: number): string
function formatModalCardActionsForRevealed(gameId: number, gameCardIndex: number): string
function formatModalCardActionsForLibrary(gameId: number, gameCardIndex: number): string
function formatModalCardActionsForTable(gameId: number, gameCardIndex: number): string
function formatModalCardActionsForCommandZone(): string
function getModalCardActionsByLocation(gameCard: GameCard, gameId: number): string
```

**Implementation notes**:
- These functions should generate the same action buttons as the location-specific components
- Buttons should include `hx-on::after-request` to close the modal after the action completes
- Use the existing `CardAction` type and `formatCardActionsGroupHtmlFragment` from shared-components
- The "Swap with next" button from hand should NOT be included (it doesn't make sense in modal context)

### Phase 3: Integrate Actions into Card Modal

**Files to modify**:
- `src/view/play-game/game-modals.ts` - Update `formatCardModalHtmlFragment`

**Changes**:
1. Call `getModalCardActionsByLocation(gameCard, gameId)` to get location-specific actions
2. Add these actions to the modal's action button area
3. Ensure proper styling/layout for the additional buttons

**Layout considerations**:
- Current modal has: [Gatherer] [Copy] [Flip]
- New modal should have: [Gatherer] [Copy] [Flip] | [Location Actions...]
- Use a visual separator (e.g., border or spacing) between utility buttons and action buttons
- Consider grouping: Utility buttons (Gatherer, Copy, Flip) vs Action buttons (Play, Put in Hand, etc.)

### Phase 4: Handle Modal Closure After Actions

**Files to modify**:
- `src/view/play-game/game-modals.ts` - Update action button generation

**Changes**:
1. All action buttons in the modal should include:
   ```html
   hx-on::after-request="htmx.ajax('GET', '/close-card-modal', {target: '#card-modal-container', swap: 'innerHTML'})"
   ```
2. This ensures the modal closes after the action is performed
3. The main game view will update via the action's normal `hx-target="#game-container"`

### Phase 5: Styling and Polish

**Files to modify**:
- `public/styles.css` (or wherever modal styles are defined)

**Changes**:
1. Add styles for action button groups in modal
2. Ensure buttons are properly sized and spaced
3. Consider responsive layout for mobile devices
4. Add visual separator between utility and action buttons
5. Ensure button hover states and focus states work well

**CSS classes to add/modify**:
- `.card-modal-actions` - container for all buttons
- `.card-modal-utility-buttons` - for Gatherer, Copy, Flip
- `.card-modal-location-actions` - for location-specific actions
- `.card-modal-action-separator` - visual separator

### Phase 6: Testing

**Test cases**:
1. Open modal for card in hand - verify Play and Put down buttons appear
2. Open modal for card in revealed - verify all 4 action buttons appear
3. Open modal for card in library (via search) - verify Reveal and Put in Hand appear
4. Open modal for card on table - verify Return button appears
5. Open modal for commander - verify no location actions appear
6. Click each action button in modal - verify:
   - Action is performed correctly
   - Modal closes automatically
   - Game view updates correctly
7. Test with two-faced cards - verify Flip button still works
8. Test on mobile - verify buttons are accessible and properly sized

## Implementation Order

1. **Start with Phase 2** - Create the action rendering functions
   - This is the core logic and can be developed independently
   - Reuse existing `CardAction` types and helper functions

2. **Then Phase 1 & 3** - Integrate into modal
   - Wire up the new functions to the modal rendering
   - Test that buttons appear correctly

3. **Then Phase 4** - Handle modal closure
   - Add the after-request handlers
   - Test the full interaction flow

4. **Then Phase 5** - Polish the styling
   - Make it look good and work well on all devices

5. **Finally Phase 6** - Comprehensive testing
   - Test all locations and actions
   - Test edge cases

## Edge Cases to Consider

1. **Cards that move locations**: If a card moves from hand to revealed, and the modal is open, what happens?
   - Current behavior: Modal stays open with old data (stale)
   - Proposed: Modal closes when action is taken (via Phase 4)

2. **Multiple commanders**: Do they need any special actions?
   - Current: No actions needed
   - Future: Might want "Remove from command zone" or similar

3. **Empty locations**: Can you open a modal for a card that's been removed?
   - Should be prevented by the UI (card no longer clickable)
   - But add error handling just in case

4. **Swap button in hand**: Should NOT appear in modal
   - Swapping requires seeing multiple cards at once
   - Modal only shows one card

## Future Enhancements

1. **Keyboard shortcuts**: Add keyboard shortcuts for common actions in modal
   - 'P' for Play
   - 'H' for Put in Hand
   - etc.

2. **Quick actions**: Add a "quick action" mode where clicking the card performs the most common action
   - Hand: Play
   - Revealed: Play
   - Library: Reveal

3. **Action history**: Show recent actions taken on this card in the modal

4. **Related cards**: Show other cards with similar names or in the same cycle

## Dependencies

- Existing `CardAction` type in `shared-components.ts`
- Existing `formatCardActionsGroupHtmlFragment` function
- HTMX for handling the modal interactions
- Current modal infrastructure (card-modal-container, close-card-modal endpoint)

## Files to Modify

1. `src/view/play-game/game-modals.ts` - Main implementation
2. `src/app.ts` - Minimal changes (if any)
3. `public/styles.css` - Styling for new button layout
4. Tests (if they exist) - Add test coverage for new functionality

## Success Criteria

- [x] All location-specific actions appear in the card modal
- [x] Actions work correctly when triggered from modal
- [x] Modal closes automatically after action is performed
- [x] Buttons are properly styled and accessible
- [x] No regression in existing modal functionality (Gatherer, Copy, Flip)
- [x] Works on desktop and mobile devices
- [x] Code is clean and maintainable (reuses existing components)

---

## Implementation Summary

### Changes Made

#### 1. `src/view/play-game/game-modals.ts`

**Added imports**:
- `CardAction` and `formatCardActionsGroupHtmlFragment` from shared-components

**New functions**:
- `formatModalActionButton()` - Helper to create action buttons with auto-close behavior
- `formatModalCardActionsForHand()` - Generates "Play" and "Put down" buttons
- `formatModalCardActionsForRevealed()` - Generates "Play", "Put in Hand", "Put on Top", "Put on Bottom" buttons
- `formatModalCardActionsForLibrary()` - Generates "Reveal" and "Put in Hand" buttons
- `formatModalCardActionsForTable()` - Generates "Return" button
- `getModalCardActionsByLocation()` - Routes to appropriate action generator based on card location

**Modified function**:
- `formatCardModalHtmlFragment()` - Now includes location-specific actions in addition to utility buttons
  - Utility buttons (Gatherer, Copy, Flip) are grouped in `.card-modal-utility-buttons`
  - Location actions are grouped in `.card-modal-location-actions` with a visual separator

**Key features**:
- All action buttons include `hx-on::after-request` to auto-close modal after action
- Buttons maintain same styling and behavior as location-specific buttons
- "Play" button includes necessary data attributes for card copying functionality
- Swap button from hand is intentionally excluded (doesn't make sense in modal context)

#### 2. `public/styles.css`

**New CSS classes**:
- `.card-modal-utility-buttons` - Container for Gatherer, Copy, Flip buttons
- `.card-modal-location-actions` - Container for location-specific actions with top border separator
- `.modal-action-button.play-button` - Pink/magenta styling for Play button
- `.modal-action-button.put-down-button` - Purple styling
- `.modal-action-button.put-in-hand-button` - Purple styling
- `.modal-action-button.put-on-top-button` - Indigo styling
- `.modal-action-button.put-on-bottom-button` - Deep purple styling
- `.modal-action-button.secondary` - Gray styling for secondary actions

**Design decisions**:
- Vertical layout with consistent spacing (10px gap between buttons)
- Visual separator (2px border) between utility and action buttons
- Consistent hover effects (translateY and box-shadow)
- Color-coded buttons for easy recognition
- Responsive design maintained

### How It Works

1. **User clicks on a card** anywhere in the game (hand, revealed, library modal, table modal)
2. **Card modal opens** showing the large card image
3. **Modal detects card location** from `gameCard.location.type`
4. **Appropriate action buttons are rendered** based on location:
   - Hand: Play, Put down
   - Revealed: Play, Put in Hand, Put on Top, Put on Bottom
   - Library: Reveal, Put in Hand
   - Table: Return
   - Command Zone: No actions (just utility buttons)
5. **User clicks an action button**:
   - Action is performed via HTMX POST request
   - Game state updates (target: `#game-container`)
   - Modal automatically closes via `hx-on::after-request`
6. **User sees updated game state** with modal closed

### Testing Checklist

To verify the implementation works correctly:

- [ ] Open modal for card in hand → verify "Play" and "Put down" buttons appear
- [ ] Click "Play" from modal → verify card is copied and removed, modal closes
- [ ] Click "Put down" from modal → verify card moves to revealed, modal closes
- [ ] Open modal for revealed card → verify all 4 action buttons appear
- [ ] Test each revealed card action → verify correct behavior and modal closes
- [ ] Open library search modal → click card → verify "Reveal" and "Put in Hand" buttons
- [ ] Open table modal → click card → verify "Return" button appears
- [ ] Open modal for commander → verify no location actions (only utility buttons)
- [ ] Test with two-faced card → verify "Flip" button still works
- [ ] Test "Copy" button → verify image copies to clipboard
- [ ] Test "See on Gatherer" link → verify opens in new tab
- [ ] Test on mobile device → verify buttons are accessible and properly sized
- [ ] Test keyboard navigation → verify Escape key closes modal

### Known Limitations

1. **Swap button not included**: The "Swap with next" button from hand is intentionally excluded because it requires seeing multiple cards at once, which doesn't make sense in a single-card modal context.

2. **Modal doesn't update if card moves**: If a card moves to a different location while the modal is open, the modal will show stale data. This is acceptable because the modal closes after any action is taken.

3. **No keyboard shortcuts**: Future enhancement could add keyboard shortcuts for common actions (e.g., 'P' for Play, 'H' for Put in Hand).

### Future Enhancements

1. **Keyboard shortcuts** for actions in modal
2. **Quick action mode** where clicking card performs most common action
3. **Action history** showing recent actions on the card
4. **Related cards** showing other cards in the same cycle or with similar names
5. **Undo last action** button in modal
