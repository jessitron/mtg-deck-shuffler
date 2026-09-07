# Straightening out `port-spine` layering (apps/shuffler)

## The problem

`apps/shuffler/src/port-spine/` violates `notes/PATTERN-port-adapter-gateway.md` three ways:

1. **No adapter layer.** `HttpSpineGateway implements SpinePort` and
   `HttpSpineConnection implements SpineConnectionPort` — the gateway *is* the adapter, so
   there is nothing doing translation, and the ports speak transport (HTTP bodies, SSE
   frames, `Last-Event-ID`, `tableUrl`).
2. **The dependency arrow points both ways.** `app.ts` imports `port-spine`, and
   `port-spine` imports `GameState`, `apply-game-command`, `GameEvents`, `table-look`,
   and `view/common/shared-components`. A port directory reaching into the view layer.
3. **Application code lives in the port directory** — `sendToSpine.ts`,
   `cardReturnedDispatch.ts`, `gameSubscriptionRegistry.ts`.

## Decisions already made (by Jess)

- **Keep the name `port-spine`.** The Spine is our own service, not an external vendor;
  vendor-neutral naming is not the goal here. Do NOT rename to `port-table`.
- **`EventEnvelope` may stay in the port.** The event envelope is the fleet's *published
  contract* (`contracts/`) — shared language between ships, not a foreign vocabulary.
  What must not leak past the port is **transport**: HTTP status codes, `tableUrl`,
  `Last-Event-ID`, SSE frame parsing, `seq`-as-reconnect-cursor.
- Smaller steps preferred; commit at each step.

## The ladder (strictly ordered — each step depends on the one before)

### Step 1 — Evict the application code (pure file moves, no interface changes)

Create `apps/shuffler/src/table-sync/` — the Shuffler's synchronization with its table —
and move, unchanged except for import paths:

- `port-spine/gameSubscriptionRegistry.ts` → `table-sync/gameSubscriptionRegistry.ts`
- `port-spine/cardReturnedDispatch.ts` → `table-sync/cardReturnedDispatch.ts`
- `port-spine/sendToSpine.ts` → `table-sync/sendToSpine.ts`

Move the matching tests alongside (`test/port-spine/` → `test/table-sync/` for
`gameSubscriptionRegistry.test.ts`, `browserStreams.test.ts`, `sendToSpine.test.ts`, and the
card*Contract tests that exercise `sendToSpine`).

**Done when:** `port-spine/` no longer imports `GameState`, `apply-game-command`,
`GameEvents`, `table-look`, `types.js`, or `view/`. Verify with grep. All tests green.

### Step 2 — Split the two ports and break up `types.ts`

`port-spine/` currently holds two unrelated ports. Give each its own home:

- `port-spine/outbound/` — `SpinePort` (join, sendEvent), `HttpSpineGateway`, `FakeSpineGateway`
- `port-spine/inbound/` — `SpineConnectionPort`, `HttpSpineConnection`, `FakeSpineConnection`,
  `spineSubscriber.ts`, `incomingEventValidation.ts`

`types.ts` currently mixes three things — split them:
- wire/port shapes (`SpineJoinRequest`, `SpineJoinResult`, `SpinePort`) → stay in the port
- domain builders (`buildSeatJoinedPayload`, `buildSeatJoinedCommander`, `SeatJoinedPayload`,
  `SeatJoinedCommander`) → these are *translation*; they become adapter material in step 3, so
  park them where step 3 wants them
- env reading (`shufflerPublicUrl`, `cardBackImageUrl`, `defaultPlaymatImageUrl`,
  `playmatImageUrlFromPath`) → these are Shuffler-side facts about our own public URLs, not
  Spine facts. They belong outside the port (`src/` proper or `table-sync/`).

**Done when:** every import still resolves, tests green, and no file in `port-spine/` mixes
port, adapter, and gateway concerns.

### Step 3 — Insert the outbound adapter

