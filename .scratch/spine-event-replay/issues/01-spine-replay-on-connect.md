# 01 — Spine: replay-on-connect for the per-table SSE stream

Mountain: spine-gathers-data
Ship: spine
Status: ready-for-agent

**What to build:** The Spine's per-table SSE stream supports replay-on-connect using the
existing per-table monotonic `seq`. A subscriber that sends the standard `Last-Event-ID`
header on its stream-opening request gets every stored event for that table with `seq`
greater than that value, replayed in order over the same connection, before the stream
proceeds into its ordinary live broadcast — unchanged in every other respect. A subscriber
that sends no `Last-Event-ID` (first-ever connection, or an old client that doesn't know
about this yet) gets exactly today's live-only stream. This ticket is backward compatible
and has no dependents — it can land and deploy on its own.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `SseStream` accepts an optional last-seen `seq`. When present, before entering the
      live `heartbeat`/`queue.pop` loop, it first reads and yields every stored event for
      the table with `seq` greater than that value, in `seq` order, as the same
      `data: <json>\n\n` frames it already emits for live events — written as fast as they
      can be read, no heartbeat pacing during replay — then proceeds exactly as today.
- [ ] When no last-seen `seq` is given, `SseStream` behavior is byte-for-byte unchanged
      from today.
- [ ] The stream route reads the `Last-Event-ID` request header, parses it, and passes it
      through to `SseStream`. A malformed or non-numeric value is treated as absent (full
      live stream, no replay, no error response) — a subscriber sending garbage isn't
      refused service.
- [ ] Replay is scoped per table via the existing `(table_id, seq)` unique index — a
      replay for one table can never yield another table's events.
- [ ] A reconnect with a last-seen `seq` equal to (or beyond) the table's latest costs
      nothing extra — zero replay frames, straight into heartbeat/live behavior.
- [ ] `services/spine/test/models/sse_stream_test.rb`: cases for events published before
      the stream opens arriving as replay frames in order given a last-seen `seq`; a
      last-seen `seq` equal to the latest yielding no replay frames; no last-seen `seq`
      behaving exactly as today's existing tests already prove.
- [ ] `services/spine/test/integration/sse_stream_test.rb`: a case sending `Last-Event-ID`
      over a real HTTP request and asserting replayed events arrive before whatever is
      published live afterward.
