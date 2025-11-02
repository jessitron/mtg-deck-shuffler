# game.js Usage by Page

This document describes which functions in `public/game.js` are used on which pages/screens of the application.

## Overview

`game.js` contains client-side JavaScript functionality for:
1. Scroll position restoration (HTMX event handlers)
2. Clipboard operations for card images
3. Drag-and-drop for hand card rearranging
4. Deck number input validation

## Usage by Page/Screen

### Deck Selection Page (/)
**View file:** `src/view/deck-selection/deck-selection-page.ts`

**Functions used:**
- `setupDeckNumberValidation()` - Enables/disables the "Load Deck" button based on whether the deck number input has a value
  - Targets: `#deck-number` input and `#load-deck-button` button

**Loaded on:** Page load (DOMContentLoaded event)

---

### Deck Review Page (/game/:gameId - before game starts)
**View file:** `src/view/deck-review/deck-review-page.ts`

**Functions used:** None

---

### Active Game Page (/game/:gameId - during game)
**View file:** `src/view/play-game/active-game-page.ts`

**Functions used:**
1. **Scroll position restoration**
   - Event listeners: `htmx:beforeSwap` and `htmx:afterSwap`
   - Preserves scroll position of hand and revealed cards when HTMX updates the page
   - Targets: `#hand-section .hand-cards` and `#revealed-cards-area`
   - Used in: `hand-components.ts` and `revealed-cards-components.ts`

2. **Clipboard operations for playing cards**
   - `copyCardToClipboard(cardId, face)` - Core function to copy card image via proxy
   - Event listener: `htmx:beforeRequest` on `.play-button` elements
   - Copies card image to clipboard before HTMX request
   - Adds visual feedback ("Copied!" or "Copy failed")
   - Adds `.being-played` class to card container for animation
   - Used in: `revealed-cards-components.ts`

3. **Drag-and-drop for hand card rearranging**
   - `setupHandCardDragAndDrop()` - Sets up drag/drop event handlers
   - Event listeners: `dragstart`, `dragend`, `dragover`, `dragleave`, `drop`
   - Allows player to reorder cards in hand by dragging
   - Makes HTMX POST request to `/move-hand-card/:gameId/:from/:to`
   - Loaded: On page load (DOMContentLoaded) and after HTMX swaps (htmx:afterSwap)
   - Used in: `hand-components.ts` (draggable cards in `#hand-cards`)

---

### Card Modal (any page with card modals)
**View file:** `src/view/play-game/game-modals.ts`

**Functions used:**
- `window.copyCardImageToClipboard(event, imageUrl, cardName)` - Called directly from HTML
  - Copies card image to clipboard from modal
  - Shows temporary feedback ("Copied!" or "Copy failed")
  - Used in card detail modals

---

## Function Dependencies

### Global Dependencies
All functions depend on:
- `htmx` library (loaded via `/htmx.js`)
- `Hny` tracing library (loaded via `/hny.js`)

### Page-Specific Dependencies
- **Active Game Page:** Requires game container with `data-game-id` attribute
- **Deck Selection Page:** Requires `#deck-number` input and `#load-deck-button` button
- **All pages with HTMX:** Scroll restoration runs automatically on all HTMX swaps

## Recommendations for Splitting

**IMPORTANT:** Before adding any JavaScript for the Deck Review page, split game.js into separate files. This makes debugging easier.

Based on this analysis, `game.js` could be split into:

1. **deck-selection.js** - Only `setupDeckNumberValidation()`
2. **active-game.js** - Scroll restoration, drag-and-drop, card clipboard operations
3. **card-modal.js** - `copyCardImageToClipboard()` for modals

Current status: Keep as one file for now since:
- Functions are relatively small (~276 lines total)
- Most complexity is in the active game page
- Event listeners check for element existence before attaching
- No performance issues with loading all functions on all pages
- Deck Review page currently has no JavaScript
