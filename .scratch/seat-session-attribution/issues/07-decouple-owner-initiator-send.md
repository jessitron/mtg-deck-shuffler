# 07 — Decouple `card.played`'s `owner` from `initiator` on the send side

Mountain: spine-gathers-data
Ship: shuffler
Status: ready-for-agent

**What to build:** `buildCardPlayedEvent` (`apps/shuffler/src/port-tabletop/types.ts`)
currently sets `payload.owner = initiator.seatId` unconditionally (line 81), conflating
"who caused the event" with "whose `PlayerArea` the card belongs in." Change its signature
to accept `owner` as an independent parameter rather than deriving it from `initiator`.

The one production call site today, `sendCardPlayedToSpineBestEffort`
(`apps/shuffler/src/port-spine/sendToSpine.ts`), passes `owner === initiator.seatId` —
the same observable value as today, since nothing yet moves a card into someone else's
zone (spec user story 12: this changes the *shape* of attribution, not any currently
observable behavior).

No schema change needed to `contracts/payloads/card.played.v1.json` — `owner` is already
its own field there, independent of the envelope's `initiator`. The bug being fixed is
entirely in how the Shuffler *populates* the payload.

Ticket 01 (Tabletop reads `payload.owner` for placement, not `initiator.seatId`) is what
gives this decoupling an observable effect — this ticket is the send-side half of that
pair.

**Blocked by:** 01 — Tabletop: place cards by `payload.owner`, not `initiator.seatId`.

**Status:** ready-for-agent

- [ ] `buildCardPlayedEvent` takes `owner` as an explicit parameter, not derived from
      `initiator.seatId`
- [ ] `sendCardPlayedToSpineBestEffort` passes `owner === initiator.seatId`, preserving
      today's observable value exactly
- [ ] `apps/shuffler/test/port-spine/sendToSpine.test.ts` (the file `544c932b` added
      assertions to) gets a case passing a different `owner` than `initiator.seatId` into
      `buildCardPlayedEvent`, asserting the payload's `owner` reflects the explicit value —
      proving the decoupling actually decoupled, not just renamed a parameter

## Comments
