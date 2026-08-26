# Analysis: what the SSE shutdown crash-loop points at

Follow-on to `INCIDENT-sse-shutdown-crashloop-2026-08-26.md`. That incident's
particular bug (Puma hanging forever on shutdown because SSE streams never
release their threads) is fixed. This note is about what else the same
mechanism implies for ordinary running — no incident required.

## The fleet has three kinds of long-lived connection

1. **Tabletop server → Spine.** One SSE stream per *room*, opened on the first
   `seat.joined` (`apps/tabletop/src/server/seatJoined.ts`). **Never closed.**
2. **Shuffler server → Spine.** One SSE stream per *game* (i.e. per player),
   opened on `GET /game-section/:gameId` for a table-mode game
   (`ensureGameSpineSubscription`). **Reference-counted and closed** when the
   last browser tab for that game disconnects.
3. **Browser → Shuffler.** Native `EventSource` on `GET /game-events/:gameId`,
   one per open tab. Closed by the browser when the tab closes; the server sees
   `req.on("close")`.

Only #2 has a lifecycle. #1 has none at all, and #3's cleanup depends entirely
on the browser telling us.

## Finding 1 — the Spine can hold about four streams, total

`config/puma.rb` sets no `threads`. Puma 8 on MRI defaults to `max_threads: 5`
(`puma/configuration.rb:157`), and nothing sets `PUMA_MAX_THREADS`/`MAX_THREADS`
in `k8s/configmap.yaml`. **Each open SSE stream occupies one Puma thread for its
entire life** — `SseStream#each` blocks on `@queue.pop`, which is a thread, not
an event loop.

So the Spine's ceiling on *simultaneously held streams* is 5, and at 5 it has
zero threads left for anything else — including `GET /spine/up`.

A single four-player table already reaches that:

| stream | count |
|---|---|
| Tabletop room → Spine | 1 |
| Shuffler game → Spine, one per player | 4 |
| **total** | **5** |

This is almost certainly the real explanation for the incident's
`Readiness probe failed: context deadline exceeded` **×470 over 2d16h**. The
incident note correctly ruled out "the `/spine/up` route itself is slow" — the
route is fine; there was simply no thread free to run it. Thread starvation also
stalls `POST /tables/:id/events`, which is how a game silently stops updating
while the Spine looks alive.

The readiness probe then marks the pod NotReady, which (with `replicas: 1`)
removes the only endpoint from `spine-service`, which produces exactly the
`ECONNREFUSED` storm the incident measured — and the SIGTERM that the shutdown
bug turned into a `SIGKILL`. **Thread exhaustion is the trigger; the shutdown
hang was the amplifier.** Fixing the amplifier stops the crash loop; it does not
raise the ceiling.

### What to do about it

- Set `threads` explicitly in `config/puma.rb` — a stream-holding server should
  size its pool to `expected_streams + headroom_for_normal_requests`, not accept
  a default tuned for short requests. Something like `threads 8, 64` is cheap
  (Ruby threads blocked on a queue cost memory, not CPU) and buys roughly a
  dozen concurrent tables.
- **Bound it anyway.** Whatever the number is, it is finite, and nothing today
  refuses stream #N+1 — it just quietly starves the health probe. Better: cap
  concurrent streams in `TableBroadcaster`, and return `503` past the cap so the
  failure is visible and attributable instead of appearing as a readiness blip.
- Consider giving the probes a route that cannot be starved, or accept that
  "readiness fails" is a *legitimate* signal of stream saturation and alert on it
  as such.

## Finding 2 — the Tabletop leaks a stream per table, forever

`getOrCreateRoom` puts a `RoomEntry` in a module-level `registry` and **nothing
ever removes it**. `onSessionRemoved` logs `room emptied` when the last browser
session leaves and then does nothing else. The `spineSubscription` field's own
comment says this out loud: "opened once … and never explicitly closed … there's
no earlier moment to close it at."

Consequences for ordinary use:

- The count of Tabletop→Spine streams equals **the number of distinct tables
  visited since the last Tabletop restart**, monotonically. It never goes down.
- Each also retains a whole `TLSocketRoom` and its document store, so Tabletop
  memory grows the same way.
- Against Finding 1's ceiling, this means the Spine's threads are consumed by
  *historical* tables, not live ones. A day of demos with several table names is
  enough to wedge the Spine even when nobody is playing.

The Shuffler already demonstrates the fix: `removeBrowserStream` tears the Spine
subscription down when the last tab for a game closes, and
`ensureGameSpineSubscription` is idempotent so the next page load re-opens it.
The Tabletop should do the same on `onSessionRemoved` when
`numSessionsRemaining === 0` — ideally after a grace delay (a refresh empties the
room for a second or two), and re-opening on the next `seat.joined` or socket
connect. That closes the leak *and* makes "how many streams" track "how many
tables are actually being looked at."

