# Rotate a card 90° to tap it, and animate it

Mountain: tabletop-replaces-mural
Type: grilling
Status: open

## Question

`TODO.md`'s `animate-tap` line. Real players hit this (Jess's college kid and friends,
2026-08-01) — tapping lands for mana and turning creatures sideways for summoning
sickness, currently tracked out-of-band because there's no rotation gesture. `onClick`
already toggles tap on `MtgCardImageShapeUtil` (from `JES-144`); this decides *how* a
90° rotation is triggered and animated on top of that — same click, a drag gesture, or
something else — and what the transition looks like.

`onRotateStart`/`onRotate`/`onRotateEnd` are confirmed real hooks in `tldraw@5.2.5` on
the same custom shape. Consult the `animations` owner before deciding the motion — the
Shuffler already has a card-movement animation vocabulary worth matching rather than
inventing a second one.

Unblocked: the custom `ShapeUtil` this needs already exists ([Tabletop cards report zone
entry as named events](../../tabletop-card-shape/issues/01-zone-entry-events.md)).