- `SpinePort` becomes domain-language: `seatGame(...)`, `announce(...)` (or similar) in
  Shuffler terms. `EventEnvelope` is allowed; `tableUrl` and HTTP shapes are not.
- New `SpineAdapter implements SpinePort` — owns the join-payload builders and the
  domain-to-wire translation.
- `HttpSpineGateway` shrinks to a thin, domain-ignorant `POST /join` +
  `POST /tables/:id/events`, wrapping fetch errors in our own error type.
- `FakeSpineGateway` -> `FakeSpineAdapter`: it implements seat-allocation *policy* (table
  reuse, seat numbering, the 4-seat cap, gameId idempotence), which is adapter behavior, never
  gateway behavior. It should implement the port, not the gateway interface.

### Step 4 — Insert the inbound adapter

- `spineSubscriber.ts` (reconnect, backoff, `lastAppliedSeq` cursor) becomes
  `SpineEventsAdapter` and *implements* the inbound port.
- `HttpSpineConnection` -> `SpineSseGateway`: thin, hands up parsed frames, owns the undici
  dispatcher/timeouts and the `data: <json>\n\n` parsing.
- The port stops mentioning `onOpen`/`onDrop`/`onEnd`/`Last-Event-ID`/frames — it should
  express "give me the events at this table, from where I left off."
- `FakeSpineConnection` stays a gateway-level double (it fakes the *transport*), which is
  fine and correct; name it accordingly.

## Constraints for every step

- Tests must be green after each step: `cd apps/shuffler && npm test` (baseline: 53 suites,
  422 tests).
- `npx tsc --noEmit` must pass.
- Commit after each step, tagged `- claude`.
- Telemetry behavior must not change: the same spans, same attributes, same `traceparent`
  extraction, same logs. Files may move; signals may not.
- Delete newly-unused code as you go (repo standard).
- Read `notes/PATTERN-port-adapter-gateway.md` and
  `apps/shuffler/notes/DESIGN-layering.md` first.

## Hard constraints from the fleet-is-observable owner review

These are non-negotiable; "keep span names identical" is NOT sufficient on its own.

1. **Whoever calls `startActiveSpan` must `await` the entire handling inside its callback.**
   Today the CONSUMER span wraps validation, `applyGameCommand`, and every auto-instrumented
   child. If an adapter opens the span and hands the frame onward via a callback that resolves
   after the callback returns, the nested spans detach into a separate trace — same names, same
   attributes, wrong parents. `propagation.extract` alone IS safe to split out (an OTel
   `Context` is an immutable value); starting the span away from the work is not.

2. **`card_return.outcome` must keep landing on the OUTER (CONSUMER) span.** In
   `cardReturnedDispatch.ts` it is written through a closure over `span` from *inside* the
   inner span's callback, while `markCurrentSpanAsError` deliberately targets the inner
   active span. Two different spans, on purpose. Do NOT replace the closure with
   `trace.getActiveSpan()` — the attribute would silently relocate to the inner span and
   every existing query on `sse subscription: card.returned` would go empty.

3. **One undici `Agent` per subscription, not per connect attempt.** Today
   `createHeartbeatAwareDispatcher()` is a constructor default, so one `HttpSpineConnection`
   (created once by `subscribeToSpine`) holds one connection pool across every reconnect. If
   `SpineSseGateway` becomes a per-attempt object, a Spine outage mints a fresh `Agent` per
   retry — a socket leak. Keep the gateway instance alive across reconnects.

4. **`cardReturnedDispatch.ts` is deliberately `recordException`-free** — failures go through
   `markCurrentSpanAsError` + `log.error`. Preserve that; do not "improve" it.

5. **If a second class needs a tracer, export a named constant** rather than hand-typing
   `"mtg-deck-shuffler"` twice (repo coding standard on shared literals). There is exactly one
   such literal today.

