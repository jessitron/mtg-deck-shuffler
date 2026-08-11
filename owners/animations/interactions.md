# Animations Interactions

## Depends On

- **GameState / WhatHappened**: `src/GameState.ts` defines `WhatHappened` interface. Animation classes are chosen based on its properties. If `WhatHappened` changes, `getAnimationClassHelper()` must be updated to match.
- **HTMX**: Animations depend on HTMX swap behavior. All game actions use immediate `hx-swap="outerHTML"`.
- **View rendering**: `shared-components.ts` applies animation classes during HTML generation. Changes to card rendering (container structure, class names, nesting) can break CSS selectors that target animated elements.
- **Two-faced cards**: The flip animation uses `.flip-container-outer`, `.flip-container-inner`, `.card-flipped`. Changes to two-faced card DOM structure will break flip animations.
- **The Tabletop's `mtg-card` shape (built, `65276e6`)**: the tap animation's trigger is
  `props.tapped` changing on a synced tldraw shape. That couples this owner to
  `apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` (ticket 12 replaced the old
  `MtgCardImageShapeUtil` image-shape subclass with this genuine custom shape), to the
  shape's prop schema, and to tldraw's own `shape.rotation` write. If tap ever stops being
  a stored boolean, the animation's trigger disappears. It also leans on tldraw's own
  `.tl-image-container` class — see Watch Points.

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

  **`{ force: true }` on such a click was a *cause* of this flake, not a workaround for it.**
  `force` skips Playwright's actionability/stability wait — precisely the wait that would
  otherwise absorb the swap. So a forced click on a freshly-swapped modal button was *more*
  likely to straddle settle than an ordinary one. **Resolved**: all five sites
  (`verify-library-grouping.spec.ts` ×3, was lines 159/243/342;
  `verify-query-parameter-modals.spec.ts` ×2, was lines 372/380) now use plain `.click()`.
  Playwright's own actionability wait absorbs the swap/settle straddle instead. The `toPass`
  retry wrappers were **kept** as a safety net (removing those is a separate, independently
  verifiable follow-up, deliberately not bundled here). Verified clean by running
  `./verify.sh verify-library-grouping verify-query-parameter-modals` twice in a row:
  19/19 passed both times, no new flakiness.

  **KB gap closed while resolving this**: the "in case of viewport issues with modal
  positioning" justification that originally motivated `force: true` (per the old `TODO.md`
  capture) was checked and has no trace anywhere — no git history, no comment near any of the
  five sites, no actual viewport constraint documented. It was unverifiable folk memory, not a
  real constraint. Don't re-add `force: true` on the strength of that phrase resurfacing.
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

- **Tabletop tap animation (BUILT 2026-08-09, `65276e6`, ticket 15)** — the four standing
  constraints are now invariants of the code in `MtgCardShapeUtil.tsx` `component()`, and
  they must keep holding: the catch-up is keyed off `props.tapped` changing (never off a
  ±90 rotation delta — that misfires when a player free-rotates through 90°); the
  previous-value ref initializes to the first-seen `tapped` so a card arriving tapped
  doesn't swing on mount or on store reconnect; the coupling between the centre-preserving
  x/y write and the default 50% 50% transform-origin is commented in the code — don't
  delete either half; and **`overflow: hidden` must stay off every ancestor on the path**
  (verified against tldraw 5.2.5: `.tl-shape` is `overflow: visible`, no clipping on
  `.tl-html-container`/`.tl-image-container` — recheck on tldraw upgrades). Also: do not
  re-derive the CSS-only rotation route (killed — see architecture.md), and do not veto
  the local catch-up by citing "no FLIP" (it isn't). The trigger stays plain `onClick` —
  tldraw's `onRotateStart`/`onRotate`/`onRotateEnd` are **not used for tap**, staying
  reserved for free rotation. Duration/easing is 0.5s `ease-out` (Shuffler's card-motion
  vocabulary), not this owner's originally-recommended 0.8s — Jess overrode that
  deliberately. **New watch points from the build**: the animated element is
  `.tl-image-container` itself, so if a tldraw upgrade ever puts a `transform` on that
  class, the WAAPI animation overrides it; running animations are cancelled before a new
  one starts, so smooth reversal on a fast double-tap is an accepted gap (one clean jump);
  and `verify-tap-animation.spec.ts` observes the animation via `getAnimations()` — a
  switch from WAAPI to a CSS transition would need `getAnimations()`-compatible assertions
  rechecked (CSS transitions do appear in `getAnimations()`, but keyframe shape differs).
- **Hand grid alignment vs. drop-zone flex participation (fixed 2026-08-09)**: `.hand-cards` is a
  wrapped flex row, so any element that exists **once per hand rather than once per row/card**
  (like the leading `.hand-drop-zone` before card 0) adds its box width to whichever row it lands
  in, throwing off column alignment on every row below it. Fixed by taking that one element out
  of flex flow (`.hand-drop-zone-leading`, `position: absolute` on now-`position: relative`
  `.hand-cards`). **Watch point for future hand-grid changes**: before adding any new per-hand
  (not per-card) element inside `.hand-cards`, check whether it's in flex flow — if so it will
  skew row width the same way. `data-hand-position` (the drag-and-drop key `game.js` reads) is
  independent of flex participation, so this fix didn't touch drag-and-drop.
- **State that must survive swaps**: Anything toggled by JS that needs to outlive a `game-state-updated` swap must NOT be re-applied to swapped-in content in `afterSwap` — the settle phase reverts it (see architecture.md). Anchor such state on `document.body` or another non-swapped ancestor. The hamburger menu (`body.game-menu-open`) is the reference example; developer mode (`body.dev-mode`, set server-side from a cookie, gating `.menu-debug` visibility) is a second, JS-free example.
- **`evt.detail.elt` is not the triggering element inside `htmx:afterSettle` (fixed 2026-08-11,
  `public/table-look-focus.js`)**: htmx's `triggerEvent` always overwrites `detail.elt` to be
  the element the event is dispatched *on*; `afterSettle` fires once per settling element in
  the swapped fragment, so `detail.elt` there is whichever of those is being settled, not the
  clicked control. Any `afterSettle` handler needing "what did the user click" must capture it
  earlier, on `htmx:configRequest` (fires once, on the real triggering element, pre-swap), and
  carry a stable selector forward in a closure variable. See architecture.md for the full
  writeup and code.

## Not Related To

- **Library search modal**: uses `#modal-container` but has no animations of its own (no transitions on open/close). The "Search" button is not animated.
- **Observability/tracing**: `hny.js` contains a `shimmer` module but that's OpenTelemetry instrumentation internals, not the CSS shimmer animation.
- **Card data/adapters**: Deck loading, MTGJSON/Archidekt adapters — these supply card data but have no animation involvement.
