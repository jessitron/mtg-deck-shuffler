# Plan — ticket 03: Shuffler's Spine subscriber + registry

## New files (apps/shuffler/src/port-spine/)

1. **`spineSubscriber.ts`** — hand-rolled SSE client, a near-verbatim port of
   `apps/tabletop/src/server/spineSubscriber.ts`: streamed `fetch` against
   `${baseUrl}/tables/:tableId/events/stream`, parses `data: <json>\n\n` frames,
   reconnects with backoff (250ms → 5s cap), no catch-up. Same
   `createHeartbeatAwareDispatcher()` (`undici.Agent`, `headersTimeout: 5_000`,
   `bodyTimeout: 45_000`). `SPINE_URL` env, default `http://localhost:4600`
   (matches the Shuffler's existing default in `sendToSpine.ts`).
   **New dependency**: `undici: "^7.29.0"` added to `apps/shuffler/package.json`
   — pinned major version 7 to match Node's vendored undici
   (`process.versions.undici` = 7.21.0 here) and the Tabletop's own pin
   (fleet-is-observable confirmed this is a real landmine, not hypothetical:
   undici 8 breaks every `fetch()` call process-wide if it drifts from what
   Node vendors internally).

2. **`incomingEventValidation.ts`** — production ajv validator for envelopes
   arriving over the subscription, mirroring the Tabletop's
   `src/server/contractValidation.ts` (envelope.v1.json + card.returned.v1.json
   compiled once, `validateIncomingEvent<Payload>(body, expectedName)`).
   `CONTRACTS_ROOT` computed the same way (`__dirname` + 4×`".."` + `"contracts"`
   — same depth as the Tabletop's `src/server/` → dist/server/, since this file
   also sits one level under `src/`).

3. **`gameSubscriptionRegistry.ts`** — in-memory `Map<string, GameSubscriptionEntry>`
   keyed by `String(gameId)`. `GameSubscriptionEntry { gameId, spineTableId,
   subscription, seenEventIds: Set<string> }`. `ensureGameSpineSubscription(gameId,
   spineTableId, deps)` is idempotent: no-ops if an entry already exists for that
   `gameId`, otherwise opens a subscription and registers it. No teardown here —
   ticket 04's job. No span/log on the idempotent-open check itself (nothing to
   learn from it, per fleet-is-observable).

4. **`cardReturnedDispatch.ts`** — `dispatchSpineEventForGame(gameId, seenEventIds,
   deps, event)`:
   - Envelope-shape guard (has `.name`), same as Tabletop's `isEnvelopeLike`.
   - Extract `traceparent` → `propagation.extract(ROOT_CONTEXT, {traceparent})`,
     fall back to `ROOT_CONTEXT`.
   - `context.with(parentContext, () => tracer.startActiveSpan("sse subscription:
     ${event.name}", {kind: SpanKind.CONSUMER, attributes: {event.name, event.id,
     table.slug: spineTableId, game.game_id: gameId}}, ...))`. Tracer name
     `"mtg-deck-shuffler"` (matches `OTEL_SERVICE_NAME`) — **the Shuffler's first
     manual span**, per fleet-is-observable (worth an -update afterward).
   - If `event.name !== "card.returned"`: span ends, no further action (span still
     created for every kind, matching the Tabletop precedent of graphability).
   - Validate payload via `incomingEventValidation.ts`. Invalid → `log.warn`, span
     ends (no outcome attribute — validation failure isn't applied/duplicate).
   - Dedup: `seenEventIds.has(envelope.id)` → `span.setAttribute("card_return.outcome",
     "duplicate")`, return (no nested span).
   - Otherwise: nested `SpanKind.INTERNAL` span (e.g. `"move returned card to
     Revealed"`) wraps only the mutation: `applyGameCommand({persistStatePort,
     cardRepository}, gameId, undefined, (game) => game.moveByGameCardIndex(
     envelope.payload.gameCardIndex, "Revealed"))`. `face` is never read from the
     payload (schema blacklists it) — `currentFace` is left untouched by
     `moveByGameCardIndex`/`addToRevealed`, confirmed against `GameState.ts` (no
     face reset outside `newGame`/`mulligan`).
   - On successful `applied` outcome: `seenEventIds.add(envelope.id)`,
     `span.setAttribute("card_return.outcome", "applied")`.
   - On `not-found`/`not-active`/thrown error: `log.error` + `span.recordException`,
     do **not** mark seen (matches Tabletop's precedent — only a successful
     placement is deduped against).

## Wiring (apps/shuffler/src/app.ts)

In `GET /game-section/:gameId`, right after `persistStatePort.retrieve(gameId)`
succeeds: if `persistedGame.spineTableId` is set, call
`ensureGameSpineSubscription(gameId, persistedGame.spineTableId, {persistStatePort,
cardRepository})`. Single idempotent check, no separate code path — covers first
load, HTMX re-fetch, and "came back after a while".

## Tests (apps/shuffler/test/port-spine/)

`spineSubscriber.test.ts` — same fake-SSE-server shape as the Tabletop's
`test/spineSubscriber.test.ts` (node:http, heartbeat frame on connect,
`publish`/`dropConnections`/`connectionCount`), adapted to jest:
1. A `card.returned.v1` frame moves the card into Revealed (assert via
   `GameState.fromPersistedGameState` after retrieve, or a fake
   `PersistStatePort`/`InMemoryPersistStateAdapter` seeded with a game that has
   `spineTableId` set and the target card in Hand/Library).
2. Same event id delivered twice → one move, second delivery's span carries
   `card_return.outcome: duplicate` (assert via re-retrieving state: card moved
   exactly once — outcome attribute itself isn't asserted directly unless an
   in-memory span exporter is wired in the test, in which case assert on it).
3. Reconnect: drop the fake server mid-stream, reopen, publish an event, confirm
   delivery resumes with no replay.
4. Registry idempotency: two `ensureGameSpineSubscription` calls (or two
   `GET /game-section/:gameId` hits) with the same `gameId` → one Spine
   connection opened (assert `fakeServer.connectionsAcceptedCount() === 1` /
   `connectionCount() === 1`, not 2).

Uses `InMemoryPersistStateAdapter` + `InMemoryCardRepositoryAdapter` (no mocks —
fleet convention), a real `GameState` built via existing test generators, with
`spineTableId` stamped on the persisted game before the subscription opens.

## Owner consults done

- `fleet-is-observable-context`: span shape confirmed (CONSUMER top span, INTERNAL
  nested doing-span, tracer name `mtg-deck-shuffler`, undici pin is load-bearing).
- `animations-context`: confirmed safe to call `moveByGameCardIndex` with no
  `browserTabId`/`WhatHappened` outside the HTTP command flow; the "no entrance
  animation" framing matches the existing `from:body` re-fetch precedent exactly.
- `two-faced-cards-context`: confirmed `currentFace` is correctly left untouched;
  no face-related side effect from moving into Revealed.
