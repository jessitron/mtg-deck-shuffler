# Feature: Rearrange Cards in Hand by Dragging

## Goal

Enable players to rearrange cards in their hand by dragging them to different positions, providing an intuitive way to organize cards during gameplay.

## Current Implementation

### HTML Structure

Hand cards are rendered in a horizontal scrolling flexbox container:

```html
<div id="hand-section">
  <h3>Hand (n)</h3>
  <div id="hand-cards" class="hand-cards">
    <!-- Individual card containers -->
    <div id="card-{gameCardIndex}-container" class="card-container clickable-card">
      <img id="card-{gameCardIndex}-face" src="{scryfallImageUrl}" class="mtg-card-image" />
      <div class="hand-card-buttons">
        <!-- Currently empty (swap buttons recently removed) -->
      </div>
    </div>
  </div>
</div>
```

**Key CSS** (from `public/styles.css`):
- `.hand-cards`: Flex container with horizontal layout, 15px gap, horizontal scrolling
- `.mtg-card-image`: 200px × 278px cards
- Animation classes: `.card-moved-left` and `.card-moved-right` for slide animations (215px translation)

### Position Data Model

Cards in hand use a fractional position system (from `src/port-persist-state/types.ts`):

```typescript
interface HandLocation {
  type: "Hand";
  position: number;  // Fractional values allowed for reordering
}
```

**Position Behavior**:
- Initial: Sequential integers (0, 1, 2, 3, ...)
- After removal: Gaps remain (no renormalization)
- After reordering: Fractional positions between cards (e.g., moving between 1 and 2 → position 1.5)
- Display: Cards sorted by position via `GameState.listHand()` (line 225-227)

### Backend Reordering Method

**Already Implemented**: `GameState.moveHandCard(from: number, to: number)` (lines 472-548)

How it works:
1. Takes array indices (0-based positions in sorted hand array)
2. Calculates new fractional position:
   - Moving to start: `firstCard.position - 1`
   - Moving to end: `lastCard.position + 1`
   - Moving between: Average of adjacent positions
3. Updates card's location position
4. Returns `WhatHappened` with animation data:
   - `movedRight`: Cards that visually shifted right
   - `movedLeft`: Cards that visually shifted left

### Recent History

- Oct 13, 2025: Swap arrow buttons (`↔`) removed (commit 9ae546c)
- Oct 13, 2025: Position field behavior documented (commit 89b2085)
- Oct 13, 2025: Drag-and-drop plan created (commit 25fcb48)

### Current State

✅ Backend method exists and is fully functional
✅ Position system supports efficient reordering
✅ Animation system ready via `WhatHappened`
❌ No endpoint exposes `moveHandCard()`
❌ No UI for triggering reordering

### Scroll Position Handling

JavaScript already preserves scroll position during HTMX swaps (in `public/game.js`, lines 1-35):
- Stores `handScrollPosition` before swap
- Restores after swap completes

## Implementation Plan

### 1. Create Backend Endpoint

Add `POST /move-hand-card/:gameId` endpoint in `src/app.ts`:
- Accept `from` and `to` indices in request body
- Call `gameState.moveHandCard(from, to)`
- Return updated hand HTML with animation classes
- Use existing `WhatHappened` for animation coordination

### 2. Add Drag-and-Drop JavaScript

Create custom JavaScript in `public/game.js`:
- Use HTML5 Drag and Drop API
- Handle events: `dragstart`, `dragover`, `drop`, `dragend`
- Calculate target position based on drop location
- Send HTMX request to `/move-hand-card` endpoint
- Provide visual feedback during drag

### 3. Update Hand Rendering

Modify `src/view/play-game/hand-components.ts`:
- Add `draggable="true"` to card containers
- Add data attributes for drag handling (e.g., `data-card-index`)
- Ensure animation classes are applied based on `WhatHappened`

### 4. Test Implementation

- Verify dragging works smoothly
- Verify positions persist after reordering
- Verify scroll position is maintained
- Verify animations work correctly
- Run snapshot tests to capture new HTML structure

## Design Decisions

### Why HTML5 Drag and Drop API?

- Native browser support
- Works with mouse and touch events
- Provides built-in visual feedback
- Simpler than custom mouse tracking

### Why Custom JavaScript?

- HTMX cannot handle drag-and-drop interactions
- Follows existing pattern: HTMX for server communication, custom JS for complex UI interactions
- Triggers on HTMX events where possible (per project guidelines)

### Why Fractional Positions?

- Already implemented and working
- Efficient: No need to renumber all cards
- Supports unlimited reordering without position exhaustion
- Persistent across page refreshes

## Related Files

- `src/GameState.ts` - Contains `moveHandCard()` method (lines 472-548)
- `src/view/play-game/hand-components.ts` - Renders hand cards
- `src/view/common/shared-components.ts` - Formats card containers
- `src/app.ts` - Express routes (needs new endpoint)
- `public/game.js` - Custom JavaScript (needs drag handlers)
- `public/styles.css` - Card and hand styling
