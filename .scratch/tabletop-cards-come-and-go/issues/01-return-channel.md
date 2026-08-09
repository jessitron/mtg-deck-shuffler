# The return channel — how the Tabletop addresses the Shuffler

Mountain: tabletop-replaces-mural
Ship: fleet
Type: grilling
Status: needs-triage

## Question

Tabletop→Shuffler is a data-flow direction that does not exist. Today the Shuffler pushes
to the Tabletop (`POST /api/tables/:tableName/cards` and `/events`); nothing ever flows
back. For a card dropped into the library portal to land in the Shuffler's Reveal zone,
the Tabletop must know, **per seat**, which Shuffler game to talk to — and how.

Decide:

- **The mapping.** How does the Tabletop learn seat → Shuffler game? Does the Shuffler
  push its game URL/id at `seat.joined` time (same channel as `playmatImageUrl`), or does
  the Tabletop derive it some other way? `GameState.ts` already has `TableInfo` ("present
  only when this game joined a table") — what does the reverse pointer look like?
- **The channel.** What does the Shuffler expose to receive a returning card — a new
  endpoint? What authenticates/addresses it (gameId in the path, like the existing
  Shuffler routes)? Per the map's transport decision, the message conforms to the
  `contracts/` envelope so the Spine can interpose later.
- **The library link** (folded in from the parked `library-links-to-shuffler` ticket):
  `TODO.md`'s old question "Can we make the library link back to Deck Shuffler?" The
  `url` prop already exists in `tableFurniture.ts`, hardcoded `""` in both the image and
  `regionShape` paths — so that open question is entirely *which* URL. It is the same
  seat→game mapping; answer both at once.

Unblocked. [Round-trip identity](03-round-trip-identity.md) reports facts this decision
will want (instanceId dedup behavior), but the channel shape doesn't wait on it.
