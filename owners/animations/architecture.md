# Animations Architecture

## Animation Mechanism: Server-Driven (WhatHappened)

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

All game actions use immediate `hx-swap="outerHTML"`. There are currently no exit animations (the card play exit animation was removed in `943ece6`).

### Gotcha: the settle phase reverts classes on swapped-in elements

HTMX swaps have two phases: **swap** (insert new DOM, fire `htmx:afterSwap`) then **settle** (~20ms later, finalize). The settle phase reconciles attributes/classes on swapped-in elements back toward the server-rendered markup. So **manually adding a class to an element inside a swapped region during `htmx:afterSwap` races the settle phase and gets silently reverted** (no JS runs, no second swap — the class just disappears within a few hundred ms).

This bit the hamburger menu: keeping its open state as an `.open` class on `#game-menu` (which lives inside the swapped `#game-container`) and re-applying it in `afterSwap` failed intermittently. The fix: store transient UI state that must survive swaps as a class on a **stable element HTMX never swaps** — the menu uses `document.body` (`body.game-menu-open`) and drives visibility purely via CSS (`body.game-menu-open .game-menu-panel { display: flex }`). The same principle applies to any future animation/UI state that needs to outlive a swap: don't re-apply it to swapped content; anchor it on `body` (or another non-swapped ancestor). Scroll-position restore (also in `game.js` `afterSwap`) works because it sets a *property* (`scrollLeft`) that settle doesn't reconcile, not a class.

**Second example — `body.dev-mode` (developer mode).** The debug block (`.menu-debug`) lives inside the swapped `#game-container`, but its visibility is gated by `body.dev-mode .menu-debug { display: block }`. The `dev-mode` class is rendered server-side onto `<body>` by `formatPageWrapper` (from a `devMode` cookie — see `/dontdie` in `app.ts`), and `<body>` is never swapped, so the debug block reveals/hides correctly across every game-state swap with **zero `afterSwap` JS**. This is the cleanest form of the pattern: when the swap-surviving state is known at full-page render time, set the body class on the server and let CSS do everything — no JS class management at all.

## CSS Keyframes

All animation keyframes live in `public/game.css` except:
- `fadeInTile` in `public/deck-selection.css`
- Card flip uses `transition` (not keyframes) in both `game.css` and `prepare.css`

## Every card animation is a self-relative transform

Verified 2026-08-07 across `game.css`: every card animation — `slideFromLeft`,
`slideFromRight`, `growFromLeft`, `growFromRight`, `shuffle-card-1/2/3`, and the flip
`transition` — animates **from an offset back to the element's own resting position**
(`translateX(0)` / `rotateY(0)`) within its own box. None of them reference a page
coordinate, a viewport offset, or a sibling's position.

**Consequence, and it's the reason most layout reviews here are cheap**: moving an
animated element around the page — raising it, re-parenting it, changing its grid cell —
cannot break the animation, because the animation only ever knows where the element
already is. What *can* break an animation is a change to the element's **own box**
(display type, transform context, `overflow` clipping on a new ancestor) or to the
**selectors** that reach it. Check those two things; don't re-derive the geometry.

This is what made the deck-title plaque move (`2d33c2f`) a no-interaction review even
though it raised `.game-top-row` by roughly the plaque's height.

## Drag-and-Drop Interaction

`game.js` (lines 183-186) removes animation classes when a drag starts, preventing animation flicker when a card is dropped in a new position. After drop, HTMX swaps in the new hand state, which may include new animation classes from `WhatHappened`.
