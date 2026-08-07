# Rotate a card 90° to tap it, and animate it

Mountain: tabletop-replaces-mural
Type: grilling
Status: resolved
Blocked by: 04

## Question

`TODO.md`'s `animate-tap` line. Real players hit this (Jess's college kid and friends,
2026-08-01) — tapping lands for mana and turning creatures sideways for summoning sickness,
currently tracked out-of-band because there's no rotation gesture. `onClick` already toggles tap
on `MtgCardImageShapeUtil`; this decides *how* a 90° rotation is triggered and animated on top of
that — same click, a drag gesture, or something else — and what the transition looks like.

`onRotateStart`/`onRotate`/`onRotateEnd` are confirmed real hooks in `tldraw@5.2.5`. Consult the
`animations` owner before deciding the motion — the Shuffler already has a card-movement
animation vocabulary worth matching rather than inventing a second one.

**Blocked by [Make tap a state the card holds](04-tap-is-state.md)**: the motion is a rendering
of the state change, so the state model has to settle first. This ticket came across from the
former `tabletop-card-physics-starter` map (2026-08-06) — it was unblocked there only because
that map didn't ask what a card is.

## Answer

**Trigger stays `onClick`, unchanged.** No new gesture — the click that already toggles
`props.tapped` keeps doing so; `onRotateStart`/`onRotate`/`onRotateEnd` go unused for tap. Jess
confirmed rather than reaching for tldraw's rotate handle, which stays reserved for free-rotation
("attacking") per ticket 04 — the two gestures must stay visually distinct since tap is never
read back out of angle.

**Animation is 0.5s, matching the Shuffler's card-motion slides, not the 0.8s flip.** The
`animations` owner leaned toward 0.8s (reorientation, like a flip) but left the call open; Jess
picked the faster 0.5s instead — tap happens often mid-turn and reads better snappier. Implied
easing: `ease-out`, matching that same slide vocabulary (`game.css`'s `slideFromRight`/
`slideFromLeft`/`growFromRight`/`growFromLeft`), rather than the flip's unspecified default
`ease`.

**Mechanism is already fully specified by the `animations` owner** (`owners/animations/
architecture.md` lines 102-166) and doesn't reopen here: a local "catch-up" counter-transform
keyed off `props.tapped` **changing** (never off reading an angle, which is exactly the
ambiguity ticket 04 killed) — apply an inner ∓90° counter-rotation on the tap-toggling frame and
CSS-transition it to 0 over 0.5s `ease-out`. One synced write; nothing to interpolate over the
wire, so undo and remote peers animate identically for free. Init the prev-`tapped` ref to the
first-seen value (never hardcode `false`), and nothing on the path may `overflow: hidden`-clip,
since mid-swing the card extends outside its own box.
