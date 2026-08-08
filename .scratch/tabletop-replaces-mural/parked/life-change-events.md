# Life changes are log events

Mountain: tabletop-replaces-mural
Ship: fleet
Status: parked — founding material for Map 5, "The table reports"

## Question

Jess, 2026-08-08, resolving
[Life totals and commander damage](../../tabletop-table-layout/issues/12-life-totals-and-commander-damage.md):
*"absolutely they are important log events!"* — a life-total or commander-damage change
belongs in the table's event log ("Sam went from 12 to 9" is exactly a narration line).

What Map 5 must decide:

- The contract: a new event kind in `contracts/` (life.changed? counter.changed?) that the
  Spine validates. Both life totals and commander damage change through the same
  `mtg-counter` shape, so one event kind probably covers both.
- **Metadata on the change event** — Jess flagged that we may need to attach metadata and
  *we don't know what yet* (who pressed it? what it was before? which commander dealt the
  damage?). Decide when the narration's needs are visible, not before.
- The emission point is already known: the counter shape's button/edit handlers, the same
  place the number is written to the tldraw store. Synced shape state is last-writer-wins
  snapshots, so the story-quality record needs an event per change, not the state.
