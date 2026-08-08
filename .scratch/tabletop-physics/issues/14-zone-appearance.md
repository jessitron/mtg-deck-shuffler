# 14 — Zone appearance: dashed at rest, glow when armed

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: ready-for-agent

**What to build:** Give `mtg-zone` its real visual treatment, replacing today's unchosen stock
tldraw dashed-grey look.

At rest: port `.commander-placeholder`'s dashed "empty receptacle" pattern and retokenize it —
`2px dashed var(--dark-pink)`, radius `0`. Armed (a card is being dragged over it): a new
`--armed-glow` token (`#e6a33d`) drives a `box-shadow` ring plus a background tint, uniform
across every zone type — including the playmat and library, where the tint is invisible under
their opaque picture layer but the ring still shows. Compute the armed state reactively inside
the zone's own `component()` (e.g. `useValue` over shapes currently being translated) — never
written to the store, so it produces no synced document write and no undo entry. The armed
highlight is visible only to the player doing the dragging, never synced to other clients.

The playmat's border is plain `black`, `10px solid`, untokenized on purpose — matching the
Shuffler's mats exactly, not `--dark-pink`. The playmat's corner radius is computed at render
time as 5% of the shape's own `props.h`, applied equally to both axes (not a fixed pixel value,
not a bare CSS percentage — CSS percentage radii resolve width/height separately and draw an
ellipse on a non-square box). The Stack gets no distinct visual treatment — same
dashed-at-rest/glow-armed family as graveyard/exile/command.

`packages/design-tokens` already carries `--armed-glow` and the Tabletop already imports the
palette and loads Orbitron — no plumbing blocked here.

**Blocked by:** 13

- [ ] A zone at rest shows the dashed pattern; an armed zone shows the glow ring + tint
- [ ] The armed highlight is computed reactively, never written to the store, and appears only on
      the dragging player's own client (verify with two Playwright clients)
- [ ] The playmat keeps its plain black 10px border
- [ ] The playmat's corner radius is 5% of its height, computed at render time, equal on both axes
- [ ] The Stack matches the graveyard/exile/command visual family
