# 14 — Build the square: compass seats around a centered Stack

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: done
Blocked by: 13 — build command-zone redraw (seat placement derives from the widened player-area dimensions)

**What to build:** Player areas take compass slots around a fixed, centered Stack
instead of sitting in a row: 1 player → S; 2 → S, N; 3 → S, N, E; 4 → S, N, E, W, by
join order. The Stack is a fixed-size square in the center, same footprint regardless
of player count; occupied slots change as seats join, the Stack doesn't. Every player
area keeps its internal layout — upright, unrotated; E/W look sideways and that's
accepted. The row-derivation of player-area position is replaced outright — no row
fallback.

Design source of truth: [10 — the square](10-the-square.md) and `apps/tabletop/DESIGN.md`'s
"The square" section.

Implementer's choice: exact margins/spacing between compass slots and the central Stack —
but keep zone bounding boxes disjoint (first-match zone detection; E/W zones packed close
to the Stack's corners would misfile drops).

Explicitly provisional — "this is all gonna be tweaked after play experience." Build to
react to, not to defend.

Test at the server event-handler seam: join 1–4 seats, assert each lands in the right
compass slot, the Stack stays fixed and centered, and all zone AABBs stay disjoint.

Consult owners: `tabletop-shape-mechanics` (zone AABBs, and its KB wants a note on the
disjointness constraint).

- [x] Seats 1–4 occupy S, N, E, W by join order; existing seats never move when a new one joins
- [x] Stack is a fixed-size square centered on the board at every player count
- [x] Row-position derivation is gone, not shadowed by a fallback
- [x] All zone AABBs disjoint at 4 players (asserted in tests, with a ≥ GAP band, across seats and the Stack)
- [x] `apps/tabletop/DESIGN.md`'s delta table updated
