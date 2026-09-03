# 02 — Shuffler subscriber: send Last-Event-ID, resume from last-applied seq

Mountain: spine-gathers-data
Ship: shuffler
Status: ready-for-agent

**What to build:** A card returned to the library shows up in the Shuffler even if the
Shuffler's Spine connection dropped right when it happened. `spineSubscriber.ts`'s connect
loop tracks the highest `seq` it has actually applied (not merely received — a crash
mid-apply must not advance past an event that never landed) and sends it as the
`Last-Event-ID` header on every connect attempt, including the first, where the header is
simply absent. Replayed events flow through the existing dedup-by-event-id path in
`cardReturnedDispatch.ts` unchanged, so nothing double-applies. Requires ticket 01 deployed
to the Spine — an old Spine ignores the header and behaves as today, so this ticket alone
is safe to write and test against a fake, but a real reconnect-catch-up only works once 01
is live.

**Blocked by:** 01 — Spine: replay-on-connect for the per-table SSE stream

**Status:** ready-for-agent

- [ ] The connect loop in `spineSubscriber.ts` tracks the highest `seq` confirmed applied
      via `onEvent`'s caller, and sends it as `Last-Event-ID` on every connect attempt.
- [ ] The very first connection (nothing applied yet) sends no `Last-Event-ID` and behaves
      exactly as today.
- [ ] An event published while the Shuffler was disconnected arrives once reconnected and
      is applied exactly once.
- [ ] The receiving span (`"sse subscription: <event.name>"`) carries a way to see whether
      an event arrived via replay or live (span attribute, or a distinct reconnect
      log/span with a replayed-count) — a reconnect that replays zero events is not itself
      noteworthy; a nonzero replay is the signal this feature exists to surface.
- [ ] `apps/shuffler/test/port-spine/spineSubscriber.test.ts`'s `fakeSpineServer.ts`
      records the `Last-Event-ID` header on each accepted connection and supports queuing
      already-published events for replay.
- [ ] The existing test `"reconnects after a dropped connection and keeps applying events,
      with no catch-up of what was missed"` is rewritten to assert the opposite — publish
      an event while disconnected, reconnect, assert it *is* applied — and renamed to match.
- [ ] The stale "no catch-up/replay, just resume listening" docstring/comments in
      `spineSubscriber.ts` are updated to describe the new behavior.
