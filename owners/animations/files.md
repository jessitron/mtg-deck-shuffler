# Animations Files

_All paths below are relative to `apps/shuffler/` — e.g. `src/app.ts` is `apps/shuffler/src/app.ts`._

## CSS (animation definitions)

- `public/game.css` — Primary animation file
  - Lines 40-70: `slideFromLeft`, `slideFromRight` keyframes (card slide)
  - Lines 72-102: `growFromLeft`, `growFromRight` keyframes (card drop)
  - Lines 104-142: Card flip transition (`.flip-container-*` classes)
  - Lines 186-206: `shimmer` keyframe (button hover effect)
  - Lines 430-497: `shuffle-card-1/2/3` keyframes (library shuffle)
  - Lines 528-552: Drag-and-drop styling (`.dragging`, `.drag-over`)
- `public/prepare.css` — Duplicate flip animation CSS (lines 221-256)
- `public/deck-selection.css` — `fadeInTile` keyframe (lines 136-164)
- `public/playmat.css` — Shared transition properties for buttons and hover states

## TypeScript (animation class application)

- `src/view/common/shared-components.ts`
  - Lines 115-127: `getAnimationClassHelper()` — maps WhatHappened to CSS classes
  - Line 34: calls `getAnimationClassHelper()` in `formatCardContainer()`
  - Lines 129-138: `formatLibraryStack()` — applies `.shuffling` class
- `src/view/play-game/game-modals.ts`
  - `formatModalActionButton()`: `data-card-id`/`data-current-face` attributes for clipboard copy — now added for Play OR Discard, and only when NOT in table mode (table-mode buttons get `table-play-button` instead of `play-button` and a conditional `hx-on::after-request` that closes `#modal-container` only on success)
- `src/view/play-game/revealed-cards-components.ts`
  - Lines 54-56: `data-card-id` and `data-current-face` attributes for clipboard copy

## JavaScript (client-side animation triggers)

- `public/game.js`
  - `htmx:beforeSwap`/`htmx:afterSwap` handlers near the top — stash/restore hand & revealed scroll positions; `afterSwap` also calls `syncMenuToggleAria()`. Note: the hamburger menu's open state is NOT restored here (it lives on `document.body`, which swaps never touch — see architecture.md "settle phase" gotcha).
  - `htmx:beforeRequest` handler (table mode, JES-127) — on `table-play-button` sets optimistic "Sent to table" text + disables; no clipboard
  - `htmx:beforeRequest` handler — copies card image to clipboard on Play/Discard (keyed on `play-button` class; solo Discard buttons carry both `discard-button` and `play-button`)
  - Drag-and-drop setup — removes animation classes on drag start
  - (Line numbers shifted down ~55 lines after the hamburger-menu code was added at the top.)
- `public/deck-selection.js`
  - Lines 35-78: Manages `search-active` class to disable/enable tile fade-in

## Data Model

- `src/GameState.ts`
  - Lines 58-64: `WhatHappened` interface definition

## Tests

- `test/GameState.test.ts` — Tests for GameState methods that produce WhatHappened objects
