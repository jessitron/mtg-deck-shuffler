# Animations Files

_All paths below are relative to `apps/shuffler/` — e.g. `src/app.ts` is `apps/shuffler/src/app.ts`,
**except** the Tabletop section at the bottom, which spells out full paths._

## CSS (animation definitions)

- `public/game.css` — Primary animation file. **Cited by selector, not line number** — this
  file's line numbers rot (they shifted again in `2d33c2f`); `grep` the selector instead.
  - `@keyframes slideFromLeft` / `slideFromRight` — card slide
  - `@keyframes growFromLeft` / `growFromRight` — card drop
  - `.flip-container-*` — card flip transition
  - `@keyframes shimmer` — button hover effect
  - `@keyframes shuffle-card-1` / `-2` / `-3` — library shuffle
  - `.dragging`, `.drag-over` — drag-and-drop styling
  - `.game-header-row` — the game's top strip (deck-title plaque + hamburger as
    **siblings**); carries the comment explaining why nothing may nest inside `#game-menu`
  - `.hand-cards` — now `position: relative` (2026-08-09), so `.hand-drop-zone-leading` can
    anchor to it
  - `.hand-drop-zone-leading` (new, 2026-08-09) — the "before card 0" drop zone, taken out of
    flex flow (`position: absolute; left: -45px; top: 0; margin: 0`) to fix a row-alignment
    bug in the wrapped hand grid; see architecture.md "New mechanism"
  - `.hand-symbol` (2026-08-11) — gained `cursor: grab` at rest, now draggable
  - `.hand-symbol.dragging` (2026-08-11, new) — sibling selector alongside
    `.card-container.dragging`, same opacity/scale/cursor-grabbing declarations
- `public/table-look-focus.js` — /prepare table-look picker's focus-restore script (not
  an animation, but shares the `htmx:afterSettle` mechanism). Captures the triggering
  element's selector on `htmx:configRequest` (fires once, on the real element, before
  swap/settle) and consumes it later on `afterSettle` — fixed 2026-08-11 after a bug where
  it read `evt.detail.elt` directly inside `afterSettle` and got whichever swatch happened
  to be settling at that moment, not the clicked one. See architecture.md.
- `public/prepare.css` — Duplicate flip animation CSS (lines 221-256)
- `public/deck-selection.css` — `fadeInTile` keyframe (lines 136-164)
- `public/playmat.css` — Shared transition properties for buttons and hover states.
  Also holds **appearance** for components shared by /game and /prepare, as bare class
  selectors (`.game-title`); the page sheets hold only placement.

### Hazard: custom properties that cross a page sheet into the shared sheet

`playmat.css` is loaded by **both** /game and /prepare, but `game.css` and `prepare.css`
are loaded by only one page each. So a custom property **defined in a page sheet and
consumed in `playmat.css`** resolves on one page and silently falls back to nothing on the
other — no error, no warning, just a rule that quietly does less.

This actually happened: `--min-title-slab-height` was defined on `.game-top-row` in
`game.css` and read by the shared deck-title rule. On /game it reserved the plaque's
height; on /prepare the plaque simply had no min-height and nobody noticed for months.
(The variable is gone as of `2d33c2f` — this is recorded for the pattern, not the name.)

**Rule**: anything `playmat.css` consumes must be defined somewhere both pages load —
`styles.css` `:root` for tokens, or `playmat.css` itself. If a value genuinely differs per
page, define it in `playmat.css` with a real fallback and let the page sheet override it.
This matters for animations because durations, distances, and offsets are exactly the kind
of value that gets tokenized into a custom property.

## TypeScript (animation class application)

- `src/view/play-game/hand-components.ts` — renders the leading `.hand-drop-zone` (before card
  0) with the added `.hand-drop-zone-leading` class (2026-08-09); `data-hand-position` unchanged,
  so drag-and-drop targeting in `game.js` is untouched. Renders `.hand-symbol` (image +
  card count) as the **last** child of `#hand-cards` on every render — this is why the
  client-side reposition (below) has to be reapplied after every swap rather than
  persisted server-side.
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
  - `click` handler (document-level) — opens/closes the hamburger; closes on
    `!evt.target.closest("#game-menu")`. This containment check is a **markup constraint on
    anything added to the top strip** — see interactions.md
  - Drag-and-drop setup — removes animation classes on drag start
  - `HAND_SYMBOL_SENTINEL`, `handSymbolPositionKey()`, `restoreHandSymbolPosition()`
    (2026-08-11) — the hand-symbol easter-egg reposition. `handleDragStart`/`handleDrop`
    check the sentinel before falling into the real-card logic; the drop path does a
    plain DOM `insertBefore` + `sessionStorage` write instead of the `/move-hand-card`
    POST. See architecture.md "New shape: a draggable non-card element."
  - (Line numbers shifted down ~55 lines after the hamburger-menu code was added at the top.)
- `public/deck-selection.js`
  - Lines 35-78: Manages `search-active` class to disable/enable tile fade-in

## Data Model

- `src/GameState.ts`
  - Lines 58-64: `WhatHappened` interface definition

## Tabletop (tap animation BUILT 2026-08-09, `65276e6`)

Full paths from the repo root.

