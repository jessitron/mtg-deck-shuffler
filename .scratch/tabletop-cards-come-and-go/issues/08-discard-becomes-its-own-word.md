# 08 — Discard becomes its own word

Mountain: tabletop-replaces-mural
Ship: fleet
Status: ready-for-agent

**What to build:** New schema `card.discarded.v1` — payload `card`, `face`, `seat` (like
`card.played` minus `zoneHint`, since graveyard *is* its meaning; keeps `face` because a
discard is public). The Shuffler emits `card.discarded.v1` instead of `card.played.v1` when
a card is discarded. `card.played.v1`'s `zoneHint` enum narrows to `stack | battlefield`.
The Tabletop routes discard vs. play on event kind, not on a zone hint.

**Blocked by:** 05 — needs contract validation in place for the new/amended schemas.

- [ ] `card.discarded.v1.json` schema written per the payload above
- [ ] `card.played.v1.json`'s `zoneHint` enum narrows to `stack | battlefield`
- [ ] The Shuffler emits `card.discarded.v1` on discard (not `card.played.v1` with a
      graveyard zone hint)
- [ ] The Tabletop's card-arrival handling routes discard to the graveyard by event kind
- [ ] Event-builder unit tests cover the new discard event shape
- [ ] Playing a card still lands correctly with the narrowed `zoneHint`
