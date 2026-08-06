# Keep/kill: tabletop-custom-card-shape

Mountain: tabletop-replaces-mural
Type: grilling
Status: resolved

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

## Answer

**Three survive, one dies, one defers.** Written into `TODO.md` § Next in the same session
(2026-08-06) — the cluster's whole output is three lines there, so this ticket's job is done.

Jess, asked how she wanted the lines shaped: *"dude I don't care, what will help you get it done?
My objective is to get this repo into a state where I can move forward without using linear."* —
so the keep/kill calls below are the agent's, made under that delegation rather than grilled out.

### JES-149 — **keep**, as a new line

`tabletop-card-shape`. Stands alone as the architecture spike: register a custom card `ShapeUtil`
in `TablePage.tsx` and turn drags into named zone-entry events. It gets its own line rather than
merging because it's a *prerequisite*, not a payoff — both existing inbox lines now point at it,
and so does the persistence work in cluster 08.

### JES-144 — **keep**, split across the two existing lines

The issue was two different things wearing one id:

- **Rotate** (the essential half) merged into **`animate-tap`**, which already asked for exactly
  this. The line's title changed from "Animate tapping a card" to "Rotate a card 90° to tap it,
  and animate it" — animation was never the hard part.
- **Menu curation + MDFC flip** merged into **`no-doubleclick-crop`**, retitled "Curate the card's
  menus — kill crop, add rotate". The double-click gesture and the popup menu are two surfaces of
  one job; keeping them apart was the near-duplicate ticket 02 warned about.

### JES-143 — **killed as superseded**

Same mechanism as JES-144's rotate; its own body said scope them together. Nothing lost: the
**real-user provenance** — Jess's college kid and their friends, 2026-08-01, tapping lands and
turning creatures sideways for summoning sickness — is now the third bullet on `animate-tap`,
where it argues for the work instead of sitting in a dead ticket.

### JES-132 — **deferred to [ticket 12](12-cluster-shuffler-look-and-feel.md)**

Sleeves. Not killed, not written — this ticket flagged it as one half of an idea whose other half
(JES-79, sleeve colors on the Shuffler's deck preview) sits in cluster 7. Deciding it here would
split the idea, which is the one thing the ticket said not to do. Its own body says *don't
accelerate; pick it up when CardShape happens* — so nothing is lost by letting cluster 12 call it
with both halves in view.

### Side effect: this cluster's `JES-` prose is already clean

Both merged lines previously cited JES-144/JES-149/JES-143 in their sub-bullets. Those references
were rewritten to slugs while merging, so **[ticket 05](05-cut-the-linear-pointers.md) has two
fewer sites to visit** — only the `← was:` labels remain, and those are dated artifacts by design.
