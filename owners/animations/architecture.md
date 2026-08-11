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

## Animation completion is NOT observable from the DOM

Verified 2026-08-07 (`65f12e8`). **No JS anywhere removes an animation class.** `grep -rn
shuffl apps/shuffler/public/` matches only `game.css`; nothing in `game.js`. `.shuffling` is
added server-side by `formatLibraryStack()` (`shared-components.ts:164`) and simply **rides on
`.library-stack` until the next htmx swap re-renders the stack** — it is never taken off when
the 1.5s shuffle finishes. The same is true of `.card-moved-*` / `.dropped-from-*`: the only
removal is the drag-start cleanup in `game.js`.

Two consequences:

- **A test that waits for `not.toHaveClass(/shuffling/)` is wrong and passes instantly** — it
  would be waiting on a swap, not on the animation.
- **The animation class arrives in the same swap as the post-action state**, so asserting the
  post-action state *is* the synchronization. A separate wait for the animation buys nothing
  unless the assertion touches a property the animation is transforming — and none do: the
  shuffle animates `.library-card-back` transforms, which no asserted locator reads. This is
  why both 1800ms mulligan sleeps could be deleted outright in `65f12e8`.

If a future animation ever *does* need a completion signal, it has to be added deliberately
(an `animationend` listener setting a class on a non-swapped ancestor — see the settle-phase
gotcha above); there is nothing to observe today.

(This is a **Shuffler** property — class-based CSS animations. The Tabletop's tap animation
is WAAPI, so its running state *is* observable via `element.getAnimations()`, which is what
`verify-tap-animation.spec.ts` asserts on. See "Third mechanism" below.)

## Gotcha: `evt.detail.elt` is not the triggering element inside `htmx:afterSettle`

Found and fixed 2026-08-11 in `public/table-look-focus.js` (the /prepare table-look
picker's focus-restore script — not an animation, but the same `htmx:afterSettle`
machinery this owner tracks, so recorded here as a general pattern for anyone using
`evt.detail.elt` in an `afterSettle` handler).

htmx's internal `triggerEvent(elt, name, detail)` **always overwrites `detail.elt = elt`**
— the element the event is being dispatched *on* — before dispatching, for every event it
fires. `htmx:afterSettle` fires **once per element in the swapped fragment that carries a
class/style/width/height attribute**, as htmx settles each one in turn. So a handler reading
`evt.detail.elt` on `afterSettle` gets whichever of those elements is being settled *at that
moment* — not the button the user actually clicked to trigger the request.

This differs from the settle-phase gotcha above (which is about *classes* the settle phase
reverts): this one is about *which element* `detail.elt` even points to, and it's wrong on
every single `afterSettle` firing, not just a race.

