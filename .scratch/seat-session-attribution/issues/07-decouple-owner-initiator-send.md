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

- [x] `buildCardPlayedEvent` takes `owner` as an explicit parameter, not derived from
      `initiator.seatId`
- [x] `sendCardPlayedToSpineBestEffort` passes `owner === initiator.seatId`, preserving
      today's observable value exactly
- [x] `apps/shuffler/test/port-spine/sendToSpine.test.ts` (the file `544c932b` added
      assertions to) gets a case passing a different `owner` than `initiator.seatId` into
      `buildCardPlayedEvent`, asserting the payload's `owner` reflects the explicit value —
      proving the decoupling actually decoupled, not just renamed a parameter

## Comments

`buildCardPlayedEvent`'s signature is now `(gameCard, instanceId, initiator, owner, zoneHint,
tableName)` — `owner` inserted as its own parameter right after `initiator`, no longer read off
`initiator.seatId` inside the function body. `sendCardPlayedToSpineBestEffort` passes
`game.seatId` for both, preserving today's exact observable value. Added a case to
`sendToSpine.test.ts` calling `buildCardPlayedEvent` directly with a different `owner` than
`initiator.seatId`, asserting `payload.owner` reflects the explicit value while
`event.initiator.seatId` stays the initiator's — confirmed it failed to compile before the
signature change (TS2554, expected 5 args got 6), then passed after. Updated the other two
existing call sites (`cardPlayedEvent.test.ts`, `cardPlayedContract.test.ts`) to pass
`initiator.seatId` explicitly as `owner`, unchanged behavior. Full shuffler suite green (364
tests, including `cardPlayedContract.test.ts`). two-faced-cards owner consulted before
(cleared — no face/image field touched) and updated after (its `interactions.md` watch point 21
no longer describes the old coupled signature).
