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

- [x] `contracts/envelope.v1.json`'s `initiator` schema has an optional `sessionId`
      property with a description matching `CONTEXT-MAP.md`'s "Initiator" table
- [x] Shuffler's `Initiator` type (`port-tabletop/types.ts`) gains `sessionId`
- [x] Shuffler mints a fresh `sessionId` on every page load and includes it in `initiator`
      on every envelope it sends
- [x] Contract-level test (mirroring `apps/shuffler/test/port-spine/
      cardPlayedContract.test.ts`'s pattern) proves an event with `sessionId` validates
- [x] Spine's `lib/event_contract.rb` test coverage extended for the new field, proving no
      silent regression on either accepting or rejecting the new shape

## Comments

Implemented 2026-08-19. `contracts/envelope.v1.json`'s `initiator.sessionId` is optional,
matching `seatId`'s optionality, with a description summarizing CONTEXT-MAP.md's per-context
"Initiator" table (Shuffler mints fresh per page load, Tabletop must persist across a refresh,
Spine only passes it through).

Shuffler wiring: a new client script `apps/shuffler/public/session-id.js` mints
`window.sessionId = crypto.randomUUID()` on every page load (no `sessionStorage`, unlike
`browser-tab-id.js`) and sends it as an `X-Session-Id` header on every htmx request, via the
shared page shell (`html-layout.ts`). A new Express middleware in `app.ts` reads that header,
stamps it as a `session.id` span attribute through the existing `CommonAttributes` funnel
(`tracing_util.ts`), and sets `res.locals.sessionId`, threaded through `sendCardBeforeMutate` →
`sendCardPlayedToSpineBestEffort` → `buildCardPlayedEvent`'s `initiator` — so every `card.played`
envelope now carries `initiator.sessionId`.

Tests: new contract-level cases in `apps/shuffler/test/port-spine/cardPlayedContract.test.ts`
(a directly-built event and the real `sendCardPlayedToSpineBestEffort` send path, both carrying
`sessionId`, validated against the updated schema) and four new Minitest cases in
`services/spine/test/models/event_contract_test.rb` covering accept-with-sessionId,
accept-with-both-ids, accept-without-sessionId (still optional), and reject-non-string-sessionId.
Full Shuffler (363), Spine (83), and Tabletop (146) suites green.

Consulted the `fleet-is-observable` owner before and after: `session.id` goes through
`CommonAttributes`/`setCommonSpanAttributes`, not a one-off `setAttribute` like `seat.id` — it's
present on essentially every request (like `browserTabId`), not only at a join call site. KB
updated (`owners/fleet-is-observable/README.md`, `interactions.md`).

`gameId` still doesn't travel on the wire as part of `initiator` — that's ticket 08, unchanged
here.
