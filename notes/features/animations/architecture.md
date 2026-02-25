# Animations Architecture

## Two Animation Mechanisms

### 1. Server-Driven (WhatHappened)

Most gameplay animations use a **server-driven** approach:

1. Player action mutates `GameState` (draw, shuffle, rearrange hand)
2. `GameState` method returns a `WhatHappened` object describing what changed
3. Server renders new HTML, passing `WhatHappened` to view functions
4. `getAnimationClassHelper()` in `shared-components.ts` maps `WhatHappened` to CSS classes
5. HTMX swaps in the new HTML; browser applies CSS animations on the new elements

```
User action → POST route → GameState mutation → WhatHappened
    → formatActiveGameHtmlSection(game, whatHappened)
        → formatCardContainer(..., whatHappened)
            → getAnimationClassHelper(whatHappened, cardIndex)
                → CSS class string (e.g., " card-moved-left")
```

This works for **entrance animations** — new content arrives with animation classes already applied.

### 2. Client-Driven (JS class application)

The card play exit animation uses a **client-driven** approach:

1. Player clicks "Play" button
2. `htmx:beforeRequest` handler in `game.js` adds `.being-played` class to the card container
3. CSS `cardPlayExit` animation starts (1.5s)
4. HTMX sends POST, gets response, waits 1.5s (`hx-swap="outerHTML swap:1.5s"`)
5. After 1.5s, HTMX swaps in new game state (card is gone)

This is needed for **exit animations** — the old element needs to animate out before being replaced.

**Status**: This mechanism is currently broken. The `.being-played` class is added but the animation doesn't visually play.

## WhatHappened Interface

Defined in `src/GameState.ts` (line 58):

```typescript
export interface WhatHappened {
  shuffling?: boolean;
  movedRight?: GameCard[];
  movedLeft?: GameCard[];
  dropppedFromLeft?: GameCard;  // note: typo in property name
  dropppedFromRight?: GameCard; // note: typo in property name
}
```

## Animation Class Helper

In `src/view/common/shared-components.ts` (lines 115-127):

`getAnimationClassHelper(whatHappened, gameCardIndex)` checks the `WhatHappened` arrays/properties and returns the appropriate CSS class string for a given card.

## HTMX Swap Timing

The `swap:Xs` modifier in `hx-swap` tells HTMX to keep old content in the DOM for X seconds before replacing it. This is the only mechanism for exit animations.

Used in:
- `game-modals.ts` line 73: `hx-swap="outerHTML swap:1.5s"` for Play action
- `revealed-cards-components.ts` line 57: same pattern for Play from revealed cards

All other actions use immediate `hx-swap="outerHTML"`.

## CSS Keyframes

All animation keyframes live in `public/game.css` except:
- `fadeInTile` in `public/deck-selection.css`
- Card flip uses `transition` (not keyframes) in both `game.css` and `prepare.css`

## Drag-and-Drop Interaction

`game.js` (lines 183-186) removes animation classes when a drag starts, preventing animation flicker when a card is dropped in a new position. After drop, HTMX swaps in the new hand state, which may include new animation classes from `WhatHappened`.
