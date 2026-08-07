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

## Third mechanism (DECIDED, NOT BUILT): prop-derived local catch-up on a synced tldraw shape

The two mechanisms above are both Shuffler-side: **server-driven** (WhatHappened → class on
render) and **client-driven class toggle** (the card flip). A third was decided on 2026-08-07
for the Tabletop and is **not implemented yet** — full reasoning in
`.scratch/tabletop-physics/issues/04-tap-is-state.md`, implementation in
`.scratch/tabletop-physics/issues/05-rotate-to-tap.md` (resolved 2026-08-07).

**Trigger gesture: settled as plain `onClick`, no new gesture.** The click that already
toggles `props.tapped` on `MtgCardImageShapeUtil` keeps doing so. tldraw's own
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
it is **never read back out of an angle** (the current `UNTAPPED_EPSILON` check in
`apps/tabletop/src/client/shapes/MtgCardImageShapeUtil.tsx` is the bug it causes, and dies with
it). The *visual* stays tldraw's real `shape.rotation`, written as a **delta**: +90° clockwise
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

Four constraints handed to ticket 05, inherited verbatim:

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
