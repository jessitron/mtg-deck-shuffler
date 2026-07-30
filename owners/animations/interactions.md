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
- **Table mode's button classes (JES-127)**: the clipboard hook is keyed on `play-button`; table-mode Play/Discard buttons deliberately get `table-play-button` instead (server-rendered — deterministic, no runtime branching in the hook). If you rename either class, both `game.js` listeners and `game-modals.ts` must change together. The 502 entry in `htmx.config.responseHandling` (`html-layout.ts`) carries `error: true` so `event.detail.successful` stays false and the table-mode buttons' conditional close leaves the failure modal visible — removing that flag silently eats the error modal.
- **Click-straddles-settle flake (tests)**: a Playwright-speed click right after the card modal opens can land its mousedown on a node htmx replaces before mouseup — no click event fires. Impossible at human speed. Specs that click freshly-opened modal buttons use a retry `expect(...).toPass()` pattern (see `verify-discard.spec.ts`, `verify-tabletop-integration.spec.ts`).
- **State that must survive swaps**: Anything toggled by JS that needs to outlive a `game-state-updated` swap must NOT be re-applied to swapped-in content in `afterSwap` — the settle phase reverts it (see architecture.md). Anchor such state on `document.body` or another non-swapped ancestor. The hamburger menu (`body.game-menu-open`) is the reference example; developer mode (`body.dev-mode`, set server-side from a cookie, gating `.menu-debug` visibility) is a second, JS-free example.

## Not Related To

- **Library search modal**: uses `#modal-container` but has no animations of its own (no transitions on open/close). The "Search" button is not animated.
- **Observability/tracing**: `hny.js` contains a `shimmer` module but that's OpenTelemetry instrumentation internals, not the CSS shimmer animation.
- **Card data/adapters**: Deck loading, MTGJSON/Archidekt adapters — these supply card data but have no animation involvement.
