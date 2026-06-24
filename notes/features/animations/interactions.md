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
- **State that must survive swaps**: Anything toggled by JS that needs to outlive a `game-state-updated` swap must NOT be re-applied to swapped-in content in `afterSwap` — the settle phase reverts it (see architecture.md). Anchor such state on `document.body` or another non-swapped ancestor. The hamburger menu (`body.game-menu-open`) is the reference example; developer mode (`body.dev-mode`, set server-side from a cookie, gating `.menu-debug` visibility) is a second, JS-free example; the Trainer chat drawer (`body.advisor-chat-open`, with the drawer rendered outside `#game-container` but inside `.game-layout`) is a third. The Trainer's open state is now driven three ways, all on `body`: inline `onclick` ("Improve this"), **server-rendered at full page load** (`formatPageWrapper` adds `advisor-chat-open` when the backend has a conversation for the game — auto-open, the dev-mode-style no-JS variant), and **removed via a global `trainer-chat-ended` listener** (`public/trainer-chat.js`) fired by an `HX-Trigger` response header when the chat is ended. None of this re-applies state to swapped-in content, so the settle phase is never in play.
- **`.game-layout` flex row** (game.css / `active-game-page.ts`): the game page wraps the playmat (`.page-container`) and the advisor drawer (`.advisor-chat`) as flex siblings. The drawer animates its width/`flex-basis` (0↔380px) on `body.advisor-chat-open`; the playmat has `flex: 0 1 auto; min-width: 0` so it shrinks to make room. If you change the game page's top-level container structure, keep the playmat and drawer as siblings in this row (the drawer must stay outside `#game-container` so swaps don't wipe the conversation).

## Not Related To

- **Library search modal** and the **Trainer "End Chat" evaluation modal** (`src/view/play-game/trainer-eval-modal.ts`): both use `#modal-container` but have no animations of their own (no transitions on open/close). The "Search" / "End Chat" buttons are not animated.
- **Observability/tracing**: `hny.js` contains a `shimmer` module but that's OpenTelemetry instrumentation internals, not the CSS shimmer animation.
- **Card data/adapters**: Deck loading, MTGJSON/Archidekt adapters — these supply card data but have no animation involvement.
