# Incident: Spine CrashLoopBackOff, player areas not appearing (2026-08-26)

## Symptom

Jess reported the Tabletop "isn't doing anything" in production: a table loads,
the Spine's `table.created` event is the only thing in its log, tldraw's menus
render, but no player areas appear even after Shuffle Up.

## Root cause

**The Spine's SSE stream handler never releases its Puma thread on shutdown,
so any transient liveness/readiness hiccup escalates into a hard `SIGKILL`,
and the resulting reconnect storm keeps the pod unhealthy — a self-sustaining
crash loop.**

- `lib/sse_stream.rb`'s `SseStream#each` is `loop do @queue.pop(timeout: 15) ... end`
  — it only exits when something calls `.close` on it, i.e. only when the
  *client* disconnects. It never exits on its own.
- Puma's graceful shutdown waits for in-flight requests/responses to finish
  naturally. A held-open SSE stream never finishes, so once Kubernetes sends
  `SIGTERM` (from any liveness/readiness blip), Puma sits in "Gracefully
  stopping, waiting for requests to finish" forever.
- `terminationGracePeriodSeconds` expires, Kubernetes `SIGKILL`s the container
  (`kubectl describe pod` showed exit code 137, `Reason: Error` — not
  `OOMKilled`, well within the 512Mi limit).
- The Tabletop's `spineSubscriber.ts` immediately retries its SSE subscription
  against the now-dead pod, producing a burst of `ECONNREFUSED` — 748 of them
  in the ~2h window inspected, against `spine-service`'s ClusterIP
  (`10.100.71.227`, matching the crashing pod's IP `192.168.26.162`).
- The new pod comes up, streams reopen, and the next probe hiccup repeats the
  cycle. `kubectl describe pod spine-<hash>` showed 470 readiness failures
  over 2d16h, escalating to full `CrashLoopBackOff` in roughly the final hour
  before this was noticed.

This is a Spine bug, not a Tabletop one. The Tabletop's `ECONNREFUSED` spam and
the missing player areas are downstream symptoms of the Spine being
unavailable at the moment those requests land — not evidence of anything
wrong in the Tabletop's own event handling. In the same window, `seat.joined`
POSTs that did land while the Spine was briefly up succeeded and correctly
produced `add player furniture` spans on the Tabletop, confirming the
seat-join → furniture-draw path itself is fine.

## Evidence trail (Honeycomb, `mtg-deck-shuffler` env)

- `mtg-tabletop` dataset: 815 `exception` spans in 2h, 748 of them
  `exception.type: ECONNREFUSED` against `spine-service:80`, 59
  `UND_ERR_SOCKET` ("other side closed"), 8 `UND_ERR_CONNECT_TIMEOUT`.
- `mtg-spine` dataset: zero spans in the 10 minutes immediately preceding the
  investigation — the Spine wasn't serving anything at that moment.
- `mtg-tabletop`'s `add player furniture` span (4 samples in 2h) confirmed
  `seat.joined` events that did arrive were applied correctly (tables
  elf2/elf3/elf5).
- `kubectl get pods -n default`: `spine-f68c656fd-kcrxl` in `CrashLoopBackOff`,
  11 restarts in ~55 minutes.
- `kubectl describe pod`: `Last State: Terminated, Reason: Error, Exit Code:
  137`; `Warning Unhealthy ... Readiness probe failed: context deadline
  exceeded`, `Warning Unhealthy (x470 over 2d16h)`.
- Current container's own log (mid-investigation) ended on `"- Gracefully
  stopping, waiting for requests to finish"` — caught in the act of hanging
  on shutdown.
- One live SSE subscription (`elf2-65348fa2`) was open at the time, confirming
  the mechanism is live, not just theoretical.

## What wasn't the cause

- Not OOM — `Reason: Error`, not `OOMKilled`, well under the 512Mi limit.
- Not a `/spine/up` route problem — it does no DB work, just returns `"ok"`;
  the route itself can't be what's slow.
- Not corrupted or missing `seat.joined` delivery — the events that did land
  were applied correctly.

## Fix implemented

`config/puma.rb` (new) registers an `after_stopped` hook. Despite the name,
Puma fires this right when graceful shutdown *starts* — `Launcher#do_graceful_stop`
calls `@events.fire_after_stopped!` before `@runner.stop_blocked`, so it's the
right moment to close every stream before Puma starts waiting. The hook pushes
`SseStream::CLOSE` through a new `TableBroadcaster#close_all`, which reaches
every subscriber on every table (not just one), unblocking each `SseStream#each`
loop so its response finishes and Puma's graceful wait has nothing left to wait
for.

**Gotcha, caught by manually sending SIGTERM to a running Puma before trusting
this:** the hook body runs *inside Ruby's SIGTERM signal trap itself* —
`Launcher#setup_signals` traps `SIGTERM` directly to `do_graceful_stop`, not on
a separate thread. Ruby forbids `Mutex#synchronize` from trap context
(`ThreadError: can't be called from trap context`), and `close_all` needs one
to read `@subscribers` safely — calling it directly crashed Puma outright
instead of shutting down cleanly. The fix wraps the call in `Thread.new`, which
*is* permitted from trap context; the spawned thread runs outside the trap and
can take the mutex normally. Unit tests alone would not have caught this — the
crash only happens when Puma's own SIGTERM trap actually invokes the hook — so
this was verified by starting a real `bundle exec puma -C config/puma.rb`,
opening an SSE stream, sending `SIGTERM`, and confirming both a clean exit and
a clean log (no trap-context exception).

Both `run` (local) and `Dockerfile`'s `CMD` (prod) now pass `-C config/puma.rb`
to `bundle exec puma`.

## Status

Fixed, verified locally (unit tests + manual SIGTERM against a running
instance). Not yet deployed to prod — run `./deploy.sh` when ready.
