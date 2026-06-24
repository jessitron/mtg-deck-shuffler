# Animations Interactions

## Depends On

- **GameState / WhatHappened**: `src/GameState.ts` defines `WhatHappened` interface. Animation classes are chosen based on its properties. If `WhatHappened` changes, `getAnimationClassHelper()` must be updated to match.
- **HTMX**: Animations depend on HTMX swap behavior. All game actions use immediate `hx-swap="outerHTML"`.
- **View rendering**: `shared-components.ts` applies animation classes during HTML generation. Changes to card rendering (container structure, class names, nesting) can break CSS selectors that target animated elements.
- **Two-faced cards**: The flip animation uses `.flip-container-outer`, `.flip-container-inner`, `.card-flipped`. Changes to two-faced card DOM structure will break flip animations.

## Depended On By

- **Game page**: All gameplay animations render through `formatActiveGameHtmlSection()` and `formatCardContainer()`.
- **Prep page**: Card flip animation is reused on the prep/deck review page (duplicate CSS in `prepare.css`).
- **Deck selection page**: Tile fade-in animation is self-contained in `deck-selection.css`.

## Watch Points

- **CSS class names in WhatHappened mapping**: `getAnimationClassHelper()` in `shared-components.ts:115-127` returns specific class name strings. These must match the CSS exactly.
- **Drag-and-drop cleanup**: `game.js` lines 183-186 remove specific animation class names. If new animation classes are added, they may need to be cleaned up here too.
- **Duplicate flip CSS**: Card flip styles exist in both `game.css` (lines 104-142) and `prepare.css` (lines 221-256). Changes to one must be mirrored in the other.
- **State that must survive swaps**: Anything toggled by JS that needs to outlive a `game-state-updated` swap must NOT be re-applied to swapped-in content in `afterSwap` — the settle phase reverts it (see architecture.md). Anchor such state on `document.body` or another non-swapped ancestor. The hamburger menu (`body.game-menu-open`) is the reference example; developer mode (`body.dev-mode`, set server-side from a cookie, gating `.menu-debug` visibility) is a second, JS-free example; the Mulligan Advisor chat drawer (`body.advisor-chat-open`, toggled by inline `onclick` on `body`, with the drawer rendered outside `#game-container`) is a third.
- **`body.dev-mode { overflow-x: hidden }`** (game.css): added so the off-canvas advisor chat drawer doesn't create a horizontal scrollbar in dev mode. If a game-page change needs body-level horizontal scroll under dev mode, this will suppress it.

## Not Related To

- **Library search modal**: Uses `#modal-container` but has no animations of its own (no transitions on open/close). The "Search" button itself is not animated.
- **Observability/tracing**: `hny.js` contains a `shimmer` module but that's OpenTelemetry instrumentation internals, not the CSS shimmer animation.
- **Card data/adapters**: Deck loading, MTGJSON/Archidekt adapters — these supply card data but have no animation involvement.