6. **Carry the rationale comments with the code.** The heartbeat/timeout comment block in
   `HttpSpineConnection.ts` and the trace-continuation docblock on `dispatchSpineEventForGame`
   are the only record of that reasoning.

7. **Do NOT change `SPINE_URL`'s module-load freeze** (`HttpSpineConnection.ts:5`). The owner
   flagged it as worth converting to a call-time default, but that is a behavior change and
   needs Jess's explicit nod — it does not ride along on this refactor.

## After the last step

- Run `/fleet-is-observable-update` with the new paths and class names — the owner KB names
  `port-spine/cardReturnedDispatch.ts`, `spineSubscriber.ts`, and `gameSubscriptionRegistry.ts`
  by exact path in at least five places, and they all go stale here.
- Update `apps/shuffler/notes/DESIGN-layering.md` — it currently cites only
  `port-deck-retrieval` as the worked example.

## Open design question, surfaced by step 1 — decide in step 4

`table-sync/cardReturnedDispatch.ts` imports `extractSeq` from `port-spine/spineSubscriber.ts`,
and `dispatchSpineEventForGame` reads the `seq` off each event to return it as the high-water
mark. But `seq`-as-reconnect-cursor is exactly the transport detail this plan says must not
leak past the port. The application layer is currently doing the port's bookkeeping.

Step 4 must decide this deliberately, not rename around it. Sketch of the shape that resolves
it: the inbound port's contract becomes "call me with each event; tell me when you've durably
applied it" — a plain ack — and the *adapter* owns translating that ack into a `seq` cursor by
remembering which `seq` each delivered event carried. Then `extractSeq` never leaves the
adapter, and `cardReturnedDispatch` returns something like `applied: true/false` instead of a
number it had to dig out of the envelope.

Check this against the real call sites before committing to it; `gameSubscriptionRegistry`'s
`highestSpineSeq(persistedEvents)` seed reads `spineSeq` off the *game's own event log*, which
is durable Shuffler state, so `spineSeq` may legitimately be domain data rather than pure
transport. Resolve that tension explicitly.

## DECISION (Jess, mid-step-3): split by capability, not by direction

`port-spine/outbound/` and `port-spine/inbound/` are REPLACED by:

- **`port-spine/join/`** — table administration. Seat a game at a table, get a seat back.
  One request/response call. Holds the join port, `SpineJoinAdapter`, the join gateway, and
  the seat-decoration builders.
- **`port-spine/events/`** — the event bus, **ONE port covering BOTH directions**:
  `SpineEventsPort` can send an event to the table AND subscribe to events from the table.
  Holds that one port, its adapter, and its gateway(s).

Rationale: "inbound/outbound" splits by direction, which is a transport fact. Every other
port in this ship (`port-deck-retrieval`, `port-card-repository`, `port-persist-state`) is
named for a **capability**. Joining a table and exchanging events are two capabilities that
merely happen to share an HTTP host.

Consequence: today's `SpinePort` (join + sendEvent) is split. `join` goes to the join port;
`sendEvent` becomes the send half of `SpineEventsPort`, whose receive half is today's
`SpineConnectionPort` + `spineSubscriber`. One port, two directions, one adapter.

## Principle (Jess): carry an identifier you didn't mint; don't learn to construct it

`tableUrl` stays on `SeatAtTable` in the join port, and that is deliberate. It looks like
transport vocabulary surviving in a port, but it isn't: the Spine *mints* the table's URL, and
the Shuffler persists it and renders it as the "Go to Table" link.

The reason to keep it is not convenience — it's that absorbing it into the adapter would force
the Shuffler to **reconstruct** the URL, which means learning the Spine's URL scheme. That
duplicates knowledge that belongs to another service, and it silently breaks the day the Spine
changes its routes.

The general rule: when another service mints an identifier, address, or URL, **carry the value
through**. Do not teach this ship how to build it. A port hiding such a value is doing harm,
not encapsulation — the leak to avoid is the *construction rule*, not the string.
