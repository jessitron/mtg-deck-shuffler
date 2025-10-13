# Feature: Drag-and-Drop Hand Card Reordering

## Implementation Plan

### 1. **Remove Existing Swap Functionality**
- Remove swap arrow buttons (⬅️ ➡️) from hand card rendering in `src/view/play-game/active-game-page.ts`
- Remove `/swap-hand-card-left` and `/swap-hand-card-right` endpoints from `src/app.ts:247-268`
- Remove or update tests that rely on swap endpoints

### 2. **Backend Changes**

#### New Endpoint: `POST /move-hand-card`
- Location: `src/app.ts`
- Parameters:
  - `fromPosition`: current card position (number)
  - `toPosition`: target position (number)
- Returns: `WhatHappened` object to enable animation of shifted cards
- Implementation:
  - Call new `gameState.moveHandCard(fromPosition, toPosition)` method
  - Return HTML with animation data for shifted cards

#### New GameState Method
- Location: `src/model/game-state.ts`
- Method: `moveHandCard(from: number, to: number): WhatHappened`
- Logic:
  - Validate positions are in bounds
  - Remove card from `from` position
  - Insert card at `to` position
  - Return `WhatHappened` tracking which cards shifted positions

### 3. **Frontend Changes**

#### HTML Structure
- Add `draggable="true"` attribute to hand card elements
- Add data attributes for position tracking (e.g., `data-position="0"`)
- Add drop zone indicators between cards

#### Custom JavaScript
- Location: New file or addition to existing JS in `src/view/play-game/active-game-page.ts` header
- Event Handlers:
  - `dragstart`: Capture dragged card's position, add visual feedback
  - `dragover`: Prevent default, highlight valid drop zones
  - `drop`: Calculate target position, POST to `/move-hand-card`, trigger HTMX swap
  - `dragend`: Clean up visual states
- Integration:
  - Trigger on HTMX events (e.g., `htmx:afterSwap`) to re-attach handlers
  - Use HTMX to handle server response and DOM updates

#### Visual Feedback (CSS)
- Dragging state: reduce opacity of dragged card
- Drop zones: highlight valid drop targets
- Cursor: change to `grabbing` during drag
- Placeholder: optional ghost element showing drop position

### 4. **Animation Integration**
- The returned `WhatHappened` object should track:
  - The moved card (from → to)
  - Any cards that shifted positions as a result
- Frontend animation can use this data to animate cards sliding to new positions
- Reuse existing animation patterns from other card movements

### 5. **Testing**
- Unit tests for `moveHandCard()` method with various scenarios:
  - Move to adjacent position
  - Move across multiple positions
  - Edge cases (first to last, last to first)
  - Invalid positions
- Integration tests for `/move-hand-card` endpoint
- Manual testing for drag-and-drop UX

## Notes
- HTMX doesn't have native drag-and-drop support, so custom JavaScript is required
- Keep JavaScript minimal and focused on drag mechanics
- Let HTMX handle all server communication and DOM updates
- Consider mobile touch support in future iterations
