# Feature: Hand Card Rearrangement

## Goal

Allow players to rearrange cards in their hand by dragging and dropping them into their desired order. This provides a more intuitive and flexible way to organize cards compared to the current swap-with-next button approach.

## Current State

Hand cards are displayed in a horizontal flexbox with swap buttons (`↔`) that allow swapping a card with the next card to its right. The position field uses fractional values to support reordering without renormalization.

**Key Implementation Details:**

- Position field: Fractional numbers, not necessarily contiguous integers. They can be negative, too.
- Cards sorted by position value in `GameState.listHand()`
- Animation system via `WhatHappened` with `movedLeft`/`movedRight` arrays
- Scroll position preservation already implemented

## Implementation Plan

### Phase 1: Add Drag-and-Drop (Keep Swap Buttons)

#### Backend Changes

1. **Add `moveHandCard(fromHandPosition, toHandPosition)` method** to `GameState.ts`

   - Parameters: Array indices in sorted hand (0-based)
   - Calculate new fractional position:
     - Moving to start (index 0): `firstCard.position - 1`
     - Moving to end: `lastCard.position + 1`
     - Moving between cards: Average of adjacent positions
   - Return `WhatHappened` with animation data for cards that shifted
   - add tests for each valid case.
   - as a task, implement a property-based test for a series of moveHandCard operations, so you can test more complicated states.

2. **Add `/move-hand-card/:gameId/:from/:to` endpoint** to `app.ts`
   - Call `game.moveHandCard(from, to)`
   - Persist updated state via PersistStatePort
   - Return game section HTML with `whatHappened` for animations

#### Frontend Changes

3. **Update hand card HTML** in `hand-components.ts`

   - Add `draggable="true"` to `.card-container` elements
   - Add drop zones between each two cards
   - Add `data-hand-position="{index}"` attributes to the drop zone for tracking position
   - Keep existing swap buttons during this phase

4. **Implement drag-and-drop handlers** in `public/game.js`

   - `dragstart`: Store dragged card's hand position, add `.dragging` class
   - `dragover`: Prevent default, add `.drag-over` class to drop target
   - `drop`: Calculate target position, send HTMX POST to `/move-hand-card` endpoint
   - `dragend`: Remove `.dragging` class, clean up state

5. **Add drag styling** to `public/styles.css`
   - `.dragging`: Reduce opacity (0.5), add transform effect
   - `.drag-over`: get wider, have an outline and a light fill
   - Ensure dragged card ghost image looks reasonable

### Phase 2: Remove Swap Buttons - NOT YET

6. **Remove swap button code** from `hand-components.ts`

   - Delete `.hand-card-buttons` div and swap button HTML

7. **Remove `/swap-with-next` endpoint** from `app.ts`

   - Delete the endpoint handler

8. **Remove `swapHandCardWithNext()` method** from `GameState.ts`

   - Delete the method and related code

9. **Remove swap button styling** from `public/styles.css`

   - Delete `.hand-card-buttons` and `.swap-button` CSS rules
   - Remove `.card-moved-left` and `.card-moved-right` animation classes if no longer used

10. **Update tests**
    - Remove tests for `swapHandCardWithNext()` method
    - Update snapshot tests

## Design Decisions

### Why Fractional Positions?

The fractional position system allows unlimited reordering without ever needing to renormalize positions. Moving a card between positions 2 and 3 can use position 2.5, and subsequent moves can use 2.25, 2.75, etc.

### Why Keep Swap Buttons Initially?

Testing drag-and-drop functionality while maintaining existing swap buttons ensures we don't lose functionality during development. Once drag-and-drop is verified working, swap buttons become redundant.

### Why Custom JavaScript?

HTMX doesn't support drag-and-drop natively. Custom JavaScript is consistent with the project's pattern of using JS for interactions that can't be implemented with HTMX (like scroll position preservation).

## Testing Strategy

- Manual testing: Verify drag-and-drop works across different scenarios (move to start, end, middle)
- Unit tests: Test `moveHandCard()` fractional position calculations
- Snapshot tests: Update after HTML changes
- Verify animations work correctly when cards shift
- Test scroll position is preserved during reordering

## Future Enhancements

- Touch device support (may need different event handlers)
- Keyboard shortcuts for reordering (accessibility)
- Visual preview of where card will be dropped
- Multi-card selection and moving (advanced)
