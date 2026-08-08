# 19 — The Command Zone lights up for its own commander

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: ready-for-agent
Blocked by: 18 — commander arrives with owner and ghost (arming reads `owner` and `isCommander` off the dragged card)

**What to build:** Dragging your own commander over your Command Zone lights the zone
up — and nothing else does: not an ordinary card, not an opponent's commander. Zones
stay locked, so drag-over hooks are unavailable; arming is computed reactively inside
the zone's own component (the established zone-arming pattern), watching the currently
translating shape and lighting up only when it's an `mtg-card` with `isCommander` true
and `owner` equal to the zone's seat. Local-only — nothing written to the synced store;
only the dragging player sees it.

The armed look follows the decided zone look (armed amber glow).

Design source of truth: [08 — commander in command zone](08-commander-in-command-zone.md),
"Arming" section.

Arming is a local derived render the server seam can't see → Playwright via the
Tabletop's `verify.sh`, kept few and behavioral: drag own commander → zone lights;
drag a plain card → it doesn't.

Consult owners: `tabletop-shape-mechanics` (zone-arming pattern, locked-shape hook
constraints).

- [ ] Command Zone arms while its own seat's commander is dragged over it
- [ ] It does not arm for non-commander cards or another seat's commander
- [ ] Arming is local and derived — nothing lands in the synced store or undo trail
- [ ] Playwright covers the arm and the two non-arm cases
