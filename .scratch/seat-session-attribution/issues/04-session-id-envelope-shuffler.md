# 04 — Add `sessionId` to the envelope; Shuffler mints one per page load

Mountain: spine-gathers-data
Ship: fleet
Status: ready-for-agent

**What to build:** Add an optional `sessionId` property to the envelope's `initiator`
object in `contracts/envelope.v1.json` (alongside the existing `seatId`/`playerName`,
matching `seatId`'s existing optionality), with a `description` documenting its
per-context meaning per `CONTEXT-MAP.md`'s "Initiator" table.

Wire the Shuffler side: `initiator` becomes `{ gameId, seatId, sessionId }`.
`apps/shuffler/src/port-tabletop/types.ts`'s `Initiator` type gains `sessionId`.
`sessionId` is minted fresh on every page load — no client-side persistence needed, since
`gameId` already anchors identity durably. (`gameId` itself still doesn't travel on the
wire as part of `initiator` — that's a separate, minor decision, ticket 08.)

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `contracts/envelope.v1.json`'s `initiator` schema has an optional `sessionId`
      property with a description matching `CONTEXT-MAP.md`'s "Initiator" table
- [ ] Shuffler's `Initiator` type (`port-tabletop/types.ts`) gains `sessionId`
- [ ] Shuffler mints a fresh `sessionId` on every page load and includes it in `initiator`
      on every envelope it sends
- [ ] Contract-level test (mirroring `apps/shuffler/test/port-spine/
      cardPlayedContract.test.ts`'s pattern) proves an event with `sessionId` validates
- [ ] Spine's `lib/event_contract.rb` test coverage extended for the new field, proving no
      silent regression on either accepting or rejecting the new shape

## Comments
