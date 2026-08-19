# 08 — Log gameId↔seatId correlation at seat mint (tracing only)

Mountain: spine-gathers-data
Ship: spine
Status: ready-for-agent

**What to build:** The Shuffler already sends its `gameId` in the `/join` request body
today (`services/spine/app.rb:114`, `apps/shuffler/src/port-spine/sendToSpine.ts:47`) —
the spec's "send gameId to the Spine at join" is already true in the code. What's missing
is the Spine actually *using* it for tracing: log the correlation between the incoming
`gameId` and the seatId it mints, as a span attribute in `Table#prepare_seat`/
`Table.join!` (`services/spine/models/table.rb`), so a trace spanning both ships is easier
to follow. This is diagnostic/tracing only — `gameId` is not persisted to any model column
and is not part of `initiator` on the wire (that's ticket 04's `sessionId`).

Consult the `fleet-is-observable` owner before implementing — this touches span attribute
conventions.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `Table#prepare_seat`/`Table.join!` records a span attribute correlating the incoming
      `gameId` with the seatId just minted
- [ ] No new persisted column; this is span-attribute-only
- [ ] `fleet-is-observable` owner consulted on the attribute naming/placement before
      implementing

## Comments
