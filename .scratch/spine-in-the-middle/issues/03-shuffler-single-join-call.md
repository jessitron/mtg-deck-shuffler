# 03 — Shuffler: one join call replaces the two direct calls

Mountain: spine-gathers-data
Ship: shuffler
Status: resolved

**What to build:** The Shuffler stops making two independent best-effort calls (a thin
`joinSpineTableBestEffort` to the Spine, a separate rich `seat.joined` POST straight to
the Tabletop) and makes one call to the Spine's `/join` (built in ticket 02) carrying
everything: identity plus deck name, playmat, card back, sleeve color, commanders, and
the Shuffler's own `gameUrl`. The Tabletop gets notified by the Spine itself, not by the
Shuffler.

This is the slice that actually fixes "the anemic log": after this ticket, a real
shuffle-up puts the full decoration on the Spine's own log, not just the Tabletop. The
swap happens atomically across all three call sites in this one ticket — there is no
in-between state where some call sites use the old flow and some use the new one, so
the game keeps working throughout. Still synchronous/awaited at this point (the join
call is awaited before `/game` redirects, same as today) — decoupling that is ticket 04.

**Blocked by:** 02 — needs the Spine's new `/join` request/response shape to call against

- [x] New single function in `apps/shuffler/src/port-spine/` replaces
      `joinSpineTableBestEffort` (from `sendToSpine.ts`) and
      `sendSeatJoinedBestEffort` (from `port-tabletop/sendToTable.ts`), building one
      request with `gameId`, `name`, `playerName`, `deckName`, `playmatImageUrl`,
      `cardBackImageUrl`, `sleeveColor`, `commanders`, `gameUrl`
- [x] `SeatJoinedPayload`/`buildSeatJoinedEvent` move from
      `apps/shuffler/src/port-tabletop/types.ts` into `port-spine/`, gaining `gameUrl`
- [x] All three call sites in `app.ts` (`/start-game`, `/restart-game`, `/yo`) switch to
      the new single call
- [x] `TabletopPort.sendSeatJoined` and its implementations (`HttpTabletopGateway`,
      `FakeTabletopGateway`) are deleted; `TabletopPort` keeps only `sendCardToTable`
- [x] The Shuffler stores the Spine's returned `tableUrl` instead of constructing the
      Tabletop link itself, if it does so today
- [x] Extend the existing `FakeSpineGateway` (`apps/shuffler/src/port-spine/` test
      doubles) to accept and record the richer request
- [x] Jest test on `/start-game` (or wherever the call site lives) asserting exactly one
      Spine call carries all the decoration fields, and a grep-level check that nothing
      calls the deleted `HttpTabletopGateway.sendSeatJoined`
- [x] `npm test` passes
