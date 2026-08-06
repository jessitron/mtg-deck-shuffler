# Keep/kill: tabletop-table-furniture

Mountain: tabletop-replaces-mural
Type: grilling
Status: resolved
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

## Answer

**All six issues' live content survives, in three lines instead of six.** Two new lines in
`## Next`, one merge into an existing line. Jess delegated the keep/kill judgment (2026-08-06:
*"dude I don't care, what will help you get it done?"*), and the standing bias is fewer, richer
lines — so the four small prop tweaks became one polish pass rather than four thin captures.

### Verified against today's code first

Every claim in this cluster is still true; nothing here has quietly shipped.

- `cardLayout.ts` `landPosition()` — `x: mat.x + col * CARD_W`, no margin term at all. JES-150 stands.
- `cardLayout.ts` `stackCardPosition(stackCount)` — doesn't even take a `seatIndex`; anchors at
  `MARGIN_X + GAP` and cascades. Not centered over anything. JES-147 stands.
- `cardLayout.ts` — `exileBounds()` sits flush at `columnX + LIBRARY_W` (no gap) and `EXILE_H =
  CARD_H` (not taller than a card). JES-148's exile half stands *as written* — but see below.
- `tableFurniture.ts` `regionShape()` — `dash: "dashed"`, `color: "grey"`, `size: "s"`. The dotted
  grey outline is exactly this. JES-146's border half stands, still a one-line prop fix.
- Rounded corners are still not a `geo` prop in `tldraw@5.2.5`. JES-146's other half stands.
- `landPosition()`'s own doc comment says the mat never grows taller. JES-141 stands.
- `tableFurniture.ts` — `url: ""` hardcoded in **both** `regionShape()` and `imageShape()`.
  JES-145 stands.

One thing the archive didn't know: the Shuffler always sends a `cardBackImageUrl`
(`sendToTable.ts:65`), so the library always renders through the **image** path — which has no
border and no label. The `regionShape` fallback that *does* carry the "Library" label is
effectively dead in practice. That makes JES-148's library half more real than its body suggests,
and it's now the second bullet on the polish line.

### JES-150 + JES-147 + JES-146 + JES-148 (library half) — **kept, as one new line**

`player-area-polish`. These are four prop/geometry nudges in the same two files, none of which
stands as its own session's work, and all of which a person would naturally do in one sitting
with the table open in front of them. Four separate inbox lines would be four separate context
loads for one afternoon's work. The line carries each fix with the specific function it touches,
so no detail is lost by collapsing them.

Rounded corners ride on the same line rather than migrating to cluster 6 as the ticket floated:
it isn't card work, it's playmat work, and the decision it needs (custom `ShapeUtil` vs. baking
the corners into a playmat image asset) is a *playmat* decision. It's noted as the one item on
the line that isn't a prop tweak.

### JES-148's exile half — **killed as pre-empted**

"Exile needs distance from the library and to be taller than a card" describes geometry that
`playmat-command-zone` deletes outright: exile moves down into the graveyard's bottom third and
stops being a box beside the library. Tuning the gap and height of a box that's about to be moved
is work that would be thrown away. The library half is what's left, and it went to the polish line.

### JES-141 — **kept, merged into `playmat-command-zone`**

Growing the mat when lands overflow isn't a separate ask from redrawing the player area; it's the
same file (`tableFurniture.ts`), the same design doc (`apps/tabletop/DESIGN.md`), and the same
question of whether the mat's bounds are fixed at seat-joined time. It merges rather than sitting
beside, per ticket 02.

The merge earns its keep by carrying the **ripple**, which is the real content of JES-141 and the
reason it was scope-cut from the Done JES-140: the library/graveyard/exile/label positions are
fixed offsets derived from the mat's bounds, and seats are laid out in a row at fixed x offsets by
join order — so growing one mat re-derives that seat's whole column *and* shifts every player area
to its right. Anyone redrawing the player area needs to know that before they start.

### JES-145 — **kept, as a new line**

`library-links-to-shuffler`, written exactly as ticket 02's worked example specified. It stays
standalone rather than folding into the polish pass because it isn't cosmetics — it's navigation,
and its open question (*which* URL, given the Tabletop has no seatId → Shuffler game URL mapping)
is a design question, not a number to tune.

### Cluster 6's blocker, discharged

This cluster was blocked on 06 because JES-149 said the custom shape lands before the cosmetics.
Re-reading that in context: the ordering advice was about not *investing* in cosmetics before
knowing the architecture works, not a hard prerequisite. Nothing in the polish line needs a custom
`ShapeUtil` except the rounded corners, which say so on their own bullet. So the lines go in
without a blocking pointer at `tabletop-card-shape`.

### No cross-cluster deferral

JES-141's body flags JES-86 (let people pick a playmat, cluster 7), but explicitly says *"not the
same gap"* — 86 is about a player choosing a playmat image on the prep screen; 141 is about the
mat's height in canvas units. Unlike JES-132/JES-79 in cluster 6, these are not two halves of one
idea, so cluster 7 can call JES-86 on its own. Worth handing cluster 7 one verified fact:
the `playmatImageUrl` transport is **already fully wired** end to end (`types.ts` →
`sendToTable.ts` → `seatJoined.ts` → `tableFurniture.ts`), with `defaultPlaymatImageUrl()` as the
only value ever sent. JES-86 is a picker on the prep screen, not plumbing.
