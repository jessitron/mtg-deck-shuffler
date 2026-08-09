# Plan — ticket 15: animate tap as a quick rotation

Ticket: `.scratch/tabletop-physics/issues/15-tap-animation.md`
Ship: `apps/tabletop`
File under change: `apps/tabletop/src/client/shapes/MtgCardShapeUtil.tsx` (component only; onClick untouched)

## Mechanism

A tap is already one synced write (`props.tapped` toggles, `shape.rotation` gets ±90° with the
center held fixed). tldraw renders the new rotation instantly. The animation is a **local
counter-rotation catch-up** inside the shape's `component()`:

- Add React hooks inside `component(shape)` (tldraw renders it as a function component, hooks
  are supported):
  - `const prevTappedRef = useRef(shape.props.tapped)` — initialized to the **first-seen**
    value, so a card arriving already-tapped (mount, store reconnect) does not animate.
  - `const containerRef = useRef<HTMLDivElement>(null)` on the existing
    `.tl-image-container` div.
  - `useLayoutEffect` keyed on `[tapped]`: if `prevTappedRef.current === tapped`, return
    (first mount and non-tap re-renders). Otherwise update the ref and run a Web Animations
    API animation on the container:
    ```ts
    containerRef.current?.animate(
      [{ transform: `rotate(${tapped ? -90 : 90}deg)` }, { transform: "rotate(0deg)" }],
      { duration: 500, easing: "ease-out" },
    );
    ```
    Tapping applied +90° to `shape.rotation`, so the content starts at −90° (pixel-identical
    to the pre-tap render) and eases to 0; untap is the mirror.
- WAAPI instead of CSS keyframes because the Tabletop has **no ship-local stylesheet** yet
  (open design choice) — this needs no stylesheet, no keyframes, no remount-by-key.
- `useLayoutEffect` runs before paint, so frame 0 never flashes the un-counter-rotated state.
- Transform origin is the div's default `50% 50%` — the **center**. This is coupled to the
  center-holding `Vec.Rot` math in `onClick`: both must hold the center or frame 0 jumps.
  A comment in the code will state this coupling (owner constraint 3).
- Trigger is **only** `props.tapped` changing. The effect cannot see `shape.rotation`, so
  free rotation through 90° can never fire it (owner constraint 1). Remote peers get the
  same prop change through the store, so they animate identically for free.
- Ancestor path checked: `.tl-html-container` and `.tl-image-container` have no
  `overflow: hidden` in tldraw.css 4.x (owner constraint 4).

## Timing

0.5s ease-out — the Shuffler's card-motion vocabulary (game.css slide/grow animations),
deliberately not the flip's 0.8s (Jess's call, recorded by the animations owner).

## Verification (test-first)

New Playwright spec `apps/tabletop/test/verification/verify-tap-animation.spec.ts`,
following `verify-card-rotate.spec.ts`'s arrival pattern:

1. **Tap animates**: click the card, then immediately assert via `page.evaluate` that the
   card's `.tl-image-container` has a running WAAPI animation (`el.getAnimations()`) with
   500ms duration. Confirm it fails before implementing (no animations today).
2. **Arriving already-tapped doesn't animate**: tap a card, wait out the 0.5s, reload the
   page; once the card re-attaches, assert it has no running animations.
3. **Remote peer animates**: two pages on the same table (pattern from
   verify-shared-canvas.spec.ts); tap on page A, assert page B's card gets a running
   animation.

Checkbox 3 (free rotation doesn't trigger it) is covered structurally — the effect's only
input is `tapped` — and noted in a code comment; no e2e handle-rotation dance.

## Out of scope

`onClick`'s rotation math, multi-select untap (ticket 16), flip (ticket 17).
