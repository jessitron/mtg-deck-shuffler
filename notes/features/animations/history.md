# Animations History

## Timeline

### Card Flip Animations (attempted, reverted, succeeded)

- `9c59a3e` - "Improve card flip animation with proper image transition timing" — tried JS-driven flip timing
- `db5885a` - Reverted the above
- `c8bf381` - "Revert 'Add card flip animations using WhatHappened structure'" — tried using WhatHappened for flips, abandoned
- `546b20f` - "Implement animation for flip card feature" — successful CSS transition approach
- `9e03881` - "Fix flip animation to properly show both faces during flip"
- `0ea1616` - "Update commander display to show both faces for two-faced commanders"

**Lesson**: Card flip animation was attempted multiple ways. The WhatHappened approach (server-driven) was reverted. The current CSS transition approach (class toggle) works.

### Card Play Exit Animation

- `0090968` - "Accept. The copy works, the animation doesn't" — acknowledged the play animation was broken
- `a0c72de` - "Modify being-played animation to move cards toward Table instead of disappearing" — changed from vertical disappear to diagonal drift toward table area
- `e904a8c` - "Fix being-played animation for two-faced cards by targeting nested flip container images"

- `943ece6` - "Remove broken card play exit animation" — removed all play exit animation code (CSS, JS class application, HTMX swap delays). Clipboard copy on play preserved.

**Outcome**: The play exit animation was broken for a while and was fully removed. The client-driven exit animation pattern (JS class + HTMX swap delay) was abandoned. If exit animations are desired in the future, a different approach will be needed.

### Hand Rearrangement Animations

- `6c01dfd` - "Add moveHandCard method with tests for drag-and-drop hand rearrangement"
- `7467447` - "Add /move-hand-card endpoint for drag-and-drop hand rearrangement"
- `a9bf37f` - "Make card images draggable instead of card containers"
- `27d9daa` - "I got it animating well when dropped"
- `30afca8` - "tweak animation speed"

### Deck Selection Animations

- `446315e` - "Add staggered fade-in animation to precon tiles" — CSS custom property for stagger delay
- `8097bbd` - "Add smooth animation to deck selection width transition"
- `3970e53` - "Skip fade-in animation on precon tiles during search" — disabled animation during active search

### Hamburger Menu (game-screen chrome relocation)

- Moved Undo, Action History, Restart Game, Choose Another Deck, and the debug/game-state block into a hamburger menu at the top of the game screen. Edited `game.js`'s `htmx:beforeSwap`/`afterSwap` handlers (scroll restore unchanged; added `syncMenuToggleAria()`).
- **Lesson (see architecture.md)**: re-applying an `.open` class to `#game-menu` in `afterSwap` raced the HTMX **settle phase** and got reverted. Fixed by storing open state on `document.body` (`body.game-menu-open`) instead of on the swapped-in menu element.

### Developer Mode (body-anchored visibility)

- Added an undocumented developer mode: the secret URL `/dontdie` sets a `devMode` cookie; `formatPageWrapper` then renders `<body class="dev-mode">`. The debug block (`.menu-debug`) in the hamburger menu is `display:none` by default and revealed only under `body.dev-mode` (plus an "Exit dev mode" link → `/dontdie/off`).
- **Lesson (see architecture.md)**: this is a second instance of the "anchor swap-surviving state on `body`, not on swapped content" principle — and the cleanest one, since the state is known at full-page render and set server-side, so CSS handles everything with **no `afterSwap` JS** (contrast `body.game-menu-open`, which is toggled by JS).

### Trainer chat drawer (dev mode) — REMOVED

> **Removed in the Trainer chat rip-out** (the whole window is being re-implemented
> from scratch). The `.advisor-chat` drawer, its width/`flex-basis` transition, the
> `body.advisor-chat-open` state, the `.game-layout` flex row, and `public/trainer-chat.js`
> are all gone. The game page now renders `.page-container` directly (no flex sibling).
> The surviving body-anchored swap-surviving examples are `body.game-menu-open` and
> `body.dev-mode`. The two sub-sections below are kept as historical record.

(Formerly "Mulligan Advisor chat drawer" — the chat agent is the **Trainer**; the Advisor is the deterministic recommender function.)

