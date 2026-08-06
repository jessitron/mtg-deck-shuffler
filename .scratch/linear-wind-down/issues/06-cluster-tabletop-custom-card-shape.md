# Keep/kill: tabletop-custom-card-shape

Mountain: tabletop-replaces-mural
Type: grilling
Status: needs-triage

## Question

Which of these 4 survive into `TODO.md`? **Walk this cluster first** — it serves the active
Mountain, and JES-149 states the dependency the other Tabletop clusters wait on.

*Theme: give Tabletop cards a custom `ShapeUtil` so they can be rotated, flipped, sleeved, and
know what zone they were dropped into. One client-side investment, four payoffs.*

- **JES-149** — card zone-entry events (dragged into graveyard/exile/library). The architecture
  spike and keystone. `onDragShapesOver`/`onDropShapesOver`/`onTranslateEnd` confirmed present in
  `tldraw@5.2.5`. Its body says do this **before** the cluster-2 cosmetics.
- **JES-144** — custom card context menu: rotate, flip, remove crop/download. Same `ShapeUtil`
  investment. Rotate is the essential half.
- **JES-143** — tap lands / rotate for summoning sickness. ⚠️ **Superseded by JES-144** (same
  mechanism; its own body says scope them together). Worth preserving if killed: the real-user
  provenance — Jess's college kid, 2026-08-01.
- **JES-132** — "choose your sleeves": rectangular frames and custom card backs. Body says don't
  accelerate; pick up when CardShape happens. ⚠️ Pairs with **JES-79** in cluster 7 — two halves
  of one idea, deliberately in different clusters. Decide them together or you'll split the idea.

**Merge, don't duplicate:** `TODO.md` already holds `no-doubleclick-crop` and `animate-tap`, both
of which want this same custom shape. Survivors fold into those lines.
