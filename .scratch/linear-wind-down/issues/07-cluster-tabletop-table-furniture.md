# Keep/kill: tabletop-table-furniture

Mountain: tabletop-replaces-mural
Type: grilling
Status: needs-triage
Blocked by: 06

## Question

Which of these 6 survive into `TODO.md`?

*Theme: geometry and cosmetics of the drawn player area — playmat, library, exile, Stack. Nearly
all prop tweaks in `cardLayout.ts` / `tableFurniture.ts`.*

- **JES-150** — lands should leave a gap between each other and the playmat edge. Smallest item
  here; a margin constant in `landPosition()`.
- **JES-147** — center cards landing on the Stack above the playmat. `stackCardPosition()` anchors
  at the strip's left edge today. Straight geometry fix.
- **JES-148** — exile box: distance from library, height, border, label. ⚠️ **Partly superseded**
  by `TODO.md`'s newer `playmat-command-zone`, which moves exile down into the graveyard's bottom
  third. The exile geometry is pre-empted; the *library border + label* half survives.
- **JES-146** — playmat cosmetics: rounded corners, thick black border, remove dotted outline.
  Two-in-one: dash/border are a one-liner, but **rounded corners are not a prop** — that half
  belongs with cluster 6's custom-shape work.
- **JES-141** — grow the playmat taller when lands overflow the bottom half. Deliberate scope cut
  from the Done JES-140. Biggest ripple here: resizing one seat's mat shifts every player area to
  its right. ⚠️ Also overlaps `playmat-command-zone`, and pairs with **JES-86** in cluster 7.
- **JES-145** — link the library back to the Shuffler. Quick win; the `url` prop exists, hardcoded
  `""`. Open part is *which* URL — needs a seatId → Shuffler game URL mapping the Tabletop lacks.

Blocked on cluster 6 because JES-149 says the custom shape lands before these cosmetics, and
JES-146's rounded corners may migrate there outright.

**Watch:** `playmat-command-zone` in `TODO.md` redraws this whole area. Settle what it covers
before keeping anything it already subsumes.
