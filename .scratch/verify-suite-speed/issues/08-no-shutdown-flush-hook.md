# No shutdown hook: the last OTel batch is dropped on every SIGTERM

Mountain: overhead
Status: ready-for-agent
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
`-review` before landing, `-update` after.