- `apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` — the genuine custom `mtg-card`
  shape (ticket 12 replaced the old `MtgCardImageShapeUtil` image-shape subclass; the
  `UNTAPPED_EPSILON` angle-read is long gone). `onClick` toggles `props.tapped` and writes
  `shape.rotation` as a ±90° delta with centre-preserving `Vec.Rot` math. **The tap
  animation lives in `component()`**: a `useLayoutEffect` keyed on `props.tapped`
  (`prevTappedRef` starts at first-seen value) runs WAAPI `element.animate()` on the
  `.tl-image-container` div — `rotate(∓90deg)` → `0`, 500ms, `ease-out`, cancelling any
  running animations first. The center-coupling comment (ticket-05 constraint 3) is at
  the effect.
- `apps/tabletop/src/client/shapes/cardTap.ts` — `tapPartial()`'s center-preserving
  rotation-delta math. `TAP_ANGLE` (`Math.PI / 2`) is now **exported** (2026-08-12) so
  `MtgCounterShapeUtil.tsx` reuses the same constant instead of duplicating it.
- `apps/tabletop/src/client/shapes/MtgCounterShapeUtil.tsx` — hosted counter's own tap
  catch-up, in `component()`'s `useLayoutEffect` keyed on the **host card's**
  `props.tapped` (read via `useValue` off the editor, not the shape's `parentId` field).
  Rotation-only catch-up landed `6713421`; extended 2026-08-12 to also compensate the
  counter's orbital translation around the card's fixed center (`offsetLocal` rotated by
  the card's rotation before/after the tap, scaled by `editor.getZoomLevel()`), combined
  into one `translate(dxPx, dyPx) rotate(...)` WAAPI transform. Plan:
  `.scratch/counter-orbit-animation/plan.md`.
- `apps/tabletop/src/client/TablePage.tsx` — registers the shape util.
- **Still no CSS source file on the Tabletop** (`tabletop-css-tokens` in `TODO.md`) —
  that's why the animation is WAAPI in the component rather than a CSS transition in a
  stylesheet.
- Decisions: `.scratch/tabletop-physics/issues/04-tap-is-state.md` (resolved, `3f14d02`),
  `.scratch/tabletop-physics/issues/05-rotate-to-tap.md` (resolved 2026-08-07 — trigger
  stays `onClick`, duration/easing is 0.5s ease-out), and the implementation ticket
  `.scratch/tabletop-physics/issues/15-tap-animation.md` (landed `65276e6`; plan in
  `.scratch/tabletop-physics/plan-15.md`).
- `apps/tabletop/test/verification/verify-tap-animation.spec.ts` — Playwright: tap and
  untap both show a running 500ms WAAPI animation on `.tl-image-container` (via
  `getAnimations()`); an already-tapped card after reload does not animate; a remote peer
  (second browser context) animates when the prop syncs in; a counter riding a tapped card
  animates along with it (`6713421`); and (2026-08-12) a counter's orbit around a tapped
  card starts from its pre-tap spot — asserted by reading the running WAAPI animation's
  first keyframe `transform` string and regex-extracting `translate(dx, dy)`, rather than
  racing bounding-box timing against the ease-out curve. This keyframe-reading pattern is
  the recommended template for any future WAAPI catch-up transform assertion.

## Tests

- `test/GameState.test.ts` — Tests for GameState methods that produce WhatHappened objects
- `test/verification/verify-deck-title-placement.spec.ts` — Playwright. Guards the
  sibling-not-child rule: clicking the deck title must dismiss an open hamburger menu.
  Copy this assertion for any new sibling added to `.game-header-row`.
- **Swap/settle retry pattern** — `expect(async () => { click; assert }).toPass()`. Reference
  implementations: `test/verification/verify-prep-commander-flip.spec.ts:99-105` and
  `test/verification/verify-discard.spec.ts:39-50`. Also used in
  `verify-library-grouping.spec.ts` (×8, including both flip loops),
  `verify-query-parameter-modals.spec.ts`, `verify-tabletop-integration.spec.ts`,
  `verify-history-card-links.spec.ts`, `verify-design-gallery.spec.ts`.
- `test/verification/verify-hand-grid-alignment.spec.ts` (new, 2026-08-09) — Playwright. Asserts
  every wrapped row's leftmost card shares the same x-coordinate, guarding against the leading
  drop zone's flex-flow width bug recurring.
- `test/verification/verify-hand-symbol-reposition.spec.ts` (new, 2026-08-11) — Playwright.
  Drags `.hand-symbol` into a `.hand-drop-zone`, asserts DOM order changed and real cards'
  `data-hand-position` values are untouched, then draws a card and confirms the symbol
  re-inserts at its stored slot while the new card still appends after the last real card.
- `test/verification/verify-mulligan.spec.ts` — carries comments at the two former 1800ms
  sleep sites explaining why no animation wait is needed, and at line ~120 marking the
  `Mulligan #2` assertion as **load-bearing synchronization** for the following Ctrl+Z.
  Don't "simplify" that assertion away.
- **No Shuffler spec asserts on animation state**, and none can — see architecture.md,
  "Animation completion is NOT observable from the DOM." The Tabletop's tap animation is
  the exception: it's WAAPI, so `element.getAnimations()` observes it, and
  `verify-tap-animation.spec.ts` (Tabletop section above) does exactly that.
