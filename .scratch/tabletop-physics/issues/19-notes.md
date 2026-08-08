# 19 — Notes attach to a card the same way counters do

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: ready-for-agent

**What to build:** Notes stay tldraw's stock `note` shape type — never folded into
`mtg-counter` — but the card's drag-attach accept-list (ticket 18's
`canReceiveNewChildrenOfType`/`onDropShapesOver`) is extended to include `note` alongside
`mtg-counter`. "Attached" is purely "currently has a parent"; there is no separate
attached/unattached shape variant, so free-floating and attached notes are the same shape.

Once parented, a note inherits ticket 18's battlefield-exit rule (detach, nudge to an open spot
near the zone's edge) with no per-note exception. A note meant to survive a zone change is simply
left unattached — never a special "permanent note" mode. The stock note tool needs no change
beyond the accept-list and stays in the toolbar.

**Blocked by:** 18

- [ ] Dragging a stock note onto a card attaches it (same hover-highlight behavior as a counter)
- [ ] Dragging a note off a card detaches it
- [ ] A host card leaving the battlefield detaches every attached note the same way it detaches
      counters
- [ ] An unattached note is unaffected when a nearby card moves or changes zone