## Finding 3 — nothing has a timeout, anywhere

The question "when a game is over, people may or may not close the client tab,
and that may or may not make it back to us" is exactly the right one, and the
answer is that **no layer currently bounds a connection's lifetime**:

- The Spine will hold a stream open indefinitely; its heartbeat is designed to
  *keep* it alive, not to expire it.
- The Tabletop never closes one (Finding 2).
- The Shuffler closes on tab close, but a laptop that sleeps or a tab that
  vanishes without a clean FIN leaves the server-side socket half-open. Node's
  default has no keepalive-driven teardown for this, so `req.on("close")` may
  simply never fire. The Shuffler's own SSE response also **never sends a
  heartbeat** after its initial `: connected` — so there is nothing writing to
  the socket that would discover the peer is gone. This is the one place where a
  periodic write would pay for itself twice: it detects dead tabs *and* keeps
  intermediaries from idling the connection out.
- A table is never "over". There is no `table.ended` concept, so nothing could
  close streams on it even if we wanted to.

Suggested shape (cheapest first):

1. Heartbeat on the Shuffler's browser SSE route, so dead tabs are discovered.
2. Tabletop closes the Spine subscription on room-empty (Finding 2).
3. Spine-side maximum stream age — close any stream after N minutes and let the
   client reconnect. Both subscribers already reconnect with backoff, and both
   already tolerate a dropped stream, so this is nearly free and it converts
   "leaked forever" into "leaked for at most N minutes." It is the one control
   that doesn't depend on any other ship behaving.
4. Longer term: an explicit end-of-table lifecycle.

## Finding 4 — a small unbounded map in the broadcaster

`TableBroadcaster#publish` reads `@subscribers[table_id]` on a
`Hash.new { |h, k| h[k] = [] }`, so *reading* creates a permanent empty-array
entry for every table id ever published to, and `unsubscribe` removes the queue
but never the now-empty array. Tiny compared to the above, but it means the
broadcaster's key set only ever grows. Prune the key when its list empties.

## Finding 5 — we cannot see any of this

`OTEL_METRICS_EXPORTER: "none"` in `k8s/configmap.yaml`; the Spine emits no
metrics at all, and has no logs pipeline yet (`spine-logs-in-traces` in
`TODO.md`). The incident had to be diagnosed through `kubectl describe` and the
Tabletop's *client-side* `ECONNREFUSED` exceptions — i.e. we found out the Spine
was saturated only by seeing someone else fail to reach it.

Note one subtlety about the stream spans: the Rack instrumentation runs as
`Rack::Events`, whose `on_finish` fires when the response body is closed. So a
stream's `GET` span has a duration equal to the stream's whole lifetime — which
is useful, but it is **only exported when the stream ends**. Currently-open
streams are invisible in Honeycomb by construction. You cannot answer "how many
streams are open right now" from traces; it has to be measured and pushed.

### Signals worth having

The single most valuable number is **currently-open SSE streams on the Spine**,
because it is the thing that hits a hard ceiling. Alongside it:

| signal | where | why |
|---|---|---|
| open stream count (gauge) | Spine | the ceiling from Finding 1; alert well below `max_threads` |
| open streams ÷ Puma `max_threads` | Spine | saturation as a ratio survives retuning the pool |
| free Puma threads (gauge) | Spine | the direct cause of a starved readiness probe |
| stream lifetime (histogram) | Spine | already available from the `GET` span's duration once it ends — a rising tail is the leak |
| stream opens / closes (counters) | Spine | opens ≫ closes over a window *is* the leak, stated plainly |
| room registry size, subscription count | Tabletop | Finding 2's leak at its source |
| open browser streams per game | Shuffler | `browserStreamCountForGame` already exists; nothing reports it |
| `ECONNREFUSED` to `spine-service` | Tabletop / Shuffler | the downstream symptom; keep it, but as confirmation, not as the alarm |
| readiness-failure count | k8s | today's only saturation signal, and a lagging one |

Given `OTEL_METRICS_EXPORTER: "none"`, the cheapest first step is not metrics at
all: have the Spine put `spine.open_streams` as an **attribute on every request
span** it already emits. Every `POST /tables/:id/events` then carries the current
stream count, which makes the ceiling queryable in Honeycomb immediately,
without turning on a metrics pipeline. Consult `owners/fleet-is-observable/`
before wiring anything.

## Summary

The shutdown hang was the visible failure, but the durable problems it points at
are: **a 5-thread ceiling nobody declared**, **a Tabletop stream leak with no
upper bound**, **no timeout at any layer**, and **no way to see any of it**. The
first two together are sufficient to reproduce the incident without any shutdown
bug at all.
