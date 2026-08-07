# Decide what a shape knows and announces, without wiring it anywhere

Mountain: tabletop-replaces-mural
Type: grilling
Status: claimed
Blocked by: 03

## Question

Zone entry is detected today and announced to `console.log` — an explicit descope
([zone-entry ticket](../../tabletop-card-shape/issues/01-zone-entry-events.md), 2026-08-06:
*"no callback/emitter/queue yet — nothing downstream consumes this"*). By the end of this map,
several more things will be observable that aren't today: a card tapped, flipped, turned
face-down, given a counter, tucked behind another card, and whatever furniture recognises when
something lands on it.

This ticket decides **what the physics layer knows and is willing to say** — the vocabulary and
the shape of the announcement — and deliberately stops short of the wire.

- **What is worth announcing?** Jess: the Spine gets *"a lot of them, not absolutely every
  move."* Physics is where the line is drawn, because only the shape layer can tell a meaningful
  gesture from a nudge. Which of the above are occurrences, and which are just pixels moving?
- **What identifies the thing it happened to** — `instanceId` alone, or does a counter or a note
  need identity of its own?
- **What's the surface?** One emitter, per-shape callbacks, or something the room subscribes to.
  The descope above deferred this until a consumer existed; map 5 is that consumer.
- **Where does it run?** The card hook is client-side, and there is no live span in scope for a
  pure browser drag gesture. `fleet-is-observable` cleared the temporary `console.log` on exactly
  that basis and flagged that a real consumer must route through a span attribute or `log.ts`.
  **Consult that owner** before deciding the surface.

**Explicitly not this ticket:** the `card.moved` contract payload, the Tabletop→Spine sender, and
making `contracts/` actually validate. Those are map 5, and its founding material is already
written — see `.scratch/tabletop-replaces-mural/parked/card-moved-contract-and-sender.md`. The
seam between the two maps is this ticket's answer: physics says what happened, map 5 decides how
it travels.
