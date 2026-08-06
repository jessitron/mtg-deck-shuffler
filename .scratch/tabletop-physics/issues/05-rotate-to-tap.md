# Rotate a card 90° to tap it, and animate it

Mountain: tabletop-replaces-mural
Type: grilling
Status: open
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