- **`d0fa14d`** - A right-side chat drawer (`.advisor-chat`) for the Trainer, opening with a **0.25s CSS transition (dev mode)**.
- **Layout (final shape):** the drawer is a **real flex sibling** of the playmat inside a `.game-layout` flex row (`formatGamePageHtmlPage`). Opening animates the drawer's **width / `flex-basis` from 0 to 380px**; the playmat (`.page-container`, `flex: 0 1 auto`, `min-width: 0`) shrinks to make room and stays centered via `margin: 0 auto`. An inner `.advisor-chat-inner` holds a fixed 380px width so the content doesn't reflow while the outer width animates. (An earlier cut used a `position: fixed` `translateX(100%)` off-canvas overlay with a `margin-right` push on `#game-container` and `body.dev-mode { overflow-x: hidden }` to suppress the resulting horizontal scrollbar — all replaced by the flex-sibling approach, which needs no overflow hack.)
- **Third instance of the body-anchored swap-surviving pattern**: open state is `body.advisor-chat-open` (joins `body.game-menu-open` and `body.dev-mode`). The drawer is rendered once **outside `#game-container`** (but inside `.game-layout`), so its content + open state both survive game-state swaps with **zero `afterSwap` JS** — visibility/width are pure CSS off the body class.

### Trainer chat: backend conversation state + auto-open + End Chat (dev mode)

- Trainer conversation state moved to a backend in-memory store (`src/mulligan/trainerConversationStore.ts`); the drawer rehydrates on full page load and now **auto-opens** when a conversation exists — `formatPageWrapper` renders `body.advisor-chat-open` server-side (via `active-game-page.ts`), a fourth no-JS instance of the body-anchored pattern (alongside `dev-mode`).
- `body.advisor-chat-open` is now driven three ways, all on `body`: inline `onclick` ("Improve this"), server-rendered auto-open, and **removed by a global `trainer-chat-ended` listener** in new `public/trainer-chat.js`, fired by an `HX-Trigger: trainer-chat-ended` response header from `POST /mulligan-advisor/end-chat`. The header approach is required because the eval modal's form is detached by its OOB swap before the form's own `after-request` could run.
- New "End Chat" evaluation modal (`src/view/play-game/trainer-eval-modal.ts`) renders into the shared `#modal-container` with the standard `.modal-*` classes — **no open/close animation** (matches the library modal). `public/trainer-chat.js` also reformats a "minutes ago" label every 60s (not an animation, just text).

### CSS Organization

- `ca27f4c` - "Separate game styles from home page styles"
- `f95319d` - "Complete CSS cleanup: separate game and shared styles" — game.css created from styles.css
- `9539966` - "Extract shared playmat component styles into playmat.css"

### Mulligan / Opening Hand

- Added the mulligan / opening-hand feature. `GameState.mulligan()` returns `{ shuffling: true }`, so the new `POST /mulligan/:gameId` reuses the existing library-shuffle animation with **no new `WhatHappened` fields or CSS classes**.
- `hand-components.ts` renders a Mulligan button (`.mulligan-row > button.mulligan-button`) as a sibling above `#hand-cards` during the hand-acceptance stage. It does not alter `.card-container`, hand-drop-zones, or card markup, so the drag-and-drop animation-class cleanup in `game.js` is untouched. `game.css` gained `.mulligan-row`/`.mulligan-button` layout rules only (no keyframes/transitions).
- `startGame()` now auto-draws seven cards, so the first game render shows a full hand (no animation involved — it's the initial render).

### Mulligan Advisor (dev-mode fragment, no animation)

- **`1034189`** - `hand-components.ts` now renders a `<div class="mulligan-recommendation">` sibling next to the mulligan button during the hand-acceptance stage (`formatMulliganRecommendationHtmlFragment`). It is **static, server-rendered, read-only text — no keyframes, transitions, or client JS**, so it touches none of the animation machinery (no `WhatHappened` fields, no `game.js` class cleanup).
- `game.css` gained `.mulligan-recommendation` rules gated by `body.dev-mode` (default `display:none`), exactly mirroring the `.menu-debug` developer-mode pattern. Because the gate lives on `body` (never HTMX-swapped) and the fragment re-renders server-side on every game-state swap, it survives swaps with **no `afterSwap` handling** — a third clean example of the "anchor swap-surviving state on `body`" principle.

## Design Decisions

- **No animation library**: Animations are pure CSS. This was never explicitly decided, it just evolved that way.
- **WhatHappened for entrance animations**: Works well. Server tells the view what changed, view applies CSS classes.
- **No exit animations currently**: The client-driven exit animation pattern (JS class + HTMX swap delay) proved fragile and was removed. All current animations are entrance-only (server-driven via WhatHappened).
- **Typo preserved**: `dropppedFromLeft/Right` has three p's. It's in the interface and multiple files. Not worth a rename.

## What Was Tried and Abandoned

- Using WhatHappened structure for card flip animations (reverted in `c8bf381`)
- JS-driven flip animation timing (reverted in `db5885a`)
- Client-driven card play exit animation using JS class application + HTMX swap delay (removed in `943ece6` — was broken, never properly worked)
