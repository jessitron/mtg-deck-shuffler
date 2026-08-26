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

## Suggested fix (not yet implemented)

Make the Spine actually close open SSE streams when it receives a shutdown
signal, e.g. a shutdown hook in `app.rb` that pushes `SseStream::CLOSE`
through `Spine.broadcaster` to every open subscriber so Puma's graceful
shutdown can actually complete before the grace period expires. Shortening
`terminationGracePeriodSeconds` alone would only paper over the hang, not fix
it.

## Status

Diagnosed, not yet fixed. Jess to decide whether to implement the shutdown
hook now or later.