**Fix**: capture the triggering element on `htmx:configRequest` instead — it fires exactly
once per request, directly on the real triggering element, before any swap/settle happens.
Stash a stable identifier (a CSS selector built from a `data-*` attribute, not the element
itself — it's about to be destroyed and replaced) in a closure variable, then consume it in
the later `afterSettle` handler to do the refocus:

```js
document.body.addEventListener("htmx:configRequest", function (evt) {
  const elt = evt.detail.elt;
  pendingSelector = elt && typeof elt.matches === "function" ? selectorFor(elt) : null;
});

document.body.addEventListener("htmx:afterSettle", function () {
  if (!pendingSelector) return;
  const replacement = document.querySelector(pendingSelector);
  if (replacement) replacement.focus();
});
```

**General rule for this codebase**: never read `evt.detail.elt` inside an `htmx:afterSettle`
listener expecting it to be the triggering element. If you need "the element whose click/change
caused this swap," capture it on `htmx:configRequest` (or `htmx:beforeRequest`) and carry it
forward in a closure variable, keyed by a stable selector rather than the element reference.

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

## Third mechanism (BUILT): prop-derived local catch-up on a synced tldraw shape

The two mechanisms above are both Shuffler-side: **server-driven** (WhatHappened → class on
render) and **client-driven class toggle** (the card flip). The third is the Tabletop's tap
animation, decided 2026-08-07 and **built 2026-08-09** (`65276e6`) — reasoning in
`.scratch/tabletop-physics/issues/04-tap-is-state.md` and
`.scratch/tabletop-physics/issues/05-rotate-to-tap.md`, implementation ticket
`.scratch/tabletop-physics/issues/15-tap-animation.md`, code in
`apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` `component()`.

**As built.** A `useLayoutEffect` keyed on `props.tapped` (with a `prevTappedRef`
initialized to the *first-seen* value, so no swing on mount or store reconnect) runs
**WAAPI `element.animate()`** on the `.tl-image-container` div: keyframes
`rotate(∓90deg)` → `rotate(0deg)`, 500ms, `ease-out`. WAAPI rather than a CSS transition
because the Tabletop still has no ship-local stylesheet; this owner's `-review` approved
that as within "CSS-driven, no animation library" (platform API, constant keyframes).
Before starting, `el.getAnimations().forEach(a => a.cancel())` — a mid-swing re-tap gets
one clean jump instead of stacked transforms. **Smooth reversal on a fast double-tap is an
accepted gap** (WAAPI starts from the fixed keyframe, not the current rendered angle),
noted in a code comment. Because the effect's only input is `tapped`, free rotation cannot
fire it; because the trigger is the synced prop, remote peers animate for free.

**One accepted risk**: the animated element is `.tl-image-container` itself (tldraw's own
class, reused for its `pointer-events: all`). If tldraw's stylesheet ever puts a
`transform` on that class, the WAAPI animation would override it. Overflow was re-verified
against installed `tldraw@5.2.5`: `.tl-shape` is explicitly `overflow: visible`;
`.tl-html-container` and `.tl-image-container` have no clipping — constraint 4 holds.

**Trigger gesture: settled as plain `onClick`, no new gesture.** The click that already
toggles `props.tapped` on `MtgCardShapeUtil` keeps doing so. tldraw's own
`onRotateStart`/`onRotate`/`onRotateEnd` hooks (confirmed real in `tldraw@5.2.5`) are **not
used for tap at all** — they stay reserved for free rotation ("attacking" per ticket 04). This
was an open question in `-context`; it's now closed. Keeping tap on `onClick` and free-rotation
on the rotate handle is deliberate: the two gestures must stay visually distinct, since tap is
never read back out of angle (that's the bug ticket 04 killed) — if tap ever moved onto the
rotate handle, telling a 90° tap from a free 90° rotate would reopen exactly that ambiguity.
**Don't reopen this path**: a future session proposing to wire tap through
`onRotateStart`/`onRotate`/`onRotateEnd` is re-litigating a settled call.

**Duration and easing: settled as 0.5s `ease-out`, matching the Shuffler's card-motion
slides — NOT the 0.8s flip.** This owner's own lean in `-context` was 0.8s (reasoning: a tap
is a reorientation, like the flip). Jess **overrode that lean, deliberately**: tap happens
often mid-turn, and it reads better snappier than an 0.8s reorientation-style transition. The
value now matches `game.css`'s `slideFromLeft`/`slideFromRight`/`growFromLeft`/`growFromRight`
(0.5s) rather than `.card-flipped` (0.8s, unspecified default `ease`). **Don't recommend 0.8s
again** — it was considered and specifically turned down for this animation.

**The state model.** `props.tapped: boolean` on the `mtg-card` shape is the stored truth, and
it is **never read back out of an angle** (the old `UNTAPPED_EPSILON` check died with ticket
04/05; ticket 12 also replaced the image-shape subclass with the genuine custom shape
`MtgCardShapeUtil.tsx`). The *visual* stays tldraw's real `shape.rotation`, written as a **delta**: +90° clockwise
on tap, −90° on untap, relative to the card's own current angle, keeping the existing
centre-preserving `Vec.Add`/`Vec.Rot` math. Free rotation composes on top; resize stays,
aspect-ratio locked.

**The animation.** A tap is *one synced write*, so there is nothing for CSS to interpolate.
The motion is a **local catch-up**: on the frame the prop changes, apply an inner
counter-transform of ∓90° and transition it to 0. Because the trigger is a prop change,
**undo animates the card back for free and remote peers animate identically with no extra
work**.

**This is NOT the banned FLIP pattern.** FLIP's forbidden part is *measuring* an unknown
delta at runtime; ±90° is a constant known from the state change. Mechanically it is the same
thing as the Shuffler's `.card-flipped`. Recorded here explicitly so a future reviewer doesn't
veto it by citing "no FLIP" from the Design Philosophy list.

**I withdrew my own earlier recommendation, and the withdrawal is the decision.** In `-context`
I advised storing only the boolean and rendering the rotation as a **CSS transform inside the
card's component** (one synced write, free local animation, composes with free rotation). I
**withdrew it in `-review`** once Jess decided tldraw's resize handle stays live on cards:
CSS-only rotation is invisible to tldraw, so a tapped card draws landscape while its hit-test
box, selection indicator and resize handles stay portrait — *a lie about where the object is,
on the gesture players repeat more than any other*. **Do not hand out the CSS-only advice
again**; it was considered and killed on that specific ground. Also rejected in the ticket:
overriding `getGeometry()` to swap the box (resize then operates in a swapped frame), and
`editor.animateShapes()` (per-frame synced writes plus an undo trail).

Four constraints handed to ticket 05, inherited verbatim — **all four verified implemented
in `65276e6`** (1: effect keyed on `tapped` only; 2: `prevTappedRef` starts at first-seen;
3: the center-coupling comment is in the code; 4: overflow re-checked against tldraw 5.2.5):

1. **Key the catch-up off `props.tapped` changing, not off a ±90 rotation delta.** A delta
   sniffer is reading tap back out of the angle again, relocated into the view layer; it
   misfires when a player free-rotates through 90°.
2. **Don't animate on first render.** Initialize the previous-value ref to the *first-seen*
   `tapped`, not `false`, or a card that arrives tapped swings on mount — and again on a store
   reconnect. Precedent: `3970e53` (fade-in suppressed during search).
3. **Comment the coupling** between the centre-preserving x/y write and the transform origin.
   Frame 0 is pixel-identical only because both hold the centre; deleting the `Vec.Rot` math
   "because tldraw handles rotation now" makes the first frame jump.
4. **Nothing on the path may clip.** Mid-swing the counter-rotated card extends outside its own
   `w × h` box; any `overflow: hidden` ancestor chops the animation.

Empirical facts from the throwaway Playwright prototype (branch `proto/multi-tap`, deleted,
nothing landed):

- **Undo is per-client in a synced tldraw room.** A client who has done nothing gets nothing
  from Ctrl+Z; one player's undo syncs to others as an ordinary edit. Nobody can rewind your
  board.
- **A tapped card's page bounds are the ROTATED bounds** — a marquee around three upright cards
  also sweeps in a tapped card beside them. The geometry is honest, which is the point.

## Drag-and-Drop Interaction

`game.js` (lines 183-186) removes animation classes when a drag starts, preventing animation flicker when a card is dropped in a new position. After drop, HTMX swaps in the new hand state, which may include new animation classes from `WhatHappened`.

## New mechanism: taking a one-time drop zone out of flex flow (2026-08-09)

`.hand-drop-zone` elements are the drag-and-drop targets between hand cards (`data-hand-position`
keys the drop, in `game.js`); they're rendered once per hand row by `hand-components.ts`, with
negative margins (-35px each side) creating a 10px net-width overlap onto the neighboring card so
the drop target reads as "between two cards" rather than "beside one."

The **leading** drop zone (before card 0) is different: it exists **once per hand, not once per
row** (there's only one "before the first card" position). Left as an ordinary in-flow flex item,
its +10px net width was added to row 1's width only — row 1 has one more drop zone than every
row below it, so row 1's cards sat 10px further right than row 2's, breaking the wrapped grid's
column alignment.

**Fix**: `.hand-drop-zone-leading` (new class, added alongside the existing `.hand-drop-zone` on
that one element) takes it **out of flex flow entirely** — `position: absolute; left: -45px; top:
0; margin: 0` — positioned relative to `.hand-cards`, which is now `position: relative`. `-45px`
reproduces the same 35px visual overlap onto card 0 that the in-flow negative margin gave the
other drop zones (35px margin + 10px own width contribution, now folded into the offset since the
element no longer contributes width to the flex line at all). Because it's absolutely positioned,
it no longer participates in wrapping/alignment math for any row — it only visually overlaps
whichever row card 0 is in.

**This is a new, third case in the "state that must survive swaps" family of body-anchoring
patterns** (see above) — except here the fix isn't anchoring to a swap-surviving ancestor, it's
**removing a flex participant from flow so its box no longer affects sibling layout**, while
keeping it in the same swapped subtree and keeping `data-hand-position` untouched for
`game.js`'s drag-and-drop targeting. Generalize this if a future one-time/edge-case element
(exists once per collection, not once per row/item) is found to be distorting a wrapped flex
grid: take it out of flow with `position: absolute` on a `position: relative` container, and
compute the offset to preserve the original visual overlap.

No CSS keyframes/transitions, no `WhatHappened` field, and no `game.js` change — this is a pure
layout fix, not an animation. It's recorded here because the affected element (`.hand-drop-zone`)
lives inside the same flex-wrap hand grid that hosts the card-move/card-drop animations, and the
principle (one-time elements in a per-row collection break flex-wrap alignment; take them out of
flow) is a general layout gotcha worth keeping alongside the other hand-layout knowledge.
