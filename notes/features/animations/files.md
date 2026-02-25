# Animations Files

## CSS (animation definitions)

- `public/game.css` — Primary animation file
  - Lines 40-70: `slideFromLeft`, `slideFromRight` keyframes (card slide)
  - Lines 72-102: `growFromLeft`, `growFromRight` keyframes (card drop)
  - Lines 104-142: Card flip transition (`.flip-container-*` classes)
  - Lines 186-206: `shimmer` keyframe (button hover effect)
  - Lines 430-497: `shuffle-card-1/2/3` keyframes (library shuffle)
  - Lines 528-552: Drag-and-drop styling (`.dragging`, `.drag-over`)
  - Lines 577-613: `cardPlayExit` keyframe and `.being-played` class
- `public/prepare.css` — Duplicate flip animation CSS (lines 221-256)
- `public/deck-selection.css` — `fadeInTile` keyframe (lines 136-164)
- `public/playmat.css` — Shared transition properties for buttons and hover states

## TypeScript (animation class application)

- `src/view/common/shared-components.ts`
  - Lines 115-127: `getAnimationClassHelper()` — maps WhatHappened to CSS classes
  - Line 34: calls `getAnimationClassHelper()` in `formatCardContainer()`
  - Lines 129-138: `formatLibraryStack()` — applies `.shuffling` class
- `src/view/play-game/game-modals.ts`
  - Line 73: `hx-swap="outerHTML swap:1.5s"` for Play action buttons
  - Lines 70-72: `data-card-id` and `data-current-face` attributes for JS animation trigger
- `src/view/play-game/revealed-cards-components.ts`
  - Line 57: `hx-swap="outerHTML swap:1.5s"` for Play from revealed cards

## JavaScript (client-side animation triggers)

- `public/game.js`
  - Lines 71-100: `htmx:beforeRequest` handler — adds `.being-played` class, copies to clipboard
  - Lines 146-250: Drag-and-drop setup — removes animation classes on drag start (lines 183-186)
- `public/deck-selection.js`
  - Lines 35-78: Manages `search-active` class to disable/enable tile fade-in

## Data Model

- `src/GameState.ts`
  - Lines 58-64: `WhatHappened` interface definition

## Tests

- `test/GameState.test.ts` — Tests for GameState methods that produce WhatHappened objects
