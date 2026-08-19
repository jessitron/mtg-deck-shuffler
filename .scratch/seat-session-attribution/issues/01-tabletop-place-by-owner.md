# 01 — Tabletop: place cards by `payload.owner`, not `initiator.seatId`

Mountain: spine-gathers-data
Ship: tabletop
Status: ready-for-agent

**What to build:** `apps/tabletop/src/server/cardArrival.ts` currently resolves which
`PlayerArea` a played card lands in from `envelope.initiator.seatId` (line 47, used at
line 83 as `entry.seats.get(seatId)`), even though `payload.owner` — a field that already
exists on `card.played` for exactly this purpose — sits unused for placement (it's only
carried through onto the shape as a prop, and later read by
`apps/tabletop/src/client/shapes/zoneHitTest.ts:48` for a commander-drop permission
check, not placement). This is the gap the spec's "Owner vs Initiator" decision missed:
decoupling `owner` from `initiator` on the Shuffler's send side (ticket 07) has no
observable effect until the Tabletop actually reads `owner` to place the card. Land this
first — it's a prerequisite for that decoupling to mean anything.

Change `cardArrival.ts` to resolve `playerArea` from `payload.owner` instead of
`envelope.initiator.seatId`. Every current sender sets `owner === initiator.seatId`
(spec user story 12), so this is a no-observable-behavior-change today — a domain-alignment
fix, not a feature change yet.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `cardArrival.ts` resolves the target `PlayerArea` from `payload.owner`, not
      `envelope.initiator.seatId`
- [ ] `zoneHitTest.ts`'s existing commander-drop check (`card.props.owner === seatId`) is
      unaffected — it already reads `owner`
- [ ] Existing card-arrival tests/verification still pass with owner-based lookup, with no
      change in placement for any existing call site
- [ ] A new test constructs a `card.played` fixture where `payload.owner` differs from
      `envelope.initiator.seatId` (not a real production shape, just a test fixture) and
      asserts the card lands in the *owner's* `PlayerArea` — proving placement is actually
      driven by `owner`, not `initiator`

## Comments
