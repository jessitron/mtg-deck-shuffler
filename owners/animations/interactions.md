# Animations Interactions

## Depends On

- **GameState / WhatHappened**: `src/GameState.ts` defines `WhatHappened` interface. Animation classes are chosen based on its properties. If `WhatHappened` changes, `getAnimationClassHelper()` must be updated to match.
- **HTMX**: Animations depend on HTMX swap behavior. All game actions use immediate `hx-swap="outerHTML"`.
- **View rendering**: `shared-components.ts` applies animation classes during HTML generation. Changes to card rendering (container structure, class names, nesting) can break CSS selectors that target animated elements.
- **Two-faced cards**: The flip animation uses `.flip-container-outer`, `.flip-container-inner`, `.card-flipped`. Changes to two-faced card DOM structure will break flip animations.
- **The Tabletop's `mtg-card` shape (decided, unbuilt)**: the tap animation's trigger is
  `props.tapped` changing on a synced tldraw shape. That couples this owner to
  `apps/tabletop/src/client/shapes/MtgCardImageShapeUtil.tsx`, to the shape's prop schema
  (ticket 02), and to tldraw's own `shape.rotation` write. If tap ever stops being a stored
  boolean, the animation's trigger disappears.

## Depended On By

- **Game page**: All gameplay animations render through `formatActiveGameHtmlSection()` and `formatCardContainer()`.
- **Prep page**: Card flip animation is reused on the prep/deck review page (duplicate CSS in `prepare.css`).
- **Deck selection page**: Tile fade-in animation is self-contained in `deck-selection.css`.

## Watch Points

- **CSS class names in WhatHappened mapping**: `getAnimationClassHelper()` in `shared-components.ts:115-127` returns specific class name strings. These must match the CSS exactly.
- **Drag-and-drop cleanup**: `game.js` lines 183-186 remove specific animation class names. If new animation classes are added, they may need to be cleaned up here too.
- **Duplicate flip CSS**: Card flip styles exist in both `game.css` (lines 104-142) and `prepare.css` (lines 221-256). Changes to one must be mirrored in the other.
- **Table mode's button classes (JES-127)**: the clipboard hook is keyed on `play-button`; table-mode Play/Discard buttons deliberately get `table-play-button` instead (server-rendered — deterministic, no runtime branching in the hook). If you rename either class, both `game.js` listeners and `game-modals.ts` must change together. The 502 entry in `htmx.config.responseHandling` (`html-layout.ts`) carries `error: true` so `event.detail.successful` stays false and the table-mode buttons' conditional close leaves the failure modal visible — removing that flag silently eats the error modal.
- **Click-straddles-settle flake (tests)**: a Playwright-speed click right after the card modal opens can land its mousedown on a node htmx replaces before mouseup — no click event fires. Impossible at human speed. Specs that click freshly-opened modal buttons use a retry `expect(async () => { click; assert }).toPass()` pattern (reference implementations: `verify-discard.spec.ts:39-50`, `verify-prep-commander-flip.spec.ts:99-105`, and since `65f12e8` also `verify-library-grouping.spec.ts` and `verify-query-parameter-modals.spec.ts`).

  **`{ force: true }` on such a click is a *cause* of this flake, not a workaround for it.**
  `force` skips Playwright's actionability/stability wait — precisely the wait that would
  otherwise absorb the swap. So a forced click on a freshly-swapped modal button is *more*
  likely to straddle settle than an ordinary one. Nine sites still pass `force: true`
  (`verify-library-grouping.spec.ts` ×3, `verify-query-parameter-modals.spec.ts` ×2 plus the
  comment sites); each is currently paired with a `toPass` retry, which papers over it.
  Removing them is filed in `TODO.md` — measured cost of the retries today is ~8.2s across a
  run for 13 `toPass` steps, cheap, so this is cleanup rather than urgency.
- **`#game-menu` containment is a markup constraint on the game's top strip.** Anything
  rendered *inside* the `#game-menu` subtree becomes menu-internal in two ways at once, and
  both are silent:
  1. `game.js`'s document-level click handler closes the menu on
     `!evt.target.closest("#game-menu")`. A control nested in that subtree **swallows its own
     dismiss click** — the menu stays open when the player clicks it.
  2. `.game-menu` carries `position: relative` and is the dropdown panel's positioning
     ancestor. Anything nested there **pushes `.game-menu-panel` down by its own height**.

  So new chrome in the top strip must be a **sibling** of `#game-menu`, not a child.
  `.game-header-row` (`game.css`, `display:flex; justify-content:space-between`) exists
  precisely to give such siblings a home — the deck-title plaque is the first tenant. Put
  the next one there too. `test/verification/verify-deck-title-placement.spec.ts` guards
  this by asserting that clicking the deck title dismisses an open menu; if you add a
  sibling, that spec is the pattern to copy.

  Checked and settled (don't re-litigate): `#game-menu` shrink-wraps as a flex item, so the
  panel's `right: 0` resolves to the toggle's right edge rather than the row's. Verified by
  screenshot 2026-08-07 — visually identical to before, because the toggle *was* already the
  row's right edge. The `gap` on `.game-header-row` does **not** offset the panel either;
  it's needed so a long deck name doesn't butt into the hamburger.

- **Tabletop tap animation (decided 2026-08-07, ticket 05 resolved, not built)** — four
  standing constraints for whoever implements `.scratch/tabletop-physics/issues/
  05-rotate-to-tap.md`: key the catch-up off `props.tapped` changing (never off a ±90 rotation
  delta — that misfires when a player free-rotates through 90°); initialize the previous-value
  ref to the first-seen `tapped` so a card arriving tapped doesn't swing on mount or on store
  reconnect; comment the coupling between the centre-preserving x/y write and the transform
  origin; and keep **`overflow: hidden` off every ancestor on the path**, because mid-swing the
  counter-rotated card extends outside its own `w × h` box. Also: do not re-derive the CSS-only
  rotation route (killed — see architecture.md), and do not veto the local catch-up by citing
  "no FLIP" (it isn't). **Now also settled**: the trigger stays plain `onClick` — tldraw's
  `onRotateStart`/`onRotate`/`onRotateEnd` are confirmed real hooks but are **not used for tap**,
  staying reserved for free rotation instead, so tap and free-rotation stay visually
  distinguishable. Duration/easing is 0.5s `ease-out` (Shuffler's card-motion vocabulary), not
  this owner's originally-recommended 0.8s flip-style transition — Jess overrode that
  recommendation deliberately.
- **State that must survive swaps**: Anything toggled by JS that needs to outlive a `game-state-updated` swap must NOT be re-applied to swapped-in content in `afterSwap` — the settle phase reverts it (see architecture.md). Anchor such state on `document.body` or another non-swapped ancestor. The hamburger menu (`body.game-menu-open`) is the reference example; developer mode (`body.dev-mode`, set server-side from a cookie, gating `.menu-debug` visibility) is a second, JS-free example.

## Not Related To

- **Library search modal**: uses `#modal-container` but has no animations of its own (no transitions on open/close). The "Search" button is not animated.
- **Observability/tracing**: `hny.js` contains a `shimmer` module but that's OpenTelemetry instrumentation internals, not the CSS shimmer animation.
- **Card data/adapters**: Deck loading, MTGJSON/Archidekt adapters — these supply card data but have no animation involvement.
