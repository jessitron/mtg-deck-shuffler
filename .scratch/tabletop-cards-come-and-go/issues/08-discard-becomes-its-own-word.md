# 08 — Discard becomes its own word

Mountain: tabletop-replaces-mural
Ship: fleet
Status: resolved

**What to build:** New schema `card.discarded.v1` — payload `card`, `face`, `seat` (like
`card.played` minus `zoneHint`, since graveyard *is* its meaning; keeps `face` because a
discard is public). The Shuffler emits `card.discarded.v1` instead of `card.played.v1` when
a card is discarded. `card.played.v1`'s `zoneHint` enum narrows to `stack | battlefield`.
The Tabletop routes discard vs. play on event kind, not on a zone hint.

**Blocked by:** 05 — needs contract validation in place for the new/amended schemas.

- [x] `card.discarded.v1.json` schema written per the payload above (card, face,
      frontImageUrl, backImageUrl, cardName, owner, isCommander, gameCardIndex — the ticket's
      shorthand "card, face, seat" turned out to need the same rendering fields as
      card.played.v1 minus zoneHint, since the Tabletop mints the same kind of card shape;
      `owner` kept as the field name to match card.played.v1's existing convention)
- [x] `card.played.v1.json`'s `zoneHint` enum narrows to `stack | battlefield`
      (`card.played-face-down.v1.json`'s sibling enum narrowed the same way, for consistency —
      a face-down play was never a discard)
- [x] The Shuffler emits `card.discarded.v1` on discard (not `card.played.v1` with a
      graveyard zone hint) — both `/discard-card` and `/mill` (mill also discards to the
      graveyard)
- [x] The Tabletop's card-arrival handling routes discard to the graveyard by event kind
- [x] Event-builder unit tests cover the new discard event shape
- [x] Playing a card still lands correctly with the narrowed `zoneHint`
