# The return channel — how the Tabletop addresses the Shuffler

Mountain: tabletop-replaces-mural
Ship: fleet
Type: grilling
Status: resolved

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

## Answer

Grilled with Jess, 2026-08-08. Six decisions:

1. **`seat.joined` grows two URL fields, both minted by the Shuffler.**
   - `gameUrl` — the public, player-clickable address of the game
     (`shufflerPublicUrl()` + `/game/:gameId`), used for the library furniture link.
   - `eventsUrl` — where the Tabletop *server* POSTs events back. The Shuffler mints
     it from whatever base is right for the environment (localhost in dev, the
     cluster-internal service name in prod).
   - **No `gameId` crosses the boundary.** The id is the Shuffler's private business;
     the URL is the address. (Same principle that already bans `gameCardIndex`.)

2. **The Tabletop stores both per seat** (on `PlayerArea` in
   `apps/tabletop/src/server/rooms.ts`), never composes URLs, and needs zero
   Shuffler-related config. In-memory is fine: `seat.joined` replay on
   start/restart re-establishes the mapping after a Tabletop redeploy.

3. **`eventsUrl` is a generic event inbox, not a card-return endpoint.**
   `contracts/`-enveloped events, dispatched on `name`, unknown name/version
   rejected loudly — "the Shuffler needs to hear about events that it cares
   about" (Jess). Today it hears exactly one kind, named by
   [the vocabulary ticket](02-event-vocabulary.md). **The table name is the key**
   — the Spine-minted `tableId` UUID doesn't exist yet, and the return channel
   doesn't pretend otherwise. Later, "the Tabletop talks to the Spine instead" =
   the seating flow hands out a different `eventsUrl`; the Tabletop doesn't change.

4. **Send-then-commit, mirrored.** The card's shape is not deleted from the table
   until the Shuffler confirms delivery (2xx). No 2xx, no poof; on failure the
   card visibly stays. (How refusal *looks* is the portal-gesture prototype's
   territory.) This mirrors `sendCardToTableFirst` in the other direction.

5. **No guard on the inbox.** No logins exist anywhere in this app; everything is
   mess-with-able, and the return channel is no exception. (A capability-URL
   option was considered and rejected.)

6. **The library link is the same mapping**: the furniture's link target is
   `gameUrl`. (Note: the `url:""` lives in `apps/tabletop/src/server/tableFurniture.ts`
   on the stock-image inset — the ticket's `src/client/shapes/` path was stale —
   and the library box itself is an `mtg-zone` whose props are a closed validated
   set; making the *zone* clickable means a schema change moved in lockstep
   client+server.)

Facts the next tickets will want (from the research pass):
- The Shuffler has **no inbound path addressed by `instanceId`** today; the only
  reveal endpoint (`POST /reveal-card/:gameId/:gameCardIndex`,
  `apps/shuffler/src/app.ts:1157`) uses the banned `gameCardIndex`. The inbox
  handler must map `card.instanceId → GameCard` itself.
- Live wire vocabulary has already diverged from `contracts/payloads/`
  (`seat.joined` vs `seat.taken`; initiator object vs string; envelope requires a
  Spine `tableId` nobody has). Ticket 02 should reconcile deliberately, not mint
  a third dialect.
- TS-side contract validation is unimplemented on every receiver (hand-rolled
  checks with a "JES-128: contract validation goes here" TODO in
  `apps/tabletop/src/server/cardArrival.ts:44`); the new inbox will be the third
  hand-rolled receiver unless ticket 02 decides otherwise.
