# No shutdown hook: the last OTel batch is dropped on every SIGTERM

Mountain: overhead
Status: resolved
Type: task
Map: ../map.md

> _Triaged from a loose `TODO.md` capture (`no-ship-flushes-on-sigterm`), found while charting
> `../map.md`. `fleet-is-observable-context` consulted 2026-08-07; verdict below is theirs._

## The problem

`apps/shuffler/src/tracing.ts` calls `sdk.start()` and registers no shutdown hook. Node's
default behavior on SIGTERM with no handler installed is to terminate immediately — so up to
`scheduledDelayMillis` (BatchSpanProcessor default 5s) of the last span/log batch is dropped:

- **Every `./verify.sh` run** — `cleanup()` sends SIGTERM to the server it started.
- **Every k8s pod termination in prod** — same signal, same hole.

Consequence worth carrying forward: the ~48s app-side figure elsewhere on this map is a floor,
not a measurement, until this is fixed.

## Why this isn't a one-line fix (read before implementing)

The owner flagged three traps that make a naive handler wrong in exactly the way this KB is
already full of — silently-wrong-only-in-the-failure-case:

1. **Installing `process.on("SIGTERM", ...)` changes Node's default behavior.** With no
   handler, SIGTERM terminates the process on its own. Once a handler exists, Node no longer
   exits by itself — the handler must call `process.exit(code)` after `sdk.shutdown()`
   resolves, or the process hangs on every SIGTERM forever. This is the easiest way to get this
   backwards.
2. **`sdk.shutdown()` can hang or reject.** The owner's KB already documents that a
   synchronously-throwing exporter leaves `BatchSpanProcessor`'s flush timer armed forever and
   `provider.shutdown()` rejects when the exporter throws. An unbounded `await sdk.shutdown()`
   can outlast a k8s termination grace period and get SIGKILLed instead of exiting clean. Use a
   bounded-timeout guard — the `bounded()` helper in
   `apps/shuffler/test/harness-telemetry/harnessTracing.ts:75-86` is the exact shape already in
   this codebase (`Promise.race` against an `unref()`'d timer); copy the pattern, not necessarily
   the code.
3. **Idempotency.** Both SIGTERM and SIGINT should trigger shutdown, but only once — guard
   against double-fire.

## Acceptance criteria

- A signal handler for SIGTERM and SIGINT in `apps/shuffler/src/tracing.ts` that:
  - calls `sdk.shutdown()` (or `forceFlush()` then `shutdown()`) bounded by a timeout so a hung
    exporter cannot outlast it,
  - explicitly calls `process.exit(...)` once the bounded wait settles (success or timeout) —
    the process must still exit; just later, and cleanly,
  - fires exactly once even if both signals arrive.
- No change to `apps/shuffler/verify.sh` needed — its existing `kill`/`wait` cleanup already
  tolerates a slower-to-exit process.
- Verify manually: start the server, send SIGTERM, confirm it exits (not hangs) and that a span
  emitted just before the signal still reaches Honeycomb (env `local`).

## Owners consulted

`fleet-is-observable-context`, 2026-08-07 — verdict: ready-for-agent, conditional on the three
traps above being named in the fix, not left as "add a handler that calls `sdk.shutdown()`".

`-review` before landing flagged two gaps in the first draft, both closed before landing:
1. Drain failures/timeouts were swallowed with no record at all — added `onDrainError` and
   `onTimeout` callbacks to the handler so `tracing.ts` can `log.warn` them (there's no live
   span to hang it on by then, per this owner's own logging guidance).
2. The manual verification hadn't actually exercised telemetry (no `.be` sourced, so drain was
   a no-op) — redone with `.be`/`.env` sourced; see Answer below.

## Answer

Landed:
- `apps/shuffler/src/shutdownHooks.ts` — `installShutdownHandlers(drain, options)`. Listens for
  SIGTERM/SIGINT, races `drain()` against an `unref()`'d timeout (default 5000ms), calls an
  injectable `exit` (default `process.exit`) exactly once no matter which signal(s) fire or
  whether `drain()` resolves, rejects, or hangs. `onTimeout`/`onDrainError` callbacks let the
  caller log without this file needing to know about `log.ts`.
- `apps/shuffler/src/tracing.ts` — calls `installShutdownHandlers(() => sdk.shutdown(), {
  onTimeout, onDrainError })` right after `sdk.start()`, wiring both callbacks to `log.warn`.
- `apps/shuffler/test/shutdownHooks.test.ts` — 5 unit tests using a real `EventEmitter` as a
  fake signal source (no mocks): happy path, hung drain (exits anyway, reports timeout),
  rejecting drain (exits anyway, reports the error), double-signal idempotency, SIGINT.

Verified:
- Full jest suite (269 tests, all passing) plus the 5 new ones.
- Manual: built `dist/`, ran the real server with `.be` then `.env` sourced (this repo's real
  sourcing order), `curl`'d `/` to emit a span, sent SIGTERM ~6s later, confirmed via
  `mcp__honeycomb-modernity__run_query` (team `modernity`, env `local`, dataset
  `mtg-deck-shuffler`) that both the `GET /` and `request handler - /` spans for that exact
  request (matching PID) landed in Honeycomb — the actual regression this ticket fixes,
  end to end, not just "the process didn't hang."
- Separately confirmed the process exits promptly on SIGTERM (not hung, not force-killed):
  `kill -TERM` on the server PID, process exited with code 0 within ~1s.
